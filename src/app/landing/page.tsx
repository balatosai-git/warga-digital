"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { PageLoader } from "@/components/ui";
import { LandingHeader } from "@/components/landing/LandingHeader";
import {
  getHeaderProfileCookie,
  setHeaderProfileCookie,
} from "@/lib/header-profile-cookie";
import { FeatureGrid } from "@/components/landing/FeatureGrid";
import {
  HorizontalCardStrip,
  type HorizontalCardItem,
} from "@/components/landing/HorizontalCardStrip";
import {
  ResidentPostsSection,
  type ResidentPostItem,
} from "@/components/landing/ResidentPostsSection";
import {
  MOCK_UMKM_CATEGORIES,
  MOCK_JASA_CATEGORIES,
  getItemsByDomain,
  formatRupiah,
} from "@/lib/constants/marketplace-catalog";

const UMKM_ITEMS: HorizontalCardItem[] = MOCK_UMKM_CATEGORIES.map((c) => {
  const items = getItemsByDomain("UMKM", c.id);
  const cheapest = items.length ? Math.min(...items.map((i) => i.final_price)) : null;
  return {
    id: c.id,
    icon: c.icon,
    title: c.name,
    description: cheapest != null ? `Mulai ${formatRupiah(cheapest)}` : (c.description ?? ""),
  };
});

const JASA_ITEMS: HorizontalCardItem[] = MOCK_JASA_CATEGORIES.map((c) => {
  const items = getItemsByDomain("JASA", c.id);
  const cheapest = items.length ? Math.min(...items.map((i) => i.final_price)) : null;
  return {
    id: c.id,
    icon: c.icon,
    title: c.name,
    description: cheapest != null ? `Mulai ${formatRupiah(cheapest)}` : (c.description ?? ""),
  };
});

const RESIDENT_POSTS: ResidentPostItem[] = [
  {
    id: "post-1",
    title: "Bazar RT 03 – Akhir Pekan Ini",
    excerpt: "Lokasi lapangan RT. Bawa keluarga, banyak stand makanan dan kerajinan warga.",
    author: "Pengurus RT 03",
  },
  {
    id: "post-2",
    title: "Jasa Service AC Blok N",
    excerpt: "Bersih & isi freon. Hubungi Pak Budi 08xxx.",
    author: "Blok N",
  },
  {
    id: "post-3",
    title: "Kumpul Kebersihan Minggu Pagi",
    excerpt: "Kerja bakti lingkungan. Meet di poskamling 06.00.",
    author: "Ketua RT",
  },
  {
    id: "post-4",
    title: "Lelang Barang Bekas Layak Pakai",
    excerpt: "Meja, kursi, lemari. Lihat di grup WA.",
    author: "Warga Blok A",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const [headerProfile, setHeaderProfile] = useState<{
    name: string;
    profilePictureUrl: string | null;
    blokRumah: string;
  } | null>(null);
  const [showVersionBanner, setShowVersionBanner] = useState(true);

  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;
    if (!isAuthenticated) {
      router.replace("/auth/login");
    }
  }, [hasMounted, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const fromCookie = getHeaderProfileCookie();
    if (fromCookie) {
      setHeaderProfile(fromCookie);
      return;
    }
    let cancelled = false;
    fetch("/api/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const house = data.house;
        const blok =
          house?.blok_rumah && house?.name
            ? `Blok — ${house.blok_rumah}`
            : house?.blok_rumah ?? "Blok —";
        const payload = {
          name: data.fullName ?? user?.fullName ?? "Warga",
          profilePictureUrl: data.profilePictureUrl ?? null,
          blokRumah: blok,
        };
        setHeaderProfile(payload);
        setHeaderProfileCookie(payload);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.fullName]);

  if (!hasMounted || !isAuthenticated) {
    return <PageLoader message="Memuat..." />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-app-surface-alt">
      <LandingHeader
        name={headerProfile?.name ?? user?.fullName ?? "Warga"}
        profilePictureUrl={headerProfile?.profilePictureUrl}
        blokRumah={headerProfile?.blokRumah ?? "Blok —"}
        saldo="Rp 0"
        onNotificationPress={() => {}}
        onMenuPress={() => {}}
      />

      <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        {showVersionBanner && (
          <div className="flex items-start gap-3 border-b border-app-primary/60 bg-app-primary-muted px-4 py-3 text-xs text-app-title shadow-sm">
            <p className="flex-1 text-[13px] leading-snug">
              <span className="font-semibold">Versi 1.0.0</span>: versi minimum yang di rilis, baru bisa
              pencatatan, laporan transaksi RT, lihat organisasi. selebihnya belum matang.
            </p>
            <button
              type="button"
              onClick={() => setShowVersionBanner(false)}
              className="ml-2 shrink-0 rounded-full px-2 py-1 text-[11px] font-medium text-app-primary transition hover:bg-app-surface hover:text-app-primary active:opacity-80"
            >
              Tutup
            </button>
          </div>
        )}
        <FeatureGrid />

        <HorizontalCardStrip
          title="Umkm RT 03"
          items={UMKM_ITEMS}
          viewAllHref="#jual-beli"
        />

        <HorizontalCardStrip
          title="Jasa RT 03"
          items={JASA_ITEMS}
          viewAllHref="#jasa"
        />

        <ResidentPostsSection
          title="Info Warga"
          items={RESIDENT_POSTS}
          detailHref={(id) => `#${id}`}
        />

        {/* Bottom safe area padding */}
        <div className="h-6" />
      </main>
    </div>
  );
}
