"use server";

import { NextResponse, type NextRequest } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import {
  DEFAULT_TENANT_ID,
  DEFAULT_COMMUNITY_ID,
  ROLE_IDS_ADMIN,
} from "@/lib/constants/seed-ids";
import { requireAdmin } from "@/lib/auth/admin-guard";

const VALID_APPLIES_TO = ["income", "expense", "both"] as const;
type AppliesTo = (typeof VALID_APPLIES_TO)[number];

function isValidAppliesTo(v: unknown): v is AppliesTo {
  return VALID_APPLIES_TO.includes(v as AppliesTo);
}

// ── Notification helper ───────────────────────────────────────────────────────

async function sendCategoryNotification(
  supabase: ReturnType<typeof createServerClient>,
  tenantId: string,
  actorUserId: string,
  categoryId: string,
  categoryName: string,
  action: "created" | "updated" | "deleted",
) {
  try {
    const { data: tenantUsers, error: userFetchErr } = await supabase
      .from("tenant_users")
      .select("id, user_id")
      .eq("tenant_id", tenantId)
      .eq("status", "ACTIVE");

    if (userFetchErr || !tenantUsers?.length) {
      console.error(
        "[Kas RT Categories] Fetch tenant users error:",
        userFetchErr,
      );
      return;
    }

    // Get admin users (those with admin roles)
    const adminUserIds = new Set<string>();
    for (const tenantUser of tenantUsers) {
      const { data: roles } = await supabase
        .from("tenant_user_roles")
        .select("id")
        .eq("tenant_user_id", tenantUser.id)
        .in("role_id", ROLE_IDS_ADMIN)
        .is("revoked_at", null)
        .limit(1);

      if (roles?.length) {
        adminUserIds.add(tenantUser.user_id);
      }
    }

    if (adminUserIds.size === 0) {
      return;
    }

    const titleMap = {
      created: "Kategori Kas RT Baru",
      updated: "Kategori Kas RT Diperbarui",
      deleted: "Kategori Kas RT Dihapus",
    };

    const notificationRows = Array.from(adminUserIds).map(
      (recipientUserId) => ({
        tenant_id: tenantId,
        recipient_user_id: recipientUserId,
        actor_user_id: actorUserId,
        type: "KAS_RT",
        priority: "NORMAL",
        title: titleMap[action],
        body: `Kategori "${categoryName.trim()}"`,
        action_url: "/admin/kas-rt-categories",
        entity_table: "kas_rt_transaction_categories",
        entity_id: categoryId,
        dedupe_key: `kas_rt_category:${categoryId}:${action}:to:${recipientUserId}`,
        metadata: {
          categoryId,
          categoryName,
          action,
        },
        created_by: actorUserId,
      }),
    );

    const { error: notifErr } = await supabase
      .from("notifications")
      .insert(notificationRows);

    if (notifErr) {
      console.error(
        "[Kas RT Categories] Insert notifications error:",
        notifErr,
      );
    }
  } catch (error) {
    console.error("[Kas RT Categories] Unexpected notification error:", error);
  }
}

