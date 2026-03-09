import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/auth/session";

/**
 * POST /api/family/remove-member
 * Kepala keluarga (OWNER) removes a family member from the house.
 * Body: { houseId: string, memberUserId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const houseId = body?.houseId;
    const memberUserId = body?.memberUserId;

    if (!houseId || typeof houseId !== "string" || !houseId.trim()) {
      return NextResponse.json({ error: "houseId wajib diisi" }, { status: 400 });
    }
    if (!memberUserId || typeof memberUserId !== "string" || !memberUserId.trim()) {
      return NextResponse.json({ error: "memberUserId wajib diisi" }, { status: 400 });
    }
    if (memberUserId === session.userId) {
      return NextResponse.json(
        { error: "Anda tidak dapat mengeluarkan diri sendiri. Transfer kepala keluarga terlebih dahulu." },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { data: ownerLink, error: ownerErr } = await supabase
      .from("user_houses")
      .select("id")
      .eq("house_id", houseId)
      .eq("user_id", session.userId)
      .eq("relationship", "OWNER")
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (ownerErr || !ownerLink) {
      return NextResponse.json(
        { error: "Anda bukan kepala keluarga di rumah ini" },
        { status: 403 }
      );
    }

    const { data: memberLink, error: memberErr } = await supabase
      .from("user_houses")
      .select("id")
      .eq("house_id", houseId)
      .eq("user_id", memberUserId)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (memberErr || !memberLink) {
      return NextResponse.json(
        { error: "Anggota tidak ditemukan di rumah ini" },
        { status: 404 }
      );
    }

    const { error: updateErr } = await supabase
      .from("user_houses")
      .update({ status: "INACTIVE" })
      .eq("id", memberLink.id);

    if (updateErr) {
      console.error("[RemoveMember] Update error:", updateErr);
      return NextResponse.json(
        { error: "Gagal mengeluarkan anggota" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[RemoveMember] Error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}
