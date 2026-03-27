import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import {
  DEFAULT_TENANT_ID,
  DEFAULT_COMMUNITY_ID,
} from "@/lib/constants/seed-ids";
import { requireAdmin } from "@/lib/auth/admin-guard";

/** Format a numeric balance as "Rp X,XM" / "Rp X,XJt" / "Rp X.XXX" for the dashboard strip. */
function formatKasSaldo(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `Rp${(amount / 1_000_000_000).toFixed(1).replace(".", ",")}M`;
  }
  if (amount >= 1_000_000) {
    return `Rp${(amount / 1_000_000).toFixed(1).replace(".", ",")}Jt`;
  }
  return `Rp${amount.toLocaleString("id-ID")}`;
}

export interface AdminStatsResponse {
  totalWarga: number;
  totalRumah: number;
  kasBalance: number;
  kasBalanceFormatted: string;
  pendingJoinRequests: number;
  activeMarketplaceItems: number;
  /** Items sold (COMPLETED transactions) — total lifetime. */
  totalItemsSold: number;
  /** Delta in warga count for the current calendar month. */
  wargaDeltaThisMonth: number;
}

/**
 * GET /api/admin/stats
 *
 * Returns real-time dashboard statistics for the RT admin panel.
 * Requires the requesting user to hold RT_ADMIN (role_id 4) or
 * RT_BENDAHARA (role_id 8) in the default tenant.
 *
 * All counts are scoped to DEFAULT_TENANT_ID / DEFAULT_COMMUNITY_ID from
 * environment / seed-ids constants so the endpoint is multi-tenant safe.
 */
export async function GET() {
  /* ── 1. Auth ─────────────────────────────────────────────────── */
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  /* ── 2. Role guard: must hold an admin role (RT_ADMIN, RT_BENDAHARA, …) ── */
  const tenantUser = await requireAdmin(supabase, session.userId);
  if (!tenantUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  /* ── 3. Run all stat queries in parallel ─────────────────────── */
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const startOfMonthIso = startOfMonth.toISOString();

  const [
    wargaRes,
    wargaThisMonthRes,
    rumahRes,
    kasIncomeRes,
    kasExpenseRes,
    joinRequestRes,
    marketplaceItemsRes,
    itemsSoldRes,
  ] = await Promise.all([
    /* Total active warga in this tenant */
    supabase
      .from("tenant_users")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .eq("status", "ACTIVE"),

    /* Warga who joined this month (for delta badge) */
    supabase
      .from("tenant_users")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .eq("status", "ACTIVE")
      .gte("joined_at", startOfMonthIso),

    /* Total active houses */
    supabase
      .from("houses")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .eq("is_active", true),

    /* Sum of all kas income for this community */
    supabase
      .from("kas_rt_transactions")
      .select("amount")
      .eq("community_id", DEFAULT_COMMUNITY_ID)
      .eq("type", "income"),

    /* Sum of all kas expenses for this community */
    supabase
      .from("kas_rt_transactions")
      .select("amount")
      .eq("community_id", DEFAULT_COMMUNITY_ID)
      .eq("type", "expense"),

    /* Pending house join requests scoped to this tenant's houses */
    supabase
      .from("house_join_requests")
      .select("id, houses!inner(tenant_id)", { count: "exact", head: true })
      .eq("status", "PENDING")
      .eq("houses.tenant_id", DEFAULT_TENANT_ID),

    /* Active marketplace items for this tenant */
    supabase
      .from("marketplace_items")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .eq("status", "ACTIVE"),

    /* Completed marketplace transactions (items sold) */
    supabase
      .from("marketplace_transactions")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .eq("status", "COMPLETED"),
  ]);

  /* ── 4. Aggregate kas balance ────────────────────────────────── */
  const sumAmount = (rows: { amount: number }[] | null): number =>
    (rows ?? []).reduce((acc, r) => acc + Number(r.amount ?? 0), 0);

  const kasIncome = sumAmount(kasIncomeRes.data as { amount: number }[] | null);
  const kasExpense = sumAmount(
    kasExpenseRes.data as { amount: number }[] | null,
  );
  const kasBalance = kasIncome - kasExpense;

  /* ── 5. Build response ───────────────────────────────────────── */
  const stats: AdminStatsResponse = {
    totalWarga: wargaRes.count ?? 0,
    totalRumah: rumahRes.count ?? 0,
    kasBalance,
    kasBalanceFormatted: formatKasSaldo(kasBalance),
    pendingJoinRequests: joinRequestRes.count ?? 0,
    activeMarketplaceItems: marketplaceItemsRes.count ?? 0,
    totalItemsSold: itemsSoldRes.count ?? 0,
    wargaDeltaThisMonth: wargaThisMonthRes.count ?? 0,
  };

  return NextResponse.json(stats);
}
