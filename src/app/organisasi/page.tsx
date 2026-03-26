"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChatBubbleLeftRightIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
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
  return <ChatBubbleLeftRightIcon className={className} aria-hidden />;
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

  const isInitialLoading = loading && !tree && !error;

  if (!hasMounted || !isAuthenticated || isInitialLoading) {
    return <PageLoader message="Memuat struktur organisasi..." />;
  }

  return (
    <main className="flex h-full min-h-0 flex-col bg-app-surface-alt">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-4">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-app-title">
              Struktur Organisasi RT 03
            </h1>
            <p className="mt-1 text-sm text-app-body-muted">
              Lihat susunan pengurus dan kontak penting untuk wilayah RT 03.
            </p>
          </div>
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
  return <PencilSquareIcon className="h-[18px] w-[18px]" aria-hidden />;
}
