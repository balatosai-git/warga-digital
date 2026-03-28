"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  PencilSquareIcon,
  PlusIcon as PlusOutlineIcon,
  TrashIcon as TrashOutlineIcon,
  XMarkIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  BuildingOffice2Icon,
} from "@heroicons/react/24/outline";
import { useAuthStore } from "@/stores/auth-store";
import { PageLoader, getInitials } from "@/components/ui";
import { apiFetch } from "@/lib/api-client";
import type {
  OrganisationTreeApi,
  OrganisationRoleApi,
  OrganisationMemberApi,
} from "@/lib/organisation-api";

/* ─── Keyframes ──────────────────────────────────────────── */
const globalKeyframes = `
  @keyframes sheetUp {
    from { transform: translate(-50%, 100%); }
    to   { transform: translate(-50%, 0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes dialogIn {
    from { opacity: 0; transform: translate(-50%, -50%) scale(0.92); }
    to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  }
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

/* ─── Types ──────────────────────────────────────────────── */
type ModalKind = "add-role" | "edit-role" | "add-member" | "edit-member" | null;

type CommunityUser = {
  id: string;
  fullName: string;
  blockName: string;
  whatsappNumber: string;
  profilePictureUrl: string | null;
};

type DeleteTarget =
  | { kind: "role"; role: OrganisationRoleApi }
  | { kind: "member"; member: OrganisationMemberApi };

/* ─── Member Row ─────────────────────────────────────────── */
function MemberRow({
  member,
  onEdit,
  onDelete,
}: {
  member: OrganisationMemberApi;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isVacant = member.userId == null;
  const displayName = isVacant ? "Posisi Kosong" : member.fullName;
  const displaySub = isVacant
    ? "Belum ada penanggung jawab"
    : [member.blockName, member.whatsappNumber].filter(Boolean).join(" · ");

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-app-surface-alt/60 px-3 py-2.5">
      {/* Avatar */}
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl text-xs font-extrabold ${
            isVacant ? "bg-amber-50 text-amber-400" : "text-white shadow-sm"
          }`}
          style={!isVacant ? { background: "var(--color-primary)" } : undefined}
        >
          {!isVacant && member.profilePictureUrl ? (
            <img
              src={member.profilePictureUrl}
              alt=""
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span>{isVacant ? "—" : getInitials(displayName)}</span>
          )}
        </div>

        <div className="min-w-0">
          <p
            className={`truncate text-xs font-bold leading-tight ${
              isVacant ? "text-app-body-muted" : "text-app-title"
            }`}
          >
            {displayName}
          </p>
          <p
            className={`truncate text-[10px] ${
              isVacant ? "text-amber-500" : "text-app-body-muted"
            }`}
          >
            {displaySub}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={onEdit}
          className="flex h-8 w-8 items-center justify-center rounded-xl transition hover:bg-app-primary-muted active:scale-90"
          style={{ color: "var(--color-primary)" }}
          aria-label="Edit anggota"
        >
          <PencilSquareIcon className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="flex h-8 w-8 items-center justify-center rounded-xl text-red-500 transition hover:bg-red-50 active:scale-90"
          aria-label={isVacant ? "Hapus slot" : "Hapus anggota"}
        >
          <TrashOutlineIcon className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

