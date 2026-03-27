import { NextResponse, type NextRequest } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import { DEFAULT_TENANT_ID } from "@/lib/constants/seed-ids";
import { requireAdmin } from "@/lib/auth/admin-guard";

/**
 * GET /api/admin/users
 *
 * Search for active tenant members by name or WA number.
 * Optionally exclude users who already hold a specific role.
 *
 * Query params:
 *   q        - search term (name or wa_number), min 1 char
 *   roleId   - (optional) if provided, users already assigned this role are excluded
 *   limit    - max results (default 20, max 50)
 */
export async function GET(request: NextRequest) {
  // ── 1. Auth ─────────────────────────────────────────────────────────────────
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const adminUser = await requireAdmin(supabase, session.userId);
  if (!adminUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── 2. Parse params ─────────────────────────────────────────────────────────
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const roleIdParam = url.searchParams.get("roleId");
  const limit = Math.min(
    50,
    Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10)),
  );

  if (!q) {
    return NextResponse.json({ users: [] });
  }

  // ── 3. Query active tenant users, join to users table ──────────────────────
  // We do a broad search: match against full_name or wa_number (case-insensitive).
  const { data: rows, error } = await supabase
    .from("tenant_users")
    .select(
      `
      id,
      user_id,
      users!inner (
        id,
        full_name,
        wa_number
      )
    `,
    )
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .eq("status", "ACTIVE")
    .limit(limit * 3); // Over-fetch so we can filter in JS after joining blok_rumah

  if (error) {
    console.error("[admin/users] GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ── 4. Filter by search term in JS (Supabase free tier lacks full-text on joined cols easily) ─
  type UserRow = {
    id: string;
    user_id: string;
    users: { id: string; full_name: string; wa_number: string | null };
  };

  const typedRows = (rows ?? []) as unknown as UserRow[];
  const ql = q.toLowerCase();

  const filtered = typedRows.filter((r) => {
    const name = (r.users?.full_name ?? "").toLowerCase();
    const wa = (r.users?.wa_number ?? "").toLowerCase();
    return name.includes(ql) || wa.includes(ql);
  });

  // ── 5. If roleId given, fetch already-assigned user IDs to exclude ──────────
  let excludedUserIds = new Set<string>();
  if (roleIdParam) {
    const roleId = parseInt(roleIdParam, 10);
    if (!isNaN(roleId)) {
      const tenantUserIds = filtered.map((r) => r.id);
      if (tenantUserIds.length > 0) {
        const { data: assigned } = await supabase
          .from("tenant_user_roles")
          .select("tenant_user_id")
          .eq("role_id", roleId)
          .in("tenant_user_id", tenantUserIds)
          .is("revoked_at", null);

        excludedUserIds = new Set(
          (assigned ?? []).map((a) => a.tenant_user_id as string),
        );
      }
    }
  }

  const resultRows = filtered.filter((r) => !excludedUserIds.has(r.id));
  const sliced = resultRows.slice(0, limit);

  // ── 6. Batch-fetch blok_rumah for each user ─────────────────────────────────
  const userIds = sliced.map((r) => r.user_id);
  const blokMap: Record<string, string | null> = {};

  if (userIds.length > 0) {
    const { data: houseRows } = await supabase
      .from("user_houses")
      .select("user_id, houses!inner(blok_rumah, tenant_id)")
      .in("user_id", userIds)
      .eq("is_primary", true)
      .eq("status", "ACTIVE")
      .eq("houses.tenant_id", DEFAULT_TENANT_ID);

    (houseRows ?? []).forEach((h) => {
      type HouseRow = {
        user_id: string;
        houses: { blok_rumah: string | null; tenant_id: string };
      };
      const row = h as unknown as HouseRow;
      blokMap[row.user_id] = row.houses?.blok_rumah ?? null;
    });
  }

  // ── 7. Shape the response ────────────────────────────────────────────────────
  const users = sliced.map((r) => ({
    user_id: r.user_id,
    tenant_user_id: r.id,
    full_name: r.users?.full_name ?? "—",
    wa_number: r.users?.wa_number ?? null,
    blok_rumah: blokMap[r.user_id] ?? null,
  }));

  return NextResponse.json({ users });
}
