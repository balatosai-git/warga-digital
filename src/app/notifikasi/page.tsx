"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { PageLoader } from "@/components/ui";

// ─── Icon components (SVG) ───────────────────────────────────────────────────

function ArrowBackIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  );
}

function DoneAllIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 12l5 5L22 4" />
      <path d="M9 12l5 5" />
    </svg>
  );
}

function WalletIcon({ filled }: { filled?: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 12V8a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4" />
      <path d="M20 12h-6a2 2 0 1 0 0 4h6" />
    </svg>
  );
}

function CampaignIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M18 11.5V7l-4 2.5v-5C14 3.12 12.88 2 11.5 2S9 3.12 9 4.5v7c0 1.38 1.12 2.5 2.5 2.5S14 12.88 14 11.5v-.1L18 14v-2.5zm-6.5 1c-.83 0-1.5-.67-1.5-1.5v-7C10 3.67 10.67 3 11.5 3S13 3.67 13 4.5v7c0 .83-.67 1.5-1.5 1.5zM3 17h18v2H3zm3.56-3h2.1c.51 2.28 2.54 4 4.95 4s4.44-1.72 4.95-4h2.1C20.07 17.27 17.55 20 14.55 20c-3 0-5.52-2.73-5.99-6H8.44l-1.94-1L8.44 11l-1.82-.99z" />
    </svg>
  );
}

function PersonAddIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V8H4v2H2v2h2v2h2v-2h2v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
  );
}

function VerifiedUserIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
    </svg>
  );
}

function GavelIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="m1 21 2-2 9.5-9.5-2-2L1 21zm16.71-14.29-2.83-2.83-1.42 1.42 1.42 1.42-9.88 9.88L7.41 19l9.88-9.88 1.42 1.42 1.42-1.42zM19 2l-3 3 3 3 3-3-3-3z" />
    </svg>
  );
}

function LeafIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-8 2z" />
    </svg>
  );
}

// ─── Data types ──────────────────────────────────────────────────────────────

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  timeLabel: string;
  isUnread: boolean;
  iconBg: string;
  iconColor: string;
  icon: React.ReactNode;
}

interface NotificationGroup {
  label: string;
  items: NotificationItem[];
  muted?: boolean;
}

// ─── Static mock data ─────────────────────────────────────────────────────────

function buildGroups(): NotificationGroup[] {
  return [
    {
      label: "Terbaru",
      items: [
        {
          id: "1",
          title: "Pemasukan Kas RT",
          body: "Iuran sampah dari Blok A-12 telah diterima.",
          timeLabel: "10 menit yang lalu",
          isUnread: true,
          iconBg: "bg-emerald-100",
          iconColor: "text-emerald-700",
          icon: <WalletIcon filled />,
        },
        {
          id: "2",
          title: "Bazar RT 03",
          body: "Jangan lupa kunjungi bazar besok pagi di lapangan.",
          timeLabel: "2 jam yang lalu",
          isUnread: true,
          iconBg: "bg-[#abf4ac]/60",
          iconColor: "text-emerald-800",
          icon: <CampaignIcon />,
        },
        {
          id: "3",
          title: "Penghuni Baru",
          body: "Permohonan bergabung dari Blok B-05 sedang diproses.",
          timeLabel: "5 jam yang lalu",
          isUnread: false,
          iconBg: "bg-emerald-200/60",
          iconColor: "text-emerald-800",
          icon: <PersonAddIcon />,
        },
        {
          id: "4",
          title: "Verifikasi Akun",
          body: "Akun Anda telah berhasil diverifikasi oleh Admin.",
          timeLabel: "Kemarin",
          isUnread: false,
          iconBg: "bg-[var(--color-surface-alt)]",
          iconColor: "text-app-body-muted",
          icon: <VerifiedUserIcon />,
        },
      ],
    },
    {
      label: "Minggu Ini",
      muted: true,
      items: [
        {
          id: "5",
          title: "Hasil Rapat RT",
          body: "Notulensi rapat bulanan Agustus telah diunggah.",
          timeLabel: "Selasa, 14:00",
          isUnread: false,
          iconBg: "bg-[var(--color-input-border)]/50",
          iconColor: "text-app-body-muted",
          icon: <GavelIcon />,
        },
      ],
    },
  ];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NotificationCard({
  item,
  muted,
  onRead,
}: {
  item: NotificationItem;
  muted: boolean;
  onRead: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onRead(item.id)}
      className={`w-full text-left rounded-3xl p-5 flex gap-4 relative shadow-[0_8px_24px_rgba(0,40,5,0.06)] transition-all active:scale-[0.985] focus-visible:outline-none ${
        muted
          ? "bg-app-surface-alt opacity-70"
          : "bg-app-surface hover:shadow-[0_12px_32px_rgba(0,40,5,0.10)]"
      }`}
      aria-label={`${item.isUnread ? "Belum dibaca: " : ""}${item.title} — ${item.body}`}
    >
      {/* Unread dot */}
      {item.isUnread && (
        <span
          className="absolute top-5 right-5 w-2.5 h-2.5 rounded-full bg-app-primary shadow-[0_0_6px_rgba(67,160,71,0.6)]"
          aria-label="Belum dibaca"
        />
      )}

      {/* Icon badge */}
      <span
        className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${item.iconBg} ${item.iconColor}`}
      >
        {item.icon}
      </span>

      {/* Content */}
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
      {/* Decorative circles */}
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NotifikasiPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [hasMounted, setHasMounted] = useState(false);
  const [groups, setGroups] = useState<NotificationGroup[]>([]);

  useEffect(() => {
    setHasMounted(true);
    setGroups(buildGroups());
  }, []);

  useEffect(() => {
    if (!hasMounted) return;
    if (!isAuthenticated) {
      router.replace("/auth/login");
    }
  }, [hasMounted, isAuthenticated, router]);

  if (!hasMounted || !isAuthenticated) {
    return <PageLoader message="Memuat notifikasi..." />;
  }

  const unreadCount = groups
    .flatMap((g) => g.items)
    .filter((i) => i.isUnread).length;

  function markAllRead() {
    setGroups((prev) =>
      prev.map((g) => ({
        ...g,
        items: g.items.map((item) => ({ ...item, isUnread: false })),
      }))
    );
  }

  function markOneRead(id: string) {
    setGroups((prev) =>
      prev.map((g) => ({
        ...g,
        items: g.items.map((item) =>
          item.id === id ? { ...item, isUnread: false } : item
        ),
      }))
    );
  }

  return (
    <main className="flex h-full min-h-0 flex-col bg-app-surface-alt">
      {/* ── Top App Bar ── */}
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

      {/* ── Notification List ── */}
      <div className="flex-1 overflow-y-auto px-4 pb-8 pt-4 space-y-6">
        {groups.map((group, gi) => (
          <section key={group.label} aria-labelledby={`notif-group-${gi}`}>
            {/* Group label */}
            <div className="flex items-center gap-2 mb-3 px-1">
              <span
                id={`notif-group-${gi}`}
                className="text-xs font-semibold text-app-body-muted uppercase tracking-wider"
              >
                {group.label}
              </span>
              <span className="flex-1 h-px bg-[var(--color-input-border)]" />
            </div>

            {/* Cards */}
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

        {/* Tips Warga editorial banner – positioned after first group */}
        <div className="pt-2">
          <TipsWargaBanner />
        </div>

        {/* Empty state guard */}
        {groups.every((g) => g.items.length === 0) && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <span className="text-5xl">🔔</span>
            <p className="text-sm text-app-body-muted font-medium">
              Belum ada notifikasi
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
