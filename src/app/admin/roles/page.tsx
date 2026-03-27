"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheckIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
  UsersIcon,
  ChevronLeftIcon,
  XMarkIcon,
  ChevronDownIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  GlobeAltIcon,
  BuildingOffice2Icon,
  HomeIcon,
  UserMinusIcon,
  UserPlusIcon,
  BellIcon,
} from "@heroicons/react/24/outline";
import { ShieldCheckIcon as ShieldCheckSolidIcon } from "@heroicons/react/24/solid";
import { PageLoader } from "@/components/ui";
import { useAuthStore } from "@/stores/auth-store";
import { hasAdminRoleInProfile } from "@/lib/roles";
import { apiFetch } from "@/lib/api-client";
import { DEFAULT_ROLE_WARGA_ID } from "@/lib/constants/seed-ids";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Role {
  id: number;
  name: string;
  description: string | null;
  scope: "SYSTEM" | "TENANT" | "HOUSE";
  created_at: string;
  member_count: number;
}

interface RoleMember {
  tenant_user_role_id: string;
  user_id: string;
  full_name: string;
  wa_number: string | null;
  blok_rumah: string | null;
  assigned_at: string;
}

interface UserSearchResult {
  user_id: string;
  tenant_user_id: string;
  full_name: string;
  wa_number: string | null;
  blok_rumah: string | null;
}

interface ProfileData {
  fullName?: string;
  roles?: Array<{ id: number; name: string; description: string | null }>;
  residences?: Array<{
    roles?: Array<{ id: number; name: string; description: string | null }>;
  }>;
}

type Scope = "SYSTEM" | "TENANT" | "HOUSE";
type ScopeFilter = "ALL" | Scope;

interface ToastState {
  id: number;
  message: string;
  type: "success" | "error" | "warning";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getScopeLabel(scope: Scope): string {
  if (scope === "SYSTEM") return "Sistem";
  if (scope === "TENANT") return "Komunitas";
  return "Rumah";
}

function getScopeDescription(scope: Scope): string {
  if (scope === "SYSTEM") return "Berlaku di seluruh platform";
  if (scope === "TENANT") return "Berlaku dalam komunitas RT";
  return "Berlaku per unit rumah";
}

function getScopePillClass(scope: Scope): string {
  if (scope === "SYSTEM") return "bg-purple-100 text-purple-700";
  if (scope === "TENANT")
    return "bg-[var(--color-primary-muted)] text-[var(--color-primary-hover)]";
  return "bg-amber-100 text-amber-700";
}

function getScopeIconBgClass(scope: Scope): string {
  if (scope === "SYSTEM") return "bg-purple-100 text-purple-600";
  if (scope === "TENANT")
    return "bg-[var(--color-primary-muted)] text-[var(--color-primary)]";
  return "bg-amber-100 text-amber-600";
}

function getScopeSelectedBorder(scope: Scope): string {
  if (scope === "SYSTEM") return "border-purple-500 bg-purple-50";
  if (scope === "TENANT")
    return "border-[var(--color-primary)] bg-[var(--color-primary-muted)]";
  return "border-amber-500 bg-amber-50";
}

function getScopeSelectedText(scope: Scope): string {
  if (scope === "SYSTEM") return "text-purple-700";
  if (scope === "TENANT") return "text-[var(--color-primary-hover)]";
  return "text-amber-700";
}

const ScopeIcons: Record<
  Scope,
  (props: { className?: string }) => JSX.Element
> = {
  SYSTEM: ({ className = "" }) => (
    <GlobeAltIcon className={className} aria-hidden />
  ),
  TENANT: ({ className = "" }) => (
    <BuildingOffice2Icon className={className} aria-hidden />
  ),
  HOUSE: ({ className = "" }) => <HomeIcon className={className} aria-hidden />,
};

function formatRoleDisplayName(name: string): string {
  return name
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function normaliseRoleName(name: string): string {
  return name.trim().toUpperCase().replace(/\s+/g, "_");
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastState;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [onDismiss, toast.id]);

  const bg =
    toast.type === "success"
      ? "var(--color-primary)"
      : toast.type === "warning"
        ? "#d97706"
        : "#dc2626";

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2.5 rounded-2xl px-4 py-3.5 shadow-xl text-sm font-semibold text-white w-[calc(100%-2rem)]"
      style={{
        maxWidth: "calc(var(--app-max-width) - 2rem)",
        background: bg,
        animation: "toastIn 0.3s cubic-bezier(0.34,1.56,0.64,1)",
      }}
    >
      {toast.type === "success" ? (
        <CheckCircleIcon className="h-5 w-5 shrink-0" />
      ) : (
        <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
      )}
      <span className="flex-1 leading-snug">{toast.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
      >
        <XMarkIcon className="h-4 w-4" />
      </button>

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translate(-50%, -12px) scale(0.95); }
          to   { opacity: 1; transform: translate(-50%, 0)    scale(1);    }
        }
      `}</style>
    </div>
  );
}

// ─── Scope badge ──────────────────────────────────────────────────────────────

function ScopeBadge({ scope }: { scope: Scope }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getScopePillClass(scope)}`}
    >
      {scope === "SYSTEM" && <GlobeAltIcon className="h-2.5 w-2.5" />}
      {scope === "TENANT" && <BuildingOffice2Icon className="h-2.5 w-2.5" />}
      {scope === "HOUSE" && <HomeIcon className="h-2.5 w-2.5" />}
      {getScopeLabel(scope)}
    </span>
  );
}

// ─── Member row ───────────────────────────────────────────────────────────────

