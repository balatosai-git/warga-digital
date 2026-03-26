import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { uuidv7 } from "uuidv7";
import {
  DEFAULT_TENANT_ID,
  DEFAULT_COMMUNITY_ID,
  DEFAULT_ROLE_WARGA_ID,
} from "@/lib/constants/seed-ids";
import { parseBlokRumah } from "@/lib/blok-rumah";

/**
 * Find or create house (by canonical blok_rumah), ensure tenant_users + user_houses (OWNER, primary),
 * assign default WARGA role. All mandatory data for first-time use is set here.
 * See blueprints/registration-blok-rumah-house-provisioning.md
 */
async function provisionHouseAndTenantMembership(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  blokRumah: string
): Promise<{ houseId: string }> {
  const tenantId = DEFAULT_TENANT_ID;
  const communityId = DEFAULT_COMMUNITY_ID;

  let houseId: string;

  const { data: existingHouse } = await supabase
    .from("houses")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("community_id", communityId)
    .eq("blok_rumah", blokRumah)
    .maybeSingle();

  if (existingHouse?.id) {
    houseId = existingHouse.id;
  } else {
    const newHouse = await supabase
      .from("houses")
      .insert({
        id: uuidv7(),
        tenant_id: tenantId,
        community_id: communityId,
        name: blokRumah,
        blok_rumah: blokRumah,
        status: "PRIBADI",
        total_residents: 0,
        is_active: true,
        created_by: userId,
      })
      .select("id")
      .single();

    if (newHouse.error) {
      console.error("[Register] Insert house error:", newHouse.error);
      throw new Error("Gagal membuat data rumah");
    }
    houseId = newHouse.data.id;
  }

  const { data: tenantUser, error: tuError } = await supabase
    .from("tenant_users")
    .upsert(
      {
        tenant_id: tenantId,
        user_id: userId,
        status: "ACTIVE",
      },
      { onConflict: "tenant_id,user_id" }
    )
    .select("id")
    .single();

  if (tuError || !tenantUser?.id) {
    console.error("[Register] Upsert tenant_users error:", tuError);
    throw new Error("Gagal mendaftarkan ke tenant");
  }

  const { data: existingPrimary } = await supabase
    .from("user_houses")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .eq("is_primary", true)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (!existingPrimary) {
    await supabase.from("user_houses").insert({
      id: uuidv7(),
      tenant_id: tenantId,
      user_id: userId,
      house_id: houseId,
      relationship: "OWNER",
      is_primary: true,
      status: "ACTIVE",
      created_by: userId,
    });
  }

  const { error: roleErr } = await supabase.from("tenant_user_roles").insert({
    tenant_user_id: tenantUser.id,
    role_id: DEFAULT_ROLE_WARGA_ID,
  });
  if (roleErr && roleErr.code !== "23505") {
    console.error("[Register] Insert tenant_user_roles error:", roleErr);
  }

  return { houseId };
}

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      fullName,
      waNumber,
      blokRumah: blokRumahRaw,
      username: usernameRaw,
      requestToJoinExisting: requestToJoinExistingRaw,
    } = body;
    const requestToJoinExisting = requestToJoinExistingRaw === true;

    if (!fullName || typeof fullName !== "string") {
      return NextResponse.json(
        { error: "Nama lengkap wajib" },
        { status: 400 }
      );
    }

    const trimmedName = fullName.trim();
    if (trimmedName.length < 2) {
      return NextResponse.json(
        { error: "Nama lengkap minimal 2 karakter" },
        { status: 400 }
      );
    }

    const hasWa = waNumber != null && typeof waNumber === "string" && waNumber.trim().length > 0;
    const hasUsername = usernameRaw != null && typeof usernameRaw === "string" && usernameRaw.trim().length > 0;
    if (!hasWa && !hasUsername) {
      return NextResponse.json(
        { error: "Isi salah satu: nomor WhatsApp atau username untuk login" },
        { status: 400 }
      );
    }

    let username: string | null = null;
    if (hasUsername) {
      const u = String(usernameRaw).trim();
      if (!USERNAME_REGEX.test(u)) {
        return NextResponse.json(
          { error: "Username 3–30 karakter, huruf/angka/underscore saja" },
          { status: 400 }
        );
      }
      username = u;
    }

    let normalized: string | null = null;
    if (hasWa) {
      const raw = String(waNumber).trim();
      normalized = raw.replace(/\D/g, "").startsWith("62")
        ? "+" + raw.replace(/\D/g, "")
        : raw.startsWith("0")
          ? "+62" + raw.replace(/\D/g, "").slice(1)
          : "+62" + raw.replace(/\D/g, "");
      const digits = normalized.replace(/\D/g, "");
      if (digits.length < 10 || !/^8[1-9]/.test(digits.slice(digits.startsWith("62") ? 2 : 0))) {
        return NextResponse.json(
          { error: "Format nomor WhatsApp tidak valid" },
          { status: 400 }
        );
      }
    }

    if (blokRumahRaw == null || typeof blokRumahRaw !== "string" || !blokRumahRaw.trim()) {
      return NextResponse.json(
        { error: "Blok rumah wajib diisi" },
        { status: 400 }
      );
    }
    const { normalized: blokRumah, error: blokError } = parseBlokRumah(blokRumahRaw);
    if (blokError) {
      return NextResponse.json({ error: blokError }, { status: 400 });
    }

    const supabase = createServerClient();

    let existingUser: { id: string } | null = null;
    if (normalized) {
      const { data } = await supabase
        .from("users")
        .select("id")
        .eq("wa_number", normalized)
        .maybeSingle();
      existingUser = data;
    }
    if (!existingUser && username) {
      const { data: rows } = await supabase.rpc("get_user_by_username_lower", {
        login_input: username,
      });
      if (Array.isArray(rows) && rows.length > 0 && rows[0]?.id) {
        existingUser = { id: rows[0].id };
      }
    }

    let userId: string;

    if (existingUser?.id) {
      userId = existingUser.id;
      const updatePayload: { full_name: string; username?: string | null; wa_number?: string | null } = { full_name: trimmedName };
      if (username !== null) updatePayload.username = username;
      if (normalized !== null) updatePayload.wa_number = normalized;
      const { error: updateErr } = await supabase
        .from("users")
        .update(updatePayload)
        .eq("id", userId);
      if (updateErr?.code === "23505") {
        return NextResponse.json({ error: "Username sudah dipakai" }, { status: 400 });
      }
      if (updateErr) {
        console.error("[Register] Update user error:", updateErr);
        return NextResponse.json({ error: "Gagal memperbarui data" }, { status: 500 });
      }
    } else {
      const newUser = await supabase
        .from("users")
        .insert({
          id: uuidv7(),
          full_name: trimmedName,
          wa_number: normalized ?? undefined,
          username: username ?? undefined,
          status: "INACTIVE",
        })
        .select("id")
        .single();

      if (newUser.error) {
        console.error("[Register] Insert user error:", newUser.error);
        if (newUser.error.code === "23505") {
          return NextResponse.json(
            { error: "Nomor WhatsApp atau username sudah terdaftar" },
            { status: 400 }
          );
        }
        return NextResponse.json(
          {
            error: "Gagal mendaftar",
            detail: process.env.NODE_ENV !== "production" ? newUser.error.message : undefined,
          },
          { status: 500 }
        );
      }
      userId = newUser.data!.id;
    }

    const tenantId = DEFAULT_TENANT_ID;
    const communityId = DEFAULT_COMMUNITY_ID;

    const { data: existingHouse } = await supabase
      .from("houses")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("community_id", communityId)
      .eq("blok_rumah", blokRumah)
      .maybeSingle();

    if (requestToJoinExisting && existingHouse?.id) {
      const houseId = existingHouse.id;

      const { data: tenantUser, error: tuError } = await supabase
        .from("tenant_users")
        .upsert(
          { tenant_id: tenantId, user_id: userId, status: "ACTIVE" },
          { onConflict: "tenant_id,user_id" }
        )
        .select("id")
        .single();

      if (tuError || !tenantUser?.id) {
        console.error("[Register] Upsert tenant_users error:", tuError);
        return NextResponse.json(
          { error: "Gagal mendaftarkan ke tenant" },
          { status: 500 }
        );
      }

      const { error: roleErr } = await supabase.from("tenant_user_roles").insert({
        tenant_user_id: tenantUser.id,
        role_id: DEFAULT_ROLE_WARGA_ID,
      });
      if (roleErr && roleErr.code !== "23505") {
        console.error("[Register] Insert tenant_user_roles error:", roleErr);
      }

      const requestId = uuidv7();
      const { error: reqErr } = await supabase.from("house_join_requests").insert({
        id: requestId,
        house_id: houseId,
        requester_user_id: userId,
        status: "PENDING",
      });

      if (reqErr) {
        console.error("[Register] Insert house_join_requests error:", reqErr);
        return NextResponse.json(
          { error: "Gagal mengirim permintaan bergabung" },
          { status: 500 }
        );
      }

      const { data: ownerRow } = await supabase
        .from("user_houses")
        .select("user_id")
        .eq("house_id", houseId)
        .eq("relationship", "OWNER")
        .eq("status", "ACTIVE")
        .limit(1)
        .maybeSingle();

      const { data: houseRow } = await supabase
        .from("houses")
        .select("created_by")
        .eq("id", houseId)
        .single();

      const userIdsToFetch = new Set<string>();
      if (ownerRow?.user_id) userIdsToFetch.add(ownerRow.user_id);
      if (houseRow?.created_by) userIdsToFetch.add(houseRow.created_by);
      let ownerFullName = "—";
      let createdByFullName = "—";
      if (userIdsToFetch.size > 0) {
        const { data: users } = await supabase
          .from("users")
          .select("id, full_name")
          .in("id", Array.from(userIdsToFetch));
        const userMap = new Map((users ?? []).map((u) => [u.id, u.full_name ?? "—"]));
        if (ownerRow?.user_id) ownerFullName = userMap.get(ownerRow.user_id) ?? "—";
        if (houseRow?.created_by) createdByFullName = userMap.get(houseRow.created_by) ?? "—";
      }

      if (ownerRow?.user_id) {
        const { error: notifErr } = await supabase.from("notifications").insert({
          tenant_id: tenantId,
          recipient_user_id: ownerRow.user_id,
          actor_user_id: userId,
          type: "RUMAH",
          priority: "NORMAL",
          title: "Permintaan Bergabung Rumah",
          body: `${trimmedName} meminta bergabung ke rumah ${blokRumah}.`,
          action_url: "/profil",
          entity_table: "house_join_requests",
          entity_id: requestId,
          dedupe_key: `house_join_request:${requestId}:owner`,
          metadata: {
            houseId,
            blokRumah,
            requesterUserId: userId,
            requestId,
          },
          created_by: userId,
        });
        if (notifErr) {
          console.error("[Register] Insert owner notification error:", notifErr);
        }
      }

      const { error: _b1 } = await supabase.from("user_badges").insert({ user_id: userId, badge_id: 1 });
      if (_b1 && _b1.code !== "23505") console.error("[Register] user_badges insert:", _b1);
      const { data: user } = await supabase
        .from("users")
        .select("id, full_name")
        .eq("id", userId)
        .single();

      if (!user) {
        return NextResponse.json(
          { error: "User tidak ditemukan" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        requiresApproval: true,
        userId: user.id,
        fullName: user.full_name,
        blokRumah,
        requestId,
        ownerFullName,
        createdByFullName,
      });
    }

    let houseId: string;
    try {
      const provisioned = await provisionHouseAndTenantMembership(supabase, userId, blokRumah);
      houseId = provisioned.houseId;
    } catch (err) {
      console.error("[Register] Provision house/tenant error:", err);
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Gagal menyimpan blok rumah" },
        { status: 500 }
      );
    }

    const { error: _b1 } = await supabase.from("user_badges").insert({ user_id: userId, badge_id: 1 });
    if (_b1 && _b1.code !== "23505") console.error("[Register] user_badges badge 1:", _b1);
    const { error: _b2 } = await supabase.from("user_badges").insert({ user_id: userId, badge_id: 2 });
    if (_b2 && _b2.code !== "23505") console.error("[Register] user_badges badge 2:", _b2);
    const { data: user } = await supabase
      .from("users")
      .select("id, full_name")
      .eq("id", userId)
      .single();

    if (!user) {
      return NextResponse.json(
        { error: "User tidak ditemukan" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      userId: user.id,
      fullName: user.full_name,
      houseId,
      blokRumah,
    });
  } catch (err) {
    console.error("[Register] Error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}
