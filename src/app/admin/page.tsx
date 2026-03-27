"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  BellIcon as BellOutlineIcon,
  BuildingOffice2Icon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
  UserCircleIcon,
  UserGroupIcon,
  UserPlusIcon,
  UsersIcon,
  WalletIcon as WalletOutlineIcon,
  ArrowTrendingUpIcon,
  ShieldCheckIcon,
  TagIcon,
} from "@heroicons/react/24/outline";
import { ShieldCheckIcon as ShieldCheckSolidIcon } from "@heroicons/react/24/solid";
import { PageLoader } from "@/components/ui";
import { useAuthStore } from "@/stores/auth-store";
import { hasAdminRoleInProfile } from "@/lib/roles";
import { apiFetch } from "@/lib/api-client";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProfileData {
  fullName?: string;
  roles?: Array<{ id: number; name: string; description: string | null }>;
  residences?: Array<{
    roles?: Array<{ id: number; name: string; description: string | null }>;
  }>;
}

interface AdminStats {
  totalWarga: number;
  totalRumah: number;
  kasBalance: number;
  kasBalanceFormatted: string;
  pendingJoinRequests: number;
  activeMarketplaceItems: number;
  totalItemsSold: number;
  wargaDeltaThisMonth: number;
}

type IconProps = { className?: string };

// ─── Icon aliases ─────────────────────────────────────────────────────────────

const UserAvatarIcon = ({ className = "" }: IconProps) => (
  <UserCircleIcon className={className} aria-hidden />
);
const BellIcon = ({ className = "" }: IconProps) => (
  <BellOutlineIcon className={className} aria-hidden />
);
const PeopleIcon = ({ className = "" }: IconProps) => (
  <UsersIcon className={className} aria-hidden />
);
const HouseIcon = ({ className = "" }: IconProps) => (
  <BuildingOffice2Icon className={className} aria-hidden />
);
const WalletIcon = ({ className = "" }: IconProps) => (
  <WalletOutlineIcon className={className} aria-hidden />
);
const JoinIcon = ({ className = "" }: IconProps) => (
  <UserPlusIcon className={className} aria-hidden />
);
const RoleIcon = ({ className = "" }: IconProps) => (
  <ShieldCheckIcon className={className} aria-hidden />
);
const GroupIcon = ({ className = "" }: IconProps) => (
  <UserGroupIcon className={className} aria-hidden />
);
const CashIcon = ({ className = "" }: IconProps) => (
  <CurrencyDollarIcon className={className} aria-hidden />
);
const TrendIcon = ({ className = "" }: IconProps) => (
  <ArrowTrendingUpIcon className={className} aria-hidden />
);
const ChartIcon = ({ className = "" }: IconProps) => (
  <ChartBarIcon className={className} aria-hidden />
);
const AdminShieldIcon = ({ className = "" }: IconProps) => (
  <ShieldCheckSolidIcon className={className} aria-hidden />
);
const RefreshIcon = ({ className = "" }: IconProps) => (
  <ArrowPathIcon className={className} aria-hidden />
);
const KasRtCategoryIcon = ({ className = "" }: IconProps) => (
  <TagIcon className={className} aria-hidden />
);

// ─── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  note: string;
  noteTone?: "positive" | "warning" | "emphasis" | "default";
  icon: (props: IconProps) => JSX.Element;
  accentClass: string;
  skeleton?: boolean;
}

function StatCard({
  label,
  value,
  note,
  noteTone,
  icon: Icon,
  accentClass,
  skeleton,
}: StatCardProps) {
  const noteColor =
    noteTone === "positive"
      ? "text-app-primary"
      : noteTone === "warning"
        ? "text-amber-600"
        : noteTone === "emphasis"
          ? "text-app-title italic"
          : "text-app-body-muted";

  return (
    <article className="group relative overflow-hidden rounded-3xl bg-app-surface p-5 shadow-[0_8px_24px_rgba(0,40,5,0.06)] transition-all active:scale-[0.97] hover:shadow-[0_12px_32px_rgba(0,40,5,0.10)]">
      <div
        className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-10"
        style={{ background: "var(--color-surface-gradient-start)" }}
        aria-hidden
      />
      <div
        className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl ${accentClass}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.06em] text-app-body-muted">
        {label}
      </p>
      {skeleton ? (
        <div className="mt-2 h-8 w-24 animate-pulse rounded-lg bg-app-surface-alt" />
      ) : (
        <p className="mt-1 text-[2rem] font-extrabold leading-none text-app-title">
          {value}
        </p>
      )}
      {skeleton ? (
        <div className="mt-2 h-3 w-16 animate-pulse rounded bg-app-surface-alt" />
      ) : (
        note && (
          <p className={`mt-2 text-xs font-semibold ${noteColor}`}>{note}</p>
        )
      )}
    </article>
  );
}

