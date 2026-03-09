import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import { DEFAULT_TENANT_ID, ROLE_IDS_CAN_MANAGE_ORGANISATION } from "@/lib/constants/seed-ids";

/**
 * Returns null if the current user can manage organisation; otherwise returns a 403 NextResponse.
 * Use in write handlers: const forbidden = await requireCanManageOrganisation(); if (forbidden) return forbidden;
 */
export async function requireCanManageOrganisation(): Promise<NextResponse | null> {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
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
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { data: roleAssignments } = await supabase
    .from("tenant_user_roles")
    .select("id")
    .eq("tenant_user_id", tenantUser.id)
    .in("role_id", ROLE_IDS_CAN_MANAGE_ORGANISATION)
    .is("revoked_at", null);

  if (!roleAssignments?.length) {
    return NextResponse.json({ message: "Forbidden: tidak punya akses kelola organisasi" }, { status: 403 });
  }

  return null;
}
