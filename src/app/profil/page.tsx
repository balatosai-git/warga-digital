"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowPathIcon,
  ArrowRightOnRectangleIcon,
  CameraIcon,
  CheckIcon,
  ChevronLeftIcon,
  ExclamationTriangleIcon,
  KeyIcon,
  PencilSquareIcon,
  PlusIcon,
  SwatchIcon,
  UserMinusIcon,
  UsersIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { Avatar, PageLoader } from "@/components/ui";
import { OtpInput } from "@/components/auth/otp-input";
import { useAuthStore } from "@/stores/auth-store";
import { useAppearanceStore } from "@/stores/appearance-store";
import { apiFetch } from "@/lib/api-client";
import { THEMES, getTheme } from "@/lib/themes";
import {
  setHeaderProfileCookie,
  getHeaderProfileCookie,
} from "@/lib/header-profile-cookie";

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface FamilyMember {
  userId: string;
  fullName: string;
  username: string | null;
  relationship: string;
  isPrimary: boolean;
}

interface PendingJoinRequestItem {
  id: string;
  houseId?: string;
  requesterFullName: string;
  blokRumah: string;
  createdAt: string;
}

interface PendingJoinRequestRequester {
  blokRumah: string;
  ownerFullName: string;
  status: string;
}

interface ProfileRole {
  id: number;
  name: string;
  description: string | null;
}

interface ProfileBadge {
  id: number;
  code: string;
  name: string;
  description: string | null;
  icon: string;
  earnedAt: string;
}

interface ProfileResidence {
  tenant: { id: string; name: string };
  community: { id: string; code: string; name: string | null };
  house: {
    houseId: string;
    blok_rumah: string | null;
    address: string | null;
    name: string;
    members: FamilyMember[];
  };
  isPrimary: boolean;
  roles: ProfileRole[];
}

interface ProfileData {
  id: string;
  fullName: string;
  username: string | null;
  waNumber: string | null;
  waNumberMasked: string | null;
  email: string | null;
  dateOfBirth: string | null;
  status: string;
  createdAt: string;
  profilePictureUrl: string | null;
  themeId?: string;
  tenant?: { id: string; name: string } | null;
  community?: { id: string; code: string; name: string | null } | null;
  roles?: ProfileRole[];
  badges?: ProfileBadge[];
  house: {
    houseId?: string;
    blok_rumah: string | null;
    address: string | null;
    name: string;
    members: FamilyMember[];
  } | null;
  residences?: ProfileResidence[];
  pendingJoinRequests?: PendingJoinRequestItem[];
  pendingJoinRequest?: PendingJoinRequestRequester | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RELATIONSHIP_LABELS: Record<string, string> = {
  OWNER: "Kepala Rumah Tangga",
  FAMILY: "Keluarga",
  TENANT: "Penyewa",
  CARETAKER: "Penjaga",
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const adjusted = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return adjusted.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

// ─── ConfirmDialog state interface ───────────────────────────────────────────

interface ConfirmDialogState {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => Promise<void>;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PageHero({
  breadcrumb,
  title,
  onBack,
  rightSlot,
}: {
  breadcrumb: string;
  title: string;
  onBack: () => void;
  rightSlot?: React.ReactNode;
}) {
  return (
    <section
      className="relative shrink-0 overflow-hidden px-4 pb-5 pt-5 text-white"
      style={{
        background:
          "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/10"
        aria-hidden
      />
      <div className="relative z-10 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm transition hover:bg-white/30 active:scale-90"
          aria-label="Kembali"
        >
          <ChevronLeftIcon className="h-5 w-5 text-white" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
            {breadcrumb}
          </p>
          <h1 className="truncate text-lg font-extrabold leading-tight text-white">
            {title}
          </h1>
        </div>
        {rightSlot}
      </div>
    </section>
  );
}

function InfoRow({
  label,
  value,
  isLast,
}: {
  label: string;
  value: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 py-2.5 ${
        !isLast ? "border-b border-[var(--color-input-border)]" : ""
      }`}
    >
      <span className="shrink-0 text-[13px] text-app-body-muted">{label}</span>
      <span className="text-right text-[13px] font-semibold text-app-title">
        {value}
      </span>
    </div>
  );
}

function FieldInput({
  label,
  id,
  optional,
  ...props
}: {
  label: string;
  id: string;
  optional?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted"
      >
        {label}
        {optional && (
          <span className="ml-1 normal-case font-normal text-app-body-muted/70">
            (opsional)
          </span>
        )}
      </label>
      <input
        id={id}
        className="w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title placeholder:text-app-body-muted/50 outline-none transition-all"
        style={{ borderColor: "var(--color-input-border)" }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--color-primary)";
          e.currentTarget.style.boxShadow =
            "0 0 0 3px color-mix(in srgb, var(--color-primary) 16%, white 84%)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "var(--color-input-border)";
          e.currentTarget.style.boxShadow = "none";
        }}
        {...props}
      />
    </div>
  );
}

function ThemeSheet({
  open,
  currentId,
  saving,
  onSelect,
  onClose,
}: {
  open: boolean;
  currentId: string;
  saving: boolean;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={saving ? undefined : onClose}
        aria-hidden
        style={{ animation: "fadeIn 0.2s ease" }}
      />
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 w-full rounded-t-[2rem] bg-app-surface shadow-[0_-20px_60px_rgba(0,40,5,0.18)]"
        style={{
          maxWidth: "var(--app-max-width)",
          animation: "sheetUp 0.3s cubic-bezier(0.34,1.4,0.64,1)",
        }}
      >
        <div className="flex justify-center pt-3">
          <div
            className="h-1 w-10 rounded-full"
            style={{ background: "var(--color-input-border)" }}
          />
        </div>
        <div className="px-5 pb-8 pt-3">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-app-title">
                Tema Warna
              </h2>
              <p className="mt-0.5 text-xs text-app-body-muted">
                Pilih warna tampilan aplikasi
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

          <div className="grid grid-cols-3 gap-3">
            {THEMES.map((theme) => {
              const isActive = theme.id === currentId;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => !saving && onSelect(theme.id)}
                  disabled={saving}
                  className={`relative flex flex-col items-center gap-2.5 rounded-2xl border-2 px-3 py-4 transition active:scale-95 disabled:opacity-60 ${
                    isActive
                      ? ""
                      : "border-[var(--color-input-border)] hover:border-[var(--color-primary-muted)]"
                  }`}
                  style={
                    isActive
                      ? { borderColor: "var(--color-primary)" }
                      : undefined
                  }
                >
                  <span
                    className="h-9 w-9 rounded-full shadow-md"
                    style={{
                      background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.primaryHover})`,
                    }}
                    aria-hidden
                  />
                  {isActive && (
                    <span
                      className="absolute right-2.5 top-2.5 flex h-4 w-4 items-center justify-center rounded-full"
                      style={{ background: "var(--color-primary)" }}
                    >
                      <CheckIcon className="h-2.5 w-2.5 text-white" />
                    </span>
                  )}
                  <span className="text-[11px] font-semibold leading-tight text-app-title">
                    {theme.nameId}
                  </span>
                </button>
              );
            })}
          </div>

