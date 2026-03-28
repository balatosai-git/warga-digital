import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/auth/session";

/**
 * POST /api/profile/check/username
 * Check if a username is available (not taken by another user)
 * Excludes the current user's own username
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username } = body;

    if (!username || typeof username !== "string") {
      return NextResponse.json(
        { error: "Username harus disediakan" },
        { status: 400 },
      );
    }

    const trimmed = username.trim();

    // Validation
    if (trimmed.length < 3 || trimmed.length > 30) {
      return NextResponse.json(
        { available: false, error: "Username harus 3–30 karakter" },
        { status: 400 },
      );
    }

    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      return NextResponse.json(
        {
          available: false,
          error: "Username hanya huruf, angka, dan underscore",
        },
        { status: 400 },
      );
    }

    // Get current user session to exclude their own username
    const session = await getSessionFromCookie();
    const currentUserId = session?.userId;

    const supabase = createServerClient();

    // Check if username exists (case-insensitive)
    const { data: existing, error: checkError } = await supabase
      .from("users")
      .select("id")
      .ilike("username", trimmed)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      console.error("[Check Username] Supabase error:", checkError);
      return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
    }

    // If found and it's not the current user's username, it's taken
    if (existing && existing.id !== currentUserId) {
      return NextResponse.json({ available: false });
    }

    return NextResponse.json({ available: true });
  } catch (err) {
    console.error("[Check Username] Error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
