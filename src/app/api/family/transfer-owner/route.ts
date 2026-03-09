import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/auth/session";

/**
 * POST /api/family/transfer-owner
 * Kepala keluarga (OWNER) transfers the role to another family member.
 * Body: { houseId: string, newOwnerUserId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const houseId = body?.houseId;
    const newOwnerUserId = body?.newOwnerUserId;

    if (!houseId || typeof houseId !== "string" || !houseId.trim()) {
      return NextResponse.json({ error: "houseId wajib diisi" }, { status: 400 });
    }
    if (!newOwnerUserId || typeof newOwnerUserId !== "string" || !newOwnerUserId.trim()) {
      return NextResponse.json({ error: "newOwnerUserId wajib diisi" }, { status: 400 });
    }
    if (newOwnerUserId === session.userId) {
      return NextResponse.json({ error: "Pilih anggota lain sebagai kepala keluarga" }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data: currentOwnerLink, error: ownerErr } = await supabase
      .from("user_houses")
      .select("id, tenant_id")
      .eq("house_id", houseId)
      .eq("user_id", session.userId)
      .eq("relationship", "OWNER")
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (ownerErr || !currentOwnerLink) {
      return NextResponse.json(
        { error: "Anda bukan kepala keluarga di rumah ini" },
        { status: 403 }
      );
    }

    const { data: newOwnerLink, error: newErr } = await supabase
      .from("user_houses")
      .select("id")
      .eq("house_id", houseId)
      .eq("user_id", newOwnerUserId)
      .eq("relationship", "FAMILY")
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (newErr || !newOwnerLink) {
      return NextResponse.json(
        { error: "Anggota keluarga tidak ditemukan atau bukan keluarga" },
        { status: 404 }
      );
    }

    const tenantId = currentOwnerLink.tenant_id;

    const { error: demoteErr } = await supabase
      .from("user_houses")
      .update({ relationship: "FAMILY" })
      .eq("id", currentOwnerLink.id);

    if (demoteErr) {
      console.error("[TransferOwner] Demote error:", demoteErr);
      return NextResponse.json(
        { error: "Gagal mengubah peran Anda" },
        { status: 500 }
      );
    }

    const { error: promoteErr } = await supabase
      .from("user_houses")
      .update({ relationship: "OWNER" })
      .eq("id", newOwnerLink.id);

    if (promoteErr) {
      console.error("[TransferOwner] Promote error:", promoteErr);
      return NextResponse.json(
        { error: "Gagal mengalihkan kepala keluarga" },
        { status: 500 }
      );
    }

    const { error: badgeErr } = await supabase.from("user_badges").insert({ user_id: newOwnerUserId, badge_id: 2 });
    if (badgeErr && badgeErr.code !== "23505") {
      console.error("[TransferOwner] Insert user_badges error:", badgeErr);
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[TransferOwner] Error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}