/**
 * PATCH /api/admin/kas-rt-categories/[id]
 *
 * Partially updates a category.
 * Body: { name?, applies_to?, title_template?, desc_template?, sort_order?, is_active? }
 * Requires admin role.
 * Sends notifications to all admin users.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const tenantUser = await requireAdmin(supabase, session.userId);
  if (!tenantUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    applies_to?: string;
    title_template?: string;
    desc_template?: string;
    sort_order?: number;
    is_active?: boolean;
  };

  // Build update payload from whichever fields are provided
  const patch: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json(
        { error: "Nama kategori tidak boleh kosong." },
        { status: 400 },
      );
    }
    if (name.length > 100) {
      return NextResponse.json(
        { error: "Nama kategori maksimal 100 karakter." },
        { status: 400 },
      );
    }
    patch.name = name;
  }

  if (body.applies_to !== undefined) {
    if (!isValidAppliesTo(body.applies_to)) {
      return NextResponse.json(
        {
          error:
            "Nilai 'berlaku untuk' tidak valid. Pilih income, expense, atau both.",
        },
        { status: 400 },
      );
    }
    patch.applies_to = body.applies_to;
  }

  if (body.title_template !== undefined) {
    patch.title_template = body.title_template.trim();
  }

  if (body.desc_template !== undefined) {
    patch.desc_template = body.desc_template.trim();
  }

  if (body.sort_order !== undefined) {
    if (!Number.isFinite(body.sort_order)) {
      return NextResponse.json(
        { error: "Urutan tampil harus berupa angka." },
        { status: 400 },
      );
    }
    patch.sort_order = Math.round(body.sort_order);
  }

  if (body.is_active !== undefined) {
    patch.is_active = Boolean(body.is_active);
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: "Tidak ada perubahan yang dikirim." },
      { status: 400 },
    );
  }

  // Fetch existing category to get name for notification
  const { data: existing, error: fetchError } = await supabase
    .from("kas_rt_transaction_categories")
    .select("id, name")
    .eq("id", id)
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .eq("community_id", DEFAULT_COMMUNITY_ID)
    .maybeSingle();

  if (fetchError) {
    console.error("[admin/kas-rt-categories] PATCH fetch error:", fetchError);
    return NextResponse.json(
      { error: "Gagal memverifikasi kategori." },
      { status: 500 },
    );
  }

  if (!existing) {
    return NextResponse.json(
      { error: "Kategori tidak ditemukan." },
      { status: 404 },
    );
  }

  const { data, error } = await supabase
    .from("kas_rt_transaction_categories")
    .update(patch)
    .eq("id", id)
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .eq("community_id", DEFAULT_COMMUNITY_ID)
    .select(
      "id, name, applies_to, title_template, desc_template, sort_order, is_active, created_at",
    )
    .single();

  if (error) {
    console.error("[admin/kas-rt-categories] PATCH error:", error);
    if (error.code === "23505") {
      return NextResponse.json(
        { error: `Kategori dengan nama tersebut sudah ada.` },
        { status: 409 },
      );
    }
    if (error.code === "PGRST116") {
      return NextResponse.json(
        { error: "Kategori tidak ditemukan." },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: "Gagal memperbarui kategori." },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Kategori tidak ditemukan." },
      { status: 404 },
    );
  }

  // Send notification about the update
  await sendCategoryNotification(
    supabase,
    DEFAULT_TENANT_ID,
    session.userId,
    data.id,
    data.name,
    "updated",
  );

  return NextResponse.json({ category: data });
}

/**
 * DELETE /api/admin/kas-rt-categories/[id]
 *
 * Permanently deletes a category.
 * Requires admin role.
 * Sends notifications to all admin users.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const tenantUser = await requireAdmin(supabase, session.userId);
  if (!tenantUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });
  }

  // Confirm the category belongs to this tenant/community before deleting
  const { data: existing, error: fetchError } = await supabase
    .from("kas_rt_transaction_categories")
    .select("id, name")
    .eq("id", id)
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .eq("community_id", DEFAULT_COMMUNITY_ID)
    .maybeSingle();

  if (fetchError) {
    console.error("[admin/kas-rt-categories] DELETE fetch error:", fetchError);
    return NextResponse.json(
      { error: "Gagal memverifikasi kategori." },
      { status: 500 },
    );
  }

  if (!existing) {
    return NextResponse.json(
      { error: "Kategori tidak ditemukan." },
      { status: 404 },
    );
  }

  const { error: deleteError } = await supabase
    .from("kas_rt_transaction_categories")
    .delete()
    .eq("id", id)
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .eq("community_id", DEFAULT_COMMUNITY_ID);

  if (deleteError) {
    console.error("[admin/kas-rt-categories] DELETE error:", deleteError);
    return NextResponse.json(
      { error: "Gagal menghapus kategori." },
      { status: 500 },
    );
  }

  // Send notification about the deletion
  await sendCategoryNotification(
    supabase,
    DEFAULT_TENANT_ID,
    session.userId,
    existing.id,
    existing.name,
    "deleted",
  );

  return NextResponse.json({ deleted: true, id, name: existing.name });
}