function MemberRow({
  member,
  onRevoke,
  revoking,
}: {
  member: RoleMember;
  onRevoke: () => void;
  revoking: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-app-surface px-3 py-2.5 shadow-[0_2px_8px_rgba(0,40,5,0.05)]">
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white text-xs font-extrabold shadow-sm"
          style={{ background: "var(--color-primary)" }}
        >
          {getInitials(member.full_name)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-app-title leading-tight">
            {member.full_name}
          </p>
          <p className="text-[10px] text-app-body-muted">
            {member.blok_rumah
              ? `Blok ${member.blok_rumah}`
              : (member.wa_number ?? "—")}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onRevoke}
        disabled={revoking}
        className="shrink-0 flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-red-600 transition hover:bg-red-50 active:scale-90 disabled:opacity-40"
        aria-label={`Cabut role dari ${member.full_name}`}
      >
        {revoking ? (
          <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <UserMinusIcon className="h-3.5 w-3.5" />
        )}
        Cabut
      </button>
    </div>
  );
}

// ─── Role card ────────────────────────────────────────────────────────────────

interface RoleCardProps {
  role: Role;
  isExpanded: boolean;
  members: RoleMember[];
  membersLoading: boolean;
  revokingId: string | null;
  assigningUserId: string | null;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRevokeRole: (member: RoleMember) => void;
  onAssignMember: () => void;
}

