import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { hashPin } from "@/lib/crypto";
import { createSession, setSessionCookie } from "@/lib/auth/session";

const PIN_REGEX = /^\d{4}$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, pin, confirmPin } = body;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "User tidak valid" }, { status: 400 });
    }

    const pinStr = String(pin ?? "").trim();
    const confirmStr = String(confirmPin ?? "").trim();

    if (!PIN_REGEX.test(pinStr)) {
      return NextResponse.json(
        { error: "PIN harus 4 digit angka" },
        { status: 400 },
      );
    }

    if (pinStr !== confirmStr) {
      return NextResponse.json(
        { error: "PIN dan konfirmasi PIN tidak sama" },
        { status: 400 },
      );
    }

    const supabase = createServerClient();

    const { data: user, error: fetchError } = await supabase
      .from("users")
      .select("id, full_name, pin_hash")
      .eq("id", userId)
      .single();

    if (fetchError || !user) {
      return NextResponse.json(
        { error: "User tidak ditemukan" },
        { status: 404 },
      );
    }

    if (user.pin_hash) {
      return NextResponse.json(
        { error: "PIN sudah diatur. Gunakan halaman login." },
        { status: 400 },
      );
    }

    const pinHash = hashPin(pinStr);
    const now = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("users")
      .update({
        pin_hash: pinHash,
        status: "ACTIVE",
        wa_verified_at: now,
      })
      .eq("id", userId);

    if (updateError) {
      console.error("[SetPin] Update error:", updateError);
      return NextResponse.json(
        { error: "Gagal menyimpan PIN" },
        { status: 500 },
      );
    }

    const { data: primaryHouse } = await supabase
      .from("user_houses")
      .select("house_id")
      .eq("user_id", userId)
      .eq("is_primary", true)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (primaryHouse?.house_id) {
      const { data: familyRows } = await supabase
        .from("user_houses")
        .select("user_id")
        .eq("house_id", primaryHouse.house_id)
        .eq("status", "ACTIVE")
        .neq("user_id", userId);

      const familyUserIds = (familyRows ?? []).map((r) => r.user_id);
      if (familyUserIds.length > 0) {
        await supabase
          .from("users")
          .update({
            pin_hash: pinHash,
            status: "ACTIVE",
            wa_verified_at: now,
          })
          .in("id", familyUserIds);
      }
    }

    const jwt = await createSession(userId);
    await setSessionCookie(jwt);

    return NextResponse.json({
      success: true,
      userId: user.id,
      fullName: user.full_name,
    });
  } catch (err) {
    console.error("[SetPin] Error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
