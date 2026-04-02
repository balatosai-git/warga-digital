import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { uuidv7 } from "uuidv7";
import { DEFAULT_ROLE_WARGA_ID } from "@/lib/constants/seed-ids";
import {
  normalizeWaNumber,
  validateNormalizedWaNumber,
} from "@/lib/phone-utils";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

/**
 * POST /api/auth/add-family-member
 *
 * Adds a new family member to the authenticated user's house.
 *
 * SECURITY FIX (2025-02-09):
 * Previously, `ownerUserId` was taken from the request body, allowing any
 * authenticated user to add members to ANY household by specifying a
 * different owner ID. This has been fixed to derive the owner identity
 * exclusively from the session cookie and verify house ownership.
 *
 * Body: { houseId?: string, fullName: string, username?: string, waNumber: string }
 * - houseId is optional; if omitted, the user's primary house is used.
 * - The caller MUST be an OWNER of the target house.
 */
export async function POST(request: NextRequest) {
  try {
    // ── 1. Authenticate the caller ─────────────────────────────────────────
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      fullName,
      username: usernameRaw,
      waNumber,
      houseId: bodyHouseId,
    } = body;

    // ── 2. Validate input ──────────────────────────────────────────────────
    if (
      !fullName ||
      typeof fullName !== "string" ||
      fullName.trim().length < 2
    ) {
      return NextResponse.json(
        { error: "Nama lengkap minimal 2 karakter" },
        { status: 400 },
      );
    }

    const trimmedName = fullName.trim();

    let usernameVal: string | null = null;
    if (
      usernameRaw != null &&
      typeof usernameRaw === "string" &&
      usernameRaw.trim()
    ) {
      const u = usernameRaw.trim();
      if (!USERNAME_REGEX.test(u)) {
        return NextResponse.json(
          { error: "Username 3–30 karakter, huruf/angka/underscore saja" },
          { status: 400 },
        );
      }
      usernameVal = u;
    }

    if (!waNumber || typeof waNumber !== "string" || !waNumber.trim()) {
      return NextResponse.json(
        { error: "Nomor WhatsApp wajib" },
        { status: 400 },
      );
    }
    const normalizedWa = normalizeWaNumber(waNumber.trim());
    const waError = validateNormalizedWaNumber(normalizedWa);
    if (waError) {
      return NextResponse.json({ error: waError }, { status: 400 });
    }

    const supabase = createServerClient();

    // ── 3. Verify house ownership ──────────────────────────────────────────
    // Derive the target house from the request or fall back to the caller's
    // primary house. In BOTH cases we verify the caller is an OWNER.
    let houseId: string;
    let tenantId: string;

    if (bodyHouseId && typeof bodyHouseId === "string") {
      // Caller specified a house — verify they own it
      const { data: ownerLink, error: ownerErr } = await supabase
        .from("user_houses")
        .select("house_id, tenant_id")
        .eq("user_id", session.userId)
        .eq("house_id", bodyHouseId)
        .eq("relationship", "OWNER")
        .eq("status", "ACTIVE")
        .maybeSingle();

      if (ownerErr) {
        console.error("[AddFamilyMember] House lookup error:", ownerErr);
        return NextResponse.json(
          { error: "Gagal memverifikasi rumah" },
          { status: 500 },
        );
      }

      if (!ownerLink) {
        return NextResponse.json(
          {
            error:
              "Rumah tidak ditemukan atau Anda bukan kepala keluarga di rumah ini.",
          },
          { status: 403 },
        );
      }

      houseId = ownerLink.house_id;
      tenantId = ownerLink.tenant_id;
    } else {
      // No house specified — use the caller's primary house
      const { data: ownerLink, error: ownerErr } = await supabase
        .from("user_houses")
        .select("house_id, tenant_id")
        .eq("user_id", session.userId)
        .eq("relationship", "OWNER")
        .eq("status", "ACTIVE")
        .order("is_primary", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ownerErr) {
        console.error(
          "[AddFamilyMember] Primary house lookup error:",
          ownerErr,
        );
        return NextResponse.json(
          { error: "Gagal memverifikasi rumah" },
          { status: 500 },
        );
      }

      if (!ownerLink) {
        return NextResponse.json(
          {
            error:
              "Anda bukan kepala keluarga. Hanya kepala keluarga yang dapat menambah anggota.",
          },
          { status: 403 },
        );
      }

      houseId = ownerLink.house_id;
      tenantId = ownerLink.tenant_id;
    }

    // ── 4. Create the new user ─────────────────────────────────────────────
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
          { status: 400 },
        );
      }
      console.error("[AddFamilyMember] Insert user error:", insertUserErr);
      return NextResponse.json(
        { error: "Gagal menambah anggota" },
        { status: 500 },
      );
    }

    // ── 5. Register user in the tenant ─────────────────────────────────────
    const { data: tenantUser, error: tuErr } = await supabase
      .from("tenant_users")
      .upsert(
        { tenant_id: tenantId, user_id: newUserId, status: "ACTIVE" },
        { onConflict: "tenant_id,user_id" },
      )
      .select("id")
      .single();

    if (tuErr || !tenantUser?.id) {
      console.error("[AddFamilyMember] Upsert tenant_users error:", tuErr);
      return NextResponse.json(
        { error: "Gagal mendaftarkan ke tenant" },
        { status: 500 },
      );
    }

    // ── 6. Assign default WARGA role ───────────────────────────────────────
    const { error: roleErr } = await supabase.from("tenant_user_roles").insert({
      tenant_user_id: tenantUser.id,
      role_id: DEFAULT_ROLE_WARGA_ID,
    });
    if (roleErr && roleErr.code !== "23505") {
      console.error("[AddFamilyMember] Insert role error:", roleErr);
    }

    // ── 7. Link user to the house as FAMILY member ─────────────────────────
    const { error: uhErr } = await supabase.from("user_houses").insert({
      id: uuidv7(),
      tenant_id: tenantId,
      user_id: newUserId,
      house_id: houseId,
      relationship: "FAMILY",
      is_primary: false,
      status: "ACTIVE",
      created_by: session.userId,
    });

    if (uhErr) {
      console.error("[AddFamilyMember] Insert user_houses error:", uhErr);
      return NextResponse.json(
        { error: "Gagal mengaitkan ke rumah" },
        { status: 500 },
      );
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
