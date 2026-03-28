import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { DEFAULT_TENANT_ID } from "@/lib/constants/seed-ids";
import { getSessionFromCookie } from "@/lib/auth/session";
import { requireCanManageOrganisation } from "../../require-manage";
import { notifyAllActiveUsers } from "@/lib/notifications";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PATCH /api/organisation/roles/[id]
 * Body: { title?: string, sortOrder?: number }
 */
export async function PATCH(request: Request, context: RouteContext) {
  const forbidden = await requireCanManageOrganisation();
  if (forbidden) return forbidden;

  const { id } = await context.params;
  if (!id)
    return NextResponse.json(
      { message: "ID peran tidak valid." },
      { status: 400 },
    );

  try {
    const body = (await request.json()) as {
      title?: string;
      sortOrder?: number;
    };
    const updates: { title?: string; sort_order?: number; updated_at: string } =
      {
        updated_at: new Date().toISOString(),
      };
    if (typeof body.title === "string") {
      const t = body.title.trim();
      if (t) updates.title = t;
    }
    if (typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)) {
      updates.sort_order = body.sortOrder;
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("organisation_roles")
      .update(updates)
      .eq("id", id)
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .select("id, title, sort_order")
      .single();

    if (error) {
      // eslint-disable-next-line no-console
      console.error("[Organisation] PATCH role error:", error);
      return NextResponse.json(
        { message: "Gagal mengubah peran." },
        { status: 500 },
      );
    }
    if (!data) {
      return NextResponse.json(
        { message: "Peran tidak ditemukan." },
        { status: 404 },
      );
    }

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
        body: `Jabatan "${data.title}" di susunan pengurus RT telah diperbarui.`,
        action_url: "/organisasi",
        entity_table: "organisation_roles",
        entity_id: id,
        metadata: { roleTitle: data.title },
        created_by: session?.userId ?? null,
      },
      session?.userId,
    );

    return NextResponse.json({
      id: data.id,
      title: data.title,
      sortOrder: data.sort_order ?? 0,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[Organisation] PATCH role error:", error);
    return NextResponse.json(
      { message: "Gagal mengubah peran." },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/organisation/roles/[id]
 * Cascades to members.
 */
export async function DELETE(_request: Request, context: RouteContext) {
  const forbidden = await requireCanManageOrganisation();
  if (forbidden) return forbidden;

  const { id } = await context.params;
  if (!id)
    return NextResponse.json(
      { message: "ID peran tidak valid." },
      { status: 400 },
    );

  const supabase = createServerClient();
  const { error } = await supabase
    .from("organisation_roles")
    .delete()
    .eq("id", id)
    .eq("tenant_id", DEFAULT_TENANT_ID);

  if (error) {
    // eslint-disable-next-line no-console
    console.error("[Organisation] DELETE role error:", error);
    return NextResponse.json(
      { message: "Gagal menghapus peran." },
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
      entity_table: "organisation_roles",
      entity_id: id,
      created_by: session?.userId ?? null,
    },
    session?.userId,
  );

  return NextResponse.json({ ok: true });
}
