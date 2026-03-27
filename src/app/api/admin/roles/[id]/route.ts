import { NextResponse, type NextRequest } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import { DEFAULT_TENANT_ID } from "@/lib/constants/seed-ids";
import { requireAdmin } from "@/lib/auth/admin-guard";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PATCH /api/admin/roles/[id]
 *
 * Updates an existing role's name, description, or scope.
 * Body: { name?: string; description?: string; scope?: "SYSTEM" | "TENANT" | "HOUSE" }
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
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
    name?: string;
    description?: string;
    scope?: string;
  };

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    updated_by: session.userId,
  };

  if (body.name !== undefined) {
    const rawName = body.name.trim();
    if (!rawName) {
      return NextResponse.json(
        { error: "Nama role tidak boleh kosong" },
        { status: 400 },
      );
    }
    updates.name = rawName.toUpperCase().replace(/\s+/g, "_");
  }

  if (body.description !== undefined) {
    updates.description = body.description.trim() || null;
  }

  if (body.scope !== undefined) {
    const validScopes = ["SYSTEM", "TENANT", "HOUSE"];
    if (!validScopes.includes(body.scope)) {
      return NextResponse.json(
        { error: "Scope tidak valid. Pilih SYSTEM, TENANT, atau HOUSE." },
        { status: 400 },
      );
    }
    updates.scope = body.scope;
  }

  const { data: role, error } = await supabase
    .from("roles")
    .update(updates)
    .eq("id", roleId)
    .select("id, name, description, scope, created_at")
    .single();

  if (error) {
    console.error("[admin/roles] PATCH error:", error);
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Nama role sudah digunakan. Pilih nama lain." },
        { status: 409 },
      );
    }
    if (error.code === "PGRST116") {
      return NextResponse.json(
        { error: "Role tidak ditemukan" },
        { status: 404 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ role });
}

/**
 * DELETE /api/admin/roles/[id]
 *
 * Deletes a role only if it has no active assignments in the tenant.
 * Returns 409 if there are still active members.
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
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

  // Guard: ensure no active members hold this role in this tenant before deletion
  const { count: activeMemberCount, error: countError } = await supabase
    .from("tenant_user_roles")
    .select("id, tenant_users!inner(tenant_id)", { count: "exact", head: true })
    .eq("role_id", roleId)
    .eq("tenant_users.tenant_id", DEFAULT_TENANT_ID)
    .is("revoked_at", null);

  if (countError) {
    console.error("[admin/roles] DELETE count error:", countError);
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  if (activeMemberCount && activeMemberCount > 0) {
    return NextResponse.json(
      {
        error: `Role ini masih memiliki ${activeMemberCount} anggota aktif. Cabut semua role terlebih dahulu sebelum menghapus.`,
      },
      { status: 409 },
    );
  }

  const { error } = await supabase.from("roles").delete().eq("id", roleId);

  if (error) {
    console.error("[admin/roles] DELETE error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
