import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import { hashPin, verifyPin } from "@/lib/crypto";

const PIN_REGEX = /^\d{4}$/;

/**
 * POST /api/auth/change-pin
 * Change PIN for the current user (session required).
 * Body: { currentPin, newPin, confirmNewPin }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const currentPin = String(body?.currentPin ?? "").trim();
    const newPin = String(body?.newPin ?? "").trim();
    const confirmNewPin = String(body?.confirmNewPin ?? "").trim();

    if (!PIN_REGEX.test(currentPin)) {
      return NextResponse.json(
        { error: "PIN saat ini harus 4 digit angka" },
        { status: 400 }
      );
    }
    if (!PIN_REGEX.test(newPin)) {
      return NextResponse.json(
        { error: "PIN baru harus 4 digit angka" },
        { status: 400 }
      );
    }
    if (newPin !== confirmNewPin) {
      return NextResponse.json(
        { error: "PIN baru dan konfirmasi PIN tidak sama" },
        { status: 400 }
      );
    }
    if (currentPin === newPin) {
      return NextResponse.json(
        { error: "PIN baru harus berbeda dari PIN saat ini" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const { data: user, error: fetchError } = await supabase
      .from("users")
      .select("id, pin_hash")
      .eq("id", session.userId)
      .single();

    if (fetchError || !user) {
      return NextResponse.json(
        { error: "Profil tidak ditemukan" },
        { status: 404 }
      );
    }
    if (!user.pin_hash) {
      return NextResponse.json(
        { error: "Akun belum mengatur PIN. Gunakan halaman daftar." },
        { status: 400 }
      );
    }

    if (!verifyPin(currentPin, user.pin_hash)) {
      return NextResponse.json(
        { error: "PIN saat ini salah" },
        { status: 401 }
      );
    }

    const pinHash = hashPin(newPin);
    const { error: updateError } = await supabase
      .from("users")
      .update({ pin_hash: pinHash, updated_at: new Date().toISOString(), updated_by: session.userId })
      .eq("id", session.userId);

    if (updateError) {
      console.error("[ChangePin] Update error:", updateError);
      return NextResponse.json(
        { error: "Gagal menyimpan PIN baru" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[ChangePin] Error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}
