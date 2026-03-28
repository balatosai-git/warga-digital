import { NextResponse, type NextRequest } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import { DEFAULT_TENANT_ID } from "@/lib/constants/seed-ids";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { notifyAdmins } from "@/lib/notifications";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/roles/[id]/users
 *
 * Returns a paginated list of users (tenant-scoped) who currently hold this role.
 * Query params: page (default 1), limit (default 20)
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const tenantUser = await requireAdmin(supabase, session.userId);
  if (!tenantUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: idStr } = await context.params;
  const roleId = parseInt(idStr, 10);
  if (isNaN(roleId)) {
    return NextResponse.json({ error: "ID role tidak valid" }, { status: 400 });
  }

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const limit = Math.min(
    50,
    Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10)),
  );
  const offset = (page - 1) * limit;

  // Fetch tenant_user_roles for this role, joined to tenant_users + users,
  // filtered to the default tenant.
  const { data: rows, error: rowsError } = await supabase
    .from("tenant_user_roles")
    .select(
      `
      id,
      assigned_at,
      tenant_users!inner (
        id,
        user_id,
        tenant_id,
        users!inner (
          id,
          full_name,
          wa_number
        )
      )
    `,
    )
    .eq("role_id", roleId)
    .eq("tenant_users.tenant_id", DEFAULT_TENANT_ID)
    .is("revoked_at", null)
    .order("assigned_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (rowsError) {
    console.error("[admin/roles/users] GET error:", rowsError);
    return NextResponse.json({ error: rowsError.message }, { status: 500 });
  }

  // Collect user IDs so we can look up their primary blok_rumah in bulk
  type RowType = {
    id: string;
    assigned_at: string;
    tenant_users: {
      id: string;
      user_id: string;
      tenant_id: string;
      users: { id: string; full_name: string; wa_number: string | null };
    };
  };

  const typedRows = (rows ?? []) as unknown as RowType[];
  const userIds = typedRows.map((r) => r.tenant_users.user_id);

  // Batch-fetch primary house blok_rumah for each user (best-effort, non-fatal)
  const blokMap: Record<string, string | null> = {};
  if (userIds.length > 0) {
    const { data: houseRows } = await supabase
      .from("user_houses")
      .select("user_id, houses!inner(blok_rumah, tenant_id)")
      .in("user_id", userIds)
      .eq("is_primary", true)
      .eq("status", "ACTIVE")
      .eq("houses.tenant_id", DEFAULT_TENANT_ID);

    (houseRows ?? []).forEach((h) => {
      type HouseRow = {
        user_id: string;
        houses: { blok_rumah: string | null; tenant_id: string };
      };
      const row = h as unknown as HouseRow;
      blokMap[row.user_id] = row.houses?.blok_rumah ?? null;
    });
  }

  const members = typedRows.map((r) => ({
    tenant_user_role_id: r.id,
    user_id: r.tenant_users.user_id,
    full_name: r.tenant_users.users?.full_name ?? "—",
    wa_number: r.tenant_users.users?.wa_number ?? null,
    blok_rumah: blokMap[r.tenant_users.user_id] ?? null,
    assigned_at: r.assigned_at,
  }));

  return NextResponse.json({ members, page, limit });
}

