"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  PencilSquareIcon,
  UserGroupIcon,
  BuildingOffice2Icon,
  ChatBubbleLeftRightIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { useAuthStore } from "@/stores/auth-store";
import { PageLoader, getInitials } from "@/components/ui";
import { getWhatsAppLink } from "@/lib/organisation-data";
import { apiFetch } from "@/lib/api-client";
import type {
  OrganisationTreeApi,
  OrganisationMemberApi,
  OrganisationRoleApi,
} from "@/lib/organisation-api";

/* ─── Keyframes ──────────────────────────────────────────── */
const keyframes = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

/* ─── Member Card (portrait) ─────────────────────────────── */
function MemberCard({ member }: { member: OrganisationMemberApi }) {
  const isVacant = member.userId == null || !member.whatsappNumber?.trim();
  const displayName = isVacant ? "Posisi Kosong" : member.fullName;
  const [imgError, setImgError] = useState(false);
  const profilePictureUrl = member.profilePictureUrl?.trim() || null;
  const showImage = !isVacant && profilePictureUrl && !imgError;

  const card = (
    <div className="flex flex-col overflow-hidden rounded-3xl bg-app-surface shadow-[0_4px_20px_rgba(0,40,5,0.08)] transition-all">
      {/* Large photo area — square, fills full card width */}
      <div
        className={`relative aspect-square w-full overflow-hidden ${
          isVacant ? "bg-amber-50" : ""
        }`}
        style={
          !isVacant ? { background: "var(--color-primary-muted)" } : undefined
        }
      >
        {showImage ? (
          <img
            src={profilePictureUrl!}
            alt={displayName}
            className="absolute inset-0 h-full w-full object-cover object-center"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className={`flex h-full w-full items-center justify-center ${
              isVacant ? "text-amber-300" : ""
            }`}
            style={!isVacant ? { color: "var(--color-primary)" } : undefined}
          >
            {isVacant ? (
              <span className="text-5xl font-bold">—</span>
            ) : (
              <span className="text-5xl font-extrabold">
                {getInitials(displayName)}
              </span>
            )}
          </div>
        )}

        {/* Vacant badge */}
        {isVacant && (
          <span className="absolute right-2 top-2 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-500">
            Kosong
          </span>
        )}

        {/* WhatsApp pill — bottom-right of photo */}
        {!isVacant && (
          <div
            className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full shadow-md"
            style={{ background: "var(--color-primary)" }}
          >
            <ChatBubbleLeftRightIcon
              className="h-4 w-4 text-white"
              aria-hidden
            />
          </div>
        )}
      </div>

      {/* Info strip */}
      <div
        className="border-t px-3 py-2.5"
        style={{
          borderColor: "var(--color-input-border)",
          background: "var(--color-surface)",
        }}
      >
        <p
          className={`truncate text-[13px] font-bold leading-tight ${
            isVacant ? "text-app-body-muted" : "text-app-title"
          }`}
        >
          {displayName}
        </p>
        {isVacant ? (
          <p className="mt-0.5 text-[10px] font-medium text-amber-400">
            Belum terisi
          </p>
        ) : (
          <p className="mt-0.5 truncate text-[10px] text-app-body-muted">
            {member.blockName ?? "Warga RT"}
          </p>
        )}
      </div>
    </div>
  );

  if (isVacant) {
    return card;
  }

  return (
    <Link
      href={getWhatsAppLink(member.whatsappNumber)}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-3xl transition-all active:scale-[0.97] hover:shadow-[0_8px_28px_rgba(0,40,5,0.14)]"
      aria-label={`Hubungi ${displayName} via WhatsApp`}
    >
      {card}
    </Link>
  );
}

