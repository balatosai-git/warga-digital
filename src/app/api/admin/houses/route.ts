import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import { DEFAULT_TENANT_ID, DEFAULT_COMMUNITY_ID } from "@/lib/constants/seed-ids";
import { requireAdmin } from "@/lib/auth/admin-guard";

interface AdminHouseRow {
  id: string;
  blok_rumah: string | null;
  name: string;
  address: string | null;
  total_residents: number;
  status: string;
  is_active: boolean;
}

/**
 * GET /api/admin/houses
 * Returns active house blocks for admin list page.
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

  const { data, error } = await supabase
    .from("houses")
    .select("id, blok_rumah, name, address, total_residents, status, is_active")
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .eq("community_id", DEFAULT_COMMUNITY_ID)
    .eq("is_active", true)
    .order("blok_rumah", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("[admin/houses] GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const houses = (data ?? []) as AdminHouseRow[];
  return NextResponse.json({ houses });
}
