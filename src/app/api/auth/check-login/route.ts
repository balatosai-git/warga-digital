import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

function normalizeWaNumber(waNumber: string): string {
  const digits = String(waNumber ?? "").replace(/\D/g, "");
  if (digits.startsWith("62")) return "+" + digits;
  if (digits.startsWith("0")) return "+62" + digits.slice(1);
  return "+62" + digits;
}

function looksLikePhone(input: string): boolean {
  return /^[\d+\s-]+$/.test(input.trim()) && input.replace(/\D/g, "").length >= 10;
}

/** POST: Check if username or WA number exists and can proceed to PIN step. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const login = typeof body?.login === "string" ? body.login.trim() : "";

    if (!login) {
      return NextResponse.json(
        { exists: false, error: "Isi Username atau Nomor WhatsApp untuk melanjutkan." },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    let user: { id: string; full_name: string; pin_hash: string | null; status: string } | null = null;
    if (looksLikePhone(login)) {
      const normalized = normalizeWaNumber(login);
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
        .ilike("username", login)
        .not("username", "is", null)
        .maybeSingle();
      if (!fetchError) user = row;
    }

    if (!user) {
      return NextResponse.json(
        { exists: false, error: "Username atau nomor WhatsApp tidak ditemukan." },
        { status: 404 }
      );
    }

    if (!user.pin_hash) {
      return NextResponse.json(
        { exists: true, canProceed: false, error: "Akun belum mengatur PIN. Selesaikan pendaftaran terlebih dahulu." },
        { status: 400 }
      );
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { exists: true, canProceed: false, error: "Akun belum aktif. Verifikasi nomor WhatsApp terlebih dahulu." },
        { status: 400 }
      );
    }

    return NextResponse.json({ exists: true, canProceed: true });
  } catch (err) {
    console.error("[Check-login] Error:", err);
    return NextResponse.json(
      { exists: false, error: "Terjadi kesalahan. Coba lagi." },
      { status: 500 }
    );
  }
}