/**
 * POST /api/admin/roles/[id]/users
 *
 * Assigns this role to a user (by userId) within the default tenant.
 * Returns 409 if the user already holds this role.
 * Body: { userId: string }
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const tenantUser = await requireAdmin(supabase, session.userId);
  if (!tenantUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: idStr } = await context.params;
  const roleId = parseInt(idStr, 10);
  if (isNaN(roleId)) {
    return NextResponse.json({ error: "ID role tidak valid" }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as { userId?: string };
  const { userId } = body;
  if (!userId?.trim()) {
    return NextResponse.json({ error: "userId wajib diisi" }, { status: 400 });
  }

  // Resolve the target user's tenant_user record
  const { data: targetTenantUser } = await supabase
    .from("tenant_users")
    .select("id")
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (!targetTenantUser) {
    return NextResponse.json(
      { error: "Warga tidak ditemukan atau tidak aktif di komunitas ini" },
      { status: 404 },
    );
  }

  // Verify the role exists (also fetch name for notification)
  const { data: roleRow } = await supabase
    .from("roles")
    .select("id, name")
    .eq("id", roleId)
    .maybeSingle();

  if (!roleRow) {
    return NextResponse.json(
      { error: "Role tidak ditemukan" },
      { status: 404 },
    );
  }

  // Check for an existing active assignment
  const { data: existing } = await supabase
    .from("tenant_user_roles")
    .select("id")
    .eq("tenant_user_id", targetTenantUser.id)
    .eq("role_id", roleId)
    .is("revoked_at", null)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "Role sudah diberikan ke warga ini dan masih aktif" },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();

  const { data: assigned, error: insertError } = await supabase
    .from("tenant_user_roles")
    .insert({
      tenant_user_id: targetTenantUser.id,
      role_id: roleId,
      assigned_at: now,
    })
    .select("id, assigned_at")
    .single();

  if (insertError) {
    console.error("[admin/roles/users] POST insert error:", insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Best-effort: send in-app notification to the newly assigned user
  const typedRole = roleRow as unknown as { id: number; name: string };
  const roleName = typedRole.name
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

  try {
    await supabase.from("notifications").insert({
      tenant_id: DEFAULT_TENANT_ID,
      recipient_user_id: userId,
      actor_user_id: session.userId,
      type: "ORGANISASI",
      priority: "NORMAL",
      title: "Role Baru Diberikan",
      body: `Anda telah diberikan role "${roleName}" oleh admin komunitas. Selamat bergabung!`,
      action_url: "/notifikasi",
      entity_table: "tenant_user_roles",
      entity_id: assigned.id,
    });
  } catch (notifErr) {
    console.error("[admin/roles/users] POST notification error:", notifErr);
  }

  // Best-effort: notify all admin personnel about the assignment
  try {
    const [targetUserRes, actorUserRes] = await Promise.all([
      supabase.from("users").select("full_name").eq("id", userId).maybeSingle(),
      supabase
        .from("users")
        .select("full_name")
        .eq("id", session.userId)
        .maybeSingle(),
    ]);

    const targetName =
      (
        targetUserRes.data as { full_name?: string } | null
      )?.full_name?.trim() || "Warga";
    const actorName =
      (actorUserRes.data as { full_name?: string } | null)?.full_name?.trim() ||
      "Admin";

    await notifyAdmins(
      supabase,
      {
        tenant_id: DEFAULT_TENANT_ID,
        actor_user_id: session.userId,
        type: "ORGANISASI",
        priority: "NORMAL",
        title: "Role Diberikan ke Warga",
        body: `${actorName} memberikan role "${roleName}" kepada ${targetName}.`,
        action_url: "/admin/roles",
        entity_table: "tenant_user_roles",
        entity_id: assigned.id,
        dedupe_key: `role_assigned:${assigned.id}:admin_notif`,
        metadata: { roleId, userId, roleName, targetName },
        created_by: session.userId,
      },
      session.userId, // exclude the actor so they don't notify themselves
    );
  } catch (adminNotifErr) {
    console.error(
      "[admin/roles/users] POST admin notification error:",
      adminNotifErr,
    );
  }

  return NextResponse.json(
    { tenantUserRoleId: assigned.id, assignedAt: assigned.assigned_at },
    { status: 201 },
  );
}

/**
 * DELETE /api/admin/roles/[id]/users
 *
 * Soft-revokes a role assignment by setting revoked_at = NOW().
 * Body: { tenantUserRoleId: string }
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const tenantUser = await requireAdmin(supabase, session.userId);
  if (!tenantUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: idStr } = await context.params;
  const roleId = parseInt(idStr, 10);
  if (isNaN(roleId)) {
    return NextResponse.json({ error: "ID role tidak valid" }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    tenantUserRoleId?: string;
  };
  const { tenantUserRoleId } = body;
  if (!tenantUserRoleId?.trim()) {
    return NextResponse.json(
      { error: "tenantUserRoleId wajib diisi" },
      { status: 400 },
    );
  }

  // Pre-fetch role name and affected user ID for notification (best-effort, before revoke)
  const [roleForNotif, turForNotif] = await Promise.all([
    supabase
      .from("roles")
      .select("name")
      .eq("id", roleId)
      .maybeSingle()
      .then((r) => r.data),
    supabase
      .from("tenant_user_roles")
      .select("tenant_users!inner(user_id)")
      .eq("id", tenantUserRoleId)
      .is("revoked_at", null)
      .maybeSingle()
      .then((r) => r.data),
  ]);

  // Soft-revoke: stamp revoked_at
  const { error: revokeError } = await supabase
    .from("tenant_user_roles")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", tenantUserRoleId)
    .eq("role_id", roleId)
    .is("revoked_at", null);

  if (revokeError) {
    console.error("[admin/roles/users] DELETE revoke error:", revokeError);
    return NextResponse.json({ error: revokeError.message }, { status: 500 });
  }

  // Best-effort: send in-app notification to the revoked user
  try {
    type TurRow = { tenant_users: { user_id: string } };
    const recipientUserId = (turForNotif as unknown as TurRow | null)
      ?.tenant_users?.user_id;
    const roleName = (roleForNotif as unknown as { name: string } | null)?.name;
    if (recipientUserId && roleName) {
      const displayName = roleName
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
      await supabase.from("notifications").insert({
        tenant_id: DEFAULT_TENANT_ID,
        recipient_user_id: recipientUserId,
        actor_user_id: session.userId,
        type: "ORGANISASI",
        priority: "NORMAL",
        title: "Role Dicabut",
        body: `Role "${displayName}" Anda telah dicabut oleh admin komunitas.`,
        action_url: "/notifikasi",
        entity_table: "tenant_user_roles",
        entity_id: tenantUserRoleId,
      });
    }
  } catch (notifErr) {
    console.error("[admin/roles/users] DELETE notification error:", notifErr);
  }

  return NextResponse.json({ success: true });
}
