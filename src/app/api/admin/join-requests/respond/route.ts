import { NextRequest, NextResponse } from "next/server";
import { uuidv7 } from "uuidv7";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import { DEFAULT_TENANT_ID } from "@/lib/constants/seed-ids";
import { requireAdmin } from "@/lib/auth/admin-guard";

/**
 * POST /api/admin/join-requests/respond
 * Body: { requestId: string, action: 'approve' | 'reject' }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();
    const adminUser = await requireAdmin(supabase, session.userId);
    if (!adminUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const requestId = body?.requestId;
    const action = body?.action;

    if (!requestId || typeof requestId !== "string" || !requestId.trim()) {
      return NextResponse.json(
        { error: "requestId wajib diisi" },
        { status: 400 },
      );
    }
    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { error: "action harus 'approve' atau 'reject'" },
        { status: 400 },
      );
    }

    const { data: joinRequest, error: joinReqErr } = await supabase
      .from("house_join_requests")
      .select("id, house_id, requester_user_id, status")
      .eq("id", requestId)
      .single();

    if (joinReqErr || !joinRequest) {
      return NextResponse.json(
        { error: "Permintaan tidak ditemukan" },
        { status: 404 },
      );
    }

    if (joinRequest.status !== "PENDING") {
      return NextResponse.json(
        { error: "Permintaan sudah ditanggapi" },
        { status: 400 },
      );
    }

    const { data: house, error: houseErr } = await supabase
      .from("houses")
      .select("id, tenant_id, blok_rumah")
      .eq("id", joinRequest.house_id)
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .single();

    if (houseErr || !house) {
      return NextResponse.json(
        { error: "Rumah tidak ditemukan" },
        { status: 404 },
      );
    }

    const now = new Date().toISOString();

    if (action === "reject") {
      const { error: updateErr } = await supabase
        .from("house_join_requests")
        .update({
          status: "REJECTED",
          responded_at: now,
          responded_by: session.userId,
        })
        .eq("id", requestId);

      if (updateErr) {
        console.error("[admin/join-requests/respond] reject error:", updateErr);
        return NextResponse.json(
          { error: "Gagal menolak permintaan" },
          { status: 500 },
        );
      }

      const { error: notifErr } = await supabase.from("notifications").insert({
        tenant_id: house.tenant_id,
        recipient_user_id: joinRequest.requester_user_id,
        actor_user_id: session.userId,
        type: "RUMAH",
        priority: "NORMAL",
        title: "Permintaan Ditolak",
        body: `Permintaan bergabung ke rumah ${house.blok_rumah ?? "-"} ditolak.`,
        action_url: "/profil",
        entity_table: "house_join_requests",
        entity_id: requestId,
        dedupe_key: `house_join_request:${requestId}:reject`,
        metadata: { requestId, houseId: house.id, action: "reject" },
        created_by: session.userId,
      });
      if (notifErr) {
        console.error("[admin/join-requests/respond] reject notif error:", notifErr);
      }

      return NextResponse.json({ success: true, action: "reject" });
    }

    const { data: existingLink } = await supabase
      .from("user_houses")
      .select("id")
      .eq("tenant_id", house.tenant_id)
      .eq("user_id", joinRequest.requester_user_id)
      .eq("house_id", joinRequest.house_id)
      .maybeSingle();

    if (existingLink) {
      return NextResponse.json(
        { error: "Pengguna sudah terdaftar di rumah ini" },
        { status: 400 },
      );
    }

    const { error: insertErr } = await supabase.from("user_houses").insert({
      id: uuidv7(),
      tenant_id: house.tenant_id,
      user_id: joinRequest.requester_user_id,
      house_id: joinRequest.house_id,
      relationship: "FAMILY",
      is_primary: true,
      status: "ACTIVE",
      created_by: session.userId,
    });

    if (insertErr) {
      console.error("[admin/join-requests/respond] insert user_houses:", insertErr);
      return NextResponse.json(
        { error: "Gagal menambahkan anggota" },
        { status: 500 },
      );
    }

    const { error: updateErr } = await supabase
      .from("house_join_requests")
      .update({
        status: "APPROVED",
        responded_at: now,
        responded_by: session.userId,
      })
      .eq("id", requestId);

    if (updateErr) {
      console.error("[admin/join-requests/respond] approve update:", updateErr);
      return NextResponse.json(
        { error: "Gagal memperbarui permintaan" },
        { status: 500 },
      );
    }

    const { error: notifErr } = await supabase.from("notifications").insert({
      tenant_id: house.tenant_id,
      recipient_user_id: joinRequest.requester_user_id,
      actor_user_id: session.userId,
      type: "RUMAH",
      priority: "NORMAL",
      title: "Permintaan Disetujui",
      body: `Anda sudah ditambahkan ke rumah ${house.blok_rumah ?? "-"}.`,
      action_url: "/profil",
      entity_table: "house_join_requests",
      entity_id: requestId,
      dedupe_key: `house_join_request:${requestId}:approve`,
      metadata: { requestId, houseId: house.id, action: "approve" },
      created_by: session.userId,
    });
    if (notifErr) {
      console.error("[admin/join-requests/respond] approve notif error:", notifErr);
    }

    return NextResponse.json({ success: true, action: "approve" });
  } catch (err) {
    console.error("[admin/join-requests/respond] error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat memproses permintaan" },
      { status: 500 },
    );
  }
}
