"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  BellIcon,
  CheckBadgeIcon,
  ShieldCheckIcon,
  SparklesIcon,
  WalletIcon as WalletOutlineIcon,
} from "@heroicons/react/24/outline";
import {
  MegaphoneIcon,
  ShieldCheckIcon as ShieldCheckSolidIcon,
  UserPlusIcon,
  WalletIcon as WalletSolidIcon,
} from "@heroicons/react/24/solid";
import { useAuthStore } from "@/stores/auth-store";
import { PageLoader } from "@/components/ui";
import { apiFetch } from "@/lib/api-client";

type NotificationType =
  | "SYSTEM"
  | "KAS_RT"
  | "RUMAH"
  | "ORGANISASI"
  | "MARKETPLACE";

interface ApiNotification {
  id: string;
  type: NotificationType;
  priority: "LOW" | "NORMAL" | "HIGH";
  title: string;
  body: string;
  actionUrl: string | null;
  metadata: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  timeLabel: string;
  isUnread: boolean;
  actionUrl: string | null;
  iconBg: string;
  iconColor: string;
  icon: ReactNode;
}

interface NotificationGroup {
  label: string;
  items: NotificationItem[];
  muted?: boolean;
}

function ArrowBackIcon() {
  return <ArrowLeftIcon className="h-6 w-6" aria-hidden />;
}

function DoneAllIcon() {
  return <CheckBadgeIcon className="h-[18px] w-[18px]" aria-hidden />;
}

function WalletIcon({ filled }: { filled?: boolean }) {
  const Icon = filled ? WalletSolidIcon : WalletOutlineIcon;
  return <Icon className="h-[22px] w-[22px]" aria-hidden />;
}

function CampaignIcon() {
  return <MegaphoneIcon className="h-[22px] w-[22px]" aria-hidden />;
}

function PersonAddIcon() {
  return <UserPlusIcon className="h-[22px] w-[22px]" aria-hidden />;
}

function VerifiedUserIcon() {
  return <ShieldCheckSolidIcon className="h-[22px] w-[22px]" aria-hidden />;
}

function LeafIcon() {
  return <SparklesIcon className="h-[22px] w-[22px]" aria-hidden />;
}

function getNotificationVisual(type: NotificationType): {
  iconBg: string;
  iconColor: string;
  icon: ReactNode;
} {
  switch (type) {
    case "KAS_RT":
      return {
        iconBg: "bg-emerald-100",
        iconColor: "text-emerald-700",
        icon: <WalletIcon filled />,
      };
    case "RUMAH":
      return {
        iconBg: "bg-emerald-200/60",
        iconColor: "text-emerald-800",
        icon: <PersonAddIcon />,
      };
    case "ORGANISASI":
      return {
        iconBg: "bg-[#abf4ac]/60",
        iconColor: "text-emerald-800",
        icon: <CampaignIcon />,
      };
    case "MARKETPLACE":
      return {
        iconBg: "bg-[var(--color-surface-alt)]",
        iconColor: "text-app-body-muted",
        icon: <WalletIcon />,
      };
    case "SYSTEM":
    default:
      return {
        iconBg: "bg-[var(--color-surface-alt)]",
        iconColor: "text-app-body-muted",
        icon: <VerifiedUserIcon />,
      };
  }
}

function getGroupLabel(value: Date): string {
  const now = new Date();
  const startNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startValue = new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate(),
  );

  const daysDiff = Math.floor(
    (startNow.getTime() - startValue.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysDiff <= 0) return "Terbaru";
  if (daysDiff === 1) return "Kemarin";
  if (daysDiff <= 7) return "Minggu Ini";
  return "Sebelumnya";
}

