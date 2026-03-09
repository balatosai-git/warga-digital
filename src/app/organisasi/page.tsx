"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { PageLoader, getInitials } from "@/components/ui";
import { getWhatsAppLink } from "@/lib/organisation-data";
import type { OrganisationTreeApi, OrganisationMemberApi, OrganisationRoleApi } from "@/lib/organisation-api";

function MemberCard({ member }: { member: OrganisationMemberApi }) {
  const isVacant = member.userId == null || !member.whatsappNumber?.trim();
  const displayName = isVacant ? "Vacant" : member.fullName;
  const profilePictureUrl = member.profilePictureUrl?.trim() || null;
  const [imgError, setImgError] = useState(false);
  const showImage = !isVacant && profilePictureUrl && !imgError;
  const cardContent = (
    <>
      <div className={`relative min-h-0 flex-1 overflow-hidden rounded-t-2xl ${isVacant ? "bg-app-body-muted/10" : "bg-app-surface-alt/60"}`}>
        {showImage ? (
          <img
            src={profilePictureUrl!}
            alt={displayName}
            className="absolute inset-0 h-full w-full object-cover object-center"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className={`flex h-full w-full items-center justify-center font-semibold text-[clamp(0.75rem,4vw,1.25rem)] ${isVacant ? "bg-app-body-muted/20 text-app-body-muted" : "bg-app-primary/15 text-app-primary"}`}>
            <span>{isVacant ? "—" : getInitials(displayName)}</span>
          </div>
        )}
      </div>
      <div className="flex shrink-0 flex-col justify-center truncate border-t border-[var(--color-input-border)] bg-white px-2 py-1.5 text-center">
        <p className="truncate font-medium text-app-title text-xs leading-tight">{displayName}</p>
        <p className="truncate text-[10px] leading-tight text-app-body-muted">{isVacant ? "Peran kosong" : member.blockName}</p>
        {!isVacant && (
          <span className="mt-0.5 inline-flex items-center justify-center gap-0.5 text-[10px] text-app-primary">
            <WhatsAppIcon className="h-3 w-3" />
            WhatsApp
          </span>
        )}
      </div>
    </>
  );
  const cardClass = "flex aspect-square min-w-0 flex-col overflow-hidden rounded-2xl border border-[var(--color-input-border)] bg-white shadow-sm transition-shadow hover:shadow-md active:scale-[0.99]";
  if (isVacant) {
    return <div className={cardClass}>{cardContent}</div>;
  }
  return (
    <Link href={getWhatsAppLink(member.whatsappNumber)} target="_blank" rel="noopener noreferrer" className={cardClass} aria-label={`Hubungi ${displayName} via WhatsApp`}>
      {cardContent}
    </Link>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function RoleSection({ role }: { role: OrganisationRoleApi }) {
  return (
    <section className="mb-6" aria-labelledby={`role-${role.id}`}>
      <h2
        id={`role-${role.id}`}
        className="mb-3 text-base font-semibold text-app-title"
      >
        {role.title}
      </h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {role.members.map((member) => (
          <MemberCard key={member.id} member={member} />
        ))}
      </div>
    </section>
  );
}

export default function OrganisasiPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [hasMounted, setHasMounted] = useState(false);
  const [canManageOrganisation, setCanManageOrganisation] = useState(false);
  const [tree, setTree] = useState<OrganisationTreeApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    if (!hasMounted || !isAuthenticated) return;
    fetch("/api/organisation/permissions", { credentials: "include" })
      .then((res) => res.json())
      .then((data: { canManageOrganisation?: boolean }) => {
        setCanManageOrganisation(Boolean(data?.canManageOrganisation));
      })
      .catch(() => setCanManageOrganisation(false));
  }, [hasMounted, isAuthenticated]);

  useEffect(() => {
    if (!hasMounted || !isAuthenticated) return;
    setLoading(true);
    setError(null);
    fetch("/api/organisation", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Gagal memuat data organisasi");
        return res.json();
      })
      .then((data: OrganisationTreeApi) => {
        setTree(data);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Gagal memuat data organisasi");
      })
      .finally(() => setLoading(false));
  }, [hasMounted, isAuthenticated]);

  if (!hasMounted || !isAuthenticated) {
    return <PageLoader message="Memuat..." />;
  }

  return (
    <main className="flex h-full min-h-0 flex-col bg-app-surface-alt">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-app-title">
            Struktur Organisasi RT 03
          </h1>
          {canManageOrganisation && (
            <Link
              href="/organisasi/manage"
              className="inline-flex items-center gap-2 rounded-2xl bg-app-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98] hover:opacity-95"
              aria-label="Kelola organisasi"
            >
              <ManageIcon />
              <span>Kelola Organisasi</span>
            </Link>
          )}
        </div>

        {loading && (
          <p className="py-8 text-center text-app-body-muted">Memuat struktur organisasi...</p>
        )}
        {error && (
          <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}
        {!loading && !error && tree && (
          <>
            {tree.roles.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[var(--color-input-border)] bg-white/50 py-8 text-center text-app-body-muted">
                Belum ada data organisasi.
              </p>
            ) : (
              tree.roles.map((role) => (
                <RoleSection key={role.id} role={role} />
              ))
            )}
          </>
        )}
        <div className="h-6" aria-hidden />
      </div>
    </main>
  );
}

function ManageIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}