          {saving && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <ArrowPathIcon className="h-4 w-4 animate-spin text-app-body-muted" />
              <p className="text-xs text-app-body-muted">Menyimpan tema...</p>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes sheetUp { from{transform:translate(-50%,100%)} to{transform:translate(-50%,0)} }
      `}</style>
    </>
  );
}

function ConfirmDialog({
  state,
  loading,
  onClose,
}: {
  state: ConfirmDialogState | null;
  loading: boolean;
  onClose: () => void;
}) {
  if (!state) return null;
  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={loading ? undefined : onClose}
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
      >
        {state.danger && (
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-red-100">
            <ExclamationTriangleIcon className="h-7 w-7 text-red-600" />
          </div>
        )}
        <h3 className="text-center text-base font-extrabold text-app-title">
          {state.title}
        </h3>
        <p className="mt-2 text-center text-sm text-app-body-muted leading-relaxed">
          {state.message}
        </p>
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
            onClick={() => void state.onConfirm()}
            disabled={loading}
            className="flex-1 rounded-2xl py-3 text-sm font-bold text-white transition active:scale-95 disabled:opacity-50"
            style={{
              background: state.danger ? "#dc2626" : "var(--color-primary)",
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-1.5">
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                Memproses...
              </span>
            ) : (
              state.confirmLabel
            )}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes dialogIn { from{opacity:0;transform:translate(-50%,-50%) scale(0.92)} to{opacity:1;transform:translate(-50%,-50%) scale(1)} }
      `}</style>
    </>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const clearUser = useAuthStore((s) => s.clearUser);
  const setUser = useAuthStore((s) => s.setUser);
  const themeId = useAppearanceStore((s) => s.themeId);
  const setThemeId = useAppearanceStore((s) => s.setThemeId);
  const [appearanceSaving, setAppearanceSaving] = useState(false);

  // New overlay state
  const [themeSheetOpen, setThemeSheetOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(
    null,
  );
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [hasMounted, setHasMounted] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Edit form state
  const [editFullName, setEditFullName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editWaNumber, setEditWaNumber] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editDateOfBirth, setEditDateOfBirth] = useState("");

  // Availability checking state
  const [usernameCheckLoading, setUsernameCheckLoading] = useState(false);
  const [usernameCheckStatus, setUsernameCheckStatus] = useState<
    "idle" | "available" | "taken" | "error"
  >("idle");
  const [waNumberCheckLoading, setWaNumberCheckLoading] = useState(false);
  const [waNumberCheckStatus, setWaNumberCheckStatus] = useState<
    "idle" | "available" | "taken" | "error"
  >("idle");
  const [validationError, setValidationError] = useState<string | null>(null);