function RoleCard({
  role,
  isExpanded,
  members,
  membersLoading,
  revokingId,
  assigningUserId,
  onToggleExpand,
  onEdit,
  onDelete,
  onRevokeRole,
  onAssignMember,
}: RoleCardProps) {
  const ScopeIcon = ScopeIcons[role.scope];

  return (
    <article className="overflow-hidden rounded-3xl bg-app-surface shadow-[0_8px_24px_rgba(0,40,5,0.06)] transition-shadow hover:shadow-[0_12px_32px_rgba(0,40,5,0.10)]">
      {/* Card body */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Scope icon chip */}
          <div
            className={`shrink-0 flex h-11 w-11 items-center justify-center rounded-2xl ${getScopeIconBgClass(role.scope)}`}
          >
            <ScopeIcon className="h-5 w-5" />
          </div>

          {/* Name + description */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="text-sm font-extrabold text-app-title leading-tight">
                {formatRoleDisplayName(role.name)}
              </h3>
              <ScopeBadge scope={role.scope} />
            </div>
            <p className="mt-0.5 text-[11px] font-mono font-semibold text-app-body-muted/70 tracking-tight">
              {role.name}
            </p>
            {role.description ? (
              <p className="mt-1 text-xs text-app-body-muted leading-relaxed line-clamp-2">
                {role.description}
              </p>
            ) : (
              <p className="mt-1 text-xs italic text-app-body-muted/50">
                Tidak ada deskripsi
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={onEdit}
              className="flex h-8 w-8 items-center justify-center rounded-xl transition hover:bg-[var(--color-primary-muted)] active:scale-90"
              style={{ color: "var(--color-primary)" }}
              aria-label={`Edit ${role.name}`}
            >
              <PencilSquareIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-red-500 transition hover:bg-red-50 active:scale-90"
              aria-label={`Hapus ${role.name}`}
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Footer: member count toggle */}
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleExpand}
            className="flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition hover:bg-app-surface-alt active:scale-95"
            style={{
              borderColor: "var(--color-input-border)",
              color: "var(--color-body-muted)",
            }}
          >
            <UsersIcon className="h-3.5 w-3.5" />
            <span>
              {role.member_count === 0
                ? "Belum ada anggota"
                : `${role.member_count} anggota aktif`}
            </span>
            <ChevronDownIcon
              className={`h-3 w-3 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
            />
          </button>

          <span className="text-[10px] text-app-body-muted/50">
            Dibuat {formatShortDate(role.created_at)}
          </span>
        </div>
      </div>

      {/* Expandable members panel */}
      {isExpanded && (
        <div
          className="border-t px-4 py-3 space-y-2"
          style={{
            borderColor: "var(--color-input-border)",
            background: "var(--color-surface-alt)",
          }}
        >
          <div className="flex items-center justify-between pb-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-app-body-muted">
              Anggota dengan Role Ini
            </p>
            <button
              type="button"
              onClick={onAssignMember}
              disabled={assigningUserId !== null}
              className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-white transition active:scale-90 disabled:opacity-50"
              style={{ background: "var(--color-primary)" }}
              aria-label="Tambah anggota ke role ini"
            >
              <UserPlusIcon className="h-3.5 w-3.5" />
              Tambah
            </button>
          </div>

          {membersLoading && (
            <div className="space-y-2 py-1">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 animate-pulse rounded-2xl bg-app-surface p-3"
                >
                  <div className="h-9 w-9 shrink-0 rounded-xl bg-app-surface-alt" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-28 rounded bg-app-surface-alt" />
                    <div className="h-2.5 w-16 rounded bg-app-surface-alt" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!membersLoading && members.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-5 text-center">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-2xl"
                style={{ background: "var(--color-primary-muted)" }}
              >
                <UsersIcon
                  className="h-5 w-5"
                  style={{ color: "var(--color-primary)" }}
                />
              </div>
              <p className="text-xs font-semibold text-app-body-muted">
                Belum ada warga dengan role ini
              </p>
              <button
                type="button"
                onClick={onAssignMember}
                className="text-[11px] font-bold transition hover:opacity-70"
                style={{ color: "var(--color-primary)" }}
              >
                + Tambahkan anggota pertama
              </button>
            </div>
          )}

          {!membersLoading && members.length > 0 && (
            <div className="space-y-2">
              {members.map((member) => (
                <MemberRow
                  key={member.tenant_user_role_id}
                  member={member}
                  onRevoke={() => onRevokeRole(member)}
                  revoking={revokingId === member.tenant_user_role_id}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-3xl bg-app-surface p-4 shadow-[0_8px_24px_rgba(0,40,5,0.04)]">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 shrink-0 rounded-2xl bg-app-surface-alt" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-4 w-36 rounded-lg bg-app-surface-alt" />
          <div className="h-3 w-20 rounded bg-app-surface-alt" />
          <div className="h-3 w-52 rounded bg-app-surface-alt" />
        </div>
      </div>
      <div className="mt-4 h-8 w-36 rounded-xl bg-app-surface-alt" />
    </div>
  );
}

// ─── Create / Edit modal (bottom sheet) ──────────────────────────────────────

interface RoleFormSheetProps {
  editingRole: Role | null;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    description: string;
    scope: Scope;
  }) => Promise<void>;
  submitting: boolean;
  formError: string | null;
}

function RoleFormSheet({
  editingRole,
  onClose,
  onSubmit,
  submitting,
  formError,
}: RoleFormSheetProps) {
  const isEdit = editingRole !== null;
  const [name, setName] = useState(
    isEdit ? formatRoleDisplayName(editingRole!.name) : "",
  );
  const [description, setDescription] = useState(
    editingRole?.description ?? "",
  );
  const [scope, setScope] = useState<Scope>(editingRole?.scope ?? "TENANT");
  const nameRef = useRef<HTMLInputElement>(null);

  // Auto-focus name field after animation settles
  useEffect(() => {
    const t = setTimeout(() => nameRef.current?.focus(), 280);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = normaliseRoleName(name);
    void onSubmit({ name: finalName, description, scope });
  };

  const scopes: Scope[] = ["SYSTEM", "TENANT", "HOUSE"];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
        style={{ animation: "fadeIn 0.2s ease" }}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 w-full rounded-t-[2rem] bg-app-surface shadow-[0_-20px_60px_rgba(0,40,5,0.18)]"
        style={{
          maxWidth: "var(--app-max-width)",
          animation: "sheetUp 0.3s cubic-bezier(0.34,1.4,0.64,1)",
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3">
          <div
            className="h-1 w-10 rounded-full"
            style={{ background: "var(--color-input-border)" }}
          />
        </div>

        <div className="px-5 pb-8 pt-3">
          {/* Header */}
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-app-title">
                {isEdit ? "Edit Role" : "Tambah Role Baru"}
              </h2>
              <p className="text-xs text-app-body-muted mt-0.5">
                {isEdit
                  ? "Perbarui informasi role"
                  : "Buat role dengan scope & deskripsi"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-2xl transition hover:bg-app-surface-alt active:scale-90"
            >
              <XMarkIcon className="h-5 w-5 text-app-body-muted" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name field */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-app-body-muted mb-2">
                Nama Role
              </label>
              <input
                ref={nameRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Cth: RT Admin, Warga, Bendahara"
                className="w-full rounded-2xl border px-4 py-3 text-sm font-semibold text-app-title placeholder:text-app-body-muted/50 focus:outline-none bg-white transition-all"
                style={{ borderColor: "var(--color-input-border)" }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-primary)";
                  e.currentTarget.style.boxShadow =
                    "0 0 0 3px color-mix(in srgb, var(--color-primary) 16%, white 84%)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor =
                    "var(--color-input-border)";
                  e.currentTarget.style.boxShadow = "none";
                }}
                required
              />
              {name.trim() && (
                <p className="mt-1 text-[10px] text-app-body-muted">
                  Akan disimpan sebagai:{" "}
                  <span className="font-bold font-mono text-app-title">
                    {normaliseRoleName(name)}
                  </span>
                </p>
              )}
            </div>

            {/* Description field */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-app-body-muted mb-2">
                Deskripsi{" "}
                <span className="normal-case font-normal text-app-body-muted/70">
                  (opsional)
                </span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Jelaskan fungsi dan hak akses role ini..."
                rows={3}
                className="w-full resize-none rounded-2xl border px-4 py-3 text-sm font-medium text-app-title placeholder:text-app-body-muted/50 focus:outline-none bg-white transition-all"
                style={{ borderColor: "var(--color-input-border)" }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-primary)";
                  e.currentTarget.style.boxShadow =
                    "0 0 0 3px color-mix(in srgb, var(--color-primary) 16%, white 84%)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor =
                    "var(--color-input-border)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Scope selector */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-app-body-muted mb-2">
                Scope Role
              </label>
              <div className="grid grid-cols-3 gap-2">
                {scopes.map((s) => {
                  const Icon = ScopeIcons[s];
                  const selected = scope === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setScope(s)}
                      className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 px-2 py-3 text-center transition active:scale-95 ${
                        selected
                          ? getScopeSelectedBorder(s)
                          : "border-[var(--color-input-border)] bg-white hover:bg-app-surface-alt"
                      }`}
                    >
                      <Icon
                        className={`h-5 w-5 ${selected ? getScopeSelectedText(s) : "text-app-body-muted"}`}
                      />
                      <span
                        className={`text-[11px] font-bold ${selected ? getScopeSelectedText(s) : "text-app-body-muted"}`}
                      >
                        {getScopeLabel(s)}
                      </span>
                      <span className="text-[9px] text-app-body-muted/70 leading-tight">
                        {getScopeDescription(s)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Error banner */}
            {formError && (
              <div className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                <ExclamationTriangleIcon className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
                <p className="text-sm text-red-700 leading-snug">{formError}</p>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="w-full rounded-2xl py-4 text-sm font-bold text-white transition-all hover:-translate-y-[1px] active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background:
                  submitting || !name.trim()
                    ? "var(--color-body-muted)"
                    : "var(--color-primary)",
                boxShadow:
                  submitting || !name.trim()
                    ? "none"
                    : "0 8px 22px -12px var(--color-primary-shadow)",
              }}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  Menyimpan...
                </span>
              ) : isEdit ? (
                "Simpan Perubahan"
              ) : (
                "Buat Role"
              )}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes sheetUp { from{transform:translate(-50%,100%)} to{transform:translate(-50%,0)} }
      `}</style>
    </>
  );
}

// ─── Delete confirmation modal ────────────────────────────────────────────────

interface DeleteConfirmProps {
  role: Role;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  confirming: boolean;
  error: string | null;
}

function DeleteConfirmModal({
  role,
  onClose,
  onConfirm,
  confirming,
  error,
}: DeleteConfirmProps) {
  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={!confirming ? onClose : undefined}
        aria-hidden
        style={{ animation: "fadeIn 0.2s ease" }}
      />
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-2.5rem)] rounded-3xl bg-app-surface p-6 shadow-[0_32px_64px_rgba(0,0,0,0.18)]"
        style={{
          maxWidth: "360px",
          animation: "dialogIn 0.25s cubic-bezier(0.34,1.56,0.64,1)",
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-role-title"
      >
        {/* Icon */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-red-100">
          <TrashIcon className="h-7 w-7 text-red-600" />
        </div>

        {/* Content */}
        <div className="text-center">
          <h3
            id="delete-role-title"
            className="text-base font-extrabold text-app-title"
          >
            Hapus Role?
          </h3>
          <p className="mt-2 text-sm text-app-body-muted leading-relaxed">
            Role{" "}
            <span className="font-bold text-app-title">
              &ldquo;{formatRoleDisplayName(role.name)}&rdquo;
            </span>{" "}
            akan dihapus secara permanen dan tidak dapat dipulihkan.
          </p>
          {role.member_count > 0 && (
            <div className="mt-3 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-left">
              <ExclamationTriangleIcon className="h-4 w-4 shrink-0 text-amber-600" />
              <p className="text-xs font-semibold text-amber-700">
                Role ini masih punya{" "}
                <strong>{role.member_count} anggota aktif</strong>. Cabut semua
                role terlebih dahulu.
              </p>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2.5">
            <ExclamationTriangleIcon className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
            <p className="text-xs text-red-700 leading-snug">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={confirming}
            className="flex-1 rounded-2xl py-3 text-sm font-bold text-app-body transition hover:bg-app-surface-alt active:scale-95 disabled:opacity-50"
            style={{ background: "var(--color-surface-alt)" }}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={confirming}
            className="flex-1 rounded-2xl py-3 text-sm font-bold text-white transition active:scale-95 disabled:opacity-50"
            style={{ background: "#dc2626" }}
          >
            {confirming ? (
              <span className="flex items-center justify-center gap-1.5">
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                Menghapus...
              </span>
            ) : (
              "Ya, Hapus"
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes dialogIn {
          from { opacity:0; transform:translate(-50%,-50%) scale(0.92); }
          to   { opacity:1; transform:translate(-50%,-50%) scale(1);    }
        }
      `}</style>
    </>
  );
}

