"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BellIcon as BellOutlineIcon,
  BuildingOffice2Icon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  HomeIcon as HomeOutlineIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  UserGroupIcon,
  UserPlusIcon,
  UsersIcon,
  WalletIcon as WalletOutlineIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/24/outline";
import {
  ShieldCheckIcon as ShieldCheckSolidIcon,
} from "@heroicons/react/24/solid";
import { PageLoader } from "@/components/ui";
import { useAuthStore } from "@/stores/auth-store";
import { hasAdminRtRoleInProfile } from "@/lib/roles";

interface ProfileData {
  fullName?: string;
  roles?: Array<{ id: number; name: string; description: string | null }>;
  residences?: Array<{
    roles?: Array<{ id: number; name: string; description: string | null }>;
  }>;
}

type IconProps = {
  className?: string;
};

type StatItem = {
  label: string;
  value: string;
  note: string;
  noteTone?: "positive" | "default" | "emphasis" | "warning";
  icon: (props: IconProps) => JSX.Element;
  accentClass: string;
};

type QuickActionItem = {
  label: string;
  sublabel: string;
  icon: (props: IconProps) => JSX.Element;
  id: string;
};

type ActivityItem = {
  title: string;
  detail: string;
  time: string;
  badgeTone: "green" | "red" | "yellow";
  icon: (props: IconProps) => JSX.Element;
  amount?: string;
  status?: string;
};

const UserAvatarIcon = ({ className = "" }: IconProps) => <UserCircleIcon className={className} aria-hidden />;
const BellIcon = ({ className = "" }: IconProps) => <BellOutlineIcon className={className} aria-hidden />;
const PeopleIcon = ({ className = "" }: IconProps) => <UsersIcon className={className} aria-hidden />;
const HouseIcon = ({ className = "" }: IconProps) => <BuildingOffice2Icon className={className} aria-hidden />;
const WalletIcon = ({ className = "" }: IconProps) => <WalletOutlineIcon className={className} aria-hidden />;
const JoinIcon = ({ className = "" }: IconProps) => <UserPlusIcon className={className} aria-hidden />;
const RoleIcon = ({ className = "" }: IconProps) => <ShieldCheckIcon className={className} aria-hidden />;
const GroupIcon = ({ className = "" }: IconProps) => <UserGroupIcon className={className} aria-hidden />;
const HomeIcon = ({ className = "" }: IconProps) => <HomeOutlineIcon className={className} aria-hidden />;
const CashIcon = ({ className = "" }: IconProps) => <CurrencyDollarIcon className={className} aria-hidden />;
const AlertIcon = ({ className = "" }: IconProps) => <ExclamationTriangleIcon className={className} aria-hidden />;
const TrendIcon = ({ className = "" }: IconProps) => <ArrowTrendingUpIcon className={className} aria-hidden />;
const ChartIcon = ({ className = "" }: IconProps) => <ChartBarIcon className={className} aria-hidden />;
const AdminShieldIcon = ({ className = "" }: IconProps) => <ShieldCheckSolidIcon className={className} aria-hidden />;

const STATS: StatItem[] = [
  {
    label: "Total Warga",
    value: "142",
    note: "+3 bulan ini",
    noteTone: "positive",
    icon: PeopleIcon,
    accentClass: "bg-app-primary-muted text-app-primary",
  },
  {
    label: "Total Rumah",
    value: "48",
    note: "Unit hunian aktif",
    noteTone: "default",
    icon: HouseIcon,
    accentClass: "bg-app-primary-muted text-app-primary",
  },
  {
    label: "Saldo Kas RT",
    value: "Rp12,4M",
    note: "Sudah termasuk iuran",
    noteTone: "positive",
    icon: WalletIcon,
    accentClass: "bg-app-primary-muted text-app-primary",
  },
  {
    label: "Join Request",
    value: "12",
    note: "Menunggu persetujuan",
    noteTone: "warning",
    icon: JoinIcon,
    accentClass: "bg-amber-100 text-amber-700",
  },
  {
    label: "Marketplace",
    value: "24",
    note: "5 item terjual",
    noteTone: "emphasis",
    icon: ChartIcon,
    accentClass: "bg-app-primary-muted text-app-primary",
  },
];

const QUICK_ACTIONS: QuickActionItem[] = [
  { label: "Kelola Role", sublabel: "Atur peran", icon: RoleIcon, id: "admin-qa-role" },
  { label: "Daftar Warga", sublabel: "142 warga", icon: GroupIcon, id: "admin-qa-warga" },
  { label: "Kelola Rumah", sublabel: "48 unit", icon: HomeIcon, id: "admin-qa-rumah" },
  { label: "Join Request", sublabel: "12 pending", icon: JoinIcon, id: "admin-qa-join" },
];

