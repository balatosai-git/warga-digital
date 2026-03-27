"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BellIcon as BellOutlineIcon,
  ArrowPathIcon,
  UsersIcon,
  BuildingOffice2Icon,
  UserPlusIcon,
  WalletIcon as WalletOutlineIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  ChevronRightIcon,
  InboxIcon,
} from "@heroicons/react/24/outline";
import { ShieldCheckIcon as ShieldCheckSolidIcon } from "@heroicons/react/24/solid";
import { PageLoader } from "@/components/ui";
import { useAuthStore } from "@/stores/auth-store";
import { hasAdminRoleInProfile } from "@/lib/roles";
import { apiFetch } from "@/lib/api-client";

// ─── Types ────────────────────────────────────────────────────────────────────

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

type IconType = React.ComponentType<{ className?: string }>;

// ─── MetricPill ───────────────────────────────────────────────────────────────
// Used in the hero section for at-a-glance numbers.

interface MetricPillProps {
  label: string;
  value: string;
  skeleton?: boolean;
  tone?: "default" | "warning";
}

function MetricPill({
  label,
  value,
  skeleton,
  tone = "default",
}: MetricPillProps) {
  return (
    <div className="flex min-w-[72px] flex-col items-center rounded-2xl bg-white/15 px-3 py-2.5 backdrop-blur-sm">
      <span className="text-[9px] font-semibold uppercase tracking-widest text-white/60">
        {label}
      </span>
      {skeleton ? (
        <div className="mt-1 h-[18px] w-10 animate-pulse rounded-md bg-white/20" />
      ) : (
        <span
          className={`mt-0.5 text-[15px] font-extrabold leading-tight ${
            tone === "warning" ? "text-amber-200" : "text-white"
          }`}
        >
          {value}
        </span>
      )}
    </div>
  );
}

// ─── NavCard ──────────────────────────────────────────────────────────────────
// Tappable management card. Uses Next Link for proper semantics.

interface NavCardProps {
  label: string;
  sublabel: string;
  icon: IconType;
  href?: string;
  badge?: number;
}

