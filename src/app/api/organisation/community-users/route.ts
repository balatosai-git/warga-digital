import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { DEFAULT_TENANT_ID } from "@/lib/constants/seed-ids";
import { requireCanManageOrganisation } from "@/app/api/organisation/require-manage";

/**
 * GET /api/organisation/community-users
 * Returns registered users in this community (tenant) for organisation assignee dropdown.
 * Requires canManageOrganisation. Used by organisasi manage page.
 */
export async function GET() {
  const forbidden = await requireCanManageOrganisation();
  if (forbidden) return forbidden;

  try {
    const supabase = createServerClient();
    const baseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "") ?? "";

    const { data: tenantUserRows, error: tuError } = await supabase
      .from("tenant_users")
      .select("user_id")
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .eq("status", "ACTIVE");

    if (tuError || !tenantUserRows?.length) {
      return NextResponse.json([]);
    }

    const userIds = tenantUserRows.map((r) => r.user_id);

    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, full_name, wa_number, avatar_path")
      .in("id", userIds);

    if (usersError || !users?.length) {
      return NextResponse.json([]);
    }

    // Primary house (blok) per user in this tenant
    const { data: primaryLinks } = await supabase
      .from("user_houses")
      .select("user_id, house_id")
      .in("user_id", userIds)
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .eq("status", "ACTIVE")
      .eq("is_primary", true);

    const houseIds = [...new Set((primaryLinks ?? []).map((l) => l.house_id))];
    const { data: houses } = houseIds.length
      ? await supabase.from("houses").select("id, blok_rumah").in("id", houseIds)
      : { data: [] as { id: string; blok_rumah: string | null }[] };

    const houseById = (houses ?? []).reduce<Record<string, string>>((acc, h) => {
      if (h.blok_rumah) acc[h.id] = h.blok_rumah;
      return acc;
    }, {});
    const userToBlock: Record<string, string> = {};
    (primaryLinks ?? []).forEach((l: { user_id: string; house_id: string }) => {
      const blok = houseById[l.house_id];
      if (blok) userToBlock[l.user_id] = blok;
    });

    const list = users.map((u) => ({
      id: u.id,
      fullName: u.full_name,
      blockName: userToBlock[u.id] ?? "",
      whatsappNumber: u.wa_number ?? "",
      profilePictureUrl:
        u.avatar_path && baseUrl
          ? `${baseUrl}/storage/v1/object/public/avatars/${u.avatar_path}`
          : null,
    }));

    return NextResponse.json(list);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[Organisation community-users] Error:", error);
    return NextResponse.json({ message: "Gagal memuat data warga." }, { status: 500 });
  }
}
