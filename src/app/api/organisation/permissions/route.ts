import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import { DEFAULT_TENANT_ID, ROLE_IDS_CAN_MANAGE_ORGANISATION } from "@/lib/constants/seed-ids";

/**
 * Returns organisation permissions for the current user (from session cookie).
 * Used to show "Kelola Organisasi" only when the user has a role that can manage the organisation.
 * Enforcement for any write actions should be done in the respective API routes.
 */
export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ canManageOrganisation: false });
    }

    const supabase = createServerClient();
    const { data: tenantUser } = await supabase
      .from("tenant_users")
      .select("id")
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .eq("user_id", session.userId)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (!tenantUser) {
      return NextResponse.json({ canManageOrganisation: false });
    }

    const { data: roleAssignments } = await supabase
      .from("tenant_user_roles")
      .select("id")
      .eq("tenant_user_id", tenantUser.id)
      .in("role_id", ROLE_IDS_CAN_MANAGE_ORGANISATION)
      .is("revoked_at", null);

    const canManageOrganisation = (roleAssignments?.length ?? 0) > 0;
    return NextResponse.json({ canManageOrganisation });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[Organisation] Permissions error:", error);
    return NextResponse.json({ canManageOrganisation: false });
  }
}
