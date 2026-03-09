import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { DEFAULT_TENANT_ID, DEFAULT_COMMUNITY_ID } from "@/lib/constants/seed-ids";
import { parseBlokRumah } from "@/lib/blok-rumah";

/**
 * POST /api/auth/register/check-blok
 * Check if a house already exists for the given blok. Used before registration to show
 * confirmation (owner/created_by) when user wants to join an existing house.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const blokRumahRaw = body?.blokRumah;

    if (blokRumahRaw == null || typeof blokRumahRaw !== "string" || !blokRumahRaw.trim()) {
      return NextResponse.json(
        { error: "Blok rumah wajib diisi" },
        { status: 400 }
      );
    }

    const { normalized: blokRumah, error: blokError } = parseBlokRumah(blokRumahRaw);
    if (blokError) {
      return NextResponse.json({ error: blokError }, { status: 400 });
    }

    const supabase = createServerClient();
    const tenantId = DEFAULT_TENANT_ID;
    const communityId = DEFAULT_COMMUNITY_ID;

    const { data: house, error: houseError } = await supabase
      .from("houses")
      .select("id, created_by")
      .eq("tenant_id", tenantId)
      .eq("community_id", communityId)
      .eq("blok_rumah", blokRumah)
      .maybeSingle();

    if (houseError || !house?.id) {
      return NextResponse.json({ exists: false, blokRumah });
    }

    const houseId = house.id;
    const createdByUserId = house.created_by;

    const { data: ownerRow } = await supabase
      .from("user_houses")
      .select("user_id")
      .eq("house_id", houseId)
      .eq("relationship", "OWNER")
      .eq("status", "ACTIVE")
      .limit(1)
      .maybeSingle();

    let ownerFullName = "—";
    let createdByFullName = "—";

    const userIdsToFetch = new Set<string>();
    if (ownerRow?.user_id) userIdsToFetch.add(ownerRow.user_id);
    if (createdByUserId) userIdsToFetch.add(createdByUserId);

    if (userIdsToFetch.size > 0) {
      const { data: users } = await supabase
        .from("users")
        .select("id, full_name")
        .in("id", Array.from(userIdsToFetch));

      const userMap = new Map((users ?? []).map((u) => [u.id, u.full_name ?? "—"]));
      if (ownerRow?.user_id) ownerFullName = userMap.get(ownerRow.user_id) ?? "—";
      if (createdByUserId) createdByFullName = userMap.get(createdByUserId) ?? "—";
    }

    return NextResponse.json({
      exists: true,
      blokRumah,
      ownerFullName,
      createdByFullName,
    });
  } catch (err) {
    console.error("[CheckBlok] Error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}
