"use server";

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import {
  DEFAULT_TENANT_ID,
  DEFAULT_COMMUNITY_ID,
  ROLE_IDS_CAN_SUBMIT_KAS_RT,
} from "@/lib/constants/seed-ids";

// ── Auth helper ───────────────────────────────────────────────────────────────

async function requireKasRtRole(): Promise<
  { userId: string } | NextResponse
> {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json(
      { message: "Anda harus masuk untuk melakukan tindakan ini." },
      { status: 401 },
    );
  }

  const supabase = createServerClient();

  const { data: tenantUser } = await supabase
    .from("tenant_users")
    .select("id")
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .eq("user_id", session.userId)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (!tenantUser) {
    return NextResponse.json({ message: "Akses ditolak." }, { status: 403 });
  }

  const { data: roleAssignments } = await supabase
    .from("tenant_user_roles")
    .select("id")
    .eq("tenant_user_id", tenantUser.id)
    .in("role_id", ROLE_IDS_CAN_SUBMIT_KAS_RT)
    .is("revoked_at", null);

  if (!roleAssignments?.length) {
    return NextResponse.json(
      { message: "Anda tidak memiliki izin untuk mengelola transaksi kas RT." },
      { status: 403 },
    );
  }

  return { userId: session.userId };
}

// ── PATCH /api/kas-rt/transactions/[id] ──────────────────────────────────────
//
// Edit an existing transaction. Only fields present in the body are updated.
// Authorised roles: same as POST (ROLE_IDS_CAN_SUBMIT_KAS_RT).

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireKasRtRole();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { message: "ID transaksi tidak valid." },
      { status: 400 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    title?: string;
    amount?: number;
    type?: string;
    date?: string;
    reference?: string | null;
    details?: string | null;
    category?: string | null;
  };

  // Build partial update payload
  const patch: Record<string, unknown> = {};

  if (body.title !== undefined) {
    const title = body.title.trim();
    if (!title) {
      return NextResponse.json(
        { message: "Judul transaksi tidak boleh kosong." },
        { status: 400 },
      );
    }
    patch.title = title;
  }

  if (body.amount !== undefined) {
    if (
      typeof body.amount !== "number" ||
      !Number.isFinite(body.amount) ||
      body.amount <= 0
    ) {
      return NextResponse.json(
        { message: "Nominal transaksi tidak valid." },
        { status: 400 },
      );
    }
    patch.amount = body.amount;
  }

  if (body.type !== undefined) {
    if (body.type !== "income" && body.type !== "expense") {
      return NextResponse.json(
        { message: "Jenis transaksi tidak valid." },
        { status: 400 },
      );
    }
    patch.type = body.type;
  }

  if (body.date !== undefined) {
    if (!body.date) {
      return NextResponse.json(
        { message: "Tanggal transaksi wajib diisi." },
        { status: 400 },
      );
    }
    const parsed = new Date(body.date);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json(
        { message: "Format tanggal tidak valid." },
        { status: 400 },
      );
    }
    patch.date = body.date;
  }

  if (body.reference !== undefined) {
    patch.reference = body.reference?.trim() || null;
  }

  if (body.details !== undefined) {
    patch.details = body.details?.trim() || null;
  }

  if (body.category !== undefined) {
    patch.category =
      body.category && body.category.trim() ? body.category.trim() : null;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { message: "Tidak ada perubahan yang dikirim." },
      { status: 400 },
    );
  }

  const supabase = createServerClient();

  // Verify the transaction belongs to this tenant/community and is not deleted
  const { data: existing, error: fetchError } = await supabase
    .from("kas_rt_transactions")
    .select("id")
    .eq("id", id)
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .eq("community_id", DEFAULT_COMMUNITY_ID)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchError) {
    console.error("[Kas RT] PATCH fetch error:", fetchError);
    return NextResponse.json(
      { message: "Gagal memverifikasi transaksi." },
      { status: 500 },
    );
  }

  if (!existing) {
    return NextResponse.json(
      { message: "Transaksi tidak ditemukan." },
      { status: 404 },
    );
  }

  const { data, error } = await supabase
    .from("kas_rt_transactions")
    .update(patch)
    .eq("id", id)
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .eq("community_id", DEFAULT_COMMUNITY_ID)
    .select(
      "id, title, amount, type, date, reference, details, category, created_at, created_by",
    )
    .single();

  if (error || !data) {
    console.error("[Kas RT] PATCH update error:", error);
    return NextResponse.json(
      { message: "Gagal memperbarui transaksi." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    id: data.id,
    title: data.title,
    amount: Number(data.amount),
    type: data.type,
    date: data.date,
    created_at: data.created_at,
    created_by: data.created_by,
    reference: data.reference ?? "",
    details: data.details ?? "",
    category: data.category ?? null,
    attachments: [],
  });
}

// ── DELETE /api/kas-rt/transactions/[id] ─────────────────────────────────────
//
// Soft-deletes a transaction by setting deleted_at = now().
// The record is retained for audit purposes and excluded from all public reads.

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireKasRtRole();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { message: "ID transaksi tidak valid." },
      { status: 400 },
    );
  }

  const supabase = createServerClient();

  // Verify the transaction exists, belongs to this tenant/community, and isn't already deleted
  const { data: existing, error: fetchError } = await supabase
    .from("kas_rt_transactions")
    .select("id, title")
    .eq("id", id)
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .eq("community_id", DEFAULT_COMMUNITY_ID)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchError) {
    console.error("[Kas RT] DELETE fetch error:", fetchError);
    return NextResponse.json(
      { message: "Gagal memverifikasi transaksi." },
      { status: 500 },
    );
  }

  if (!existing) {
    return NextResponse.json(
      { message: "Transaksi tidak ditemukan atau sudah dihapus." },
      { status: 404 },
    );
  }

  const { error: deleteError } = await supabase
    .from("kas_rt_transactions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .eq("community_id", DEFAULT_COMMUNITY_ID);

  if (deleteError) {
    console.error("[Kas RT] DELETE soft-delete error:", deleteError);
    return NextResponse.json(
      { message: "Gagal menghapus transaksi." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    deleted: true,
    id,
    title: existing.title,
  });
}
