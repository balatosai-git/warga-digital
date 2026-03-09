"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { PageLoader, getInitials } from "@/components/ui";
import type { OrganisationTreeApi, OrganisationRoleApi, OrganisationMemberApi } from "@/lib/organisation-api";

type ModalKind = "add-role" | "edit-role" | "add-member" | "edit-member" | null;

export default function OrganisasiManagePage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [hasMounted, setHasMounted] = useState(false);
  const [permissionChecked, setPermissionChecked] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [tree, setTree] = useState<OrganisationTreeApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{
    kind: ModalKind;
    roleId?: string;
    role?: OrganisationRoleApi;
    member?: OrganisationMemberApi;
  } | null>(null);

  const loadTree = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/organisation", { credentials: "include" });
      if (!res.ok) throw new Error("Gagal memuat");
      const data: OrganisationTreeApi = await res.json();
      setTree(data);
    } catch (e) {
      setError("Gagal memuat data organisasi.");
    } finally {
      setLoading(false);
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
    fetch("/api/organisation/permissions", { credentials: "include" })
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

  if (!hasMounted || !isAuthenticated || !permissionChecked || !canManage) {
    return <PageLoader message="Memuat..." />;
  }

  return (
    <main className="flex h-full min-h-0 flex-col bg-app-surface-alt">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/organisasi"
              className="rounded-lg p-1 text-app-body-muted transition hover:bg-app-surface hover:text-app-body"
              aria-label="Kembali ke organisasi"
            >
              <BackIcon />
            </Link>
            <h1 className="text-xl font-bold text-app-title">Kelola Organisasi</h1>
          </div>
          <button
            type="button"
            onClick={() => setModal({ kind: "add-role" })}
            className="inline-flex items-center gap-2 rounded-2xl bg-app-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98] hover:opacity-95"
          >
            <PlusIcon />
            <span>Tambah peran</span>
          </button>
        </div>

        {loading && (
          <p className="py-8 text-center text-app-body-muted">Memuat...</p>
        )}
        {error && (
          <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">
            {error}
            <button
              type="button"
              onClick={() => void loadTree()}
              className="ml-2 font-medium underline"
            >
              Coba lagi
            </button>
          </div>
        )}
        {!loading && !error && tree && (
          <div className="space-y-6">
            {tree.roles.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[var(--color-input-border)] bg-white/50 py-8 text-center text-app-body-muted">
                Belum ada peran. Klik &quot;Tambah peran&quot; untuk mulai.
              </p>
            ) : (
              tree.roles.map((role) => (
                <RoleCard
                  key={role.id}
                  role={role}
                  onEdit={() => setModal({ kind: "edit-role", role })}
                  onDelete={async () => {
                    if (!confirm(`Hapus peran "${role.title}" dan semua anggotanya?`)) return;
                    const res = await fetch(`/api/organisation/roles/${role.id}`, { method: "DELETE", credentials: "include" });
                    if (res.ok) void loadTree();
                  }}
                  onAddMember={() => setModal({ kind: "add-member", roleId: role.id, role })}
                  onEditMember={(member) => setModal({ kind: "edit-member", roleId: role.id, role, member })}
                  onDeleteMember={async (member) => {
                    if (!confirm(`Hapus ${member.fullName}?`)) return;
                    const res = await fetch(`/api/organisation/members/${member.id}`, { method: "DELETE", credentials: "include" });
                    if (res.ok) void loadTree();
                  }}
                />
              ))
            )}
          </div>
        )}

        {modal && (
          <OrganisationModal
            kind={modal.kind}
            roleId={modal.roleId}
            role={modal.role}
            member={modal.member}
            onClose={() => setModal(null)}
            onSaved={() => {
              setModal(null);
              void loadTree();
            }}
          />
        )}
      </div>
    </main>
  );
}

function BackIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function RoleCard({
  role,
  onEdit,
  onDelete,
  onAddMember,
  onEditMember,
  onDeleteMember,
}: {
  role: OrganisationRoleApi;
  onEdit: () => void;
  onDelete: () => void;
  onAddMember: () => void;
  onEditMember: (m: OrganisationMemberApi) => void;
  onDeleteMember: (m: OrganisationMemberApi) => void;
}) {
  return (
    <section className="rounded-2xl border border-[var(--color-input-border)] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-app-title">{role.title}</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg p-2 text-app-body-muted transition hover:bg-app-surface-alt hover:text-app-body"
            aria-label="Edit peran"
          >
            <PencilIcon />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg p-2 text-app-body-muted transition hover:bg-red-50 hover:text-red-600"
            aria-label="Hapus peran"
          >
            <TrashIcon />
          </button>
        </div>
      </div>
      <ul className="space-y-2">
        {role.members.map((member) => {
          const isVacant = member.userId == null;
          const displayName = isVacant ? "Vacant" : member.fullName;
          const displaySub = isVacant ? "Peran kosong, belum ada penanggung jawab" : `${member.blockName ? `${member.blockName} · ` : ""}${member.whatsappNumber}`;
          return (
          <li
            key={member.id}
            className="flex items-center justify-between gap-2 rounded-xl border border-[var(--color-input-border)] bg-app-surface-alt/50 px-3 py-2"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-semibold ${isVacant ? "bg-app-body-muted/20 text-app-body-muted" : "bg-app-primary/15 text-app-primary"}`}>
                {!isVacant && member.profilePictureUrl ? (
                  <img src={member.profilePictureUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span>{isVacant ? "—" : getInitials(displayName)}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-app-title text-sm">{displayName}</p>
                <p className="truncate text-xs text-app-body-muted">{displaySub}</p>
              </div>
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={() => onEditMember(member)}
                className="rounded-lg p-1.5 text-app-body-muted transition hover:bg-app-surface hover:text-app-body"
                aria-label="Edit anggota"
              >
                <PencilIcon />
              </button>
              <button
                type="button"
                onClick={() => onDeleteMember(member)}
                className="rounded-lg p-1.5 text-app-body-muted transition hover:bg-red-50 hover:text-red-600"
                aria-label={isVacant ? "Hapus Vacant" : "Hapus anggota"}
              >
                <TrashIcon />
              </button>
            </div>
          </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={onAddMember}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--color-input-border)] py-2.5 text-sm font-medium text-app-body-muted transition hover:border-app-primary hover:bg-app-primary/5 hover:text-app-primary"
      >
        <PlusIcon />
        <span>Tambah anggota</span>
      </button>
    </section>
  );
}

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

type CommunityUser = {
  id: string;
  fullName: string;
  blockName: string;
  whatsappNumber: string;
  profilePictureUrl: string | null;
};

function OrganisationModal({
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
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const isRole = kind === "add-role" || kind === "edit-role";
  const isMember = kind === "add-member" || kind === "edit-member";
  const titleLabel =
    kind === "add-role" ? "Tambah peran" :
    kind === "edit-role" ? "Edit peran" :
    kind === "add-member" ? "Tambah anggota" : "Edit anggota";

  useEffect(() => {
    if (!isMember) return;
    setSelectedUserId(member?.userId ?? "");
    setCommunityUsersLoading(true);
    setCommunityUsers([]);
    fetch("/api/organisation/community-users", { credentials: "include" })
      .then((res) => res.ok ? res.json() : [])
      .then((list: CommunityUser[]) => {
        setCommunityUsers(Array.isArray(list) ? list : []);
      })
      .catch(() => setCommunityUsers([]))
      .finally(() => setCommunityUsersLoading(false));
  }, [isMember, member?.userId]);

  const handleSubmitRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    try {
      if (kind === "add-role") {
        const res = await fetch("/api/organisation/roles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ title: title.trim(), sortOrder }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? "Gagal menambah peran");
      } else if (kind === "edit-role" && role) {
        const res = await fetch(`/api/organisation/roles/${role.id}`, {
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
        const res = await fetch(`/api/organisation/roles/${roleId}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ userId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? "Gagal menambah anggota");
      } else if (kind === "edit-member" && member) {
        const res = await fetch(`/api/organisation/members/${member.id}`, {
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
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[430px] rounded-t-3xl bg-app-surface p-4 shadow-[0_-16px_40px_-24px_rgba(15,23,42,0.6)] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="org-modal-title"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="org-modal-title" className="text-lg font-bold text-app-title">
            {titleLabel}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-app-body-muted transition hover:bg-app-surface-alt hover:text-app-body"
            aria-label="Tutup"
          >
            <CloseIcon />
          </button>
        </div>

        {err && (
          <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {err}
          </p>
        )}

        {isRole && (
          <form onSubmit={handleSubmitRole} className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-app-body">Nama peran</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Bendahara"
                className="mt-1 w-full rounded-xl border border-[var(--color-input-border)] bg-white px-3 py-2 text-app-body focus:border-app-primary focus:outline-none"
                required
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-app-body">Urutan</span>
              <input
                type="number"
                min={0}
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
                className="mt-1 w-full rounded-xl border border-[var(--color-input-border)] bg-white px-3 py-2 text-app-body focus:border-app-primary focus:outline-none"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-2xl border border-[var(--color-input-border)] py-2.5 text-sm font-semibold text-app-body transition hover:bg-app-surface-alt"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving || !title.trim()}
                className="flex-1 rounded-2xl bg-app-primary py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-50"
              >
                {saving ? "Menyimpan..." : kind === "add-role" ? "Tambah" : "Simpan"}
              </button>
            </div>
          </form>
        )}

        {isMember && (
          <form onSubmit={handleSubmitMember} className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-app-body">Pilih warga atau Vacant</span>
              <p className="mt-0.5 text-xs text-app-body-muted">Hanya warga terdaftar di komunitas ini. Pilih &quot;Vacant&quot; jika peran belum diisi.</p>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[var(--color-input-border)] bg-white px-3 py-2.5 text-app-body focus:border-app-primary focus:outline-none"
                disabled={communityUsersLoading}
              >
                <option value="">— Vacant (belum ada penanggung jawab)</option>
                {communityUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName}{u.blockName ? ` · ${u.blockName}` : ""}
                  </option>
                ))}
              </select>
              {communityUsersLoading && (
                <p className="mt-1 text-xs text-app-body-muted">Memuat daftar warga...</p>
              )}
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-2xl border border-[var(--color-input-border)] py-2.5 text-sm font-semibold text-app-body transition hover:bg-app-surface-alt"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-2xl bg-app-primary py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-50"
              >
                {saving ? "Menyimpan..." : kind === "add-member" ? "Tambah" : "Simpan"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}
