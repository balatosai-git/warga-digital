import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { verifyPin } from "@/lib/crypto";
import { createSession, setSessionCookie } from "@/lib/auth/session";

const PIN_REGEX = /^\d{4}$/;

function normalizeWaNumber(waNumber: string): string {
  const digits = String(waNumber ?? "").replace(/\D/g, "");
  if (digits.startsWith("62")) return "+" + digits;
  if (digits.startsWith("0")) return "+62" + digits.slice(1);
  return "+62" + digits;
}

/** True if input looks like a phone number (digits, +, spaces, dashes only). */
function looksLikePhone(input: string): boolean {
  return /^[\d+\s-]+$/.test(input.trim()) && input.replace(/\D/g, "").length >= 10;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { login, pin } = body;

    if (!login || typeof login !== "string" || !login.trim()) {
      return NextResponse.json(
        { error: "Nomor WhatsApp atau username wajib" },
        { status: 400 }
      );
    }

    const pinStr = String(pin ?? "").trim();
    if (!PIN_REGEX.test(pinStr)) {
      return NextResponse.json(
        { error: "PIN harus 4 digit angka" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    let user: { id: string; full_name: string; pin_hash: string | null; status: string } | null = null;

    if (looksLikePhone(login)) {
      const normalized = normalizeWaNumber(login.trim());
      const { data, error: fetchError } = await supabase
        .from("users")
        .select("id, full_name, pin_hash, status")
        .eq("wa_number", normalized)
        .maybeSingle();
      if (!fetchError) user = data;
    } else {
      const { data: row, error: fetchError } = await supabase
        .from("users")
        .select("id, full_name, pin_hash, status")
        .ilike("username", login.trim())
        .not("username", "is", null)
        .maybeSingle();
      if (!fetchError) user = row;
    }

    if (!user) {
      return NextResponse.json(
        { error: "Username atau nomor WhatsApp tidak ditemukan." },
        { status: 404 }
      );
    }

    if (!user.pin_hash) {
      return NextResponse.json(
        { error: "Akun belum mengatur PIN. Selesaikan pendaftaran terlebih dahulu." },
        { status: 400 }
      );
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Akun belum aktif. Verifikasi nomor WhatsApp terlebih dahulu." },
        { status: 400 }
      );
    }

    if (!verifyPin(pinStr, user.pin_hash)) {
      return NextResponse.json(
        { error: "PIN salah." },
        { status: 401 }
      );
    }

    const jwt = await createSession(user.id);
    await setSessionCookie(jwt);

    return NextResponse.json({
      success: true,
      userId: user.id,
      fullName: user.full_name,
    });
  } catch (err) {
    console.error("[Login] Error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}