const ACTIVITIES: ActivityItem[] = [
  {
    title: "Kas Masuk: Iuran Sampah",
    detail: "Oleh Bpk. Heru (Blok A3)",
    time: "10m lalu",
    amount: "Rp50.000",
    badgeTone: "green",
    icon: CashIcon,
  },
  {
    title: "Warga Baru Terdaftar",
    detail: "Ibu Maya (Blok C12)",
    time: "1j lalu",
    status: "Pending",
    badgeTone: "yellow",
    icon: JoinIcon,
  },
  {
    title: "Laporan: Lampu Jalan Mati",
    detail: "Area Fasum Barat",
    time: "3j lalu",
    badgeTone: "red",
    icon: AlertIcon,
  },
];

function StatCard({ stat }: { stat: StatItem }) {
  const noteColor =
    stat.noteTone === "positive"
      ? "text-app-primary"
      : stat.noteTone === "warning"
        ? "text-amber-600"
        : stat.noteTone === "emphasis"
          ? "text-app-title italic"
          : "text-app-body-muted";

  return (
    <article className="group relative overflow-hidden rounded-3xl bg-app-surface p-5 shadow-[0_8px_24px_rgba(0,40,5,0.06)] transition-all active:scale-[0.97] hover:shadow-[0_12px_32px_rgba(0,40,5,0.10)]">
      {/* Decorative blob */}
      <div
        className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-10"
        style={{ background: "var(--color-surface-gradient-start)" }}
        aria-hidden
      />

      <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl ${stat.accentClass}`}>
        <stat.icon className="h-5 w-5" />
      </div>

      <p className="text-xs font-semibold uppercase tracking-[0.06em] text-app-body-muted">{stat.label}</p>
      <p className="mt-1 text-[2rem] font-extrabold leading-none text-app-title">{stat.value}</p>

      {stat.note && (
        <p className={`mt-2 text-xs font-semibold ${noteColor}`}>{stat.note}</p>
      )}
    </article>
  );
}

function QuickActionButton({ action }: { action: QuickActionItem }) {
  return (
    <button
      type="button"
      id={action.id}
      className="group flex flex-col items-center gap-2 text-center transition active:scale-[0.95]"
    >
      <div
        className="flex h-[68px] w-[68px] items-center justify-center rounded-[22px] bg-app-surface shadow-[0_8px_24px_rgba(0,40,5,0.07)] transition group-hover:shadow-[0_12px_32px_rgba(0,40,5,0.12)] group-active:shadow-[0_4px_12px_rgba(0,40,5,0.08)]"
        style={{ color: "var(--color-primary)" }}
      >
        <action.icon className="h-8 w-8" />
      </div>
      <span className="block text-[11px] font-bold uppercase tracking-wide text-app-title leading-tight">{action.label}</span>
      <span className="block -mt-1 text-[10px] text-app-body-muted">{action.sublabel}</span>
    </button>
  );
}

function ActivityCard({ activity }: { activity: ActivityItem }) {
  const bgClass =
    activity.badgeTone === "red"
      ? "bg-red-100 text-red-600"
      : activity.badgeTone === "yellow"
        ? "bg-amber-100 text-amber-600"
        : "bg-app-primary-muted text-app-primary";

  const statusBg =
    activity.badgeTone === "yellow"
      ? "bg-amber-100 text-amber-700"
      : "bg-app-primary-muted text-app-primary";

  return (
    <article className="flex items-center gap-4 rounded-3xl bg-app-surface p-4 shadow-[0_8px_24px_rgba(0,40,5,0.05)] transition-all active:scale-[0.985] hover:shadow-[0_12px_28px_rgba(0,40,5,0.09)]">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${bgClass}`}>
        <activity.icon className="h-6 w-6" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-app-title">{activity.title}</p>
        <p className="truncate text-xs text-app-body-muted">{activity.detail}</p>
      </div>

      <div className="shrink-0 text-right">
        {activity.amount && (
          <p className="text-sm font-bold" style={{ color: "var(--color-primary)" }}>
            {activity.amount}
          </p>
        )}
        {activity.status && (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${statusBg}`}>
            {activity.status}
          </span>
        )}
        <p className="mt-0.5 text-[10px] text-app-body-muted">{activity.time}</p>
      </div>
    </article>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const clearUser = useAuthStore((s) => s.clearUser);

  const [hasMounted, setHasMounted] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  useEffect(() => {
    setHasMounted(true);
  }, []);

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
        const res = await fetch("/api/profile");
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
        if (!hasAdminRtRoleInProfile(data)) {
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

  if (!hasMounted || !isAuthenticated || checkingAccess) {
    return <PageLoader message="Memuat dashboard admin..." />;
  }

  return (
    <main className="flex h-full min-h-0 flex-col bg-app-surface-alt">
      {/* ── Scrollable body ──────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 pb-10 pt-4 space-y-5">

        {/* ── Hero / Header ──────────────────────────────────────── */}
        <section
          className="relative overflow-hidden rounded-3xl p-5 text-white shadow-[0_20px_40px_-24px_rgba(16,24,40,0.55)]"
          style={{
            background: `linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)`,
          }}
        >
          {/* Decorative blobs */}
          <div className="pointer-events-none absolute -top-8 -right-8 h-36 w-36 rounded-full bg-white/10" aria-hidden />
          <div className="pointer-events-none absolute -bottom-6 -left-6 h-28 w-28 rounded-full bg-white/10" aria-hidden />
          <div className="pointer-events-none absolute top-1/2 right-16 h-16 w-16 rounded-full bg-white/5" aria-hidden />

          <div className="relative z-10 flex items-center justify-between">
            {/* Left: avatar + greeting */}
            <div className="flex items-center gap-3">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 shadow-inner backdrop-blur-sm"
              >
                <UserAvatarIcon className="h-10 w-10 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <AdminShieldIcon className="h-3.5 w-3.5 text-white/80" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">Admin RT</span>
                </div>
                <h1 className="text-xl font-extrabold leading-tight text-white">
                  {profile?.fullName ?? "Admin RT"}
                </h1>
                <p className="text-xs text-white/70">Panel kendali RT 03</p>
              </div>
            </div>

            {/* Right: bell */}
            <button
              type="button"
              id="admin-bell-btn"
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm transition hover:bg-white/25 active:scale-90"
              aria-label="Notifikasi"
            >
              <BellIcon className="h-6 w-6 text-white" />
            </button>
          </div>

          {/* Summary strip */}
          <div className="relative z-10 mt-5 grid grid-cols-3 gap-2">
            {[
              { label: "Warga", value: "142" },
              { label: "Saldo", value: "Rp12,4M" },
              { label: "Pending", value: "12" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl bg-white/15 px-3 py-2.5 text-center backdrop-blur-sm"
              >
                <p className="text-[11px] text-white/75 font-medium">{item.label}</p>
                <p className="text-base font-extrabold text-white leading-tight">{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Quick Actions ─────────────────────────────────────── */}
        <section aria-label="Aksi cepat">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-app-title tracking-tight">Aksi Cepat</h2>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {QUICK_ACTIONS.map((action) => (
              <QuickActionButton key={action.id} action={action} />
            ))}
          </div>
        </section>

        {/* ── Stats Grid ────────────────────────────────────────── */}
        <section aria-label="Ringkasan statistik">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-app-title tracking-tight">Ringkasan Statistik</h2>
            <button
              type="button"
              id="admin-stats-see-all-btn"
              className="flex items-center gap-1 text-xs font-semibold transition hover:opacity-70 active:scale-95"
              style={{ color: "var(--color-primary)" }}
            >
              <TrendIcon className="h-3.5 w-3.5" />
              Lihat detail
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {STATS.map((stat) => (
              <StatCard key={stat.label} stat={stat} />
            ))}
          </div>
        </section>

        {/* ── Recent Activity ───────────────────────────────────── */}
        <section aria-label="Aktivitas terkini">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-app-title tracking-tight">Aktivitas Terkini</h2>
            <button
              type="button"
              id="admin-activity-see-all-btn"
              className="text-xs font-semibold transition hover:opacity-70 active:scale-95"
              style={{ color: "var(--color-primary)" }}
            >
              Lihat Semua
            </button>
          </div>

          <div className="space-y-3">
            {ACTIVITIES.map((activity) => (
              <ActivityCard key={activity.title} activity={activity} />
            ))}
          </div>
        </section>

        {/* ── Footer note ───────────────────────────────────────── */}
        <p className="text-center text-[10px] text-app-body-muted pb-2">
          Warga Digital · Admin Panel RT 03
        </p>
      </div>
    </main>
  );
}
