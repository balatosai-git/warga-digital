import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { uuidv7 } from "uuidv7";
import { DEFAULT_TENANT_ID, DEFAULT_ROLE_WARGA_ID } from "@/lib/constants/seed-ids";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;
const WA_REGEX = /^(\+62|62|0)8[1-9][0-9]{6,10}$/;

function normalizeWaNumber(waNumber: string): string {
  const digits = String(waNumber ?? "").replace(/\D/g, "");
  if (digits.startsWith("62")) return "+" + digits;
  if (digits.startsWith("0")) return "+62" + digits.slice(1);
  return "+62" + digits;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ownerUserId, houseId, fullName, username, waNumber } = body;

    if (!ownerUserId || typeof ownerUserId !== "string") {
      return NextResponse.json({ error: "Pemilik rumah tidak valid" }, { status: 400 });
    }
    if (!houseId || typeof houseId !== "string") {
      return NextResponse.json({ error: "Rumah tidak valid" }, { status: 400 });
    }
    if (!fullName || typeof fullName !== "string" || fullName.trim().length < 2) {
      return NextResponse.json({ error: "Nama lengkap minimal 2 karakter" }, { status: 400 });
    }

    const trimmedName = fullName.trim();
    let usernameVal: string | null = null;
    if (username != null && typeof username === "string" && username.trim()) {
      const u = username.trim();
      if (!USERNAME_REGEX.test(u)) {
        return NextResponse.json(
          { error: "Username 3–30 karakter, huruf/angka/underscore saja" },
          { status: 400 }
        );
      }
      usernameVal = u;
    }

    if (!waNumber || typeof waNumber !== "string" || !waNumber.trim()) {
      return NextResponse.json({ error: "Nomor WhatsApp wajib" }, { status: 400 });
    }
    const normalizedWa = normalizeWaNumber(waNumber.trim());
    if (!WA_REGEX.test(normalizedWa.replace("+", ""))) {
      return NextResponse.json({ error: "Format nomor WhatsApp tidak valid" }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data: house, error: houseErr } = await supabase
      .from("houses")
      .select("id, tenant_id, community_id")
      .eq("id", houseId)
      .single();

    if (houseErr || !house) {
      return NextResponse.json({ error: "Rumah tidak ditemukan" }, { status: 404 });
    }

    const tenantId = house.tenant_id;

    const newUserId = uuidv7();
    const { error: insertUserErr } = await supabase.from("users").insert({
      id: newUserId,
      full_name: trimmedName,
      username: usernameVal ?? undefined,
      wa_number: normalizedWa,
      status: "INACTIVE",
    });

    if (insertUserErr) {
      if (insertUserErr.code === "23505") {
        return NextResponse.json(
          { error: "Username atau nomor WhatsApp sudah terdaftar" },
          { status: 400 }
        );
      }
      console.error("[AddFamilyMember] Insert user error:", insertUserErr);
      return NextResponse.json({ error: "Gagal menambah anggota" }, { status: 500 });
    }

    const { data: tenantUser, error: tuErr } = await supabase
      .from("tenant_users")
      .upsert(
        { tenant_id: tenantId, user_id: newUserId, status: "ACTIVE" },
        { onConflict: "tenant_id,user_id" }
      )
      .select("id")
      .single();

    if (tuErr || !tenantUser?.id) {
      console.error("[AddFamilyMember] Upsert tenant_users error:", tuErr);
      return NextResponse.json({ error: "Gagal mendaftarkan ke tenant" }, { status: 500 });
    }

    const { error: roleErr } = await supabase.from("tenant_user_roles").insert({
      tenant_user_id: tenantUser.id,
      role_id: DEFAULT_ROLE_WARGA_ID,
    });
    if (roleErr && roleErr.code !== "23505") {
      console.error("[AddFamilyMember] Insert role error:", roleErr);
    }

    const { error: uhErr } = await supabase.from("user_houses").insert({
      id: uuidv7(),
      tenant_id: tenantId,
      user_id: newUserId,
      house_id: houseId,
      relationship: "FAMILY",
      is_primary: false,
      status: "ACTIVE",
      created_by: ownerUserId,
    });

    if (uhErr) {
      console.error("[AddFamilyMember] Insert user_houses error:", uhErr);
      return NextResponse.json({ error: "Gagal mengaitkan ke rumah" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      userId: newUserId,
      fullName: trimmedName,
    });
  } catch (err) {
    console.error("[AddFamilyMember] Error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
