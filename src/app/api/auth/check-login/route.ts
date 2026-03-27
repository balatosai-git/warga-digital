import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  looksLikePhone,
  normalizeWaNumber,
  getWaNumberVariants,
} from "@/lib/phone-utils";

/** POST: Check if username or WA number exists and can proceed to PIN step. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const login = typeof body?.login === "string" ? body.login.trim() : "";

    if (!login) {
      return NextResponse.json(
        {
          exists: false,
          error: "Isi Username atau Nomor WhatsApp untuk melanjutkan.",
        },
        { status: 400 },
      );
    }

    const supabase = createServerClient();
    let user: {
      id: string;
      full_name: string;
      pin_hash: string | null;
      status: string;
    } | null = null;

    if (looksLikePhone(login)) {
      // Build all plausible storage variants so we find the user regardless
      // of which format was used when the account was created (e.g. "08...",
      // "628...", "+628...", or bare "8...").
      const variants = getWaNumberVariants(login);

      const { data, error: fetchError } = await supabase
        .from("users")
        .select("id, full_name, pin_hash, status")
        .in("wa_number", variants)
        .limit(1);

      if (!fetchError && data && data.length > 0) {
        user = data[0];
      } else if (fetchError) {
        console.error("[Check-login] Phone lookup error:", fetchError);
      }

      // Fallback: also try the canonical normalized form explicitly
      // (handles the case where getWaNumberVariants missed a format)
      if (!user) {
        const canonical = normalizeWaNumber(login);
        if (!variants.includes(canonical)) {
          const { data: fb, error: fbErr } = await supabase
            .from("users")
            .select("id, full_name, pin_hash, status")
            .eq("wa_number", canonical)
            .maybeSingle();
          if (!fbErr && fb) user = fb;
        }
      }
    } else {
      // Treat as username (case-insensitive)
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
        {
          exists: false,
          error: "Username atau nomor WhatsApp tidak ditemukan.",
        },
        { status: 404 },
      );
    }

    if (!user.pin_hash) {
      return NextResponse.json(
        {
          exists: true,
          canProceed: false,
          error:
            "Akun belum mengatur PIN. Selesaikan pendaftaran terlebih dahulu.",
        },
        { status: 400 },
      );
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        {
          exists: true,
          canProceed: false,
          error: "Akun belum aktif. Verifikasi nomor WhatsApp terlebih dahulu.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({ exists: true, canProceed: true });
  } catch (err) {
    console.error("[Check-login] Error:", err);
    return NextResponse.json(
      { exists: false, error: "Terjadi kesalahan. Coba lagi." },
      { status: 500 },
    );
  }
}
