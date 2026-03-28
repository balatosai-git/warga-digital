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
import { formatRupiah } from "@/lib/constants/marketplace-catalog";
import { apiFetch } from "@/lib/api-client";

// ─── API response shapes ──────────────────────────────────────────────────────

interface ProfileApiResponse {
  fullName?: string;
  profilePictureUrl?: string | null;
  house?: {
    blok_rumah?: string | null;
    name?: string;
  } | null;
  walletBalanceFormatted?: string;
}

interface MarketplaceCategorySummary {
  id: string;
  icon: string | null;
  title: string;
  description: string | null;
  cheapest: number | null;
  itemCount: number;
}

interface MarketplaceSummaryResponse {
  success: boolean;
  data: {
    UMKM: MarketplaceCategorySummary[];
    JASA: MarketplaceCategorySummary[];
  };
}

interface AnnouncementApiItem {
  id: string;
  title: string;
  excerpt: string | null;
  authorLabel: string;
  isPinned: boolean;
  publishedAt: string;
}

interface AnnouncementsApiResponse {
  announcements: AnnouncementApiItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build the "Blok - N2" display string from the house object.
 *
 * Fixed: the previous version checked `house?.name` as a condition but then
 * never used `house.name` in the result — the condition was a dead branch.
 * Now the logic is simply: show blok_rumah if present, otherwise fallback.
 */
function buildBlokLabel(
  house: { blok_rumah?: string | null; name?: string } | null | undefined,
): string {
  if (house?.blok_rumah) {
    return `Blok - ${house.blok_rumah}`;
  }
  return "Blok —";
}

/**
 * Map API category summaries into the HorizontalCardStrip item shape.
 * Only categories that have at least one active item are shown.
 *
 * Previously used `any[]` — now typed with the actual API response shape.
 */
function buildMarketplaceItems(
  cats: MarketplaceCategorySummary[],
): HorizontalCardItem[] {
  return cats
    .filter((c) => c.itemCount > 0)
    .map((c) => ({
      id: c.id,
      icon: c.icon ?? "",
      title: c.title,
      description:
        c.cheapest != null
          ? `Mulai ${formatRupiah(c.cheapest)}`
          : (c.description ?? ""),
    }));
}

/**
 * Map API announcement items into the ResidentPostsSection item shape.
 */
function mapAnnouncement(item: AnnouncementApiItem): ResidentPostItem {
  return {
    id: item.id,
    title: item.title,
    excerpt: item.excerpt ?? "",
    author: item.authorLabel,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  // ── Header profile ─────────────────────────────────────────────────────────
  const [headerProfile, setHeaderProfile] = useState<{
    name: string;
    profilePictureUrl: string | null;
    blokRumah: string;
  } | null>(null);
  const [walletBalance, setWalletBalance] = useState("Rp 0");
  const [isHeaderProfileReady, setIsHeaderProfileReady] = useState(false);

  // ── Marketplace ────────────────────────────────────────────────────────────
  const [umkmItems, setUmkmItems] = useState<HorizontalCardItem[]>([]);
  const [jasaItems, setJasaItems] = useState<HorizontalCardItem[]>([]);
  const [isMarketplaceLoaded, setIsMarketplaceLoaded] = useState(false);

  // ── Announcements (Info Warga) ─────────────────────────────────────────────
  const [announcementItems, setAnnouncementItems] = useState<
    ResidentPostItem[]
  >([]);
  const [isAnnouncementsLoaded, setIsAnnouncementsLoaded] = useState(false);

  // ── Mount guard (prevents hydration mismatch) ──────────────────────────────
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // ── Auth redirect ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasMounted) return;
    if (!isAuthenticated) {
      router.replace("/auth/login");
    }
  }, [hasMounted, isAuthenticated, router]);

  // ── Data fetching ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;

    setIsHeaderProfileReady(false);

    let cancelledProfile = false;
    let cancelledMarketplace = false;
    let cancelledAnnouncements = false;

    // ── Profile (header + wallet) ────────────────────────────────────────────
    const fromCookie = getHeaderProfileCookie();
    if (fromCookie) {
      setHeaderProfile(fromCookie);
      setIsHeaderProfileReady(true);
      // Cookie doesn't cache wallet balance; always fetch it fresh.
    }

    apiFetch("/api/profile")
      .then((res) =>
        res.ok ? (res.json() as Promise<ProfileApiResponse>) : null,
      )
      .then((data) => {
        if (cancelledProfile || !data) return;

        const blokRumah = buildBlokLabel(data.house);

        const payload = {
          name: data.fullName ?? user?.fullName ?? "Warga",
          profilePictureUrl: data.profilePictureUrl ?? null,
          blokRumah,
        };

        setHeaderProfile(payload);
        setHeaderProfileCookie(payload);
        setIsHeaderProfileReady(true);

        // Update wallet balance from live profile response.
        if (data.walletBalanceFormatted) {
          setWalletBalance(data.walletBalanceFormatted);
        }
      })
      .catch(() => {
        // If profile fetch fails but we already have a cookie, keep it.
        if (!cancelledProfile && !fromCookie) {
          setIsHeaderProfileReady(false);
        }
      });