function formatRelativeTime(value: Date): string {
  const diff = Date.now() - value.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} menit yang lalu`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam yang lalu`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "Kemarin";
  if (days < 7) return `${days} hari yang lalu`;

  return value.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildGroupsFromApi(
  notifications: ApiNotification[],
): NotificationGroup[] {
  const grouped = new Map<string, NotificationItem[]>();

  for (const row of notifications) {
    const createdAtDate = new Date(row.createdAt);
    const groupLabel = getGroupLabel(createdAtDate);
    const visual = getNotificationVisual(row.type);

    const item: NotificationItem = {
      id: row.id,
      title: row.title,
      body: row.body,
      timeLabel: formatRelativeTime(createdAtDate),
      isUnread: row.readAt == null,
      actionUrl: row.actionUrl,
      iconBg: visual.iconBg,
      iconColor: visual.iconColor,
      icon: visual.icon,
    };

    const existing = grouped.get(groupLabel) ?? [];
    existing.push(item);
    grouped.set(groupLabel, existing);
  }

  const order = ["Terbaru", "Kemarin", "Minggu Ini", "Sebelumnya"];
  return order
    .filter((label) => (grouped.get(label)?.length ?? 0) > 0)
    .map((label) => ({
      label,
      muted: label === "Sebelumnya",
      items: grouped.get(label) ?? [],
    }));
}

