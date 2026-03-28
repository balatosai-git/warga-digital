import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { normalizeWaNumber } from "@/lib/phone-utils";

/**
 * POST /api/profile/check/wa-number
 * Check if a WhatsApp number is available (not taken by another user)
 * Excludes the current user's own WhatsApp number
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { waNumber } = body;

    if (!waNumber || typeof waNumber !== "string") {
      return NextResponse.json(
        { error: "Nomor WhatsApp harus disediakan" },
        { status: 400 },
      );
    }

    const trimmed = waNumber.trim();

    // Normalize the WhatsApp number
    const normalized = normalizeWaNumber(trimmed);
    if (!normalized) {
      return NextResponse.json(
        { available: false, error: "Nomor WhatsApp tidak valid" },
        { status: 400 },
      );
    }

    // Get current user session to exclude their own WhatsApp number
    const session = await getSessionFromCookie();
    const currentUserId = session?.userId;

    const supabase = createServerClient();

    // Check if WhatsApp number exists
    const { data: existing, error: checkError } = await supabase
      .from("users")
      .select("id")
      .eq("wa_number", normalized)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      console.error("[Check WA Number] Supabase error:", checkError);
      return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
    }

    // If found and it's not the current user's number, it's taken
    if (existing && existing.id !== currentUserId) {
      return NextResponse.json({ available: false });
    }

    return NextResponse.json({ available: true });
  } catch (err) {
    console.error("[Check WA Number] Error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
