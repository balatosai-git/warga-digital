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

async function requireKasRtRole(): Promise<{ userId: string } | NextResponse> {
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

// ── Notification helper ───────────────────────────────────────────────────────
//
// Sends a KAS_RT notification to every active authorized manager
// (ROLE_IDS_CAN_SUBMIT_KAS_RT) EXCEPT the user who performed the action.

async function sendKasRtNotification(
  supabase: ReturnType<typeof createServerClient>,
  tenantId: string,
  actorUserId: string,
  transactionId: string,
  transactionTitle: string,
  transactionAmount: number,
  transactionType: "income" | "expense",
  date: string,
  action: "UPDATED" | "DELETED",
) {
  try {
    // 1. Resolve actor's full name
    const { data: actorUser } = await supabase
      .from("users")
      .select("full_name")
      .eq("id", actorUserId)
      .maybeSingle();

    const actorFullName = actorUser?.full_name?.trim() || "Seseorang";

    // 2. Get all tenant_user row IDs that carry a kas-rt role (non-revoked)
    const { data: roleRows, error: roleErr } = await supabase
      .from("tenant_user_roles")
      .select("tenant_user_id")
      .in("role_id", ROLE_IDS_CAN_SUBMIT_KAS_RT)
      .is("revoked_at", null);

    if (roleErr) {
      console.error("[Kas RT] Fetch role rows error:", roleErr);
      return;
    }

    if (!roleRows?.length) return;

    const authorizedTenantUserIds = roleRows.map((r) => r.tenant_user_id);

    // 3. Resolve to user_ids: active, in this tenant, NOT the actor
    const { data: tenantUsers, error: tuErr } = await supabase
      .from("tenant_users")
      .select("user_id")
      .eq("tenant_id", tenantId)
      .eq("status", "ACTIVE")
      .in("id", authorizedTenantUserIds)
      .neq("user_id", actorUserId);

    if (tuErr) {
      console.error("[Kas RT] Fetch recipients error:", tuErr);
      return;
    }

    if (!tenantUsers?.length) return;

    const uniqueRecipients = Array.from(
      new Set(tenantUsers.map((r) => r.user_id).filter(Boolean)),
    );

    if (uniqueRecipients.length === 0) return;

    // 4. Build notification content
    const titleMap: Record<"UPDATED" | "DELETED", string> = {
      UPDATED:
        transactionType === "income"
          ? "Pemasukan Kas RT Diperbarui"
          : "Pengeluaran Kas RT Diperbarui",
      DELETED:
        transactionType === "income"
          ? "Pemasukan Kas RT Dihapus"
          : "Pengeluaran Kas RT Dihapus",
    };

    const actionLabelMap: Record<"UPDATED" | "DELETED", string> = {
      UPDATED: "Diperbarui oleh",
      DELETED: "Dihapus oleh",
    };

    const body =
      `${transactionTitle.trim()} – Rp ${Math.round(transactionAmount).toLocaleString("id-ID")}` +
      ` · ${actionLabelMap[action]}: ${actorFullName}`;

    // 5. Insert one notification row per recipient
    const notificationRows = uniqueRecipients.map((recipientUserId) => ({
      tenant_id: tenantId,
      recipient_user_id: recipientUserId,
      actor_user_id: actorUserId,
      type: "KAS_RT",
      priority: "NORMAL",
      title: titleMap[action],
      body,
      action_url: "/kas-rt",
      entity_table: "kas_rt_transactions",
      entity_id: transactionId,
      dedupe_key: `kas_rt_transaction:${transactionId}:${action}:to:${recipientUserId}`,
      metadata: {
        transactionId,
        transactionType,
        amount: transactionAmount,
        date,
        action,
        actorFullName,
      },
      created_by: actorUserId,
    }));

    const { error: notifErr } = await supabase
      .from("notifications")
      .insert(notificationRows);

    if (notifErr) {
      console.error("[Kas RT] Insert notifications error:", notifErr);
    }
  } catch (error) {
    console.error("[Kas RT] Unexpected notification error:", error);
  }
}

// ── PATCH /api/kas-rt/transactions/[id] ──────────────────────────────────────
//
// Edit an existing transaction. Only fields present in the body are updated.
// Authorised roles: ROLE_IDS_CAN_SUBMIT_KAS_RT.
// Notifies all other authorized managers with the editor's name.

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
    .select("id, title, amount, type, date")
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

  // Notify all other authorized managers about the edit
  await sendKasRtNotification(
    supabase,
    DEFAULT_TENANT_ID,
    auth.userId,
    data.id,
    data.title,
    Number(data.amount),
    data.type as "income" | "expense",
    data.date,
    "UPDATED",
  );

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
// Notifies all other authorized managers with the deleter's name.

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
    .select("id, title, amount, type, date")
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

  // Notify all other authorized managers about the deletion
  await sendKasRtNotification(
    supabase,
    DEFAULT_TENANT_ID,
    auth.userId,
    existing.id,
    existing.title,
    Number(existing.amount),
    existing.type as "income" | "expense",
    existing.date,
    "DELETED",
  );

  return NextResponse.json({
    deleted: true,
    id,
    title: existing.title,
  });
}