/* ─── Role Card ──────────────────────────────────────────── */
function RoleCard({
  role,
  index,
  onEdit,
  onDelete,
  onAddMember,
  onEditMember,
  onDeleteMember,
}: {
  role: OrganisationRoleApi;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onAddMember: () => void;
  onEditMember: (m: OrganisationMemberApi) => void;
  onDeleteMember: (m: OrganisationMemberApi) => void;
}) {
  const activeCount = role.members.filter((m) => m.userId != null).length;

  return (
    <article
      className="overflow-hidden rounded-3xl bg-app-surface shadow-[0_4px_16px_rgba(0,40,5,0.06)] transition-shadow hover:shadow-[0_8px_24px_rgba(0,40,5,0.09)]"
      style={{
        animation: "fadeInUp 0.35s ease both",
        animationDelay: `${index * 70}ms`,
      }}
    >
      {/* Card header */}
      <div className="flex items-center gap-3 border-b border-[var(--color-input-border)] px-4 py-3.5">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
          style={{ background: "var(--color-primary-muted)" }}
        >
          <UserGroupIcon
            className="h-[18px] w-[18px]"
            style={{ color: "var(--color-primary)" }}
            aria-hidden
          />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[13px] font-bold leading-snug text-app-title">
            {role.title}
          </h2>
          <p className="mt-0.5 text-[11px] leading-snug text-app-body-muted">
            {activeCount} dari {role.members.length} slot terisi
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={onEdit}
            className="flex h-8 w-8 items-center justify-center rounded-xl transition hover:bg-app-primary-muted active:scale-90"
            style={{ color: "var(--color-primary)" }}
            aria-label={`Edit peran ${role.title}`}
          >
            <PencilSquareIcon className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-red-500 transition hover:bg-red-50 active:scale-90"
            aria-label={`Hapus peran ${role.title}`}
          >
            <TrashOutlineIcon className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      {/* Member rows */}
      <div className="px-4 py-3">
        {role.members.length === 0 ? (
          <p className="py-2 text-center text-[11px] text-app-body-muted/70">
            Belum ada anggota di peran ini
          </p>
        ) : (
          <div className="space-y-2">
            {role.members.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                onEdit={() => onEditMember(member)}
                onDelete={() => onDeleteMember(member)}
              />
            ))}
          </div>
        )}

        {/* Add member button */}
        <button
          type="button"
          onClick={onAddMember}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed py-2.5 text-[12px] font-bold transition hover:bg-app-primary-muted active:scale-[0.97]"
          style={{
            borderColor: "var(--color-input-border)",
            color: "var(--color-primary)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor =
              "var(--color-primary)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor =
              "var(--color-input-border)";
          }}
        >
          <PlusOutlineIcon className="h-3.5 w-3.5" aria-hidden />
          Tambah anggota
        </button>
      </div>
    </article>
  );
}

