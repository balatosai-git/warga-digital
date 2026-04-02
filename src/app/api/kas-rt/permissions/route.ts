import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import {
  DEFAULT_TENANT_ID,
  ROLE_IDS_CAN_SUBMIT_KAS_RT,
} from "@/lib/constants/seed-ids";

/**
 * Returns Kas RT permissions for the current user (from session cookie).
 * Used to control UI (e.g. show "Catat Transaksi" only when allowed).
 * Enforcement for submission is in POST /api/kas-rt/transactions.
 */
export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      return NextResponse.json({ canSubmitTransaction: false });
    }

    const { data: roleAssignments } = await supabase
      .from("tenant_user_roles")
      .select("id")
      .eq("tenant_user_id", tenantUser.id)
      .in("role_id", ROLE_IDS_CAN_SUBMIT_KAS_RT)
      .is("revoked_at", null);

    const canSubmitTransaction = (roleAssignments?.length ?? 0) > 0;
    return NextResponse.json({ canSubmitTransaction });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[Kas RT] Permissions error:", error);
    return NextResponse.json({ canSubmitTransaction: false });
  }
}