  // Ubah PIN state
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmNewPin, setConfirmNewPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinLoading, setPinLoading] = useState(false);

  // Avatar upload
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // House join request respond
  const [respondingRequestId, setRespondingRequestId] = useState<string | null>(
    null,
  );
  const [respondError, setRespondError] = useState<string | null>(null);

  // Family management (kepala keluarga) — focused edit view
  const [isManagingFamily, setIsManagingFamily] = useState(false);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [addMemberFullName, setAddMemberFullName] = useState("");
  const [addMemberUsername, setAddMemberUsername] = useState("");
  const [addMemberWaNumber, setAddMemberWaNumber] = useState("");
  const [addMemberError, setAddMemberError] = useState<string | null>(null);
  const [addMemberLoading, setAddMemberLoading] = useState(false);
  const [transferLoadingId, setTransferLoadingId] = useState<string | null>(
    null,
  );
  const [removeLoadingId, setRemoveLoadingId] = useState<string | null>(null);
  const [familyActionError, setFamilyActionError] = useState<string | null>(
    null,
  );
  const [selectedResidenceIndex, setSelectedResidenceIndex] = useState(0);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;
    if (!isAuthenticated) {
      router.replace("/auth/login");
      return;
    }
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch("/api/profile");
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (res.status === 401) {
            clearUser();
            router.replace("/auth/login");
            return;
          }
          setError(data.error ?? "Gagal memuat profil");
          setProfile(null);
          return;
        }
        const data = await res.json();
        setProfile(data);
        setEditFullName(data.fullName ?? "");
        setEditUsername(data.username ?? "");
        setEditWaNumber(data.waNumber ?? "");
        setEditEmail(data.email ?? "");
        setEditDateOfBirth(toDateInputValue(data.dateOfBirth));
        setValidationError(null);
        setUsernameCheckStatus("idle");
        setWaNumberCheckStatus("idle");
        const savedThemeId = data.themeId ?? "green";
        setThemeId(savedThemeId);
        const house = data.house;
        const blok =
          house?.blok_rumah && house?.name
            ? `Blok — ${house.blok_rumah}`
            : (house?.blok_rumah ?? "Blok —");
        setHeaderProfileCookie({
          name: data.fullName ?? "Warga",
          profilePictureUrl: data.profilePictureUrl ?? null,
          blokRumah: blok,
        });
      } catch {
        setError("Gagal memuat profil");
        setProfile(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [hasMounted, isAuthenticated, router, clearUser]);

  const refreshProfile = async () => {
    const profileRes = await apiFetch("/api/profile");
    if (profileRes.ok) {
      const profileData = await profileRes.json();
      setProfile(profileData);
      setEditFullName(profileData.fullName ?? "");
      setEditUsername(profileData.username ?? "");
      setEditWaNumber(profileData.waNumber ?? "");
      setEditEmail(profileData.email ?? "");
      setEditDateOfBirth(toDateInputValue(profileData.dateOfBirth));
      setValidationError(null);
      setUsernameCheckStatus("idle");
      setWaNumberCheckStatus("idle");
      const savedThemeId = profileData.themeId ?? "green";
      setThemeId(savedThemeId);
      const house = profileData.house;
      const blok =
        house?.blok_rumah && house?.name
          ? `Blok — ${house.blok_rumah}`
          : (house?.blok_rumah ?? "Blok —");
      setHeaderProfileCookie({
        name: profileData.fullName ?? "Warga",
        profilePictureUrl: profileData.profilePictureUrl ?? null,
        blokRumah: blok,
      });
    }
  };

  const checkUsernameAvailability = async (username: string) => {
    if (!username.trim()) {
      setUsernameCheckStatus("idle");
      return;
    }
    setUsernameCheckLoading(true);
    setUsernameCheckStatus("idle");
    try {
      const res = await apiFetch("/api/profile/check/username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });
      const data = await res.json();
      if (data.available) {
        setUsernameCheckStatus("available");
      } else {
        setUsernameCheckStatus("taken");
      }
    } catch {
      setUsernameCheckStatus("error");
    } finally {
      setUsernameCheckLoading(false);
    }
  };

  const checkWaNumberAvailability = async (waNumber: string) => {
    if (!waNumber.trim()) {
      setWaNumberCheckStatus("idle");
      return;
    }
    setWaNumberCheckLoading(true);
    setWaNumberCheckStatus("idle");
    try {
      const res = await apiFetch("/api/profile/check/wa-number", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waNumber: waNumber.trim() }),
      });
      const data = await res.json();
      if (data.available) {
        setWaNumberCheckStatus("available");
      } else {
        setWaNumberCheckStatus("taken");
      }
    } catch {
      setWaNumberCheckStatus("error");
    } finally {
      setWaNumberCheckLoading(false);
    }
  };

  const handleRespondToJoinRequest = async (
    requestId: string,
    action: "approve" | "reject",
  ) => {
    setRespondError(null);
    setRespondingRequestId(requestId);
    try {
      const res = await apiFetch("/api/house-join-requests/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRespondError(data.error ?? "Gagal menanggapi permintaan");
        return;
      }
      await refreshProfile();
    } catch {
      setRespondError("Terjadi kesalahan");
    } finally {
      setRespondingRequestId(null);
    }
  };

  const residences = profile?.residences ?? [];
  const currentResidence = residences.length
    ? (residences[selectedResidenceIndex] ?? residences[0])
    : profile?.house && profile?.tenant
      ? {
          tenant: profile.tenant,
          community: profile.community ?? { id: "", code: "", name: null },
          house: profile.house,
          isPrimary: true,
          roles: profile.roles ?? [],
        }
      : null;
  const currentHouse = currentResidence?.house ?? null;
  const isKepalaKeluarga = Boolean(
    currentHouse?.members?.some(
      (m) => m.userId === profile?.id && m.relationship === "OWNER",
    ),
  );
  const houseId = currentHouse?.houseId;

  useEffect(() => {
    if (residences.length > 0 && selectedResidenceIndex >= residences.length) {
      setSelectedResidenceIndex(0);
    }
  }, [residences.length, selectedResidenceIndex]);

  const handleTransferOwner = (newOwnerUserId: string) => {
    if (!houseId) return;
    const member = currentHouse?.members.find(
      (m) => m.userId === newOwnerUserId,
    );
    setConfirmDialog({
      title: "Jadikan Kepala Keluarga?",
      message: `${member?.fullName ?? "Anggota ini"} akan menjadi Kepala Rumah Tangga. Anda akan menjadi anggota keluarga biasa.`,
      confirmLabel: "Ya, Jadikan",
      onConfirm: async () => {
        setConfirmLoading(true);
        setFamilyActionError(null);
        try {
          const res = await apiFetch("/api/family/transfer-owner", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ houseId, newOwnerUserId }),
          });
          const data = await res.json();
          if (!res.ok) {
            setFamilyActionError(data.error ?? "Gagal mengalihkan");
          } else {
            await refreshProfile();
          }
        } catch {
          setFamilyActionError("Terjadi kesalahan");
        } finally {
          setConfirmLoading(false);
          setConfirmDialog(null);
        }
      },
    });
  };

  const handleRemoveMember = (memberUserId: string) => {
    if (!houseId) return;
    const member = currentHouse?.members.find((m) => m.userId === memberUserId);
    setConfirmDialog({
      title: "Keluarkan Anggota?",
      message: `${member?.fullName ?? "Anggota ini"} akan dikeluarkan dan tidak lagi terhubung dengan rumah ini.`,
      confirmLabel: "Ya, Keluarkan",
      danger: true,
      onConfirm: async () => {
        setConfirmLoading(true);
        setFamilyActionError(null);
        try {
          const res = await apiFetch("/api/family/remove-member", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ houseId, memberUserId }),
          });
          const data = await res.json();
          if (!res.ok) {
            setFamilyActionError(data.error ?? "Gagal mengeluarkan");
          } else {
            await refreshProfile();
          }
        } catch {
          setFamilyActionError("Terjadi kesalahan");
        } finally {
          setConfirmLoading(false);
          setConfirmDialog(null);
        }
      },
    });
  };

  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddMemberError(null);
    const nameErr = !addMemberFullName.trim()
      ? "Nama wajib"
      : addMemberFullName.trim().length < 2
        ? "Nama minimal 2 karakter"
        : undefined;
    const waErr = !addMemberWaNumber.trim()
      ? "Nomor WhatsApp wajib"
      : undefined;
    if (nameErr || waErr) {
      setAddMemberError(nameErr ?? waErr ?? "");
      return;
    }
    setAddMemberLoading(true);
    try {
      const res = await apiFetch("/api/family/add-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: addMemberFullName.trim(),
          username: addMemberUsername.trim() || undefined,
          waNumber: addMemberWaNumber.trim(),
          ...(houseId && { houseId }),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddMemberError(data.error ?? "Gagal menambah anggota");
        return;
      }
      setAddMemberFullName("");
      setAddMemberUsername("");
      setAddMemberWaNumber("");
      setShowAddMemberForm(false);
      await refreshProfile();
    } catch {
      setAddMemberError("Terjadi kesalahan");
    } finally {
      setAddMemberLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setValidationError(null);

    // Validation: username or wa_number must not both be empty
    const hasUsername = editUsername.trim().length > 0;
    const hasWaNumber = editWaNumber.trim().length > 0;

    if (!hasUsername && !hasWaNumber) {
      setValidationError(
        "Username atau nomor WhatsApp wajib diisi (minimal satu harus aktif)",
      );
      return;
    }

    // Check availability if changed
    if (
      hasUsername &&
      editUsername !== profile?.username &&
      usernameCheckStatus === "taken"
    ) {
      setValidationError("Username sudah dipakai");
      return;
    }

    if (
      hasWaNumber &&
      editWaNumber !== profile?.waNumberMasked &&
      waNumberCheckStatus === "taken"
    ) {
      setValidationError("Nomor WhatsApp sudah dipakai");
      return;
    }

    setSaving(true);
    try {
      const res = await apiFetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: editFullName.trim(),
          username: editUsername.trim() || null,
          wa_number: editWaNumber.trim() || null,
          email: editEmail.trim() || null,
          date_of_birth: editDateOfBirth || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error ?? "Gagal menyimpan");
        return;
      }
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              fullName: data.profile.fullName,
              username: data.profile.username,
              waNumberMasked: data.profile.waNumber,
              email: data.profile.email,
              dateOfBirth: data.profile.dateOfBirth,
            }
          : null,
      );
      setUser({ id: profile!.id, fullName: data.profile.fullName });
      setIsEditing(false);
      const house = profile?.house;
      const blok =
        house?.blok_rumah && house?.name
          ? `Blok — ${house.blok_rumah}`
          : (house?.blok_rumah ?? "Blok —");
      const existing = getHeaderProfileCookie();
      setHeaderProfileCookie({
        name: data.profile.fullName,
        profilePictureUrl:
          existing?.profilePictureUrl ?? profile?.profilePictureUrl ?? null,
        blokRumah: existing?.blokRumah ?? blok,
      });
    } catch {
      setSaveError("Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      clearUser();
      router.replace("/auth/login");
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAvatarError(null);
    setAvatarLoading(true);
    const formData = new FormData();
    formData.set("file", file);
    apiFetch("/api/profile/avatar", {
      method: "POST",
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.profilePictureUrl && data.error) {
          setAvatarError(data.error);
          return;
        }
        setProfile((prev) =>
          prev
            ? { ...prev, profilePictureUrl: data.profilePictureUrl ?? null }
            : null,
        );
        const existing = getHeaderProfileCookie();
        if (existing) {
          setHeaderProfileCookie({
            ...existing,
            profilePictureUrl: data.profilePictureUrl ?? null,
          });
        }
      })
      .catch(() => setAvatarError("Gagal mengunggah foto."))
      .finally(() => setAvatarLoading(false));
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    if (
      currentPin.length !== 4 ||
      newPin.length !== 4 ||
      confirmNewPin.length !== 4
    ) {
      setPinError("Semua PIN harus 4 digit.");
      return;
    }
    if (newPin !== confirmNewPin) {
      setPinError("PIN baru dan konfirmasi PIN tidak sama.");
      return;
    }
    setPinLoading(true);
    try {
      const res = await fetch("/api/auth/change-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPin,
          newPin,
          confirmNewPin,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPinError(data.error ?? "Gagal mengubah PIN.");
        return;
      }
      setIsChangingPin(false);
      setCurrentPin("");
      setNewPin("");
      setConfirmNewPin("");
    } catch {
      setPinError("Gagal mengubah PIN.");
    } finally {
      setPinLoading(false);
    }
  };

  const handleThemeSelect = useCallback(
    async (id: string) => {
      setAppearanceSaving(true);
      try {
        const res = await apiFetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme_id: id }),
        });
        const data = await res.json();
        if (!res.ok) {
          setSaveError(data.error ?? "Gagal menyimpan tema");
          return;
        }
        setThemeId(id);
        setProfile((p) => (p ? { ...p, themeId: id } : null));
        setThemeSheetOpen(false);
      } catch {
        setSaveError("Gagal menyimpan tema");
      } finally {
        setAppearanceSaving(false);
      }
    },
    [setThemeId],
  );

  // ── Guards ──────────────────────────────────────────────────────────────────

  if (!hasMounted || !isAuthenticated) return null;
  if (loading) return <PageLoader message="Memuat profil..." />;

  // ── Derived values ──────────────────────────────────────────────────────────

  const pendingForCurrentHouse =
    houseId && profile?.pendingJoinRequests?.length
      ? profile.pendingJoinRequests.filter((r) => r.houseId === houseId)
      : (profile?.pendingJoinRequests ?? []);

  // ── View: isEditing ─────────────────────────────────────────────────────────

  if (profile && isEditing) {
    return (
      <main className="flex h-full min-h-0 flex-col bg-app-surface-alt">
        <PageHero
          breadcrumb="Profil"
          title="Edit Informasi"
          onBack={() => {
            setIsEditing(false);
            setSaveError(null);
            setValidationError(null);
            setEditFullName(profile.fullName);
            setEditUsername(profile.username ?? "");
            setEditWaNumber(profile.waNumberMasked ?? "");
            setEditEmail(profile.email ?? "");
            setEditDateOfBirth(toDateInputValue(profile.dateOfBirth));
            setUsernameCheckStatus("idle");
            setWaNumberCheckStatus("idle");
          }}
        />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <form onSubmit={handleSave} className="space-y-4 px-4 pb-10 pt-5">
            {/* Profile Picture Edit Section - Large Cover */}
            <div className="flex flex-col items-center gap-4 py-6 -mx-4 px-4 bg-gradient-to-b from-app-surface to-transparent">
              <div className="relative w-full flex items-center justify-center">
                <div
                  className="relative rounded-3xl overflow-hidden shadow-lg"
                  style={{
                    width: "90%",
                    maxWidth: "500px",
                    aspectRatio: "1 / 1",
                  }}
                >
                  {profile?.profilePictureUrl ? (
                    <Image
                      src={profile.profilePictureUrl}
                      alt={profile?.fullName ?? "Warga"}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-app-primary-muted">
                      <Avatar name={profile?.fullName ?? "Warga"} size={300} />
                    </div>
                  )}
                  {avatarLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <div className="h-8 w-8 animate-spin rounded-full border-3 border-white border-t-transparent" />
                    </div>
                  )}
                  {!avatarLoading && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={avatarLoading}
                      className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors group"
                    >
                      <div className="flex flex-col items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <CameraIcon className="h-12 w-12 text-white drop-shadow-lg" />
                        <span className="text-white font-semibold text-sm drop-shadow-lg">
                          Ubah Foto
                        </span>
                      </div>
                    </button>
                  )}
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              {avatarError && (
                <p className="text-[12px] text-red-600 text-center">
                  {avatarError}
                </p>
              )}
            </div>

            <FieldInput
              label="Nama Lengkap"
              id="full-name"
              value={editFullName}
              onChange={(e) => setEditFullName(e.target.value)}
              autoComplete="name"
              placeholder="Contoh: Budi Santoso"
            />

            {/* Username Field with Availability Check */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor="username"
                  className="text-[11px] font-bold uppercase tracking-widest text-app-body-muted"
                >
                  Username
                  <span className="ml-1 normal-case font-normal text-app-body-muted/70">
                    (opsional)
                  </span>
                </label>
                {usernameCheckLoading && (
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 animate-spin rounded-full border border-app-primary border-t-transparent" />
                    <span className="text-[10px] text-app-body-muted">
                      Cek...
                    </span>
                  </div>
                )}
                {!usernameCheckLoading &&
                  usernameCheckStatus === "available" && (
                    <span className="flex items-center gap-1 text-[10px] text-green-600">
                      <CheckIcon className="h-3 w-3" />
                      Tersedia
                    </span>
                  )}
                {usernameCheckStatus === "taken" && (
                  <span className="text-[10px] text-red-600">
                    Sudah dipakai
                  </span>
                )}
              </div>
              <input
                id="username"
                type="text"
                value={editUsername}
                onChange={(e) => {
                  setEditUsername(e.target.value);
                  setValidationError(null);
                  if (e.target.value.trim() !== profile?.username) {
                    if (e.target.value.trim()) {
                      checkUsernameAvailability(e.target.value);
                    } else {
                      setUsernameCheckStatus("idle");
                    }
                  } else {
                    setUsernameCheckStatus("idle");
                  }
                }}
                autoComplete="username"
                placeholder="Contoh: budi_santoso"
                className="w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title outline-none transition-all"
                style={{
                  borderColor:
                    usernameCheckStatus === "taken"
                      ? "var(--color-red-500)"
                      : "var(--color-input-border)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-primary)";
                  e.currentTarget.style.boxShadow =
                    "0 0 0 3px color-mix(in srgb, var(--color-primary) 16%, white 84%)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor =
                    usernameCheckStatus === "taken"
                      ? "var(--color-red-500)"
                      : "var(--color-input-border)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            {/* WhatsApp Number Field with Availability Check */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor="wa-number"
                  className="text-[11px] font-bold uppercase tracking-widest text-app-body-muted"
                >
                  Nomor WhatsApp
                  <span className="ml-1 normal-case font-normal text-app-body-muted/70">
                    (opsional)
                  </span>
                </label>
                {waNumberCheckLoading && (
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 animate-spin rounded-full border border-app-primary border-t-transparent" />
                    <span className="text-[10px] text-app-body-muted">
                      Cek...
                    </span>
                  </div>
                )}
                {!waNumberCheckLoading &&
                  waNumberCheckStatus === "available" && (
                    <span className="flex items-center gap-1 text-[10px] text-green-600">
                      <CheckIcon className="h-3 w-3" />
                      Tersedia
                    </span>
                  )}
                {waNumberCheckStatus === "taken" && (
                  <span className="text-[10px] text-red-600">
                    Sudah dipakai
                  </span>
                )}
              </div>
              <input
                id="wa-number"
                type="tel"
                value={editWaNumber}
                onChange={(e) => {
                  setEditWaNumber(e.target.value);
                  setValidationError(null);
                  if (e.target.value.trim() !== profile?.waNumberMasked) {
                    if (e.target.value.trim()) {
                      checkWaNumberAvailability(e.target.value);
                    } else {
                      setWaNumberCheckStatus("idle");
                    }
                  } else {
                    setWaNumberCheckStatus("idle");
                  }
                }}
                autoComplete="tel"
                placeholder="08xxxxxxxxxx"
                className="w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title outline-none transition-all"
                style={{
                  borderColor:
                    waNumberCheckStatus === "taken"
                      ? "var(--color-red-500)"
                      : "var(--color-input-border)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-primary)";
                  e.currentTarget.style.boxShadow =
                    "0 0 0 3px color-mix(in srgb, var(--color-primary) 16%, white 84%)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor =
                    waNumberCheckStatus === "taken"
                      ? "var(--color-red-500)"
                      : "var(--color-input-border)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>
            <FieldInput
              label="Email"
              id="email"
              type="email"
              optional
              value={editEmail}
              onChange={(e) => {
                setEditEmail(e.target.value);
                setValidationError(null);
              }}
              autoComplete="email"
              placeholder="budi@email.com"
            />
            <div>
              <label
                htmlFor="dob"
                className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted"
              >
                Tanggal Lahir
                <span className="ml-1 normal-case font-normal text-app-body-muted/70">
                  (opsional)
                </span>
              </label>
              <input
                id="dob"
                type="date"
                value={editDateOfBirth}
                onChange={(e) => {
                  setEditDateOfBirth(e.target.value);
                  setValidationError(null);
                }}
                className="w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title outline-none transition-all"
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

            {(saveError || validationError) && (
              <div className="flex items-start gap-2.5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <p className="text-sm text-red-600 leading-snug">
                  {validationError || saveError}
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setSaveError(null);
                  setValidationError(null);
                  setEditFullName(profile.fullName);
                  setEditUsername(profile.username ?? "");
                  setEditWaNumber(profile.waNumberMasked ?? "");
                  setEditEmail(profile.email ?? "");
                  setEditDateOfBirth(toDateInputValue(profile.dateOfBirth));
                  setUsernameCheckStatus("idle");
                  setWaNumberCheckStatus("idle");
                }}
                className="flex-1 rounded-2xl py-4 text-sm font-bold text-app-body transition hover:bg-app-surface active:scale-95"
                style={{ background: "var(--color-surface-alt)" }}
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={
                  saving ||
                  usernameCheckLoading ||
                  waNumberCheckLoading ||
                  usernameCheckStatus === "taken" ||
                  waNumberCheckStatus === "taken"
                }
                className="flex-1 rounded-2xl py-4 text-sm font-bold text-white transition hover:-translate-y-[1px] active:translate-y-0 disabled:opacity-50"
                style={{
                  background:
                    saving ||
                    usernameCheckLoading ||
                    waNumberCheckLoading ||
                    usernameCheckStatus === "taken" ||
                    waNumberCheckStatus === "taken"
                      ? "var(--color-body-muted)"
                      : "var(--color-primary)",
                  boxShadow:
                    saving ||
                    usernameCheckLoading ||
                    waNumberCheckLoading ||
                    usernameCheckStatus === "taken" ||
                    waNumberCheckStatus === "taken"
                      ? "none"
                      : "0 8px 22px -12px var(--color-primary-shadow)",
                }}
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    Menyimpan...
                  </span>
                ) : (
                  "Simpan"
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    );
  }

  // ── View: isChangingPin ─────────────────────────────────────────────────────

  if (profile && isChangingPin) {
    return (
      <main className="flex h-full min-h-0 flex-col bg-app-surface-alt">
        <PageHero
          breadcrumb="Keamanan"
          title="Ubah PIN"
          onBack={() => {
            setIsChangingPin(false);
            setPinError(null);
            setCurrentPin("");
            setNewPin("");
            setConfirmNewPin("");
          }}
        />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <form
            onSubmit={handleChangePin}
            className="space-y-5 px-4 pb-10 pt-5"
          >
            <p className="text-[13px] text-app-body-muted leading-relaxed">
              Masukkan PIN saat ini lalu buat PIN baru 4 digit.
            </p>

            <div className="space-y-5">
              <div>
                <label className="mb-3 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                  PIN Saat Ini
                </label>
                <OtpInput
                  value={currentPin}
                  onChange={(v) => {
                    setCurrentPin(v);
                    setPinError(null);
                  }}
                  length={4}
                  disabled={pinLoading}
                  error={pinError ?? undefined}
                  masked
                />
              </div>
              <div>
                <label className="mb-3 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                  PIN Baru
                </label>
                <OtpInput
                  value={newPin}
                  onChange={(v) => {
                    setNewPin(v);
                    setPinError(null);
                  }}
                  length={4}
                  disabled={pinLoading}
                  masked
                  autoFocus={false}
                />
              </div>
              <div>
                <label className="mb-3 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                  Konfirmasi PIN Baru
                </label>
                <OtpInput
                  value={confirmNewPin}
                  onChange={(v) => {
                    setConfirmNewPin(v);
                    setPinError(null);
                  }}
                  length={4}
                  disabled={pinLoading}
                  masked
                  autoFocus={false}
                />
              </div>
            </div>

            {pinError && (
              <div className="flex items-start gap-2.5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <p className="text-sm text-red-600">{pinError}</p>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsChangingPin(false);
                  setPinError(null);
                  setCurrentPin("");
                  setNewPin("");
                  setConfirmNewPin("");
                }}
                className="flex-1 rounded-2xl py-4 text-sm font-bold text-app-body transition hover:bg-app-surface active:scale-95"
                style={{ background: "var(--color-surface-alt)" }}
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={
                  pinLoading ||
                  currentPin.length !== 4 ||
                  newPin.length !== 4 ||
                  confirmNewPin.length !== 4
                }
                className="flex-1 rounded-2xl py-4 text-sm font-bold text-white transition hover:-translate-y-[1px] active:translate-y-0 disabled:opacity-50"
                style={{
                  background: pinLoading
                    ? "var(--color-body-muted)"
                    : "var(--color-primary)",
                  boxShadow: pinLoading
                    ? "none"
                    : "0 8px 22px -12px var(--color-primary-shadow)",
                }}
              >
                {pinLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    Menyimpan...
                  </span>
                ) : (
                  "Simpan PIN"
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    );
  }

  // ── View: isManagingFamily ──────────────────────────────────────────────────

  if (profile && isManagingFamily && currentHouse) {
    return (
      <main className="flex h-full min-h-0 flex-col bg-app-surface-alt">
        <PageHero
          breadcrumb="Rumah"
          title="Kelola Penghuni"
          onBack={() => {
            setIsManagingFamily(false);
            setFamilyActionError(null);
            setShowAddMemberForm(false);
            setAddMemberError(null);
          }}
        />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-3 px-4 pb-10 pt-5">
            {familyActionError && (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                <p className="text-[13px] text-red-600">{familyActionError}</p>
                <button
                  type="button"
                  onClick={() => setFamilyActionError(null)}
                >
                  <XMarkIcon className="h-4 w-4 text-red-400" />
                </button>
              </div>
            )}

            {/* Member list */}
            <div className="space-y-2.5">
              {currentHouse.members.map((m) => (
                <div
                  key={m.userId}
                  className="rounded-2xl bg-app-surface p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={m.fullName} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-app-title">
                        {m.fullName}
                      </p>
                      <p className="text-[11px] text-app-body-muted">
                        {m.username ? `@${m.username}` : "—"}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        m.relationship === "OWNER"
                          ? "bg-app-primary-muted text-app-primary"
                          : "bg-app-surface-alt text-app-body-muted"
                      }`}
                    >
                      {RELATIONSHIP_LABELS[m.relationship] ?? m.relationship}
                    </span>
                  </div>

                  {m.userId !== profile.id && m.relationship !== "OWNER" && (
                    <div className="mt-3 flex gap-2 border-t border-[var(--color-input-border)] pt-3">
                      <button
                        type="button"
                        onClick={() => handleTransferOwner(m.userId)}
                        disabled={
                          transferLoadingId !== null || removeLoadingId !== null
                        }
                        className="flex-1 rounded-xl py-2 text-[11px] font-bold text-white transition active:scale-95 disabled:opacity-50"
                        style={{ background: "var(--color-primary)" }}
                      >
                        Jadikan Kepala
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(m.userId)}
                        disabled={
                          transferLoadingId !== null || removeLoadingId !== null
                        }
                        className="flex items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-bold text-red-600 transition hover:bg-red-50 active:scale-95 disabled:opacity-40"
                      >
                        <UserMinusIcon className="h-3.5 w-3.5" />
                        Keluarkan
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add member */}
            <div className="rounded-2xl bg-app-surface shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
              {!showAddMemberForm ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMemberForm(true);
                    setAddMemberError(null);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3.5 transition hover:bg-app-surface-alt active:scale-[0.98]"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-app-primary-muted">
                    <PlusIcon className="h-[18px] w-[18px] text-app-primary" />
                  </div>
                  <span className="text-[13px] font-semibold text-app-title">
                    Tambah Anggota Keluarga
                  </span>
                </button>
              ) : (
                <form
                  onSubmit={handleAddMemberSubmit}
                  className="space-y-4 p-4"
                >
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.07em] text-app-body-muted">
                    Tambah Anggota Baru
                  </h3>
                  <FieldInput
                    label="Nama Lengkap"
                    id="add-name"
                    value={addMemberFullName}
                    onChange={(e) => {
                      setAddMemberFullName(e.target.value);
                      setAddMemberError(null);
                    }}
                    placeholder="Contoh: Siti Aminah"
                    autoComplete="name"
                  />
                  <FieldInput
                    label="Username"
                    id="add-username"
                    optional
                    value={addMemberUsername}
                    onChange={(e) => setAddMemberUsername(e.target.value)}
                    placeholder="Contoh: siti_aminah"
                    autoComplete="username"
                  />
                  <FieldInput
                    label="Nomor WhatsApp"
                    id="add-wa"
                    value={addMemberWaNumber}
                    onChange={(e) => {
                      setAddMemberWaNumber(e.target.value);
                      setAddMemberError(null);
                    }}
                    placeholder="08xxxxxxxxxx"
                    autoComplete="tel"
                  />
                  {addMemberError && (
                    <div className="flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 px-3 py-2.5">
                      <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                      <p className="text-xs text-red-600">{addMemberError}</p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddMemberForm(false);
                        setAddMemberError(null);
                      }}
                      className="flex-1 rounded-2xl py-3 text-sm font-bold text-app-body transition active:scale-95"
                      style={{ background: "var(--color-surface-alt)" }}
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={addMemberLoading}
                      className="flex-1 rounded-2xl py-3 text-sm font-bold text-white transition active:scale-95 disabled:opacity-50"
                      style={{ background: "var(--color-primary)" }}
                    >
                      {addMemberLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <ArrowPathIcon className="h-4 w-4 animate-spin" />
                          Menambah...
                        </span>
                      ) : (
                        "Tambah"
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        <ConfirmDialog
          state={confirmDialog}
          loading={confirmLoading}
          onClose={() => !confirmLoading && setConfirmDialog(null)}
        />
      </main>
    );
  }

  // ── View: default profile ───────────────────────────────────────────────────

  return (
    <main className="flex h-full min-h-0 flex-col bg-app-surface-alt">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section
          aria-label="Profil pengguna"
          className="relative overflow-hidden px-4 pb-6 pt-10 text-white"
          style={{
            background:
              "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)",
          }}
        >
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/10"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-10 -left-4 h-28 w-28 rounded-full bg-white/[0.06]"
            aria-hidden
          />

          <div className="relative z-10 flex flex-col items-center">
            {/* Avatar upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <div className="relative mb-3">
              <div className="h-20 w-20 overflow-hidden rounded-full ring-2 ring-white/30">
                <Avatar
                  name={profile?.fullName ?? ""}
                  src={profile?.profilePictureUrl ?? null}
                  size={80}
                />
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarLoading}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity hover:opacity-100 focus:opacity-100 active:opacity-100 disabled:opacity-100"
                aria-label="Ubah foto profil"
              >
                {avatarLoading ? (
                  <ArrowPathIcon className="h-5 w-5 animate-spin text-white" />
                ) : (
                  <CameraIcon className="h-5 w-5 text-white" />
                )}
              </button>
            </div>

            <h1 className="text-[19px] font-extrabold leading-tight text-white">
              {profile?.fullName ?? "—"}
            </h1>
            {profile?.username && (
              <p className="mt-0.5 text-[11px] text-white/60">
                @{profile.username}
              </p>
            )}

            {/* Role chips */}
            {(currentResidence?.roles?.length ?? 0) > 0 && (
              <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                {currentResidence!.roles.map((role) => (
                  <span
                    key={role.id}
                    className="rounded-full bg-white/15 px-2.5 py-[3px] text-[9px] font-bold uppercase tracking-widest text-white/80"
                  >
                    {role.name}
                  </span>
                ))}
              </div>
            )}

            {/* Community */}
            {(currentResidence?.tenant || currentResidence?.community) && (
              <p className="mt-1.5 text-[11px] text-white/50">
                {[
                  currentResidence?.tenant?.name,
                  currentResidence?.community?.name ??
                    currentResidence?.community?.code,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </div>
        </section>

        {/* ── Content ─────────────────────────────────────────────────── */}
        <div className="space-y-3 px-4 pb-10 pt-4">
          {/* Error banners */}
          {error && (
            <div className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
              <p className="text-[13px] text-red-600">{error}</p>
            </div>
          )}
          {avatarError && (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
              <p className="text-[13px] text-red-600">{avatarError}</p>
              <button
                type="button"
                onClick={() => setAvatarError(null)}
                className="shrink-0"
              >
                <XMarkIcon className="h-4 w-4 text-red-400" />
              </button>
            </div>
          )}

          {/* Residence selector */}
          {residences.length > 1 && (
            <div>
              <div className="mb-2">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.07em] text-app-body-muted">
                  Lingkungan
                </h2>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
                {residences.map((res, i) => {
                  const label = [
                    res.tenant.name,
                    res.community.name || res.community.code,
                  ]
                    .filter(Boolean)
                    .join(" · ");
                  const isActive = i === selectedResidenceIndex;
                  return (
                    <button
                      key={`${res.tenant.id}-${res.house.houseId}`}
                      type="button"
                      onClick={() => setSelectedResidenceIndex(i)}
                      className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition active:scale-95 ${
                        isActive
                          ? "text-white shadow-sm"
                          : "bg-app-surface text-app-body-muted hover:bg-app-surface-alt"
                      }`}
                      style={
                        isActive
                          ? { background: "var(--color-primary)" }
                          : undefined
                      }
                    >
                      {res.isPrimary && (
                        <span
                          className="h-1.5 w-1.5 rounded-full bg-current opacity-80"
                          aria-hidden
                        />
                      )}
                      <span className="max-w-[140px] truncate">
                        {label || "Lingkungan"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Badges */}
          {(profile?.badges?.length ?? 0) > 0 && (
            <div className="rounded-2xl bg-app-surface p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
              <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.07em] text-app-body-muted">
                Lencana
              </h2>
              <div className="flex flex-wrap gap-2">
                {profile!.badges!.map((badge) => (
                  <span
                    key={badge.id}
                    className="flex h-10 w-10 items-center justify-center rounded-2xl bg-app-surface-alt text-xl transition-transform hover:scale-110"
                    title={
                      badge.description
                        ? `${badge.name}: ${badge.description}`
                        : badge.name
                    }
                  >
                    {badge.icon}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Account info */}
          {profile && (
            <div className="rounded-2xl bg-app-surface shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
              <div className="flex items-center justify-between px-4 pt-4">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.07em] text-app-body-muted">
                  Informasi Akun
                </h2>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl transition hover:bg-app-primary-muted active:scale-90"
                  style={{ color: "var(--color-primary)" }}
                  aria-label="Edit profil"
                >
                  <PencilSquareIcon className="h-4 w-4" />
                </button>
              </div>
              <div className="px-4 pb-4 pt-2">
                <InfoRow
                  label="WhatsApp"
                  value={profile.waNumberMasked ?? "—"}
                />
                <InfoRow label="Email" value={profile.email ?? "—"} />
                <InfoRow
                  label="Tanggal Lahir"
                  value={formatDate(profile.dateOfBirth)}
                />
                <InfoRow
                  label="Status"
                  isLast
                  value={
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        profile.status === "ACTIVE"
                          ? "bg-app-primary-muted text-app-primary"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {profile.status === "ACTIVE" ? "Aktif" : profile.status}
                    </span>
                  }
                />
              </div>
            </div>
          )}

          {/* House card */}
          {currentHouse && (
            <div className="overflow-hidden rounded-2xl bg-app-surface shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
              <div className="flex items-center justify-between px-4 pt-4">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.07em] text-app-body-muted">
                  Rumah
                </h2>
                {isKepalaKeluarga && (
                  <button
                    type="button"
                    onClick={() => setIsManagingFamily(true)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl transition hover:bg-app-primary-muted active:scale-90"
                    style={{ color: "var(--color-primary)" }}
                    aria-label="Kelola anggota keluarga"
                  >
                    <UsersIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="px-4 pb-4 pt-2">
                {currentHouse.blok_rumah && (
                  <InfoRow
                    label="Blok"
                    value={currentHouse.blok_rumah}
                    isLast={!currentHouse.address}
                  />
                )}
                {currentHouse.address && (
                  <InfoRow label="Alamat" value={currentHouse.address} isLast />
                )}
              </div>

              {(currentHouse.members?.length ?? 0) > 0 && (
                <div
                  className="space-y-2 border-t px-4 py-3"
                  style={{
                    borderColor: "var(--color-input-border)",
                    background: "var(--color-surface-alt)",
                  }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-widest text-app-body-muted">
                    Penghuni
                  </p>
                  {currentHouse.members.map((m) => (
                    <div
                      key={m.userId}
                      className="flex items-center gap-2.5 rounded-2xl bg-app-surface px-3 py-2.5 shadow-[0_2px_8px_rgba(0,40,5,0.05)]"
                    >
                      <Avatar name={m.fullName} size={36} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-app-title leading-tight">
                          {m.fullName}
                        </p>
                        <p className="text-[10px] text-app-body-muted">
                          {m.username ? `@${m.username}` : "—"}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          m.relationship === "OWNER"
                            ? "bg-app-primary-muted text-app-primary"
                            : "bg-app-surface-alt text-app-body-muted"
                        }`}
                      >
                        {RELATIONSHIP_LABELS[m.relationship] ?? m.relationship}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Incoming join requests */}
          {pendingForCurrentHouse.length > 0 && currentHouse && (
            <div className="overflow-hidden rounded-2xl bg-app-surface shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
              <div className="px-4 pt-4">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.07em] text-app-body-muted">
                  Permintaan Bergabung
                </h2>
                {respondError && (
                  <div className="mt-2 rounded-2xl border border-red-100 bg-red-50 px-3 py-2">
                    <p className="text-xs text-red-600">{respondError}</p>
                  </div>
                )}
              </div>
              <div className="space-y-2 px-4 pb-4 pt-3">
                {pendingForCurrentHouse.map((req) => (
                  <div
                    key={req.id}
                    className="rounded-2xl border border-[var(--color-input-border)] bg-app-surface-alt p-3"
                  >
                    <p className="text-[13px] font-semibold text-app-title">
                      {req.requesterFullName}
                    </p>
                    <p className="mt-0.5 text-[11px] text-app-body-muted">
                      Blok {req.blokRumah} · {formatDate(req.createdAt)}
                    </p>
                    <div className="mt-2.5 flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleRespondToJoinRequest(req.id, "approve")
                        }
                        disabled={respondingRequestId !== null}
                        className="flex-1 rounded-xl py-2 text-xs font-bold text-white transition active:scale-95 disabled:opacity-50"
                        style={{ background: "var(--color-primary)" }}
                      >
                        {respondingRequestId === req.id ? (
                          <span className="flex items-center justify-center gap-1">
                            <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                            Memproses
                          </span>
                        ) : (
                          "Setuju"
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleRespondToJoinRequest(req.id, "reject")
                        }
                        disabled={respondingRequestId !== null}
                        className="flex-1 rounded-xl py-2 text-xs font-bold text-red-600 transition hover:bg-red-50 active:scale-95 disabled:opacity-50"
                      >
                        Tolak
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending join notice */}
          {!currentHouse && profile?.pendingJoinRequest && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="text-[13px] font-semibold text-amber-800">
                  Menunggu Persetujuan
                </p>
                <p className="mt-0.5 text-xs text-amber-700 leading-relaxed">
                  Permintaan bergabung ke blok{" "}
                  {profile.pendingJoinRequest.blokRumah} menunggu persetujuan
                  oleh {profile.pendingJoinRequest.ownerFullName}.
                </p>
              </div>
            </div>
          )}

          {/* Appearance */}
          <div className="overflow-hidden rounded-2xl bg-app-surface shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <div className="px-4 pt-4 pb-1">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.07em] text-app-body-muted">
                Penampilan
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setThemeSheetOpen(true)}
              disabled={appearanceSaving}
              className="flex w-full items-center gap-3 px-4 pb-4 pt-2 transition hover:bg-app-surface-alt active:scale-[0.98] disabled:opacity-60"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-app-primary-muted">
                <SwatchIcon className="h-[18px] w-[18px] text-app-primary" />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-[13px] font-semibold text-app-title">
                  Tema Warna
                </p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span
                    className="h-3 w-3 rounded-full ring-1 ring-black/10"
                    style={{
                      background: getTheme(themeId).colors.primary,
                    }}
                    aria-hidden
                  />
                  <p className="text-[11px] text-app-body-muted">
                    {getTheme(themeId).nameId}
                  </p>
                </div>
              </div>
              <span
                className="text-[11px] font-semibold"
                style={{ color: "var(--color-primary)" }}
              >
                Ganti
              </span>
            </button>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={() => setIsChangingPin(true)}
              className="flex w-full items-center gap-3 rounded-2xl bg-app-surface px-4 py-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition hover:bg-app-surface-alt active:scale-[0.98]"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-app-primary-muted">
                <KeyIcon className="h-[18px] w-[18px] text-app-primary" />
              </div>
              <span className="text-[13px] font-semibold text-app-title">
                Ubah PIN
              </span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-2xl bg-app-surface px-4 py-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition hover:bg-red-50 active:scale-[0.98]"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50">
                <ArrowRightOnRectangleIcon className="h-[18px] w-[18px] text-red-500" />
              </div>
              <span className="text-[13px] font-semibold text-red-600">
                Keluar
              </span>
            </button>
          </div>

          {/* Footer */}
          <p className="text-center text-[10px] text-app-body-muted/50">
            Warga Digital · Profil
          </p>
        </div>
      </div>

      {/* Overlays */}
      <ThemeSheet
        open={themeSheetOpen}
        currentId={themeId}
        saving={appearanceSaving}
        onSelect={handleThemeSelect}
        onClose={() => setThemeSheetOpen(false)}
      />
      <ConfirmDialog
        state={confirmDialog}
        loading={confirmLoading}
        onClose={() => !confirmLoading && setConfirmDialog(null)}
      />
    </main>
  );
}