/* ─── Bottom Sheet Modal ─────────────────────────────────── */
function OrganisationSheet({
  kind,
  roleId,
  role,
  member,
  onClose,
  onSaved,
}: {
  kind: ModalKind;
  roleId?: string;
  role?: OrganisationRoleApi;
  member?: OrganisationMemberApi;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [title, setTitle] = useState(role?.title ?? "");
  const [sortOrder, setSortOrder] = useState(role?.sortOrder ?? 0);
  const [communityUsers, setCommunityUsers] = useState<CommunityUser[]>([]);
  const [communityUsersLoading, setCommunityUsersLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>(
    member?.userId ?? "",
  );

  const isRole = kind === "add-role" || kind === "edit-role";
  const isMember = kind === "add-member" || kind === "edit-member";

  const titleLabel =
    kind === "add-role"
      ? "Tambah Peran Baru"
      : kind === "edit-role"
        ? "Edit Peran"
        : kind === "add-member"
          ? "Tambah Anggota"
          : "Edit Anggota";

  useEffect(() => {
    if (!isMember) return;
    setSelectedUserId(member?.userId ?? "");
    setCommunityUsersLoading(true);
    apiFetch("/api/organisation/community-users", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((list: CommunityUser[]) =>
        setCommunityUsers(Array.isArray(list) ? list : []),
      )
      .catch(() => setCommunityUsers([]))
      .finally(() => setCommunityUsersLoading(false));
  }, [isMember, member?.userId]);

  const handleSubmitRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    try {
      if (kind === "add-role") {
        const res = await apiFetch("/api/organisation/roles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ title: title.trim(), sortOrder }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? "Gagal menambah peran");
      } else if (kind === "edit-role" && role) {
        const res = await apiFetch(`/api/organisation/roles/${role.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ title: title.trim(), sortOrder }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? "Gagal mengubah peran");
      }
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    const userId = selectedUserId.trim() ? selectedUserId.trim() : null;
    try {
      if (kind === "add-member" && roleId) {
        const res = await apiFetch(
          `/api/organisation/roles/${roleId}/members`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ userId }),
          },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? "Gagal menambah anggota");
      } else if (kind === "edit-member" && member) {
        const res = await apiFetch(`/api/organisation/members/${member.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ userId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? "Gagal mengubah anggota");
      }
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  };

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
        className="fixed bottom-0 left-1/2 z-50 w-full rounded-t-[2rem] bg-app-surface shadow-[0_-20px_60px_rgba(0,40,5,0.18)]"
        style={{
          maxWidth: "var(--app-max-width)",
          animation: "sheetUp 0.3s cubic-bezier(0.34,1.4,0.64,1)",
          transform: "translateX(-50%)",
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="org-sheet-title"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3" aria-hidden>
          <div
            className="h-1 w-10 rounded-full"
            style={{ background: "var(--color-input-border)" }}
          />
        </div>

        <div className="px-5 pb-8 pt-3">
          {/* Sheet header */}
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2
                id="org-sheet-title"
                className="text-lg font-extrabold text-app-title"
              >
                {titleLabel}
              </h2>
              {isRole && (
                <p className="mt-0.5 text-xs text-app-body-muted">
                  {kind === "add-role"
                    ? "Tambahkan jabatan baru ke struktur organisasi"
                    : "Perbarui informasi peran ini"}
                </p>
              )}
              {isMember && (
                <p className="mt-0.5 text-xs text-app-body-muted">
                  {kind === "add-member"
                    ? `Pilih warga untuk mengisi peran ${role?.title ?? ""}`
                    : "Ganti pengemban peran ini"}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-2xl transition hover:bg-app-surface-alt active:scale-90"
              aria-label="Tutup"
            >
              <XMarkIcon className="h-5 w-5 text-app-body-muted" aria-hidden />
            </button>
          </div>

          {/* Error banner */}
          {err && (
            <div
              className="mb-4 flex items-center gap-2.5 rounded-2xl border border-red-100 bg-red-50 px-3.5 py-3"
              role="alert"
            >
              <ExclamationTriangleIcon
                className="h-4 w-4 shrink-0 text-red-500"
                aria-hidden
              />
              <p className="text-[13px] text-red-600">{err}</p>
            </div>
          )}

          {/* Role form */}
          {isRole && (
            <form onSubmit={handleSubmitRole} className="space-y-4">
              <div>
                <label
                  htmlFor="role-title"
                  className="block text-[11px] font-bold uppercase tracking-widest text-app-body-muted mb-2"
                >
                  Nama Peran
                </label>
                <input
                  id="role-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Bendahara"
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
                  autoFocus
                />
              </div>

              <div>
                <label
                  htmlFor="role-order"
                  className="block text-[11px] font-bold uppercase tracking-widest text-app-body-muted mb-2"
                >
                  Urutan Tampil{" "}
                  <span className="normal-case font-normal text-app-body-muted/70">
                    (angka lebih kecil = tampil lebih atas)
                  </span>
                </label>
                <input
                  id="role-order"
                  type="number"
                  min={0}
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
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
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-2xl py-3 text-sm font-bold text-app-body transition hover:bg-app-surface-alt active:scale-95"
                  style={{ background: "var(--color-surface-alt)" }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving || !title.trim()}
                  className="flex-1 rounded-2xl py-3 text-sm font-bold text-white transition hover:-translate-y-[1px] active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background:
                      saving || !title.trim()
                        ? "var(--color-body-muted)"
                        : "var(--color-primary)",
                    boxShadow:
                      saving || !title.trim()
                        ? "none"
                        : "0 8px 22px -12px var(--color-primary-shadow)",
                  }}
                >
                  {saving
                    ? "Menyimpan..."
                    : kind === "add-role"
                      ? "Tambah Peran"
                      : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          )}

          {/* Member form */}
          {isMember && (
            <form onSubmit={handleSubmitMember} className="space-y-4">
              <div>
                <label
                  htmlFor="member-select"
                  className="block text-[11px] font-bold uppercase tracking-widest text-app-body-muted mb-2"
                >
                  Pilih Warga
                </label>
                <p className="mb-2 text-xs text-app-body-muted">
                  Hanya warga terdaftar di komunitas ini. Pilih{" "}
                  <strong>Vacant</strong> jika peran belum diisi.
                </p>
                <div className="relative">
                  <select
                    id="member-select"
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full appearance-none rounded-2xl border px-4 py-3 text-sm font-semibold text-app-title focus:outline-none bg-white transition-all pr-10"
                    style={{ borderColor: "var(--color-input-border)" }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor =
                        "var(--color-primary)";
                      e.currentTarget.style.boxShadow =
                        "0 0 0 3px color-mix(in srgb, var(--color-primary) 16%, white 84%)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor =
                        "var(--color-input-border)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                    disabled={communityUsersLoading}
                  >
                    <option value="">
                      — Vacant (belum ada penanggung jawab)
                    </option>
                    {communityUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName}
                        {u.blockName ? ` · ${u.blockName}` : ""}
                      </option>
                    ))}
                  </select>
                  {communityUsersLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <ArrowPathIcon
                        className="h-4 w-4 animate-spin text-app-body-muted"
                        aria-hidden
                      />
                    </div>
                  )}
                </div>
                {communityUsersLoading && (
                  <p className="mt-1.5 text-[11px] text-app-body-muted">
                    Memuat daftar warga...
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-2xl py-3 text-sm font-bold text-app-body transition hover:bg-app-surface-alt active:scale-95"
                  style={{ background: "var(--color-surface-alt)" }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving || communityUsersLoading}
                  className="flex-1 rounded-2xl py-3 text-sm font-bold text-white transition hover:-translate-y-[1px] active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background:
                      saving || communityUsersLoading
                        ? "var(--color-body-muted)"
                        : "var(--color-primary)",
                    boxShadow:
                      saving || communityUsersLoading
                        ? "none"
                        : "0 8px 22px -12px var(--color-primary-shadow)",
                  }}
                >
                  {saving
                    ? "Menyimpan..."
                    : kind === "add-member"
                      ? "Tambah Anggota"
                      : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

/* ─── Delete Confirmation Dialog ─────────────────────────── */
function DeleteDialog({
  target,
  onClose,
  onConfirm,
  loading,
}: {
  target: DeleteTarget;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  const isRole = target.kind === "role";
  const label =
    target.kind === "role"
      ? `peran "${target.role.title}"`
      : target.member.userId
        ? `anggota "${target.member.fullName}"`
        : "slot vacant ini";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
        style={{ animation: "fadeIn 0.2s ease" }}
      />

      {/* Dialog */}
      <div
        className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2.5rem)] rounded-3xl bg-app-surface p-6 shadow-[0_32px_64px_rgba(0,0,0,0.18)]"
        style={{
          maxWidth: "360px",
          animation: "dialogIn 0.25s cubic-bezier(0.34,1.56,0.64,1)",
          transform: "translate(-50%, -50%)",
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
      >
        {/* Icon */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-red-100">
          <TrashOutlineIcon className="h-7 w-7 text-red-600" aria-hidden />
        </div>

        <h3
          id="delete-dialog-title"
          className="text-center text-base font-extrabold text-app-title"
        >
          Hapus {isRole ? "Peran" : "Anggota"}?
        </h3>
        <p className="mt-2 text-center text-sm text-app-body-muted leading-relaxed">
          Tindakan ini akan menghapus {label} secara permanen.
        </p>

        {isRole && (
          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5">
            <ExclamationTriangleIcon
              className="h-4 w-4 shrink-0 text-amber-600"
              aria-hidden
            />
            <p className="text-xs font-semibold text-amber-700">
              Semua anggota dalam peran ini juga akan dihapus.
            </p>
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-2xl py-3 text-sm font-bold text-app-body transition hover:bg-app-surface-alt active:scale-95 disabled:opacity-50"
            style={{ background: "var(--color-surface-alt)" }}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-2xl py-3 text-sm font-bold text-white transition active:scale-95 disabled:opacity-50"
            style={{ background: "#dc2626" }}
          >
            {loading ? "Menghapus..." : "Ya, Hapus"}
          </button>
        </div>
      </div>
    </>
  );
}

/* ─── Page ───────────────────────────────────────────────── */
export default function OrganisasiManagePage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [hasMounted, setHasMounted] = useState(false);
  const [permissionChecked, setPermissionChecked] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [tree, setTree] = useState<OrganisationTreeApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{
    kind: ModalKind;
    roleId?: string;
    role?: OrganisationRoleApi;
    member?: OrganisationMemberApi;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadTree = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const res = await apiFetch("/api/organisation", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Gagal memuat");
      const data: OrganisationTreeApi = await res.json();
      setTree(data);
    } catch {
      setError("Gagal memuat data organisasi.");
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
    if (!isAuthenticated) {
      router.replace("/auth/login");
      return;
    }
    apiFetch("/api/organisation/permissions", { credentials: "include" })
      .then((res) => res.json())
      .then((data: { canManageOrganisation?: boolean }) => {
        setCanManage(Boolean(data?.canManageOrganisation));
        setPermissionChecked(true);
      })
      .catch(() => {
        setCanManage(false);
        setPermissionChecked(true);
      });
  }, [hasMounted, isAuthenticated, router]);

  useEffect(() => {
    if (!permissionChecked || canManage) return;
    router.replace("/organisasi");
  }, [permissionChecked, canManage, router]);

  useEffect(() => {
    if (canManage) void loadTree();
  }, [canManage, loadTree]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      let res: Response;
      if (deleteTarget.kind === "role") {
        res = await apiFetch(
          `/api/organisation/roles/${deleteTarget.role.id}`,
          { method: "DELETE", credentials: "include" },
        );
      } else {
        res = await apiFetch(
          `/api/organisation/members/${deleteTarget.member.id}`,
          { method: "DELETE", credentials: "include" },
        );
      }
      if (res.ok) {
        setDeleteTarget(null);
        void loadTree(true);
      }
    } finally {
      setDeleting(false);
    }
  };

  if (!hasMounted || !isAuthenticated || !permissionChecked || !canManage) {
    return <PageLoader message="Memuat..." />;
  }

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

  return (
    <>
      <style>{globalKeyframes}</style>

      <main className="flex h-full min-h-0 flex-col bg-app-surface-alt">
        {/* ── Gradient Hero ──────────────────────────────────── */}
        <section
          className="relative shrink-0 overflow-hidden px-4 pb-5 pt-5 text-white"
          style={{
            background:
              "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)",
          }}
          aria-label="Kelola organisasi"
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
            {/* Nav row */}
            <div className="flex items-center gap-3">
              <Link
                href="/organisasi"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm transition hover:bg-white/30 active:scale-90"
                aria-label="Kembali ke organisasi"
              >
                <ArrowLeftIcon className="h-5 w-5 text-white" aria-hidden />
              </Link>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                  Organisasi · RT 03
                </p>
                <h1 className="truncate text-lg font-extrabold leading-tight text-white">
                  Kelola Struktur
                </h1>
              </div>
              <button
                type="button"
                onClick={() => void loadTree(true)}
                disabled={refreshing}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm transition hover:bg-white/30 active:scale-90 disabled:opacity-50"
                aria-label="Muat ulang"
              >
                <ArrowPathIcon
                  className={`h-4 w-4 text-white ${refreshing ? "animate-spin" : ""}`}
                  aria-hidden
                />
              </button>
            </div>

            {/* Stats strip */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              {/* Peran */}
              <div className="flex flex-col items-center rounded-2xl bg-white/15 px-3 py-2.5 backdrop-blur-sm">
                <span className="text-[9px] font-semibold uppercase tracking-widest text-white/60">
                  Peran
                </span>
                {loading ? (
                  <div className="mt-1 h-[18px] w-10 animate-pulse rounded-md bg-white/20" />
                ) : (
                  <span className="mt-0.5 text-[15px] font-extrabold leading-tight text-white">
                    {totalRoles}
                  </span>
                )}
              </div>
              {/* Anggota */}
              <div className="flex flex-col items-center rounded-2xl bg-white/15 px-3 py-2.5 backdrop-blur-sm">
                <span className="text-[9px] font-semibold uppercase tracking-widest text-white/60">
                  Anggota
                </span>
                {loading ? (
                  <div className="mt-1 h-[18px] w-10 animate-pulse rounded-md bg-white/20" />
                ) : (
                  <span className="mt-0.5 text-[15px] font-extrabold leading-tight text-white">
                    {totalMembers}
                  </span>
                )}
              </div>
              {/* Kosong */}
              <div className="flex flex-col items-center rounded-2xl bg-white/15 px-3 py-2.5 backdrop-blur-sm">
                <span className="text-[9px] font-semibold uppercase tracking-widest text-white/60">
                  Kosong
                </span>
                {loading ? (
                  <div className="mt-1 h-[18px] w-10 animate-pulse rounded-md bg-white/20" />
                ) : (
                  <span
                    className={`mt-0.5 text-[15px] font-extrabold leading-tight ${
                      vacantCount > 0 ? "text-amber-200" : "text-white"
                    }`}
                  >
                    {vacantCount}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Scrollable content ──────────────────────────────── */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 pb-28">
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

          {/* Skeleton */}
          {loading && !tree && (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="animate-pulse overflow-hidden rounded-3xl bg-app-surface shadow-[0_4px_16px_rgba(0,40,5,0.06)]"
                >
                  <div className="flex items-center gap-3 border-b border-[var(--color-input-border)] px-4 py-3.5">
                    <div className="h-8 w-8 rounded-xl bg-app-surface-alt" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 w-28 rounded-full bg-app-surface-alt" />
                      <div className="h-2.5 w-20 rounded-full bg-app-surface-alt" />
                    </div>
                  </div>
                  <div className="space-y-2 px-4 py-3">
                    {[1, 2].map((j) => (
                      <div
                        key={j}
                        className="flex items-center gap-2.5 rounded-2xl bg-app-surface-alt/60 px-3 py-2.5"
                      >
                        <div className="h-9 w-9 rounded-xl bg-app-surface" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 w-24 rounded-full bg-app-surface" />
                          <div className="h-2.5 w-16 rounded-full bg-app-surface" />
                        </div>
                      </div>
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
                <div className="flex flex-col items-center gap-3 rounded-3xl bg-app-surface py-10 text-center px-6 shadow-[0_4px_16px_rgba(0,40,5,0.05)]">
                  <BuildingOffice2Icon
                    className="h-10 w-10 text-app-body-muted/30"
                    aria-hidden
                  />
                  <p className="text-sm font-bold text-app-body-muted">
                    Belum ada peran
                  </p>
                  <p className="text-xs text-app-body-muted/70 max-w-[180px] leading-relaxed">
                    Klik tombol di bawah untuk mulai menambahkan peran
                    organisasi.
                  </p>
                  <button
                    type="button"
                    onClick={() => setModal({ kind: "add-role" })}
                    className="mt-1 flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-white transition active:scale-95"
                    style={{ background: "var(--color-primary)" }}
                  >
                    <PlusOutlineIcon className="h-3.5 w-3.5" aria-hidden />
                    Tambah Peran Pertama
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {tree.roles.map((role, index) => (
                    <RoleCard
                      key={role.id}
                      role={role}
                      index={index}
                      onEdit={() => setModal({ kind: "edit-role", role })}
                      onDelete={() => setDeleteTarget({ kind: "role", role })}
                      onAddMember={() =>
                        setModal({ kind: "add-member", roleId: role.id, role })
                      }
                      onEditMember={(member) =>
                        setModal({
                          kind: "edit-member",
                          roleId: role.id,
                          role,
                          member,
                        })
                      }
                      onDeleteMember={(member) =>
                        setDeleteTarget({ kind: "member", member })
                      }
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── FAB ────────────────────────────────────────────── */}
        <div className="fixed bottom-6 right-4 z-30">
          <button
            type="button"
            onClick={() => setModal({ kind: "add-role" })}
            className="flex items-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
            style={{
              background: "var(--color-primary)",
              boxShadow: "0 8px 24px -6px var(--color-primary-shadow)",
            }}
          >
            <PlusOutlineIcon className="h-5 w-5" aria-hidden />
            Tambah Peran
          </button>
        </div>

        {/* ── Bottom Sheet ────────────────────────────────────── */}
        {modal && (
          <OrganisationSheet
            kind={modal.kind}
            roleId={modal.roleId}
            role={modal.role}
            member={modal.member}
            onClose={() => setModal(null)}
            onSaved={() => {
              setModal(null);
              void loadTree(true);
            }}
          />
        )}

        {/* ── Delete Dialog ───────────────────────────────────── */}
        {deleteTarget && (
          <DeleteDialog
            target={deleteTarget}
            onClose={() => setDeleteTarget(null)}
            onConfirm={handleDelete}
            loading={deleting}
          />
        )}
      </main>
    </>
  );
}
