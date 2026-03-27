import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { verifyPin } from "@/lib/crypto";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import {
  looksLikePhone,
  normalizeWaNumber,
  getWaNumberVariants,
} from "@/lib/phone-utils";

const PIN_REGEX = /^\d{4}$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { login, pin } = body;

    if (!login || typeof login !== "string" || !login.trim()) {
      return NextResponse.json(
        { error: "Nomor WhatsApp atau username wajib" },
        { status: 400 },
      );
    }

    const pinStr = String(pin ?? "").trim();
    if (!PIN_REGEX.test(pinStr)) {
      return NextResponse.json(
        { error: "PIN harus 4 digit angka" },
        { status: 400 },
      );
    }

    const loginTrimmed = login.trim();
    const supabase = createServerClient();
    let user: {
      id: string;
      full_name: string;
      pin_hash: string | null;
      status: string;
    } | null = null;

    if (looksLikePhone(loginTrimmed)) {
      // Query all plausible storage variants so we match regardless of which
      // format was used when the account was originally created
      // (e.g. "08...", "628...", "+628...", or bare "8...").
      const variants = getWaNumberVariants(loginTrimmed);

      const { data, error: fetchError } = await supabase
        .from("users")
        .select("id, full_name, pin_hash, status")
        .in("wa_number", variants)
        .limit(1);

      if (!fetchError && data && data.length > 0) {
        user = data[0];
      } else if (fetchError) {
        console.error("[Login] Phone lookup error:", fetchError);
      }

      // Fallback: also try the canonical normalized form explicitly
      // (handles edge cases where getWaNumberVariants missed a format)
      if (!user) {
        const canonical = normalizeWaNumber(loginTrimmed);
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
        .ilike("username", loginTrimmed)
        .not("username", "is", null)
        .maybeSingle();
      if (!fetchError) user = row;
    }

    if (!user) {
      return NextResponse.json(
        { error: "Username atau nomor WhatsApp tidak ditemukan." },
        { status: 404 },
      );
    }

    if (!user.pin_hash) {
      return NextResponse.json(
        {
          error:
            "Akun belum mengatur PIN. Selesaikan pendaftaran terlebih dahulu.",
        },
        { status: 400 },
      );
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        {
          error: "Akun belum aktif. Verifikasi nomor WhatsApp terlebih dahulu.",
        },
        { status: 400 },
      );
    }

    if (!verifyPin(pinStr, user.pin_hash)) {
      return NextResponse.json({ error: "PIN salah." }, { status: 401 });
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
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
