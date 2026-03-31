"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ClockIcon,
  UserPlusIcon,
  XCircleIcon,
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

interface JoinRequestItem {
  id: string;
  requesterUserId: string;
  requesterFullName: string;
  requesterWaNumber: string | null;
  houseId: string;
  blokRumah: string;
  requestedAt: string;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function maskWa(wa: string | null): string {
  if (!wa) return "—";
  const digits = wa.replace(/\D/g, "");
  if (digits.length < 8) return wa;
  return `${digits.slice(0, 4)}••••${digits.slice(-3)}`;
}

export default function AdminJoinRequestPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const clearUser = useAuthStore((s) => s.clearUser);

  const [hasMounted, setHasMounted] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [requests, setRequests] = useState<JoinRequestItem[]>([]);
  const [actingRequestId, setActingRequestId] = useState<string | null>(null);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;
    if (!isAuthenticated) {
      router.replace("/auth/login?redirect=/admin/join-request");
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
            router.replace("/auth/login?redirect=/admin/join-request");
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

  const loadRequests = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await apiFetch("/api/admin/join-requests");
      const body = (await res.json().catch(() => ({}))) as {
        items?: JoinRequestItem[];
        error?: string;
      };

      if (!res.ok) {
        setError(body.error ?? "Gagal memuat permintaan");
        return;
      }
      setRequests(body.items ?? []);
    } catch {
      setError("Gagal memuat permintaan. Periksa koneksi Anda.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!checkingAccess && isAuthenticated) {
      void loadRequests();
    }
  }, [checkingAccess, isAuthenticated, loadRequests]);

  const handleRespond = useCallback(
    async (requestId: string, action: "approve" | "reject") => {
      setActingRequestId(requestId);
      setActionError(null);
      try {
        const res = await apiFetch("/api/admin/join-requests/respond", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestId, action }),
        });
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setActionError(body.error ?? "Gagal memproses permintaan");
          return;
        }
        setRequests((prev) => prev.filter((r) => r.id !== requestId));
      } catch {
        setActionError("Gagal memproses permintaan. Coba lagi.");
      } finally {
        setActingRequestId(null);
      }
    },
    [],
  );

  const pendingCount = useMemo(() => requests.length, [requests]);

  if (!hasMounted || !isAuthenticated || checkingAccess) {
    return <PageLoader message="Memuat halaman join request..." />;
  }

  return (
    <main className="flex h-full min-h-0 flex-col bg-app-surface-alt">
      <header className="flex shrink-0 items-center justify-between border-b border-[var(--color-input-border)] bg-app-surface/90 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-app-surface-alt transition hover:bg-app-primary-muted active:scale-95"
            aria-label="Kembali ke admin"
          >
            <ChevronLeftIcon className="h-4 w-4 text-app-body-muted" />
          </button>
          <div>
            <h1 className="text-[13px] font-bold tracking-tight text-app-title">
              Join Request
            </h1>
            <p className="text-[10px] text-app-body-muted">
              {pendingCount} menunggu persetujuan
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => loadRequests(true)}
          disabled={refreshing || loading}
          className="flex h-8 w-8 items-center justify-center rounded-xl bg-app-surface-alt transition hover:bg-app-primary-muted active:scale-95 disabled:opacity-40"
          aria-label="Muat ulang"
        >
          <ArrowPathIcon
            className={`h-4 w-4 text-app-body-muted ${refreshing ? "animate-spin" : ""}`}
          />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-4">
        {error && (
          <div className="mb-3 rounded-2xl border border-red-100 bg-red-50 px-3 py-2">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}
        {actionError && (
          <div className="mb-3 rounded-2xl border border-red-100 bg-red-50 px-3 py-2">
            <p className="text-xs text-red-600">{actionError}</p>
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                className="h-28 animate-pulse rounded-2xl bg-app-surface"
              />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="mt-8 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[var(--color-input-border)] bg-app-surface py-8 text-center">
            <CheckCircleIcon className="h-8 w-8 text-app-body-muted/35" />
            <p className="text-sm font-semibold text-app-title">
              Tidak ada join request
            </p>
            <p className="max-w-[220px] text-xs text-app-body-muted">
              Semua permintaan bergabung sudah ditindaklanjuti.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => {
              const isActing = actingRequestId === req.id;
              return (
                <article
                  key={req.id}
                  className="rounded-2xl bg-app-surface p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04),0_2px_12px_rgba(0,0,0,0.05)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-app-title">
                        {req.requesterFullName}
                      </p>
                      <p className="mt-0.5 text-[11px] text-app-body-muted">
                        WA: {maskWa(req.requesterWaNumber)}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                      <ClockIcon className="h-3 w-3" />
                      Pending
                    </span>
                  </div>

                  <div className="mt-3 rounded-xl bg-app-surface-alt px-3 py-2">
                    <p className="text-[11px] text-app-body-muted">
                      Blok Rumah
                    </p>
                    <p className="text-xs font-semibold text-app-title">
                      {req.blokRumah}
                    </p>
                    <p className="mt-1 text-[10px] text-app-body-muted">
                      Diajukan: {formatDateTime(req.requestedAt)}
                    </p>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleRespond(req.id, "approve")}
                      disabled={actingRequestId !== null}
                      className="flex flex-1 items-center justify-center gap-1 rounded-xl py-2 text-xs font-bold text-white transition active:scale-95 disabled:opacity-50"
                      style={{ background: "var(--color-primary)" }}
                    >
                      {isActing ? (
                        <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <UserPlusIcon className="h-3.5 w-3.5" />
                      )}
                      Setujui
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRespond(req.id, "reject")}
                      disabled={actingRequestId !== null}
                      className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-red-200 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50 active:scale-95 disabled:opacity-50"
                    >
                      <XCircleIcon className="h-3.5 w-3.5" />
                      Tolak
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
