"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowPathIcon,
  BuildingOffice2Icon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronUpIcon,
  HomeModernIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { PageLoader } from "@/components/ui";
import { apiFetch } from "@/lib/api-client";
import { hasAdminRoleInProfile } from "@/lib/roles";
import { useAuthStore } from "@/stores/auth-store";

interface ProfileData {
  roles?: Array<{ id: number; name: string; description: string | null }>;
  residences?: Array<{
    roles?: Array<{ id: number; name: string; description: string | null }>;
  }>;
}

interface HouseItem {
  id: string;
  blok_rumah: string | null;
  name: string;
  address: string | null;
  total_residents: number;
  status: string;
  is_active: boolean;
  owner_full_name?: string | null;
  source_full_name?: string | null;
  residents?: Array<{
    user_id: string;
    full_name: string;
    relationship: string | null;
  }>;
}

function statusLabel(status: string): string {
  if (status === "KONTRAKAN") return "Kontrakan";
  if (status === "KANTOR") return "Kantor";
  return "Pribadi";
}

type OccupancyFilter = "ALL" | "KONTRAKAN" | "PRIBADI" | "KOSONG" | "TERISI";

export default function AdminBlokRumahPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const clearUser = useAuthStore((s) => s.clearUser);

  const [hasMounted, setHasMounted] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [occupancyFilter, setOccupancyFilter] = useState<OccupancyFilter>("ALL");
  const [houses, setHouses] = useState<HouseItem[]>([]);
  const [expandedHouseIds, setExpandedHouseIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;
    if (!isAuthenticated) {
      router.replace("/auth/login?redirect=/admin/blok-rumah");
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
            router.replace("/auth/login?redirect=/admin/blok-rumah");
            return;
          }
          router.replace("/landing");
          return;
        }

        const profile = (await res.json()) as ProfileData;
        if (!hasAdminRoleInProfile(profile)) {
          router.replace("/landing");
          return;
        }
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

  const loadHouses = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await apiFetch("/api/admin/houses");
      const body = (await res.json().catch(() => ({}))) as {
        houses?: HouseItem[];
        error?: string;
      };

      if (!res.ok) {
        setError(body.error ?? "Gagal memuat daftar blok rumah");
        return;
      }

      setHouses(body.houses ?? []);
    } catch {
      setError("Gagal memuat daftar blok rumah. Periksa koneksi Anda.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const toggleExpandedHouse = useCallback((houseId: string) => {
    setExpandedHouseIds((prev) => ({ ...prev, [houseId]: !prev[houseId] }));
  }, []);

  useEffect(() => {
    if (!checkingAccess && isAuthenticated) {
      void loadHouses();
    }
  }, [checkingAccess, isAuthenticated, loadHouses]);

  const filteredHouses = useMemo(() => {
    const q = query.trim().toLowerCase();
    return houses.filter((house) => {
      if (occupancyFilter === "TERISI" && (house.total_residents ?? 0) === 0) {
        return false;
      }
      if (occupancyFilter === "KOSONG" && (house.total_residents ?? 0) > 0) {
        return false;
      }
      if (
        occupancyFilter !== "ALL" &&
        occupancyFilter !== "TERISI" &&
        occupancyFilter !== "KOSONG" &&
        house.status !== occupancyFilter
      ) {
        return false;
      }
      if (!q) return true;
      const blok = (house.blok_rumah ?? "").toLowerCase();
      const name = (house.name ?? "").toLowerCase();
      const address = (house.address ?? "").toLowerCase();
      return blok.includes(q) || name.includes(q) || address.includes(q);
    });
  }, [houses, occupancyFilter, query]);

  const totalResidents = useMemo(
    () => houses.reduce((sum, house) => sum + (house.total_residents ?? 0), 0),
    [houses],
  );

  if (!hasMounted || !isAuthenticated || checkingAccess) {
    return <PageLoader message="Memuat daftar blok rumah..." />;
  }

  return (
    <main className="flex h-full min-h-0 flex-col bg-app-surface-alt">
      <section
        className="relative shrink-0 overflow-hidden px-4 pb-5 pt-4 text-white"
        style={{
          background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)",
        }}
      >
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/10" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/admin")}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm transition hover:bg-white/30 active:scale-90"
              aria-label="Kembali ke admin"
            >
              <ChevronLeftIcon className="h-5 w-5 text-white" />
            </button>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                Admin RT
              </p>
              <h1 className="truncate text-lg font-extrabold leading-tight text-white">
                List Blok Rumah
              </h1>
            </div>

            <button
              type="button"
              onClick={() => void loadHouses(true)}
              disabled={refreshing || loading}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm transition hover:bg-white/30 active:scale-90 disabled:opacity-50"
              aria-label="Segarkan"
            >
              <ArrowPathIcon
                className={`h-4 w-4 text-white ${refreshing ? "animate-spin" : ""}`}
              />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-white/15 px-2 py-2 text-center backdrop-blur-sm">
              <p className="text-[10px] text-white/70 font-medium">Total Blok</p>
              <p className="text-base font-extrabold text-white leading-tight">
                {houses.length}
              </p>
            </div>
            <div className="rounded-xl bg-white/15 px-2 py-2 text-center backdrop-blur-sm">
              <p className="text-[10px] text-white/70 font-medium">Ditampilkan</p>
              <p className="text-base font-extrabold text-white leading-tight">
                {filteredHouses.length}
              </p>
            </div>
            <div className="rounded-xl bg-white/15 px-2 py-2 text-center backdrop-blur-sm">
              <p className="text-[10px] text-white/70 font-medium">Total Warga</p>
              <p className="text-base font-extrabold text-white leading-tight">
                {totalResidents}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="shrink-0 bg-app-surface-alt px-4 pb-3 pt-3 space-y-2.5 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.08)]">
        {error && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700">{error}</p>
            <button
              type="button"
              onClick={() => void loadHouses(true)}
              className="shrink-0 text-xs font-semibold text-red-600 underline underline-offset-2"
            >
              Coba lagi
            </button>
          </div>
        )}

        <div
          className="flex items-center gap-2.5 rounded-2xl border bg-app-surface px-3.5 py-2.5 shadow-sm"
          style={{ borderColor: "var(--color-input-border)" }}
        >
          <MagnifyingGlassIcon className="h-4 w-4 shrink-0 text-app-body-muted/60" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari blok, nama pengguna, atau alamat..."
            className="flex-1 bg-transparent text-sm text-app-body placeholder:text-app-body-muted/50 outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-app-body-muted/60 hover:text-app-body-muted"
              aria-label="Hapus pencarian"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { value: "ALL" as const, label: "Semua" },
            { value: "PRIBADI" as const, label: "Pribadi" },
            { value: "KONTRAKAN" as const, label: "Kontrakan" },
            { value: "KOSONG" as const, label: "Kosong" },
            { value: "TERISI" as const, label: "Terisi" },
          ].map((item) => {
            const active = occupancyFilter === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setOccupancyFilter(item.value)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "bg-app-primary text-white"
                    : "border border-[var(--color-input-border)] bg-app-surface text-app-body-muted"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading && !refreshing ? (
          <div className="space-y-2.5">
            {[1, 2, 3, 4].map((k) => (
              <div
                key={k}
                className="animate-pulse rounded-2xl bg-app-surface p-4 shadow-[0_6px_20px_rgba(0,40,5,0.05)]"
              >
                <div className="h-4 w-24 rounded bg-app-surface-alt" />
                <div className="mt-2 h-3 w-40 rounded bg-app-surface-alt" />
              </div>
            ))}
          </div>
        ) : filteredHouses.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-[var(--color-input-border)] bg-app-surface py-12 text-center">
            <HomeModernIcon className="h-10 w-10 text-app-body-muted/40" />
            <div>
              <p className="text-sm font-semibold text-app-body-muted">
                {query ? "Tidak ada blok yang cocok" : "Belum ada data blok rumah"}
              </p>
              <p className="mt-1 text-xs text-app-body-muted/70">
                {query
                  ? "Coba gunakan kata kunci lain"
                  : "Data blok rumah akan tampil di sini"}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredHouses.map((house) => {
              const isExpanded = Boolean(expandedHouseIds[house.id]);
              const residents = house.residents ?? [];
              return (
                <article
                  key={house.id}
                  className="rounded-2xl bg-app-surface p-4 shadow-[0_8px_24px_rgba(0,40,5,0.06)]"
                >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-app-body-muted">
                      Blok Rumah
                    </p>
                    <h2 className="truncate text-base font-extrabold text-app-title">
                      {house.blok_rumah ?? "-"}
                    </h2>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-full bg-app-primary-muted px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-app-primary">
                      {statusLabel(house.status)}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleExpandedHouse(house.id)}
                      className="rounded-full border border-[var(--color-input-border)] p-1 text-app-body-muted transition hover:bg-app-surface-alt"
                      aria-label={isExpanded ? "Sembunyikan daftar warga" : "Lihat daftar warga"}
                      title={isExpanded ? "Sembunyikan daftar warga" : "Lihat daftar warga"}
                    >
                      {isExpanded ? (
                        <ChevronUpIcon className="h-4 w-4" />
                      ) : (
                        <ChevronDownIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-app-body-muted">
                  <div className="flex items-center gap-1.5">
                    <BuildingOffice2Icon className="h-4 w-4" />
                    <span className="truncate">{house.name || "Belum ada pemilik"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <UserGroupIcon className="h-4 w-4" />
                    <span>{house.total_residents ?? 0} warga</span>
                  </div>
                </div>

                {house.address && (
                  <p className="mt-2 line-clamp-2 text-xs text-app-body-muted">
                    {house.address}
                  </p>
                )}

                {isExpanded && (
                  <div className="mt-3 rounded-xl border border-[var(--color-input-border)] bg-app-surface-alt/70 p-2.5">
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-app-body-muted">
                      Daftar Warga
                    </p>
                    {residents.length === 0 ? (
                      <p className="text-xs text-app-body-muted">Belum ada warga terdaftar</p>
                    ) : (
                      <ul className="space-y-1">
                        {residents.map((resident) => (
                          <li
                            key={resident.user_id}
                            className="flex items-center justify-between gap-2 rounded-lg bg-app-surface px-2.5 py-1.5 text-xs"
                          >
                            <span className="truncate text-app-body">{resident.full_name}</span>
                            <span className="shrink-0 rounded-full bg-app-primary-muted px-2 py-0.5 text-[10px] font-semibold text-app-primary">
                              {resident.relationship ?? "WARGA"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