function NotificationCard({
  item,
  muted,
  onRead,
}: {
  item: NotificationItem;
  muted: boolean;
  onRead: (id: string, actionUrl: string | null) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onRead(item.id, item.actionUrl)}
      className={`w-full text-left rounded-3xl p-5 flex gap-4 relative shadow-[0_8px_24px_rgba(0,40,5,0.06)] transition-all active:scale-[0.985] focus-visible:outline-none ${
        muted
          ? "bg-app-surface-alt opacity-70"
          : "bg-app-surface hover:shadow-[0_12px_32px_rgba(0,40,5,0.10)]"
      }`}
      aria-label={`${item.isUnread ? "Belum dibaca: " : ""}${item.title} - ${item.body}`}
    >
      {item.isUnread && (
        <span
          className="absolute top-5 right-5 w-2.5 h-2.5 rounded-full bg-app-primary shadow-[0_0_6px_rgba(67,160,71,0.6)]"
          aria-label="Belum dibaca"
        />
      )}

      <span
        className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${item.iconBg} ${item.iconColor}`}
      >
        {item.icon}
      </span>

      <span className="flex flex-col gap-1 min-w-0 flex-1">
        <span
          className={`font-bold text-app-title text-sm leading-snug ${item.isUnread ? "" : "font-semibold"}`}
        >
          {item.title}
        </span>
        <span className="text-sm text-app-body-muted leading-relaxed line-clamp-2">
          {item.body}
        </span>
        <span className="text-xs text-[var(--color-body-muted)] font-medium mt-0.5">
          {item.timeLabel}
        </span>
      </span>
    </button>
  );
}

function TipsWargaBanner() {
  return (
    <div className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-[0_16px_40px_rgba(0,80,20,0.25)]">
      <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10" />
      <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-white/10" />
      <div className="absolute top-1/2 right-8 w-16 h-16 rounded-full bg-white/5" />

      <div className="relative z-10">
        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold text-emerald-100/90">
          <LeafIcon />
          Tips Warga
        </span>
        <h2 className="font-bold text-xl mt-2 leading-snug">
          Kelola Sampah Mandiri
        </h2>
        <p className="text-sm mt-2 text-white/85 leading-relaxed">
          Panduan baru tentang pemilahan sampah organik kini tersedia di menu
          Edukasi.
        </p>
        <button
          type="button"
          className="mt-4 bg-white/95 text-emerald-700 px-4 py-2 rounded-full text-xs font-bold shadow-md transition active:scale-95 hover:bg-white"
        >
          Baca Selengkapnya
        </button>
      </div>
    </div>
  );
}

export default function NotifikasiPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [hasMounted, setHasMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [groups, setGroups] = useState<NotificationGroup[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;
    if (!isAuthenticated) {
      router.replace("/auth/login");
      return;
    }

    async function loadNotifications() {
      try {
        setErrorMessage(null);
        setIsLoading(true);

        const response = await apiFetch("/api/notifications", {
          credentials: "include",
        });

        if (response.status === 401) {
          router.replace("/auth/login");
          return;
        }

        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(payload.error ?? "Gagal memuat notifikasi");
        }

        const payload = (await response.json()) as {
          notifications: ApiNotification[];
        };

        setGroups(buildGroupsFromApi(payload.notifications ?? []));
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Gagal memuat notifikasi",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadNotifications();
  }, [hasMounted, isAuthenticated, router]);

  if (!hasMounted || !isAuthenticated || isLoading) {
    return <PageLoader message="Memuat notifikasi..." />;
  }

  const unreadCount = groups
    .flatMap((g) => g.items)
    .filter((item) => item.isUnread).length;

  async function markAllRead() {
    // Snapshot pre-update state so we can roll back on failure.
    const snapshot = groups;

    setGroups((prev) =>
      prev.map((group) => ({
        ...group,
        items: group.items.map((item) => ({ ...item, isUnread: false })),
      })),
    );

    try {
      const res = await apiFetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ markAllRead: true }),
      });
      if (!res.ok) {
        // Roll back the optimistic update.
        setGroups(snapshot);
        setErrorMessage("Gagal menandai semua notifikasi sebagai dibaca");
      }
    } catch {
      // Roll back the optimistic update.
      setGroups(snapshot);
      setErrorMessage("Gagal menandai semua notifikasi sebagai dibaca");
    }
  }

  async function markOneRead(id: string, actionUrl: string | null) {
    // Snapshot pre-update state so we can roll back on failure.
    const snapshot = groups;

    setGroups((prev) =>
      prev.map((group) => ({
        ...group,
        items: group.items.map((item) =>
          item.id === id ? { ...item, isUnread: false } : item,
        ),
      })),
    );

    try {
      const res = await apiFetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ notificationId: id }),
      });
      if (!res.ok) {
        // Roll back the optimistic update.
        setGroups(snapshot);
        setErrorMessage("Gagal menandai notifikasi");
        return;
      }
    } catch {
      // Roll back the optimistic update.
      setGroups(snapshot);
      setErrorMessage("Gagal menandai notifikasi");
      return;
    }

    if (actionUrl) {
      router.push(actionUrl);
    }
  }

  return (
    <main className="flex h-full min-h-0 flex-col bg-app-surface-alt">
      <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-app-surface/90 backdrop-blur-xl shadow-[0_8px_24px_rgba(0,40,5,0.06)] border-b border-[var(--color-input-border)]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full text-app-primary transition hover:bg-app-primary-muted active:scale-90"
            aria-label="Kembali"
            id="notifikasi-back-btn"
          >
            <ArrowBackIcon />
          </button>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-lg text-app-title tracking-tight">
              Notifikasi
            </h1>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-app-primary text-white text-[10px] font-bold leading-none">
                {unreadCount}
              </span>
            )}
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="flex items-center gap-1.5 text-app-primary text-xs font-semibold px-3 py-1.5 rounded-full transition hover:bg-app-primary-muted active:scale-95"
            id="notifikasi-mark-all-read-btn"
          >
            <DoneAllIcon />
            Tandai semua dibaca
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-8 pt-4 space-y-6">
        {errorMessage && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {groups.map((group, groupIndex) => (
          <section
            key={group.label}
            aria-labelledby={`notif-group-${groupIndex}`}
          >
            <div className="flex items-center gap-2 mb-3 px-1">
              <span
                id={`notif-group-${groupIndex}`}
                className="text-xs font-semibold text-app-body-muted uppercase tracking-wider"
              >
                {group.label}
              </span>
              <span className="flex-1 h-px bg-[var(--color-input-border)]" />
            </div>

            <div className="space-y-3">
              {group.items.map((item) => (
                <NotificationCard
                  key={item.id}
                  item={item}
                  muted={group.muted ?? false}
                  onRead={markOneRead}
                />
              ))}
            </div>
          </section>
        ))}

        {groups.length > 0 && (
          <div className="pt-2">
            <TipsWargaBanner />
          </div>
        )}

        {groups.every((group) => group.items.length === 0) && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <BellIcon className="h-12 w-12 text-app-body-muted" aria-hidden />
            <p className="text-sm text-app-body-muted font-medium">
              Belum ada notifikasi
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