/* ─── Skeleton Card ──────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-3xl bg-app-surface shadow-[0_4px_20px_rgba(0,40,5,0.06)]">
      <div className="aspect-square w-full bg-app-surface-alt" />
      <div
        className="border-t px-3 py-2.5"
        style={{ borderColor: "var(--color-input-border)" }}
      >
        <div className="h-3.5 w-20 rounded-full bg-app-surface-alt" />
        <div className="mt-1.5 h-2.5 w-14 rounded-full bg-app-surface-alt" />
      </div>
    </div>
  );
}

/* ─── Role Section ───────────────────────────────────────── */
function RoleSection({
  role,
  index,
}: {
  role: OrganisationRoleApi;
  index: number;
}) {
  const activeCount = role.members.filter((m) => m.userId != null).length;

  return (
    <section
      className="mb-6"
      aria-label={role.title}
      style={{
        animation: `fadeInUp 0.35s ease both`,
        animationDelay: `${index * 60}ms`,
      }}
    >
      {/* Section label row */}
      <div className="mb-2.5 flex items-center justify-between px-0.5">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.07em] text-app-body-muted">
          {role.title}
        </h2>
        <span className="rounded-full bg-app-primary-muted px-2.5 py-0.5 text-[10px] font-bold text-app-primary">
          {activeCount} aktif
        </span>
      </div>

      {/* Member cards */}
      <div className="grid grid-cols-2 gap-3">
        {role.members.map((member) => (
          <MemberCard key={member.id} member={member} />
        ))}
      </div>
    </section>
  );
}