// ─── Quick action button ──────────────────────────────────────────────────────

interface QuickActionProps {
  label: string;
  sublabel: string;
  icon: (props: IconProps) => JSX.Element;
  id: string;
  onClick: () => void;
}

function QuickActionButton({
  label,
  sublabel,
  icon: Icon,
  id,
  onClick,
}: QuickActionProps) {
  return (
    <button
      type="button"
      id={id}
      onClick={onClick}
      className="group flex flex-col items-center gap-2 text-center transition active:scale-[0.95]"
    >
      <div
        className="flex h-[68px] w-[68px] items-center justify-center rounded-[22px] bg-app-surface shadow-[0_8px_24px_rgba(0,40,5,0.07)] transition group-hover:shadow-[0_12px_32px_rgba(0,40,5,0.12)] group-active:shadow-[0_4px_12px_rgba(0,40,5,0.08)]"
        style={{ color: "var(--color-primary)" }}
      >
        <Icon className="h-8 w-8" />
      </div>
      <span className="block text-[11px] font-bold uppercase tracking-wide text-app-title leading-tight">
        {label}
      </span>
      <span className="block -mt-1 text-[10px] text-app-body-muted">
        {sublabel}
      </span>
    </button>
  );
}

// ─── Summary strip item ───────────────────────────────────────────────────────

interface StripItem {
  label: string;
  value: string;
}