    // ── Marketplace summary ──────────────────────────────────────────────────
    apiFetch("/api/marketplace/summary")
      .then((res) =>
        res.ok ? (res.json() as Promise<MarketplaceSummaryResponse>) : null,
      )
      .then((resData) => {
        if (cancelledMarketplace) return;
        if (!resData?.success) {
          setIsMarketplaceLoaded(true);
          return;
        }
        setUmkmItems(buildMarketplaceItems(resData.data.UMKM ?? []));
        setJasaItems(buildMarketplaceItems(resData.data.JASA ?? []));
        setIsMarketplaceLoaded(true);
      })
      .catch(() => {
        if (!cancelledMarketplace) setIsMarketplaceLoaded(true);
      });

    // ── Announcements ────────────────────────────────────────────────────────
    apiFetch("/api/announcements")
      .then((res) =>
        res.ok ? (res.json() as Promise<AnnouncementsApiResponse>) : null,
      )
      .then((resData) => {
        if (cancelledAnnouncements) return;
        if (!resData) {
          setIsAnnouncementsLoaded(true);
          return;
        }
        setAnnouncementItems(
          (resData.announcements ?? []).map(mapAnnouncement),
        );
        setIsAnnouncementsLoaded(true);
      })
      .catch(() => {
        if (!cancelledAnnouncements) setIsAnnouncementsLoaded(true);
      });

    return () => {
      cancelledProfile = true;
      cancelledMarketplace = true;
      cancelledAnnouncements = true;
    };
  }, [isAuthenticated, user?.fullName]);

  // ── Loading guard ──────────────────────────────────────────────────────────
  if (
    !hasMounted ||
    !isAuthenticated ||
    !isHeaderProfileReady ||
    !headerProfile
  ) {
    return <PageLoader message="Memuat..." />;
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full min-h-0 flex-col bg-app-surface-alt">
      <LandingHeader
        name={headerProfile.name}
        profilePictureUrl={headerProfile.profilePictureUrl}
        blokRumah={headerProfile.blokRumah}
        saldo={walletBalance}
        onNotificationPress={() => router.push("/notifikasi")}
      />

      <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        {/* Feature grid */}
        <FeatureGrid />

        {/* Marketplace — UMKM */}
        {!isMarketplaceLoaded ? (
          <div className="py-8 text-center">
            <p className="text-sm font-medium text-app-body-muted animate-pulse">
              Memuat layanan warga...
            </p>
          </div>
        ) : (
          <>
            {umkmItems.length > 0 ? (
              <HorizontalCardStrip title="Umkm RT 03" items={umkmItems} />
            ) : (
              <section className="py-4">
                <div className="mb-3 px-4">
                  <h2 className="text-lg font-bold text-app-title">
                    Umkm RT 03
                  </h2>
                </div>
                <div className="px-4">
                  <div className="rounded-xl border border-dashed border-emerald-200/50 bg-emerald-50/50 p-6 flex flex-col items-center justify-center text-center">
                    <p className="text-[14px] text-emerald-800 font-semibold mb-1">
                      Dukung Ekonomi Tetangga!
                    </p>
                    <p className="text-[12px] text-emerald-700 leading-relaxed">
                      Belum ada listing UMKM terdaftar di lingkungan ini.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Marketplace — Jasa */}
            {jasaItems.length > 0 ? (
              <HorizontalCardStrip title="Jasa RT 03" items={jasaItems} />
            ) : (
              <section className="py-4">
                <div className="mb-3 px-4">
                  <h2 className="text-lg font-bold text-app-title">
                    Jasa RT 03
                  </h2>
                </div>
                <div className="px-4">
                  <div className="rounded-xl border border-dashed border-emerald-200/50 bg-emerald-50/50 p-6 flex flex-col items-center justify-center text-center">
                    <p className="text-[14px] text-emerald-800 font-semibold mb-1">
                      Berdayakan Keahlian Warga!
                    </p>
                    <p className="text-[12px] text-emerald-700 leading-relaxed">
                      Belum ada listing Jasa terdaftar di lingkungan ini.
                    </p>
                  </div>
                </div>
              </section>
            )}
          </>
        )}

        {/* Info Warga — dynamic announcements from /api/announcements */}
        {isAnnouncementsLoaded && announcementItems.length > 0 && (
          <ResidentPostsSection
            title="Info Warga"
            items={announcementItems}
            detailHref={(id) => `#${id}`}
          />
        )}

        {isAnnouncementsLoaded && announcementItems.length === 0 && (
          <section className="py-4">
            <div className="mb-3 px-4">
              <h2 className="text-lg font-bold text-app-title">Info Warga</h2>
            </div>
            <div className="px-4">
              <div className="rounded-xl border border-dashed border-app-primary/20 bg-app-primary-muted/30 p-6 flex flex-col items-center justify-center text-center">
                <p className="text-[14px] text-app-title font-semibold mb-1">
                  Belum ada pengumuman
                </p>
                <p className="text-[12px] text-app-body-muted leading-relaxed">
                  Info dan pengumuman dari pengurus RT akan muncul di sini.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Bottom safe-area padding */}
        <div className="h-6" />
      </main>
    </div>
  );
}