/* ─── Metric Pill ────────────────────────────────────────── */
function MetricPill({
  label,
  value,
  skeleton,
  warning,
}: {
  label: string;
  value: number;
  skeleton: boolean;
  warning?: boolean;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-white/15 px-3 py-2.5 backdrop-blur-sm">
      <span className="text-[9px] font-semibold uppercase tracking-widest text-white/60">
        {label}
      </span>
      {skeleton ? (
        <div className="mt-1 h-[18px] w-10 animate-pulse rounded-md bg-white/20" />
      ) : (
        <span
          className={`mt-0.5 text-[15px] font-extrabold leading-tight ${
            warning && value > 0 ? "text-amber-200" : "text-white"
          }`}
        >
          {value}
        </span>
      )}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────── */
export default function OrganisasiPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [hasMounted, setHasMounted] = useState(false);
  const [canManageOrganisation, setCanManageOrganisation] = useState(false);
  const [tree, setTree] = useState<OrganisationTreeApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  /* computed stats */
  const totalRoles = tree?.roles.length ?? 0;
  const totalMembers =
    tree?.roles.reduce(
      (acc, role) => acc + role.members.filter((m) => m.userId != null).length,
      0,
    ) ?? 0;
  const vacantCount =
    tree?.roles.reduce(
      (acc, role) => acc + role.members.filter((m) => m.userId == null).length,
      0,
    ) ?? 0;

  const loadTree = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const res = await apiFetch("/api/organisation", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Gagal memuat data organisasi");
      const data: OrganisationTreeApi = await res.json();
      setTree(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat data organisasi");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;
    if (!isAuthenticated) router.replace("/auth/login");
  }, [hasMounted, isAuthenticated, router]);

  useEffect(() => {
    if (!hasMounted || !isAuthenticated) return;
    apiFetch("/api/organisation/permissions", { credentials: "include" })
      .then((res) => res.json())
      .then((data: { canManageOrganisation?: boolean }) => {
        setCanManageOrganisation(Boolean(data?.canManageOrganisation));
      })
      .catch(() => setCanManageOrganisation(false));
  }, [hasMounted, isAuthenticated]);

  useEffect(() => {
    if (!hasMounted || !isAuthenticated) return;
    void loadTree();
  }, [hasMounted, isAuthenticated, loadTree]);

  const isInitialLoading = loading && !tree && !error;

  if (!hasMounted || !isAuthenticated || isInitialLoading) {
    return <PageLoader message="Memuat struktur organisasi..." />;
  }

  return (
    <>
      <style>{keyframes}</style>

      <main className="flex h-full min-h-0 flex-col bg-app-surface-alt">
        {/* ── Hero ──────────────────────────────────────────── */}
        <section
          className="relative shrink-0 overflow-hidden px-4 pb-5 pt-5 text-white"
          style={{
            background:
              "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)",
          }}
          aria-label="Ringkasan organisasi"
        >
          {/* Decorative blobs */}
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/10"
            aria-hidden
          />

          <div className="relative z-10">
            {/* Header row */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                  Warga Digital · RT 03
                </p>
                <h1 className="text-lg font-extrabold leading-tight text-white">
                  Struktur Organisasi
                </h1>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => void loadTree(true)}
                  disabled={refreshing}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm transition hover:bg-white/30 active:scale-90 disabled:opacity-50"
                  aria-label="Muat ulang"
                >
                  <ArrowPathIcon
                    className={`h-4 w-4 text-white ${refreshing ? "animate-spin" : ""}`}
                    aria-hidden
                  />
                </button>
                {canManageOrganisation && (
                  <Link
                    href="/organisasi/manage"
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm transition hover:bg-white/30 active:scale-90"
                    aria-label="Kelola organisasi"
                  >
                    <PencilSquareIcon
                      className="h-4 w-4 text-white"
                      aria-hidden
                    />
                  </Link>
                )}
              </div>
            </div>

            {/* Metric pills */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              <MetricPill label="Peran" value={totalRoles} skeleton={loading} />
              <MetricPill
                label="Anggota Aktif"
                value={totalMembers}
                skeleton={loading}
              />
              <MetricPill
                label="Posisi Kosong"
                value={vacantCount}
                skeleton={loading}
                warning
              />
            </div>
          </div>
        </section>

        {/* ── Scrollable content ────────────────────────────── */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
          {/* Error banner */}
          {error && (
            <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
              <p className="text-[13px] text-red-600">{error}</p>
              <button
                type="button"
                onClick={() => void loadTree()}
                className="shrink-0 text-xs font-semibold text-red-500 underline underline-offset-2"
              >
                Coba lagi
              </button>
            </div>
          )}

          {/* Skeleton loading */}
          {loading && !tree && (
            <div className="space-y-6">
              {[3, 2, 2].map((count, gi) => (
                <div key={gi}>
                  <div className="mb-2.5 flex items-center justify-between px-0.5">
                    <div className="h-3 w-24 animate-pulse rounded-full bg-app-surface" />
                    <div className="h-4 w-12 animate-pulse rounded-full bg-app-surface" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {Array.from({ length: count }).map((_, i) => (
                      <SkeletonCard key={i} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Roles list */}
          {!loading && !error && tree && (
            <>
              {tree.roles.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[var(--color-input-border)] bg-app-surface/60 py-10 text-center">
                  <BuildingOffice2Icon
                    className="h-8 w-8 text-app-body-muted/30"
                    aria-hidden
                  />
                  <p className="text-[13px] font-medium text-app-body-muted">
                    Belum ada data organisasi
                  </p>
                  <p className="max-w-[180px] text-[11px] leading-relaxed text-app-body-muted/60">
                    Pengurus RT belum menambahkan struktur organisasi.
                  </p>
                  {canManageOrganisation && (
                    <Link
                      href="/organisasi/manage"
                      className="mt-1 text-xs font-bold"
                      style={{ color: "var(--color-primary)" }}
                    >
                      Tambah sekarang
                    </Link>
                  )}
                </div>
              ) : (
                <div>
                  {/* Decorative intro label */}
                  <div className="mb-4 flex items-center gap-3">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: "var(--color-primary-muted)" }}
                    >
                      <UserGroupIcon
                        className="h-[18px] w-[18px]"
                        style={{ color: "var(--color-primary)" }}
                        aria-hidden
                      />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold leading-snug text-app-title">
                        Pengurus RT 03
                      </p>
                      <p className="mt-0.5 text-[11px] leading-snug text-app-body-muted">
                        Ketuk kartu anggota aktif untuk menghubungi via WhatsApp
                      </p>
                    </div>
                  </div>

                  {tree.roles.map((role, index) => (
                    <RoleSection key={role.id} role={role} index={index} />
                  ))}
                </div>
              )}
            </>
          )}

          <div className="h-6" aria-hidden />
        </div>
      </main>
    </>
  );
}
