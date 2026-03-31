import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import { DEFAULT_TENANT_ID } from "@/lib/constants/seed-ids";
import { requireAdmin } from "@/lib/auth/admin-guard";

type JoinRequestItem = {
  id: string;
  requesterUserId: string;
  requesterFullName: string;
  requesterWaNumber: string | null;
  houseId: string;
  blokRumah: string;
  requestedAt: string;
};

/**
 * GET /api/admin/join-requests
 *
 * Returns pending join requests across the tenant.
 */
export async function GET() {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const adminUser = await requireAdmin(supabase, session.userId);
  if (!adminUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: requests, error: requestErr } = await supabase
    .from("house_join_requests")
    .select("id, requester_user_id, house_id, created_at")
    .eq("status", "PENDING")
    .order("created_at", { ascending: false });

  if (requestErr) {
    console.error("[admin/join-requests] query error:", requestErr);
    return NextResponse.json(
      { error: "Gagal memuat data permintaan" },
      { status: 500 },
    );
  }

  if (!requests || requests.length === 0) {
    return NextResponse.json({ items: [], meta: { total: 0 } });
  }

  const houseIds = [...new Set(requests.map((r) => r.house_id))];
  const requesterIds = [...new Set(requests.map((r) => r.requester_user_id))];

  const { data: houses, error: houseErr } = await supabase
    .from("houses")
    .select("id, tenant_id, blok_rumah")
    .in("id", houseIds)
    .eq("tenant_id", DEFAULT_TENANT_ID);

  if (houseErr) {
    console.error("[admin/join-requests] houses query error:", houseErr);
    return NextResponse.json(
      { error: "Gagal memuat data rumah" },
      { status: 500 },
    );
  }

  const houseMap = new Map((houses ?? []).map((h) => [h.id, h]));
  const scopedRequests = requests.filter((r) => houseMap.has(r.house_id));

  if (scopedRequests.length === 0) {
    return NextResponse.json({ items: [], meta: { total: 0 } });
  }

  const { data: users, error: userErr } = await supabase
    .from("users")
    .select("id, full_name, wa_number")
    .in("id", requesterIds);

  if (userErr) {
    console.error("[admin/join-requests] users query error:", userErr);
    return NextResponse.json(
      { error: "Gagal memuat data pemohon" },
      { status: 500 },
    );
  }

  const userMap = new Map((users ?? []).map((u) => [u.id, u]));

  const items: JoinRequestItem[] = scopedRequests.map((r) => {
    const house = houseMap.get(r.house_id);
    const requester = userMap.get(r.requester_user_id);

    return {
      id: r.id,
      requesterUserId: r.requester_user_id,
      requesterFullName: requester?.full_name ?? "—",
      requesterWaNumber: requester?.wa_number ?? null,
      houseId: r.house_id,
      blokRumah: house?.blok_rumah ?? "—",
      requestedAt: r.created_at,
    };
  });

  return NextResponse.json({
    items,
    meta: { total: items.length },
  });
}
