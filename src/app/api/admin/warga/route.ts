import { NextResponse, type NextRequest } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import { DEFAULT_TENANT_ID } from "@/lib/constants/seed-ids";
import { requireAdmin } from "@/lib/auth/admin-guard";

/**
 * GET /api/admin/warga
 *
 * Lists all active warga in the tenant with optional search and blok filter.
 *
 * Query params:
 *   q      - search term (name or wa_number), optional
 *   blok   - filter by blok_rumah slug, optional ("" = all)
 *   page   - 1-based page number (default 1)
 *   limit  - items per page (default 30, max 100)
 */
export async function GET(request: NextRequest) {
  // ── 1. Auth ────────────────────────────────────────────────────────────────
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const adminUser = await requireAdmin(supabase, session.userId);
  if (!adminUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── 2. Parse query params ──────────────────────────────────────────────────
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const blokFilter = (url.searchParams.get("blok") ?? "").trim().toLowerCase();
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("limit") ?? "30", 10)),
  );

  // ── 3. Fetch all active tenant_users with joined user info ─────────────────
  const { data: tuRows, error: tuError } = await supabase
    .from("tenant_users")
    .select(
      `
      id,
      user_id,
      status,
      joined_at,
      users!inner (
        id,
        full_name,
        wa_number,
        status
      )
    `,
    )
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .eq("status", "ACTIVE")
    .order("joined_at", { ascending: false });

  if (tuError) {
    console.error("[admin/warga] tenant_users query error:", tuError);
    return NextResponse.json({ error: tuError.message }, { status: 500 });
  }

  type TuRow = {
    id: string;
    user_id: string;
    status: string;
    joined_at: string | null;
    users: {
      id: string;
      full_name: string;
      wa_number: string | null;
      status: string;
    };
  };

  const rows = (tuRows ?? []) as unknown as TuRow[];
  const tenantUserIds = rows.map((r) => r.id);
  const userIds = rows.map((r) => r.user_id);

  // ── 4. Batch-fetch primary blok_rumah for each user ────────────────────────
  const blokMap: Record<string, string | null> = {};
  if (userIds.length > 0) {
    const { data: houseRows } = await supabase
      .from("user_houses")
      .select("user_id, houses!inner(blok_rumah, tenant_id)")
      .in("user_id", userIds)
      .eq("is_primary", true)
      .eq("status", "ACTIVE")
      .eq("houses.tenant_id", DEFAULT_TENANT_ID);

    type HouseRow = {
      user_id: string;
      houses: { blok_rumah: string | null; tenant_id: string };
    };

    (houseRows ?? []).forEach((h) => {
      const row = h as unknown as HouseRow;
      blokMap[row.user_id] = row.houses?.blok_rumah ?? null;
    });
  }

  // ── 5. Batch-fetch roles for each tenant_user ──────────────────────────────
  const rolesMap: Record<string, string[]> = {};
  if (tenantUserIds.length > 0) {
    const { data: roleRows } = await supabase
      .from("tenant_user_roles")
      .select(
        `
        tenant_user_id,
        roles!inner (
          name
        )
      `,
      )
      .in("tenant_user_id", tenantUserIds)
      .is("revoked_at", null);

    type RoleRow = {
      tenant_user_id: string;
      roles: { name: string };
    };

    (roleRows ?? []).forEach((r) => {
      const row = r as unknown as RoleRow;
      if (!rolesMap[row.tenant_user_id]) rolesMap[row.tenant_user_id] = [];
      if (row.roles?.name) rolesMap[row.tenant_user_id].push(row.roles.name);
    });
  }

  // ── 6. Batch-fetch last active session for each user ─────────────────────
  const lastActiveMap: Record<string, string | null> = {};
  if (userIds.length > 0) {
    const { data: sessionRows } = await supabase
      .from("sessions")
      .select("user_id, last_active_at")
      .in("user_id", userIds)
      .order("last_active_at", { ascending: false });

    type SessionRow = {
      user_id: string;
      last_active_at: string;
    };

    (sessionRows ?? []).forEach((s) => {
      const row = s as unknown as SessionRow;
      // Keep only the most-recent entry per user (results are pre-sorted DESC)
      if (!lastActiveMap[row.user_id]) {
        lastActiveMap[row.user_id] = row.last_active_at;
      }
    });
  }

  // ── 7. Build full warga list ───────────────────────────────────────────────
  const allWarga = rows.map((r) => ({
    tenant_user_id: r.id,
    user_id: r.user_id,
    full_name: r.users?.full_name ?? "—",
    wa_number: r.users?.wa_number ?? null,
    blok_rumah: blokMap[r.user_id] ?? null,
    joined_at: r.joined_at,
    roles: rolesMap[r.id] ?? [],
    last_active_at: lastActiveMap[r.user_id] ?? null,
  }));

  // ── 8. Apply search + blok filter in JS ───────────────────────────────────
  const filtered = allWarga.filter((w) => {
    const matchSearch =
      !q ||
      w.full_name.toLowerCase().includes(q) ||
      (w.wa_number ?? "").toLowerCase().includes(q) ||
      (w.blok_rumah ?? "").toLowerCase().includes(q);

    const matchBlok =
      !blokFilter || (w.blok_rumah ?? "").toLowerCase() === blokFilter;

    return matchSearch && matchBlok;
  });

  // ── 9. Build distinct blok list for filter pills ──────────────────────────
  const blokSet = new Set<string>();
  allWarga.forEach((w) => {
    if (w.blok_rumah) blokSet.add(w.blok_rumah);
  });
  const blokList = Array.from(blokSet).sort();

  // ── 10. Paginate ───────────────────────────────────────────────────────────
  const total = filtered.length;
  const offset = (page - 1) * limit;
  const warga = filtered.slice(offset, offset + limit);
  const hasMore = offset + warga.length < total;

  return NextResponse.json({
    warga,
    meta: {
      total,
      totalAll: allWarga.length,
      page,
      limit,
      hasMore,
    },
    blokList,
  });
}
