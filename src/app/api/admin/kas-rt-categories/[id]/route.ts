"use server";

import { NextResponse, type NextRequest } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import {
  DEFAULT_TENANT_ID,
  DEFAULT_COMMUNITY_ID,
} from "@/lib/constants/seed-ids";
import { requireAdmin } from "@/lib/auth/admin-guard";

const VALID_APPLIES_TO = ["income", "expense", "both"] as const;
type AppliesTo = (typeof VALID_APPLIES_TO)[number];

function isValidAppliesTo(v: unknown): v is AppliesTo {
  return VALID_APPLIES_TO.includes(v as AppliesTo);
}

/**
 * PATCH /api/admin/kas-rt-categories/[id]
 *
 * Partially updates a category.
 * Body: { name?, applies_to?, title_template?, desc_template?, sort_order?, is_active? }
 * Requires admin role.
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

  return NextResponse.json({ category: data });
}

/**
 * DELETE /api/admin/kas-rt-categories/[id]
 *
 * Permanently deletes a category.
 * Requires admin role.
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

  return NextResponse.json({ deleted: true, id, name: existing.name });
}
