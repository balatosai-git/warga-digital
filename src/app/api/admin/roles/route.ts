import { NextResponse, type NextRequest } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import { DEFAULT_TENANT_ID } from "@/lib/constants/seed-ids";
import { requireAdmin } from "@/lib/auth/admin-guard";

/**
 * GET /api/admin/roles
 *
 * Returns all roles with member count scoped to the default tenant.
 * Requires RT_ADMIN or RT_BENDAHARA role.
 */
export async function GET() {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const tenantUser = await requireAdmin(supabase, session.userId);
  if (!tenantUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch all roles ordered by id
  const { data: roles, error: rolesError } = await supabase
    .from("roles")
    .select("id, name, description, scope, created_at")
    .order("id", { ascending: true });

  if (rolesError) {
    console.error("[admin/roles] GET roles error:", rolesError);
    return NextResponse.json({ error: rolesError.message }, { status: 500 });
  }

  // Fetch active tenant_user_roles for this tenant to compute per-role member counts
  const { data: assignmentRows, error: assignmentError } = await supabase
    .from("tenant_user_roles")
    .select("role_id, tenant_users!inner(tenant_id)")
    .eq("tenant_users.tenant_id", DEFAULT_TENANT_ID)
    .is("revoked_at", null);

  if (assignmentError) {
    console.error("[admin/roles] GET assignments error:", assignmentError);
    // Non-fatal — just return zero counts
  }

  // Build a map of role_id → member count
  const countMap: Record<number, number> = {};
  (assignmentRows ?? []).forEach((row) => {
    const rid = (row as { role_id: number }).role_id;
    countMap[rid] = (countMap[rid] ?? 0) + 1;
  });

  const enrichedRoles = (roles ?? []).map((r) => ({
    ...r,
    member_count: countMap[r.id as number] ?? 0,
  }));

  return NextResponse.json({ roles: enrichedRoles });
}

/**
 * POST /api/admin/roles
 *
 * Creates a new role.
 * Body: { name: string; description?: string; scope: "SYSTEM" | "TENANT" | "HOUSE" }
 */
export async function POST(request: NextRequest) {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const tenantUser = await requireAdmin(supabase, session.userId);
  if (!tenantUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    description?: string;
    scope?: string;
  };

  const rawName = body.name?.trim() ?? "";
  if (!rawName) {
    return NextResponse.json(
      { error: "Nama role wajib diisi" },
      { status: 400 },
    );
  }

  const validScopes = ["SYSTEM", "TENANT", "HOUSE"];
  if (!body.scope || !validScopes.includes(body.scope)) {
    return NextResponse.json(
      { error: "Scope tidak valid. Pilih SYSTEM, TENANT, atau HOUSE." },
      { status: 400 },
    );
  }

  // Normalise to SCREAMING_SNAKE_CASE
  const normalizedName = rawName.toUpperCase().replace(/\s+/g, "_");

  const { data: role, error } = await supabase
    .from("roles")
    .insert({
      name: normalizedName,
      description: body.description?.trim() || null,
      scope: body.scope,
      created_by: session.userId,
      created_at: new Date().toISOString(),
    })
    .select("id, name, description, scope, created_at")
    .single();

  if (error) {
    console.error("[admin/roles] POST insert error:", error);
    if (error.code === "23505") {
      return NextResponse.json(
        { error: `Role "${normalizedName}" sudah ada. Gunakan nama lain.` },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { role: { ...role, member_count: 0 } },
    { status: 201 },
  );
}
