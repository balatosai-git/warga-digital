import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { DEFAULT_TENANT_ID } from "@/lib/constants/seed-ids";
import { getSessionFromCookie } from "@/lib/auth/session";
import { requireCanManageOrganisation } from "../../require-manage";
import { notifyAllActiveUsers } from "@/lib/notifications";

const VACANT_LABEL = "Vacant";

type RouteContext = { params: Promise<{ id: string }> };

async function getUserDisplay(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
) {
  const { data: user, error: uErr } = await supabase
    .from("users")
    .select("id, full_name, wa_number, avatar_path")
    .eq("id", userId)
    .single();
  if (uErr || !user) return null;
  const baseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "") ?? "";
  const profilePictureUrl =
    user.avatar_path && baseUrl
      ? `${baseUrl}/storage/v1/object/public/avatars/${user.avatar_path}`
      : null;

  const { data: primaryLink } = await supabase
    .from("user_houses")
    .select("house_id")
    .eq("user_id", userId)
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .eq("status", "ACTIVE")
    .eq("is_primary", true)
    .limit(1)
    .maybeSingle();
  let blockName = "";
  if (primaryLink?.house_id) {
    const { data: house } = await supabase
      .from("houses")
      .select("blok_rumah")
      .eq("id", primaryLink.house_id)
      .single();
    if (house?.blok_rumah) blockName = house.blok_rumah;
  }

  return {
    user_id: user.id,
    full_name: user.full_name,
    block_name: blockName,
    whatsapp_number: user.wa_number ?? "",
    profile_picture_url: profilePictureUrl,
  };
}

/**
 * PATCH /api/organisation/members/[id]
 * Body: { userId: string | null }
 * - userId null or "vacant" → set slot to Vacant.
 * - userId = registered user id → update member to that user (sync from users).
 */
