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

export interface KasRtCategoryAdminRow {
  id: string;
  name: string;
  applies_to: "income" | "expense" | "both";
  title_template: string;
  desc_template: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

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
 * GET /api/admin/kas-rt-categories
 *
 * Returns all categories for the default tenant/community (including inactive).
 * Ordered by applies_to then sort_order then name.
 * Requires admin role.
 */
export async function GET() {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const tenantUser = await requireAdmin(supabase, session.userId);
  if (!tenantUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("kas_rt_transaction_categories")
    .select(
      "id, name, applies_to, title_template, desc_template, sort_order, is_active, created_at",
    )
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .eq("community_id", DEFAULT_COMMUNITY_ID)
    .order("applies_to", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("[admin/kas-rt-categories] GET error:", error);
    return NextResponse.json(
      { error: "Gagal memuat kategori kas RT." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    categories: (data ?? []) as KasRtCategoryAdminRow[],
  });
}

/**
 * POST /api/admin/kas-rt-categories
 *
 * Creates a new category.
 * Body: { name, applies_to, title_template?, desc_template?, sort_order?, is_active? }
 * Requires admin role.
 * Sends notifications to all admin users.
 */
export async function POST(request: NextRequest) {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const tenantUser = await requireAdmin(supabase, session.userId);
  if (!tenantUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    applies_to?: string;
    title_template?: string;
    desc_template?: string;
    is_active?: boolean;
  };

  const name = body.name?.trim() ?? "";
  if (!name) {
    return NextResponse.json(
      { error: "Nama kategori wajib diisi." },
      { status: 400 },
    );
  }
  if (name.length > 100) {
    return NextResponse.json(
      { error: "Nama kategori maksimal 100 karakter." },
      { status: 400 },
    );
  }

  if (!isValidAppliesTo(body.applies_to)) {
    return NextResponse.json(
      {
        error:
          "Nilai 'berlaku untuk' tidak valid. Pilih income, expense, atau both.",
      },
      { status: 400 },
    );
  }

  const titleTemplate = body.title_template?.trim() ?? "";
  const descTemplate = body.desc_template?.trim() ?? "";

  const isActive = body.is_active !== false; // default true

  const { data: maxRow } = await supabase
    .from("kas_rt_transaction_categories")
    .select("sort_order")
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .eq("community_id", DEFAULT_COMMUNITY_ID)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const autoSortOrder = ((maxRow?.sort_order as number) ?? 0) + 10;

  const { data, error } = await supabase
    .from("kas_rt_transaction_categories")
    .insert({
      tenant_id: DEFAULT_TENANT_ID,
      community_id: DEFAULT_COMMUNITY_ID,
      name,
      applies_to: body.applies_to,
      title_template: titleTemplate,
      desc_template: descTemplate,
      sort_order: autoSortOrder,
      is_active: isActive,
    })
    .select(
      "id, name, applies_to, title_template, desc_template, sort_order, is_active, created_at",
    )
    .single();

  if (error) {
    console.error("[admin/kas-rt-categories] POST insert error:", error);
    if (error.code === "23505") {
      return NextResponse.json(
        { error: `Kategori dengan nama "${name}" sudah ada.` },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Gagal menyimpan kategori." },
      { status: 500 },
    );
  }

  // Send notification about the new category
  await sendCategoryNotification(
    supabase,
    DEFAULT_TENANT_ID,
    session.userId,
    data.id,
    data.name,
    "created",
  );

  return NextResponse.json(
    { category: data as KasRtCategoryAdminRow },
    { status: 201 },
  );
}
