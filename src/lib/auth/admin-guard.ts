import { createServerClient } from "@/lib/supabase/server";
import { DEFAULT_TENANT_ID, ROLE_IDS_ADMIN } from "@/lib/constants/seed-ids";

type SupabaseClient = ReturnType<typeof createServerClient>;

/**
 * Verifies that the given user is an active tenant member who holds at
 * least one role listed in ROLE_IDS_ADMIN (RT_ADMIN, RT_BENDAHARA, …).
 *
 * Returns the `tenant_users` row on success, or `null` when the check
 * fails (user not found, inactive, or missing the required role).
 *
 * Usage in any /api/admin/** route:
 *
 *   const supabase = createServerClient();
 *   const tenantUser = await requireAdmin(supabase, session.userId);
 *   if (!tenantUser) {
 *     return NextResponse.json({ error: "Forbidden" }, { status: 403 });
 *   }
 */
export async function requireAdmin(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ id: string } | null> {
  // ── 1. Confirm the user is an active member of the default tenant ──────────
  const { data: tenantUser } = await supabase
    .from("tenant_users")
    .select("id")
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (!tenantUser) return null;

  // ── 2. Confirm they hold at least one admin role (non-revoked) ────────────
  const { data: roleRows } = await supabase
    .from("tenant_user_roles")
    .select("role_id")
    .eq("tenant_user_id", tenantUser.id)
    .in("role_id", ROLE_IDS_ADMIN)
    .is("revoked_at", null)
    .limit(1);

  if (!roleRows || roleRows.length === 0) return null;

  return tenantUser;
}