// ─── Assign Member Sheet ──────────────────────────────────────────────────────

interface AssignMemberSheetProps {
  role: Role;
  onClose: () => void;
  onAssigned: (member: RoleMember) => void;
  showToast: (message: string, type?: ToastState["type"]) => void;
}

function AssignMemberSheet({
  role,
  onClose,
  onAssigned,
  showToast,
}: AssignMemberSheetProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t = setTimeout(() => searchRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setSearchError(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const res = await apiFetch(
          `/api/admin/users?q=${encodeURIComponent(trimmed)}&roleId=${role.id}&limit=20`,
        );
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          setSearchError(body.error ?? "Gagal mencari warga");
          return;
        }
        const data = (await res.json()) as { users: UserSearchResult[] };
        setResults(data.users);
      } catch {
        setSearchError("Gagal terhubung ke server");
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, role.id]);

  async function handleAssign(user: UserSearchResult) {
    setAssigningId(user.user_id);
    try {
      const res = await apiFetch(`/api/admin/roles/${role.id}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.user_id }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        tenantUserRoleId?: string;
        assignedAt?: string;
        error?: string;
      };
      if (!res.ok) {
        showToast(body.error ?? "Gagal memberikan role", "error");
        return;
      }
      const newMember: RoleMember = {
        tenant_user_role_id: body.tenantUserRoleId!,
        user_id: user.user_id,
        full_name: user.full_name,
        wa_number: user.wa_number,
        blok_rumah: user.blok_rumah,
        assigned_at: body.assignedAt ?? new Date().toISOString(),
      };
      onAssigned(newMember);
      showToast(
        `Role "${formatRoleDisplayName(role.name)}" diberikan ke ${user.full_name}. Notifikasi terkirim. 🔔`,
      );
      // Remove assigned user from results so list stays accurate
      setResults((prev) => prev.filter((u) => u.user_id !== user.user_id));
    } catch {
      showToast("Terjadi kesalahan jaringan", "error");
    } finally {
      setAssigningId(null);
    }
  }

  const roleName = formatRoleDisplayName(role.name);

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={assigningId ? undefined : onClose}
        aria-hidden
        style={{ animation: "fadeIn 0.2s ease" }}
      />
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 w-full rounded-t-[2rem] bg-app-surface shadow-[0_-16px_48px_rgba(0,0,0,0.18)] flex flex-col"
        style={{
          maxWidth: "var(--app-max-width)",
          maxHeight: "90dvh",
          animation: "sheetUp 0.35s cubic-bezier(0.34,1.56,0.64,1)",
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="assign-sheet-title"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-app-body-muted/20" />
        </div>

        {/* Header */}
        <div
          className="flex items-start justify-between px-5 pb-4 pt-2 border-b"
          style={{ borderColor: "var(--color-input-border)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-2xl"
              style={{ background: "var(--color-primary-muted)" }}
            >
              <UserPlusIcon
                className="h-5 w-5"
                style={{ color: "var(--color-primary)" }}
              />
            </div>
            <div>
              <h2
                id="assign-sheet-title"
                className="text-base font-extrabold text-app-title leading-tight"
              >
                Tambah Anggota
              </h2>
              <p className="text-xs text-app-body-muted mt-0.5">
                Role:{" "}
                <span
                  className="font-bold"
                  style={{ color: "var(--color-primary)" }}
                >
                  {roleName}
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={assigningId !== null}
            className="flex h-8 w-8 items-center justify-center rounded-2xl transition hover:bg-app-surface-alt active:scale-90 disabled:opacity-40"
            style={{ color: "var(--color-body-muted)" }}
            aria-label="Tutup"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Notification info banner */}
        <div
          className="mx-5 mt-4 flex items-start gap-2.5 rounded-2xl px-3.5 py-3"
          style={{
            background: "var(--color-primary-muted)",
            border:
              "1px solid color-mix(in srgb, var(--color-primary) 20%, transparent 80%)",
          }}
        >
          <BellIcon
            className="h-4 w-4 shrink-0 mt-0.5"
            style={{ color: "var(--color-primary)" }}
          />
          <p
            className="text-[11px] leading-snug"
            style={{ color: "var(--color-primary-hover)" }}
          >
            Warga yang dipilih akan menerima <strong>notifikasi in-app</strong>{" "}
            bahwa role telah diberikan.
          </p>
        </div>

        {/* Search bar */}
        <div className="px-5 pt-4 pb-2">
          <div
            className="flex items-center gap-2.5 rounded-2xl px-3.5 py-3 bg-app-surface-alt transition-all"
            style={{ border: "1.5px solid var(--color-input-border)" }}
          >
            {searching ? (
              <ArrowPathIcon className="h-4 w-4 shrink-0 text-app-primary animate-spin" />
            ) : (
              <MagnifyingGlassIcon className="h-4 w-4 shrink-0 text-app-body-muted" />
            )}
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama atau nomor WA warga..."
              className="flex-1 bg-transparent text-sm text-app-title placeholder:text-app-body-muted/60 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setResults([]);
                }}
                className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full transition hover:bg-app-surface"
                style={{ color: "var(--color-body-muted)" }}
              >
                <XMarkIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Results list */}
        <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-2 pt-2">
          {searchError && (
            <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs text-red-700">
              <ExclamationTriangleIcon className="h-4 w-4 shrink-0" />
              {searchError}
            </div>
          )}

          {!query.trim() && (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <MagnifyingGlassIcon className="h-10 w-10 text-app-body-muted/25" />
              <p className="text-xs text-app-body-muted">
                Ketik nama atau nomor WA untuk mencari warga
              </p>
            </div>
          )}

          {query.trim() &&
            !searching &&
            results.length === 0 &&
            !searchError && (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <UsersIcon className="h-10 w-10 text-app-body-muted/25" />
                <p className="text-xs font-semibold text-app-body-muted">
                  Warga tidak ditemukan
                </p>
                <p className="text-[11px] text-app-body-muted/60">
                  Coba kata kunci lain, atau warga sudah memiliki role ini
                </p>
              </div>
            )}

          {results.map((user) => (
            <div
              key={user.user_id}
              className="flex items-center justify-between gap-3 rounded-2xl px-3.5 py-3 border transition"
              style={{
                borderColor: "var(--color-input-border)",
                background: "var(--color-surface-alt)",
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white text-xs font-extrabold shadow-sm"
                  style={{ background: "var(--color-primary)" }}
                >
                  {getInitials(user.full_name)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-app-title leading-tight">
                    {user.full_name}
                  </p>
                  <p className="text-[11px] text-app-body-muted mt-0.5">
                    {user.blok_rumah
                      ? `Blok ${user.blok_rumah}`
                      : (user.wa_number ?? "—")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void handleAssign(user)}
                disabled={assigningId !== null}
                className="shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-white transition active:scale-90 disabled:opacity-50"
                style={{ background: "var(--color-primary)" }}
                aria-label={`Berikan role ke ${user.full_name}`}
              >
                {assigningId === user.user_id ? (
                  <>
                    <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <UserPlusIcon className="h-3.5 w-3.5" />
                    Assign
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes sheetUp {
          from { opacity: 0; transform: translate(-50%, 48px); }
          to   { opacity: 1; transform: translate(-50%, 0);    }
        }
      `}</style>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function KelolRolePage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const clearUser = useAuthStore((s) => s.clearUser);

  const [hasMounted, setHasMounted] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState("");
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("ALL");

  // Expansion + members
  const [expandedRoleId, setExpandedRoleId] = useState<number | null>(null);
  const [roleMembers, setRoleMembers] = useState<Record<number, RoleMember[]>>(
    {},
  );
  const [membersLoading, setMembersLoading] = useState<Record<number, boolean>>(
    {},
  );
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Assign member
  const [assigningToRole, setAssigningToRole] = useState<Role | null>(null);

  // Create / Edit
  const [showFormSheet, setShowFormSheet] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Toast
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const toastCounterRef = useRef(0);

  const showToast = useCallback(
    (message: string, type: ToastState["type"] = "success") => {
      toastCounterRef.current += 1;
      const id = toastCounterRef.current;
      setToasts((prev) => [...prev, { id, message, type }]);
    },
    [],
  );

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Mount guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // ── Access guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasMounted) return;
    if (!isAuthenticated) {
      router.replace("/auth/login?redirect=/admin/roles");
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
            router.replace("/auth/login?redirect=/admin/roles");
            return;
          }
          router.replace("/landing");
          return;
        }
        const data = (await res.json()) as ProfileData;
        if (!hasAdminRoleInProfile(data)) {
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

  // ── Load roles ───────────────────────────────────────────────────────────────
  const loadRoles = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setLoadError(null);

    try {
      const res = await apiFetch("/api/admin/roles");
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setLoadError(body.error ?? "Gagal memuat data role");
        return;
      }
      const data = (await res.json()) as { roles: Role[] };
      setRoles(data.roles);
    } catch {
      setLoadError("Gagal terhubung ke server. Periksa koneksi Anda.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!checkingAccess) {
      void loadRoles();
    }
  }, [checkingAccess, loadRoles]);

  // ── Load members for a role ──────────────────────────────────────────────────
  const loadMembers = useCallback(async (roleId: number) => {
    setMembersLoading((prev) => ({ ...prev, [roleId]: true }));
    try {
      const res = await apiFetch(`/api/admin/roles/${roleId}/users`);
      if (!res.ok) return;
      const data = (await res.json()) as { members: RoleMember[] };
      setRoleMembers((prev) => ({ ...prev, [roleId]: data.members }));
    } finally {
      setMembersLoading((prev) => ({ ...prev, [roleId]: false }));
    }
  }, []);

  // ── Toggle expand ────────────────────────────────────────────────────────────
  const handleToggleExpand = useCallback(
    (roleId: number) => {
      setExpandedRoleId((prev) => {
        if (prev === roleId) return null;
        if (roleMembers[roleId] === undefined) {
          void loadMembers(roleId);
        }
        return roleId;
      });
    },
    [roleMembers, loadMembers],
  );

  // ── Create / Edit submit ─────────────────────────────────────────────────────
  const handleSubmitRole = useCallback(
    async (data: { name: string; description: string; scope: Scope }) => {
      setSubmitting(true);
      setFormError(null);
      try {
        let res: Response;
        if (editingRole) {
          res = await apiFetch(`/api/admin/roles/${editingRole.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
        } else {
          res = await apiFetch("/api/admin/roles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
        }

        const body = (await res.json()) as { role?: Role; error?: string };
        if (!res.ok) {
          setFormError(body.error ?? "Terjadi kesalahan, coba lagi.");
          return;
        }

        const updatedRole = body.role!;
        if (editingRole) {
          setRoles((prev) =>
            prev.map((r) =>
              r.id === editingRole.id
                ? { ...updatedRole, member_count: r.member_count }
                : r,
            ),
          );
          showToast("Role berhasil diperbarui");
        } else {
          setRoles((prev) => [...prev, updatedRole]);
          showToast("Role baru berhasil dibuat");
        }

        setShowFormSheet(false);
        setEditingRole(null);
      } catch {
        setFormError("Terjadi kesalahan jaringan. Coba lagi.");
      } finally {
        setSubmitting(false);
      }
    },
    [editingRole, showToast],
  );

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDeleteRole = useCallback(async () => {
    if (!deletingRole) return;
    setDeleteConfirming(true);
    setDeleteError(null);
    try {
      const res = await apiFetch(`/api/admin/roles/${deletingRole.id}`, {
        method: "DELETE",
      });
      const body = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok) {
        setDeleteError(body.error ?? "Gagal menghapus role");
        return;
      }
      setRoles((prev) => prev.filter((r) => r.id !== deletingRole.id));
      setDeletingRole(null);
      showToast("Role berhasil dihapus");
    } catch {
      setDeleteError("Terjadi kesalahan jaringan.");
    } finally {
      setDeleteConfirming(false);
    }
  }, [deletingRole, showToast]);

  // ── Revoke role from member ──────────────────────────────────────────────────
  const handleRevokeRole = useCallback(
    async (roleId: number, member: RoleMember) => {
      setRevokingId(member.tenant_user_role_id);
      try {
        const res = await apiFetch(`/api/admin/roles/${roleId}/users`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenantUserRoleId: member.tenant_user_role_id,
          }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          showToast(body.error ?? "Gagal mencabut role", "error");
          return;
        }
        setRoleMembers((prev) => ({
          ...prev,
          [roleId]: (prev[roleId] ?? []).filter(
            (m) => m.tenant_user_role_id !== member.tenant_user_role_id,
          ),
        }));
        setRoles((prev) =>
          prev.map((r) =>
            r.id === roleId
              ? { ...r, member_count: Math.max(0, r.member_count - 1) }
              : r,
          ),
        );
        showToast(`Role dicabut dari ${member.full_name}`);
      } catch {
        showToast("Terjadi kesalahan jaringan", "error");
      } finally {
        setRevokingId(null);
      }
    },
    [showToast],
  );

  // ── Assign member to role ─────────────────────────────────────────────────
  const handleMemberAssigned = useCallback(
    (roleId: number, member: RoleMember) => {
      setRoleMembers((prev) => ({
        ...prev,
        [roleId]: [member, ...(prev[roleId] ?? [])],
      }));
      setRoles((prev) =>
        prev.map((r) =>
          r.id === roleId ? { ...r, member_count: r.member_count + 1 } : r,
        ),
      );
    },
    [],
  );

  // ── Filtered roles ───────────────────────────────────────────────────────────
  const filteredRoles = roles.filter((r) => {
    // Exclude default warga role
    if (r.id === DEFAULT_ROLE_WARGA_ID) return false;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      r.name.toLowerCase().includes(q) ||
      (r.description ?? "").toLowerCase().includes(q) ||
      formatRoleDisplayName(r.name).toLowerCase().includes(q);
    const matchScope = scopeFilter === "ALL" || r.scope === scopeFilter;
    return matchSearch && matchScope;
  });

  // ── Derived stats ────────────────────────────────────────────────────────────
  const totalRoles = roles.filter((r) => r.id !== DEFAULT_ROLE_WARGA_ID).length;
  const systemCount = roles.filter(
    (r) => r.scope === "SYSTEM" && r.id !== DEFAULT_ROLE_WARGA_ID,
  ).length;
  const tenantCount = roles.filter(
    (r) => r.scope === "TENANT" && r.id !== DEFAULT_ROLE_WARGA_ID,
  ).length;
  const houseCount = roles.filter(
    (r) => r.scope === "HOUSE" && r.id !== DEFAULT_ROLE_WARGA_ID,
  ).length;
  const totalMembers = roles
    .filter((r) => r.id !== DEFAULT_ROLE_WARGA_ID)
    .reduce((acc, r) => acc + r.member_count, 0);

  // ── Guards ───────────────────────────────────────────────────────────────────
  if (!hasMounted || !isAuthenticated || checkingAccess) {
    return <PageLoader message="Memuat halaman role..." />;
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <main className="flex h-full min-h-0 flex-col bg-app-surface-alt">
      {/* Toasts */}
      {toasts.slice(-1).map((t) => (
        <Toast key={t.id} toast={t} onDismiss={() => dismissToast(t.id)} />
      ))}

      <div className="flex-1 overflow-y-auto pb-28">
        {/* ── Hero Header ──────────────────────────────────────────────────── */}
        <section
          className="relative overflow-hidden px-4 pt-5 pb-6 text-white"
          style={{
            background: `linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)`,
          }}
        >
          {/* Decorative blobs */}
          <div
            className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/10"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute top-6 right-24 h-16 w-16 rounded-full bg-white/5"
            aria-hidden
          />

          {/* Nav row */}
          <div className="relative z-10 flex items-center justify-between mb-5">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm transition hover:bg-white/25 active:scale-90"
              aria-label="Kembali ke admin"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void loadRoles(true)}
                disabled={refreshing}
                className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm transition hover:bg-white/25 active:scale-90 disabled:opacity-50"
                aria-label="Segarkan data"
              >
                <ArrowPathIcon
                  className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`}
                />
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingRole(null);
                  setFormError(null);
                  setShowFormSheet(true);
                }}
                className="flex items-center gap-1.5 rounded-2xl bg-white/20 backdrop-blur-sm px-3.5 py-2.5 text-xs font-bold transition hover:bg-white/30 active:scale-95"
              >
                <PlusIcon className="h-4 w-4" />
                Tambah
              </button>
            </div>
          </div>

          {/* Title row */}
          <div className="relative z-10 flex items-center gap-3.5">
            <div className="flex h-13 w-13 items-center justify-center rounded-[1.1rem] bg-white/20 backdrop-blur-sm shadow-inner">
              <ShieldCheckSolidIcon className="h-7 w-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[1.35rem] font-extrabold leading-none text-white">
                  Kelola Role
                </h1>
              </div>
              <p className="mt-1 text-xs text-white/70">
                Manajemen peran &amp; hak akses warga komunitas
              </p>
            </div>
          </div>

          {/* Stats strip */}
          <div className="relative z-10 mt-5 grid grid-cols-4 gap-2">
            {[
              { label: "Total", value: totalRoles },
              { label: "Sistem", value: systemCount },
              { label: "Komunitas", value: tenantCount },
              { label: "Rumah", value: houseCount },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl bg-white/15 px-2 py-2.5 text-center backdrop-blur-sm"
              >
                <p className="text-[10px] text-white/70 font-medium truncate">
                  {item.label}
                </p>
                {loading ? (
                  <div className="mx-auto mt-1 h-4 w-7 animate-pulse rounded bg-white/20" />
                ) : (
                  <p className="text-sm font-extrabold text-white leading-none mt-0.5">
                    {item.value}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Search + Scope filter ─────────────────────────────────────── */}
        <div className="px-4 pt-4 space-y-3">
          {/* Search bar */}
          <div
            className="flex items-center gap-2.5 rounded-2xl px-3.5 py-3 bg-app-surface transition-all"
            style={{ border: "1.5px solid var(--color-input-border)" }}
          >
            <MagnifyingGlassIcon className="h-4 w-4 shrink-0 text-app-body-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari role berdasarkan nama atau deskripsi..."
              className="flex-1 bg-transparent text-sm text-app-title placeholder:text-app-body-muted/60 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full transition hover:bg-app-surface-alt"
                style={{ color: "var(--color-body-muted)" }}
              >
                <XMarkIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Scope filter pills */}
          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
            {(["ALL", "SYSTEM", "TENANT", "HOUSE"] as ScopeFilter[]).map(
              (s) => {
                const isActive = scopeFilter === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setScopeFilter(s)}
                    className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition active:scale-95 ${
                      isActive
                        ? "text-white shadow-sm"
                        : "bg-app-surface text-app-body-muted hover:bg-app-surface-alt"
                    }`}
                    style={
                      isActive
                        ? {
                            background:
                              s === "SYSTEM"
                                ? "#7c3aed"
                                : s === "HOUSE"
                                  ? "#d97706"
                                  : s === "TENANT"
                                    ? "var(--color-primary)"
                                    : "var(--color-primary)",
                          }
                        : undefined
                    }
                  >
                    {s !== "ALL" &&
                      (() => {
                        const Icon = ScopeIcons[s as Scope];
                        return <Icon className="h-3.5 w-3.5" />;
                      })()}
                    {s === "ALL" ? "Semua" : getScopeLabel(s as Scope)}
                    {s !== "ALL" && !isActive && (
                      <span
                        className="flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[9px] font-extrabold"
                        style={{
                          background: "var(--color-surface-alt)",
                          color: "var(--color-body-muted)",
                        }}
                      >
                        {
                          roles.filter(
                            (r) =>
                              r.scope === s && r.id !== DEFAULT_ROLE_WARGA_ID,
                          ).length
                        }
                      </span>
                    )}
                  </button>
                );
              },
            )}
          </div>
        </div>

        {/* ── Content area ─────────────────────────────────────────────── */}
        <div className="px-4 pt-3 space-y-3">
          {/* Summary info row */}
          {!loading && !loadError && roles.length > 0 && (
            <div className="flex items-center justify-between px-1">
              <p className="text-xs font-semibold text-app-body-muted">
                {filteredRoles.length === roles.length
                  ? `${roles.length} role terdaftar`
                  : `${filteredRoles.length} dari ${roles.length} role`}
              </p>
              <p className="text-xs text-app-body-muted/70">
                {totalMembers} total penugasan aktif
              </p>
            </div>
          )}

          {/* Loading skeletons */}
          {loading && (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          )}

          {/* Error state */}
          {!loading && loadError && (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-center">
              <ExclamationTriangleIcon className="mx-auto mb-3 h-10 w-10 text-red-400" />
              <p className="text-sm font-bold text-red-700">
                Gagal memuat data
              </p>
              <p className="mt-1 text-xs text-red-600/80">{loadError}</p>
              <button
                type="button"
                onClick={() => void loadRoles()}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-bold text-white transition hover:opacity-90 active:scale-95"
                style={{ background: "var(--color-primary)" }}
              >
                <ArrowPathIcon className="h-3.5 w-3.5" />
                Coba Lagi
              </button>
            </div>
          )}

          {/* Empty state — no roles at all */}
          {!loading && !loadError && roles.length === 0 && (
            <div
              className="flex flex-col items-center gap-4 rounded-3xl border border-dashed px-6 py-12 text-center"
              style={{ borderColor: "var(--color-input-border)" }}
            >
              <div
                className="flex h-16 w-16 items-center justify-center rounded-3xl"
                style={{ background: "var(--color-primary-muted)" }}
              >
                <ShieldCheckIcon
                  className="h-8 w-8"
                  style={{ color: "var(--color-primary)" }}
                />
              </div>
              <div>
                <p className="text-sm font-bold text-app-title">
                  Belum ada role terdaftar
                </p>
                <p className="mt-1 text-xs text-app-body-muted leading-relaxed">
                  Role digunakan untuk mengatur hak akses warga di dalam
                  komunitas.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingRole(null);
                  setFormError(null);
                  setShowFormSheet(true);
                }}
                className="flex items-center gap-1.5 rounded-2xl px-5 py-2.5 text-sm font-bold text-white transition hover:-translate-y-[1px] active:scale-95"
                style={{
                  background: "var(--color-primary)",
                  boxShadow: "0 8px 20px -10px var(--color-primary-shadow)",
                }}
              >
                <PlusIcon className="h-4 w-4" />
                Buat Role Pertama
              </button>
            </div>
          )}

          {/* Empty state — filter yields nothing */}
          {!loading &&
            !loadError &&
            roles.length > 0 &&
            filteredRoles.length === 0 && (
              <div className="flex flex-col items-center gap-3 rounded-3xl bg-app-surface py-10 text-center px-6 shadow-[0_4px_16px_rgba(0,40,5,0.05)]">
                <MagnifyingGlassIcon className="h-10 w-10 text-app-body-muted/30" />
                <div>
                  <p className="text-sm font-bold text-app-body-muted">
                    Tidak ditemukan
                  </p>
                  <p className="mt-0.5 text-xs text-app-body-muted/70">
                    Coba ubah filter atau kata kunci pencarian
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setScopeFilter("ALL");
                  }}
                  className="text-xs font-bold transition hover:opacity-70"
                  style={{ color: "var(--color-primary)" }}
                >
                  Reset Filter
                </button>
              </div>
            )}

          {/* Role list */}
          {!loading &&
            !loadError &&
            filteredRoles.map((role) => (
              <RoleCard
                key={role.id}
                role={role}
                isExpanded={expandedRoleId === role.id}
                members={roleMembers[role.id] ?? []}
                membersLoading={membersLoading[role.id] ?? false}
                revokingId={revokingId}
                assigningUserId={null}
                onToggleExpand={() => handleToggleExpand(role.id)}
                onEdit={() => {
                  setEditingRole(role);
                  setFormError(null);
                  setShowFormSheet(true);
                }}
                onDelete={() => {
                  setDeletingRole(role);
                  setDeleteError(null);
                }}
                onRevokeRole={(member) =>
                  void handleRevokeRole(role.id, member)
                }
                onAssignMember={() => {
                  setAssigningToRole(role);
                  // Ensure member list is loaded when panel is expanded
                  if (expandedRoleId !== role.id) {
                    void loadMembers(role.id);
                    setExpandedRoleId(role.id);
                  }
                }}
              />
            ))}
        </div>
      </div>

      {/* ── FAB ──────────────────────────────────────────────────────────── */}
      <div className="fixed bottom-20 right-4 z-30">
        <button
          type="button"
          onClick={() => {
            setEditingRole(null);
            setFormError(null);
            setShowFormSheet(true);
          }}
          className="flex items-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
          style={{
            background: "var(--color-primary)",
            boxShadow: "0 8px 24px -6px var(--color-primary-shadow)",
          }}
        >
          <PlusIcon className="h-5 w-5" />
          Tambah Role
        </button>
      </div>

      {/* ── Create / Edit sheet ───────────────────────────────────────── */}
      {showFormSheet && (
        <RoleFormSheet
          editingRole={editingRole}
          onClose={() => {
            setShowFormSheet(false);
            setEditingRole(null);
          }}
          onSubmit={handleSubmitRole}
          submitting={submitting}
          formError={formError}
        />
      )}

      {/* ── Assign member sheet ───────────────────────────────────────── */}
      {assigningToRole && (
        <AssignMemberSheet
          role={assigningToRole}
          onClose={() => setAssigningToRole(null)}
          onAssigned={(member) => {
            handleMemberAssigned(assigningToRole.id, member);
          }}
          showToast={showToast}
        />
      )}

      {/* ── Delete confirm dialog ─────────────────────────────────────── */}
      {deletingRole && (
        <DeleteConfirmModal
          role={deletingRole}
          onClose={() => {
            setDeletingRole(null);
            setDeleteError(null);
          }}
          onConfirm={handleDeleteRole}
          confirming={deleteConfirming}
          error={deleteError}
        />
      )}
    </main>
  );
}
