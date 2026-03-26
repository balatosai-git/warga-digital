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
  formatRupiah,
} from "@/lib/constants/marketplace-catalog";

const RESIDENT_POSTS: ResidentPostItem[] = [
  {
    id: "post-1",
    title: "Bazar RT 03 - Akhir Pekan Ini",
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
  const [isHeaderProfileReady, setIsHeaderProfileReady] = useState(false);

  const [umkmItems, setUmkmItems] = useState<HorizontalCardItem[]>([]);
  const [jasaItems, setJasaItems] = useState<HorizontalCardItem[]>([]);
  const [isMarketplaceLoaded, setIsMarketplaceLoaded] = useState(false);

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

    setIsHeaderProfileReady(false);

    const fromCookie = getHeaderProfileCookie();
    if (fromCookie) {
      setHeaderProfile(fromCookie);
      setIsHeaderProfileReady(true);
      return;
    }

    let cancelledProfile = false;
    fetch("/api/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelledProfile || !data) return;
        const house = data.house;
        const blok =
          house?.blok_rumah && house?.name
            ? `Blok - ${house.blok_rumah}`
            : house?.blok_rumah ?? "Blok -";
        const payload = {
          name: data.fullName ?? user?.fullName ?? "Warga",
          profilePictureUrl: data.profilePictureUrl ?? null,
          blokRumah: blok,
        };
        setHeaderProfile(payload);
        setHeaderProfileCookie(payload);
        setIsHeaderProfileReady(true);
      })
      .catch(() => {});

    let cancelledMarketplace = false;
    fetch("/api/marketplace/summary")
      .then((res) => (res.ok ? res.json() : null))
      .then((resData) => {
        if (cancelledMarketplace || !resData || !resData.success) {
          setIsMarketplaceLoaded(true);
          return;
        }
        const buildItems = (cats: any[]) =>
          cats
            .filter((c) => c.itemCount > 0)
            .map((c) => ({
              id: c.id,
              icon: c.icon,
              title: c.title,
              description:
                c.cheapest != null
                  ? `Mulai ${formatRupiah(c.cheapest)}`
                  : c.description ?? "",
            }));
        setUmkmItems(buildItems(resData.data.UMKM || []));
        setJasaItems(buildItems(resData.data.JASA || []));
        setIsMarketplaceLoaded(true);
      })
      .catch(() => {
        if (!cancelledMarketplace) setIsMarketplaceLoaded(true);
      });

    return () => {
      cancelledProfile = true;
      cancelledMarketplace = true;
    };
  }, [isAuthenticated, user?.fullName]);

  if (!hasMounted || !isAuthenticated || !isHeaderProfileReady || !headerProfile) {
    return <PageLoader message="Memuat..." />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-app-surface-alt">
      <LandingHeader
        name={headerProfile.name}
        profilePictureUrl={headerProfile.profilePictureUrl}
        blokRumah={headerProfile.blokRumah}
        saldo="Rp 0"
        onNotificationPress={() => router.push("/notifikasi")}
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

        {!isMarketplaceLoaded ? (
          <div className="py-8 text-center">
            <p className="text-sm font-medium text-app-body-muted animate-pulse">Memuat layanan warga...</p>
          </div>
        ) : (
          <>
            {umkmItems.length > 0 ? (
              <HorizontalCardStrip
                title="Umkm RT 03"
                items={umkmItems}
              />
            ) : (
              <section className="py-4">
                <div className="mb-3 px-4">
                  <h2 className="text-lg font-bold text-app-title">Umkm RT 03</h2>
                </div>
                <div className="px-4">
                  <div className="rounded-xl border border-dashed border-emerald-200/50 bg-emerald-50/50 p-6 flex flex-col items-center justify-center text-center">
                    <p className="text-[14px] text-emerald-800 font-semibold mb-1">Dukung Ekonomi Tetangga!</p>
                    <p className="text-[12px] text-emerald-700 leading-relaxed">Belum ada listing UMKM terdaftar di lingkungan ini.</p>
                  </div>
                </div>
              </section>
            )}

            {jasaItems.length > 0 ? (
              <HorizontalCardStrip
                title="Jasa RT 03"
                items={jasaItems}
              />
            ) : (
              <section className="py-4">
                <div className="mb-3 px-4">
                  <h2 className="text-lg font-bold text-app-title">Jasa RT 03</h2>
                </div>
                <div className="px-4">
                  <div className="rounded-xl border border-dashed border-emerald-200/50 bg-emerald-50/50 p-6 flex flex-col items-center justify-center text-center">
                    <p className="text-[14px] text-emerald-800 font-semibold mb-1">Berdayakan Keahlian Warga!</p>
                    <p className="text-[12px] text-emerald-700 leading-relaxed">Belum ada listing Jasa terdaftar di lingkungan ini.</p>
                  </div>
                </div>
              </section>
            )}
          </>
        )}

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
