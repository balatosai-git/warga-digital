"use server";

import { NextResponse, type NextRequest } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import {
  DEFAULT_TENANT_ID,
  DEFAULT_COMMUNITY_ID,
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

  return NextResponse.json({ categories: (data ?? []) as KasRtCategoryAdminRow[] });
}

/**
 * POST /api/admin/kas-rt-categories
 *
 * Creates a new category.
 * Body: { name, applies_to, title_template?, desc_template?, sort_order?, is_active? }
 * Requires admin role.
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
    sort_order?: number;
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
      { error: "Nilai 'berlaku untuk' tidak valid. Pilih income, expense, atau both." },
      { status: 400 },
    );
  }

  const titleTemplate = body.title_template?.trim() ?? "";
  const descTemplate = body.desc_template?.trim() ?? "";

  const sortOrder =
    typeof body.sort_order === "number" && Number.isFinite(body.sort_order)
      ? Math.round(body.sort_order)
      : 0;

  const isActive = body.is_active !== false; // default true

  const { data, error } = await supabase
    .from("kas_rt_transaction_categories")
    .insert({
      tenant_id: DEFAULT_TENANT_ID,
      community_id: DEFAULT_COMMUNITY_ID,
      name,
      applies_to: body.applies_to,
      title_template: titleTemplate,
      desc_template: descTemplate,
      sort_order: sortOrder,
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

  return NextResponse.json(
    { category: data as KasRtCategoryAdminRow },
    { status: 201 },
  );
}