export async function PATCH(request: Request, context: RouteContext) {
  const forbidden = await requireCanManageOrganisation();
  if (forbidden) return forbidden;

  const { id } = await context.params;
  if (!id)
    return NextResponse.json(
      { message: "ID anggota tidak valid." },
      { status: 400 },
    );

  try {
    const body = (await request.json()) as { userId?: string | null };
    const rawUserId = body.userId;
    const isVacant =
      rawUserId === null ||
      rawUserId === undefined ||
      rawUserId === "" ||
      String(rawUserId).toLowerCase() === "vacant";

    const supabase = createServerClient();

    if (isVacant) {
      const { data, error } = await supabase
        .from("organisation_members")
        .update({
          user_id: null,
          full_name: VACANT_LABEL,
          block_name: "",
          whatsapp_number: "",
          profile_picture_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select(
          "id, user_id, full_name, block_name, whatsapp_number, profile_picture_url, sort_order",
        )
        .single();

      if (error) {
        // eslint-disable-next-line no-console
        console.error("[Organisation] PATCH member (vacant) error:", error);
        return NextResponse.json(
          { message: "Gagal mengubah anggota." },
          { status: 500 },
        );
      }
      if (!data)
        return NextResponse.json(
          { message: "Anggota tidak ditemukan." },
          { status: 404 },
        );

      // ── Notify all active users that the org structure changed ─────────────
      const session = await getSessionFromCookie();
      await notifyAllActiveUsers(
        supabase,
        {
          tenant_id: DEFAULT_TENANT_ID,
          actor_user_id: session?.userId ?? null,
          type: "ORGANISASI",
          priority: "NORMAL",
          title: "Pengurus RT Diperbarui",
          body: "Satu posisi di susunan pengurus RT telah dikosongkan.",
          action_url: "/organisasi",
          entity_table: "organisation_members",
          entity_id: id,
          created_by: session?.userId ?? null,
        },
        session?.userId,
      );

      return NextResponse.json({
        id: data.id,
        userId: data.user_id ?? null,
        fullName: data.full_name,
        blockName: data.block_name ?? "",
        whatsappNumber: data.whatsapp_number,
        profilePictureUrl: data.profile_picture_url ?? null,
        sortOrder: data.sort_order ?? 0,
      });
    }

    const userId = String(rawUserId).trim();
    const display = await getUserDisplay(supabase, userId);
    if (!display) {
      return NextResponse.json(
        {
          message:
            "Pengguna tidak ditemukan atau bukan warga terdaftar di komunitas ini.",
        },
        { status: 400 },
      );
    }

    const { data: inTenant } = await supabase
      .from("tenant_users")
      .select("id")
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .eq("user_id", userId)
      .eq("status", "ACTIVE")
      .maybeSingle();
    if (!inTenant) {
      return NextResponse.json(
        { message: "Pengguna bukan warga terdaftar di komunitas ini." },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("organisation_members")
      .update({
        user_id: display.user_id,
        full_name: display.full_name,
        block_name: display.block_name,
        whatsapp_number: display.whatsapp_number,
        profile_picture_url: display.profile_picture_url,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(
        "id, user_id, full_name, block_name, whatsapp_number, profile_picture_url, sort_order",
      )
      .single();

    if (error) {
      // eslint-disable-next-line no-console
      console.error("[Organisation] PATCH member error:", error);
      return NextResponse.json(
        { message: "Gagal mengubah anggota." },
        { status: 500 },
      );
    }
    if (!data)
      return NextResponse.json(
        { message: "Anggota tidak ditemukan." },
        { status: 404 },
      );

    // ── Notify all active users that the org structure changed ───────────────
    const session = await getSessionFromCookie();
    await notifyAllActiveUsers(
      supabase,
      {
        tenant_id: DEFAULT_TENANT_ID,
        actor_user_id: session?.userId ?? null,
        type: "ORGANISASI",
        priority: "NORMAL",
        title: "Pengurus RT Diperbarui",
        body: `${display.full_name} telah ditambahkan ke susunan pengurus RT.`,
        action_url: "/organisasi",
        entity_table: "organisation_members",
        entity_id: id,
        metadata: { assignedUserId: userId, fullName: display.full_name },
        created_by: session?.userId ?? null,
      },
      session?.userId,
    );

    return NextResponse.json({
      id: data.id,
      userId: data.user_id ?? null,
      fullName: data.full_name,
      blockName: data.block_name ?? "",
      whatsappNumber: data.whatsapp_number,
      profilePictureUrl: data.profile_picture_url ?? null,
      sortOrder: data.sort_order ?? 0,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[Organisation] PATCH member error:", error);
    return NextResponse.json(
      { message: "Gagal mengubah anggota." },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/organisation/members/[id]
 */
export async function DELETE(_request: Request, context: RouteContext) {
  const forbidden = await requireCanManageOrganisation();
  if (forbidden) return forbidden;

  const { id } = await context.params;
  if (!id)
    return NextResponse.json(
      { message: "ID anggota tidak valid." },
      { status: 400 },
    );

  const supabase = createServerClient();
  const { error } = await supabase
    .from("organisation_members")
    .delete()
    .eq("id", id);

  if (error) {
    // eslint-disable-next-line no-console
    console.error("[Organisation] DELETE member error:", error);
    return NextResponse.json(
      { message: "Gagal menghapus anggota." },
      { status: 500 },
    );
  }

  // ── Notify all active users that the org structure changed ─────────────────
  const session = await getSessionFromCookie();
  await notifyAllActiveUsers(
    supabase,
    {
      tenant_id: DEFAULT_TENANT_ID,
      actor_user_id: session?.userId ?? null,
      type: "ORGANISASI",
      priority: "NORMAL",
      title: "Pengurus RT Diperbarui",
      body: "Susunan pengurus RT telah diperbarui.",
      action_url: "/organisasi",
      entity_table: "organisation_members",
      entity_id: id,
      created_by: session?.userId ?? null,
    },
    session?.userId,
  );

  return NextResponse.json({ ok: true });
}