function HeroStrip({
  items,
  skeleton,
}: {
  items: StripItem[];
  skeleton: boolean;
}) {
  return (
    <div className="relative z-10 mt-5 grid grid-cols-3 gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl bg-white/15 px-3 py-2.5 text-center backdrop-blur-sm"
        >
          <p className="text-[11px] text-white/75 font-medium">{item.label}</p>
          {skeleton ? (
            <div className="mx-auto mt-1 h-5 w-12 animate-pulse rounded bg-white/20" />
          ) : (
            <p className="text-base font-extrabold text-white leading-tight">
              {item.value}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Empty activity state ─────────────────────────────────────────────────────

function EmptyActivity() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-[var(--color-input-border)] bg-app-surface/50 py-10 text-center">
      <CashIcon className="h-10 w-10 text-app-body-muted/40" />
      <p className="text-sm font-medium text-app-body-muted">
        Belum ada aktivitas terbaru
      </p>
      <p className="text-xs text-app-body-muted/70">
        Transaksi dan warga baru akan muncul di sini.
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const clearUser = useAuthStore((s) => s.clearUser);

  const [hasMounted, setHasMounted] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // ── Access guard: verify session + admin role ──────────────────────────────
  useEffect(() => {
    if (!hasMounted) return;
    if (!isAuthenticated) {
      router.replace("/auth/login?redirect=/admin");
      return;
    }

    let cancelled = false;
    (async () => {
      setCheckingAccess(true);
      try {
        const res = await apiFetch("/api/profile");
        if (!res.ok) {
          if (res.status === 401) {
            clearUser();
            router.replace("/auth/login?redirect=/admin");
            return;
          }
          router.replace("/landing");
          return;
        }

        const data = (await res.json()) as ProfileData;
        if (!hasAdminRoleInProfile(data)) {
          router.replace("/landing");
          return;
        }

        if (!cancelled) setProfile(data);
      } catch {
        router.replace("/landing");
      } finally {
        if (!cancelled) setCheckingAccess(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasMounted, isAuthenticated, router, clearUser]);

  // ── Load dashboard stats ───────────────────────────────────────────────────
  const loadStats = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setStatsLoading(true);
    setStatsError(null);

    try {
      const res = await apiFetch("/api/admin/stats");
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setStatsError(body.error ?? "Gagal memuat statistik");
        return;
      }
      const data = (await res.json()) as AdminStats;
      setStats(data);
    } catch {
      setStatsError("Gagal memuat statistik. Periksa koneksi Anda.");
    } finally {
      setStatsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!checkingAccess && profile) {
      void loadStats();
    }
  }, [checkingAccess, profile, loadStats]);

  // ── Derived display values ─────────────────────────────────────────────────
  const isStatsReady = !statsLoading && stats !== null;

  const heroStrip: StripItem[] = [
    { label: "Warga", value: isStatsReady ? String(stats!.totalWarga) : "—" },
    { label: "Saldo", value: isStatsReady ? stats!.kasBalanceFormatted : "—" },
    {
      label: "Pending",
      value: isStatsReady ? String(stats!.pendingJoinRequests) : "—",
    },
  ];

  const statCards: StatCardProps[] = [
    {
      label: "Total Warga",
      value: isStatsReady ? String(stats!.totalWarga) : "—",
      note: isStatsReady
        ? stats!.wargaDeltaThisMonth > 0
          ? `+${stats!.wargaDeltaThisMonth} bulan ini`
          : "Tidak ada warga baru bulan ini"
        : "",
      noteTone: stats && stats.wargaDeltaThisMonth > 0 ? "positive" : "default",
      icon: PeopleIcon,
      accentClass: "bg-app-primary-muted text-app-primary",
      skeleton: statsLoading,
    },
    {
      label: "Total Rumah",
      value: isStatsReady ? String(stats!.totalRumah) : "—",
      note: "Unit hunian aktif",
      noteTone: "default",
      icon: HouseIcon,
      accentClass: "bg-app-primary-muted text-app-primary",
      skeleton: statsLoading,
    },
    {
      label: "Saldo Kas RT",
      value: isStatsReady ? stats!.kasBalanceFormatted : "—",
      note: isStatsReady ? "Saldo berjalan" : "",
      noteTone: "positive",
      icon: WalletIcon,
      accentClass: "bg-app-primary-muted text-app-primary",
      skeleton: statsLoading,
    },
    {
      label: "Join Request",
      value: isStatsReady ? String(stats!.pendingJoinRequests) : "—",
      note: isStatsReady
        ? stats!.pendingJoinRequests > 0
          ? "Menunggu persetujuan"
          : "Tidak ada permintaan"
        : "",
      noteTone: stats && stats.pendingJoinRequests > 0 ? "warning" : "default",
      icon: JoinIcon,
      accentClass:
        stats && stats.pendingJoinRequests > 0
          ? "bg-amber-100 text-amber-700"
          : "bg-app-primary-muted text-app-primary",
      skeleton: statsLoading,
    },
    {
      label: "Marketplace",
      value: isStatsReady ? String(stats!.activeMarketplaceItems) : "—",
      note: isStatsReady ? `${stats!.totalItemsSold} item terjual` : "",
      noteTone: "emphasis",
      icon: ChartIcon,
      accentClass: "bg-app-primary-muted text-app-primary",
      skeleton: statsLoading,
    },
  ];

  const quickActions: QuickActionProps[] = [
    {
      label: "Kelola Role",
      sublabel: "Atur peran",
      icon: RoleIcon,
      id: "admin-qa-role",
      onClick: () => router.push("/admin/roles"),
    },
    {
      label: "Daftar Warga",
      sublabel: isStatsReady ? `${stats!.totalWarga} warga` : "Warga",
      icon: GroupIcon,
      id: "admin-qa-warga",
      onClick: () => router.push("/admin/warga"),
    },
    {
      label: "Kelola Rumah",
      sublabel: isStatsReady ? `${stats!.totalRumah} unit` : "Rumah",
      icon: HouseIcon,
      id: "admin-qa-rumah",
      onClick: () => router.push("/admin/rumah"),
    },
    {
      label: "Join Request",
      sublabel: isStatsReady
        ? stats!.pendingJoinRequests > 0
          ? `${stats!.pendingJoinRequests} pending`
          : "Tidak ada"
        : "Pending",
      icon: JoinIcon,
      id: "admin-qa-join",
      onClick: () => router.push("/admin/join-requests"),
    },
    {
      label: "Kat. Kas RT",
      sublabel: "Kelola kategori",
      icon: KasRtCategoryIcon,
      id: "admin-qa-kas-rt-categories",
      onClick: () => router.push("/admin/kas-rt-categories"),
    },
  ];

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (!hasMounted || !isAuthenticated || checkingAccess) {
    return <PageLoader message="Memuat dashboard admin..." />;
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="flex h-full min-h-0 flex-col bg-app-surface-alt">
      <div className="flex-1 overflow-y-auto px-4 pb-10 pt-4 space-y-5">
        {/* ── Hero / Header ─────────────────────────────────────────── */}
        <section
          className="relative overflow-hidden rounded-3xl p-5 text-white shadow-[0_20px_40px_-24px_rgba(16,24,40,0.55)]"
          style={{
            background: `linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)`,
          }}
        >
          {/* Decorative blobs */}
          <div
            className="pointer-events-none absolute -top-8 -right-8 h-36 w-36 rounded-full bg-white/10"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-6 -left-6 h-28 w-28 rounded-full bg-white/10"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute top-1/2 right-16 h-16 w-16 rounded-full bg-white/5"
            aria-hidden
          />

          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 shadow-inner backdrop-blur-sm">
                <UserAvatarIcon className="h-10 w-10 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <AdminShieldIcon className="h-3.5 w-3.5 text-white/80" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">
                    Admin RT
                  </span>
                </div>
                <h1 className="text-xl font-extrabold leading-tight text-white">
                  {profile?.fullName ?? "Admin RT"}
                </h1>
                <p className="text-xs text-white/70">Panel kendali RT 03</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Refresh button */}
              <button
                type="button"
                onClick={() => loadStats(true)}
                disabled={refreshing || statsLoading}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm transition hover:bg-white/25 active:scale-90 disabled:opacity-50"
                aria-label="Segarkan statistik"
              >
                <RefreshIcon
                  className={`h-5 w-5 text-white ${refreshing ? "animate-spin" : ""}`}
                />
              </button>

              {/* Notification bell */}
              <button
                type="button"
                id="admin-bell-btn"
                onClick={() => router.push("/notifikasi")}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm transition hover:bg-white/25 active:scale-90"
                aria-label="Notifikasi"
              >
                <BellIcon className="h-6 w-6 text-white" />
              </button>
            </div>
          </div>

          <HeroStrip items={heroStrip} skeleton={statsLoading && !refreshing} />
        </section>

        {/* ── Stats error banner ────────────────────────────────────── */}
        {statsError && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700">{statsError}</p>
            <button
              type="button"
              onClick={() => loadStats(true)}
              className="shrink-0 text-xs font-semibold text-red-600 underline underline-offset-2"
            >
              Coba lagi
            </button>
          </div>
        )}

        {/* ── Quick Actions ─────────────────────────────────────────── */}
        <section aria-label="Aksi cepat">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-app-title tracking-tight">
              Aksi Cepat
            </h2>
          </div>
          <div className="grid grid-cols-4 gap-1 overflow-x-auto scrollbar-none">
            {quickActions.map((action) => (
              <QuickActionButton key={action.id} {...action} />
            ))}
          </div>
        </section>

        {/* ── Stats Grid ────────────────────────────────────────────── */}
        <section aria-label="Ringkasan statistik">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-app-title tracking-tight">
              Ringkasan Statistik
            </h2>
            <button
              type="button"
              id="admin-stats-see-all-btn"
              onClick={() => router.push("/admin/statistik")}
              className="flex items-center gap-1 text-xs font-semibold transition hover:opacity-70 active:scale-95"
              style={{ color: "var(--color-primary)" }}
            >
              <TrendIcon className="h-3.5 w-3.5" />
              Lihat detail
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {statCards.map((card) => (
              <StatCard key={card.label} {...card} />
            ))}
          </div>
        </section>

        {/* ── Recent Activity ───────────────────────────────────────── */}
        <section aria-label="Aktivitas terkini">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-app-title tracking-tight">
              Aktivitas Terkini
            </h2>
            <button
              type="button"
              id="admin-activity-see-all-btn"
              onClick={() => router.push("/kas-rt")}
              className="text-xs font-semibold transition hover:opacity-70 active:scale-95"
              style={{ color: "var(--color-primary)" }}
            >
              Lihat Semua
            </button>
          </div>
          <EmptyActivity />
        </section>

        {/* ── Footer ───────────────────────────────────────────────── */}
        <p className="text-center text-[10px] text-app-body-muted pb-2">
          Warga Digital · Admin Panel RT 03
        </p>
      </div>
    </main>
  );
}
