import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { uuidv7 } from "uuidv7";

/**
 * POST /api/house-join-requests/respond
 * Owner approves or rejects a pending house join request.
 * Body: { requestId: string, action: 'approve' | 'reject' }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const requestId = body?.requestId;
    const action = body?.action;

    if (!requestId || typeof requestId !== "string" || !requestId.trim()) {
      return NextResponse.json(
        { error: "requestId wajib diisi" },
        { status: 400 }
      );
    }
    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { error: "action harus 'approve' atau 'reject'" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { data: joinRequest, error: fetchErr } = await supabase
      .from("house_join_requests")
      .select("id, house_id, requester_user_id, status")
      .eq("id", requestId)
      .single();

    if (fetchErr || !joinRequest) {
      return NextResponse.json(
        { error: "Permintaan tidak ditemukan" },
        { status: 404 }
      );
    }

    if (joinRequest.status !== "PENDING") {
      return NextResponse.json(
        { error: "Permintaan sudah ditanggapi" },
        { status: 400 }
      );
    }

    const { data: house } = await supabase
      .from("houses")
      .select("id, tenant_id, blok_rumah")
      .eq("id", joinRequest.house_id)
      .single();

    if (!house) {
      return NextResponse.json(
        { error: "Rumah tidak ditemukan" },
        { status: 404 }
      );
    }

    const { data: ownerLink } = await supabase
      .from("user_houses")
      .select("id")
      .eq("house_id", joinRequest.house_id)
      .eq("user_id", session.userId)
      .eq("relationship", "OWNER")
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (!ownerLink) {
      return NextResponse.json(
        { error: "Anda bukan pemilik rumah ini" },
        { status: 403 }
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
        console.error("[HouseJoinRespond] Reject update error:", updateErr);
        return NextResponse.json(
          { error: "Gagal menolak permintaan" },
          { status: 500 }
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
        console.error("[HouseJoinRespond] Reject notification error:", notifErr);
      }

      return NextResponse.json({ success: true, action: "reject" });
    }

    if (action === "approve") {
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
          { status: 400 }
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
        console.error("[HouseJoinRespond] Insert user_houses error:", insertErr);
        return NextResponse.json(
          { error: "Gagal menambahkan anggota" },
          { status: 500 }
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
        console.error("[HouseJoinRespond] Approve update error:", updateErr);
        return NextResponse.json(
          { error: "Gagal memperbarui permintaan" },
          { status: 500 }
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
        console.error("[HouseJoinRespond] Approve notification error:", notifErr);
      }

      return NextResponse.json({ success: true, action: "approve" });
    }

    return NextResponse.json({ error: "Aksi tidak valid" }, { status: 400 });
  } catch (err) {
    console.error("[HouseJoinRespond] Error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}