function NavCard({ label, sublabel, icon: Icon, href, badge }: NavCardProps) {
  const inner = (
    <>
      {/* Pending badge */}
      {badge !== undefined && badge > 0 && (
        <span className="absolute right-3 top-3 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold leading-none text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      )}

      {/* Icon */}
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-app-primary-muted">
        <Icon className="h-[18px] w-[18px] text-app-primary" />
      </div>

      {/* Text */}
      <div className="min-w-0">
        <p className="text-[13px] font-semibold leading-snug text-app-title">
          {label}
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-app-body-muted">
          {sublabel}
        </p>
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="group relative flex flex-col gap-3 rounded-2xl bg-app-surface p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04),0_2px_12px_rgba(0,0,0,0.05)] transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
      >
        {inner}
      </Link>
    );
  }

  return (
    <div className="relative flex flex-col gap-3 rounded-2xl bg-app-surface p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04),0_2px_12px_rgba(0,0,0,0.05)] opacity-40">
      {inner}
    </div>
  );
}

// ─── SectionLabel ─────────────────────────────────────────────────────────────
// Consistent small uppercase label with optional action link.

interface SectionLabelProps {
  title: string;
  action?: string;
  onAction?: () => void;
}

function SectionLabel({ title, action, onAction }: SectionLabelProps) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.07em] text-app-body-muted">
        {title}
      </h2>
      {action && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="flex items-center gap-0.5 text-[11px] font-semibold transition-opacity hover:opacity-70 active:scale-95"
          style={{ color: "var(--color-primary)" }}
        >
          {action}
          <ChevronRightIcon className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

// ─── EmptyActivity ────────────────────────────────────────────────────────────

function EmptyActivity() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[var(--color-input-border)] bg-app-surface/60 py-8 text-center">
      <InboxIcon className="h-7 w-7 text-app-body-muted/30" aria-hidden />
      <p className="text-[13px] font-medium text-app-body-muted">
        Belum ada aktivitas
      </p>
      <p className="max-w-[180px] text-[11px] leading-relaxed text-app-body-muted/60">
        Transaksi dan pendaftaran baru akan muncul di sini.
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
    if (!checkingAccess && profile) void loadStats();
  }, [checkingAccess, profile, loadStats]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const isReady = !statsLoading && stats !== null;

  const adminName = profile?.fullName ?? "Admin";
  const initials =
    adminName
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0] ?? "")
      .join("")
      .toUpperCase() || "A";

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (!hasMounted || !isAuthenticated || checkingAccess) {
    return <PageLoader message="Memuat dashboard admin..." />;
  }

  // ── Management grid items ──────────────────────────────────────────────────
  const navItems: NavCardProps[] = [
    {
      label: "Warga",
      sublabel: "Kelola data penghuni",
      icon: UsersIcon,
      // no page yet
    },
    {
      label: "Blok Rumah",
      sublabel: "Kelola unit hunian",
      icon: BuildingOffice2Icon,
      href: "/admin/blok-rumah",
    },
    {
      label: "Kas RT",
      sublabel: "Transaksi keuangan",
      icon: WalletOutlineIcon,
      href: "/kas-rt",
    },
    {
      label: "Join Request",
      sublabel:
        isReady && stats!.pendingJoinRequests > 0
          ? `${stats!.pendingJoinRequests} menunggu persetujuan`
          : "Permintaan masuk",
      icon: UserPlusIcon,
      badge: isReady ? stats!.pendingJoinRequests : undefined,
      // no page yet
    },
    {
      label: "Marketplace",
      sublabel: "Usaha & layanan warga",
      icon: ChartBarIcon,
      // no page yet
    },
    {
      label: "Peran & Akses",
      sublabel: "Hak akses & role warga",
      icon: ShieldCheckIcon,
      href: "/admin/roles",
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="flex h-full min-h-0 flex-col bg-app-surface-alt">
      {/* ── Sticky Top Bar ────────────────────────────────────────────────── */}
      <header className="flex shrink-0 items-center justify-between border-b border-[var(--color-input-border)] bg-app-surface/90 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <ShieldCheckSolidIcon
            className="h-[18px] w-[18px]"
            style={{ color: "var(--color-primary)" }}
            aria-hidden
          />
          <span className="text-[13px] font-bold tracking-tight text-app-title">
            Admin Panel
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => loadStats(true)}
            disabled={refreshing || statsLoading}
            aria-label="Segarkan data"
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-app-surface-alt transition hover:bg-app-primary-muted active:scale-90 disabled:opacity-40"
          >
            <ArrowPathIcon
              className={`h-4 w-4 text-app-body-muted ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
          <button
            type="button"
            onClick={() => router.push("/notifikasi")}
            aria-label="Notifikasi"
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-app-surface-alt transition hover:bg-app-primary-muted active:scale-90"
          >
            <BellOutlineIcon className="h-4 w-4 text-app-body-muted" />
          </button>
        </div>
      </header>

      {/* ── Scrollable Body ───────────────────────────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <section
          aria-label="Profil admin"
          className="relative overflow-hidden px-4 pb-5 pt-5"
          style={{
            background:
              "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)",
          }}
        >
          {/* Decorative blobs */}
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/10"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-10 -left-4 h-28 w-28 rounded-full bg-white/[0.06]"
            aria-hidden
          />

          {/* Identity row */}
          <div className="relative z-10 flex items-center gap-3.5">
            {/* Avatar with initials */}
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-white/20 text-base font-extrabold text-white backdrop-blur-sm"
              aria-hidden
            >
              {initials}
            </div>

            <div className="min-w-0 flex-1">
              {/* Role pill */}
              <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-[3px]">
                <ShieldCheckSolidIcon
                  className="h-3 w-3 text-white/80"
                  aria-hidden
                />
                <span className="text-[9px] font-bold uppercase tracking-widest text-white/80">
                  RT Admin
                </span>
              </div>
              {/* Name */}
              <h1 className="truncate text-[19px] font-extrabold leading-tight text-white">
                {adminName}
              </h1>
              {/* Subtitle */}
              <p className="text-[11px] text-white/60">
                Panel kendali warga &amp; komunitas
              </p>
            </div>
          </div>

          {/* Metric pills — key numbers at a glance */}
          <div
            className="relative z-10 mt-4 grid grid-cols-3 gap-2"
            aria-label="Ringkasan metrik"
          >
            <MetricPill
              label="Warga"
              value={isReady ? String(stats!.totalWarga) : "—"}
              skeleton={statsLoading}
            />
            <MetricPill
              label="Rumah"
              value={isReady ? String(stats!.totalRumah) : "—"}
              skeleton={statsLoading}
            />
            <MetricPill
              label="Pending"
              value={isReady ? String(stats!.pendingJoinRequests) : "—"}
              skeleton={statsLoading}
              tone={
                isReady && stats!.pendingJoinRequests > 0
                  ? "warning"
                  : "default"
              }
            />
          </div>
        </section>

        {/* ── Page Sections ────────────────────────────────────────────────── */}
        <div className="space-y-5 px-4 pb-10 pt-5">
          {/* Stats error */}
          {statsError && (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
              <p className="text-[13px] text-red-600">{statsError}</p>
              <button
                type="button"
                onClick={() => loadStats(true)}
                className="shrink-0 text-xs font-semibold text-red-500 underline underline-offset-2"
              >
                Coba lagi
              </button>
            </div>
          )}

          {/* ── Management Grid ──────────────────────────────────────────── */}
          <section aria-label="Kelola">
            <SectionLabel title="Kelola" />
            <div className="grid grid-cols-2 gap-3">
              {navItems.map((item) => (
                <NavCard key={item.href} {...item} />
              ))}
            </div>
          </section>

          {/* ── Recent Activity ──────────────────────────────────────────── */}
          <section aria-label="Aktivitas terkini">
            <SectionLabel
              title="Aktivitas Terkini"
              action="Lihat Semua"
              onAction={() => router.push("/kas-rt")}
            />
            <EmptyActivity />
          </section>

          {/* Footer */}
          <p className="text-center text-[10px] text-app-body-muted/50">
            Warga Digital · Admin Panel
          </p>
        </div>
      </div>
    </main>
  );
}
