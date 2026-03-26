"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@nextui-org/react";
import {
  PrimaryButton,
  SecondaryButton,
  PageLoader,
  Avatar,
} from "@/components/ui";
import { OtpInput } from "@/components/auth/otp-input";
import { useAuthStore } from "@/stores/auth-store";
import { useAppearanceStore } from "@/stores/appearance-store";
import { apiFetch } from "@/lib/api-client";
import { THEMES, getTheme } from "@/lib/themes";
import {
  setHeaderProfileCookie,
  getHeaderProfileCookie,
} from "@/lib/header-profile-cookie";

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

const RELATIONSHIP_LABELS: Record<string, string> = {
  OWNER: "Kepala Rumah Tangga",
  FAMILY: "Keluarga",
  TENANT: "Penyewa",
  CARETAKER: "Penjaga",
};

const inputClassNames = {
  label: "text-app-body-muted",
  input: "text-base text-app-body",
  inputWrapper:
    "min-h-12 bg-white border-default-200 data-[hover=true]:bg-white data-[focus=true]:bg-white data-[focus=true]:border-app-primary",
};

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

/** For date input value (YYYY-MM-DD) */
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

export default function ProfilePage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const clearUser = useAuthStore((s) => s.clearUser);
  const setUser = useAuthStore((s) => s.setUser);
  const themeId = useAppearanceStore((s) => s.themeId);
  const setThemeId = useAppearanceStore((s) => s.setThemeId);
  const [appearanceDropdownOpen, setAppearanceDropdownOpen] = useState(false);
  const [appearanceSaving, setAppearanceSaving] = useState(false);

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
  const [editEmail, setEditEmail] = useState("");
  const [editDateOfBirth, setEditDateOfBirth] = useState("");

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
        setEditEmail(data.email ?? "");
        setEditDateOfBirth(toDateInputValue(data.dateOfBirth));
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
      setEditEmail(profileData.email ?? "");
      setEditDateOfBirth(toDateInputValue(profileData.dateOfBirth));
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

  const handleTransferOwner = async (newOwnerUserId: string) => {
    if (!houseId) return;
    if (
      !confirm(
        "Jadikan orang ini Kepala Rumah Tangga? Anda akan menjadi anggota keluarga.",
      )
    )
      return;
    setFamilyActionError(null);
    setTransferLoadingId(newOwnerUserId);
    try {
      const res = await apiFetch("/api/family/transfer-owner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ houseId, newOwnerUserId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFamilyActionError(data.error ?? "Gagal mengalihkan");
        return;
      }
      await refreshProfile();
    } catch {
      setFamilyActionError("Terjadi kesalahan");
    } finally {
      setTransferLoadingId(null);
    }
  };

  const handleRemoveMember = async (memberUserId: string) => {
    if (!houseId) return;
    if (
      !confirm(
        "Keluarkan anggota ini dari rumah? Mereka tidak lagi terhubung dengan rumah ini.",
      )
    )
      return;
    setFamilyActionError(null);
    setRemoveLoadingId(memberUserId);
    try {
      const res = await apiFetch("/api/family/remove-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ houseId, memberUserId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFamilyActionError(data.error ?? "Gagal mengeluarkan");
        return;
      }
      await refreshProfile();
    } catch {
      setFamilyActionError("Terjadi kesalahan");
    } finally {
      setRemoveLoadingId(null);
    }
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
    setSaving(true);
    try {
      const res = await apiFetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: editFullName.trim(),
          username: editUsername.trim() || null,
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

  if (!hasMounted || !isAuthenticated) {
    return null;
  }

  if (loading) {
    return <PageLoader message="Memuat profil..." />;
  }

  return (
    <main
      className="min-h-full px-4 pb-6 pt-4"
      style={{
        background:
          "linear-gradient(to bottom, var(--color-bg-gradient-start) 0%, var(--color-surface-alt) 100%)",
      }}
    >
      <div className="mx-auto max-w-[400px]">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50/80 p-4 text-center text-sm text-red-700">
            {error}
          </div>
        )}

        {profile && !isEditing && !isChangingPin && !isManagingFamily && (
          <>
            {/* Avatar + name */}
            <div className="mb-6 flex flex-col items-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarLoading}
                className="group relative mb-3 h-20 w-20 shrink-0 overflow-hidden rounded-full focus:outline-none focus:ring-2 focus:ring-app-primary focus:ring-offset-2"
                aria-label="Ubah foto profil"
              >
                <Avatar
                  name={profile.fullName}
                  src={profile.profilePictureUrl}
                  size={80}
                />
                <span
                  className={`absolute inset-0 flex items-center justify-center rounded-full bg-black/40 transition-opacity ${avatarLoading ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus:opacity-100"}`}
                >
                  {avatarLoading ? (
                    <span className="text-xs font-medium text-white">
                      Mengunggah...
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-white">
                      Ubah foto
                    </span>
                  )}
                </span>
              </button>
              {avatarError && (
                <p className="mb-1 text-center text-sm text-red-600">
                  {avatarError}
                </p>
              )}
              <h2 className="text-lg font-semibold text-app-title">
                {profile.fullName}
              </h2>
              {profile.username && (
                <p className="text-sm text-app-body-muted">
                  @{profile.username}
                </p>
              )}
            </div>

            {/* Residence selector — when user has multiple houses/places (mobile: horizontal scroll) */}
            {residences.length > 1 && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-app-body-muted">
                  Pilih lingkungan
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none snap-x snap-mandatory">
                  {residences.map((res, i) => {
                    const label = [
                      res.tenant.name,
                      res.community.name || res.community.code,
                    ]
                      .filter(Boolean)
                      .join(" · ");
                    const isSelected = i === selectedResidenceIndex;
                    return (
                      <button
                        key={`${res.tenant.id}-${res.house.houseId}`}
                        type="button"
                        onClick={() => setSelectedResidenceIndex(i)}
                        className={`snap-start shrink-0 rounded-full px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-app-primary/40 ${
                          isSelected
                            ? "bg-app-primary text-white shadow-md"
                            : "bg-default-100 text-app-body hover:bg-default-200"
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          {res.isPrimary && (
                            <span
                              className="size-1.5 rounded-full bg-current opacity-80"
                              aria-hidden
                            />
                          )}
                          <span className="truncate max-w-[140px]">
                            {label || "Lingkungan"}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Badge, Role, Tenant/Community — top section (for current residence) */}
            {(profile.badges?.length ?? 0) > 0 ||
            (currentResidence?.roles?.length ?? 0) > 0 ||
            currentResidence?.tenant ||
            currentResidence?.community ? (
              <section className="mb-6 rounded-xl border border-default-200 bg-white p-4 shadow-sm">
                <div className="space-y-3">
                  {profile.badges && profile.badges.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-app-body-muted">
                        Lencana
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {profile.badges.map((badge) => (
                          <span
                            key={badge.id}
                            className="inline-flex size-10 items-center justify-center rounded-full bg-default-100 text-xl transition-transform hover:scale-110"
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
                  {currentResidence?.roles &&
                    currentResidence.roles.length > 0 && (
                      <div>
                        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-app-body-muted">
                          Peran di lingkungan ini
                        </p>
                        <p className="text-sm font-medium text-app-body">
                          {currentResidence.roles.map((r) => r.name).join(", ")}
                        </p>
                      </div>
                    )}
                  {(currentResidence?.tenant ||
                    currentResidence?.community) && (
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase tracking-wider text-app-body-muted">
                        Lingkungan
                      </p>
                      <p className="text-sm text-app-body">
                        {[
                          currentResidence.tenant?.name,
                          currentResidence.community?.name ??
                            currentResidence.community?.code,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            ) : null}

            {/* Info cards */}
            <div className="space-y-3">
              <section className="rounded-xl border border-default-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="text-xs font-medium uppercase tracking-wider text-app-body-muted">
                    Informasi akun
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="text-xs font-medium text-app-primary hover:underline focus:outline-none focus:ring-2 focus:ring-app-primary/30 rounded"
                  >
                    Edit
                  </button>
                </div>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-app-body-muted">Nomor WhatsApp</dt>
                    <dd className="font-medium text-app-body">
                      {profile.waNumberMasked ?? "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-app-body-muted">Email</dt>
                    <dd className="font-medium text-app-body">
                      {profile.email ?? "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-app-body-muted">Tanggal lahir</dt>
                    <dd className="font-medium text-app-body">
                      {formatDate(profile.dateOfBirth)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-app-body-muted">Status</dt>
                    <dd>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          profile.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {profile.status === "ACTIVE" ? "Aktif" : profile.status}
                      </span>
                    </dd>
                  </div>
                </dl>
              </section>

              {currentHouse && (
                <section className="rounded-xl border border-default-200 bg-white shadow-sm overflow-hidden">
                  <div className="p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <h3 className="text-xs font-medium uppercase tracking-wider text-app-body-muted">
                        Rumah
                      </h3>
                      {isKepalaKeluarga && (
                        <button
                          type="button"
                          onClick={() => setIsManagingFamily(true)}
                          className="text-xs font-medium text-app-primary hover:underline focus:outline-none focus:ring-2 focus:ring-app-primary/30 rounded"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                    <dl className="space-y-2 text-sm">
                      {currentHouse.blok_rumah && (
                        <div className="flex justify-between gap-2">
                          <dt className="text-app-body-muted">Blok</dt>
                          <dd className="font-medium text-app-body">
                            {currentHouse.blok_rumah}
                          </dd>
                        </div>
                      )}
                      {currentHouse.address && (
                        <div>
                          <dt className="mb-1 text-app-body-muted">Alamat</dt>
                          <dd className="font-medium text-app-body">
                            {currentHouse.address}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                  {currentHouse.members?.length > 0 && (
                    <div className="border-t border-default-100 bg-default-50/50 px-4 py-3">
                      <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-app-body-muted">
                        Anggota Keluarga
                      </h4>
                      <ul className="space-y-2" role="list">
                        {currentHouse.members.map((m) => (
                          <li
                            key={m.userId}
                            className="flex items-center gap-3 rounded-lg bg-white py-2 pl-2 pr-3 shadow-sm border border-default-100"
                          >
                            <Avatar name={m.fullName} size={36} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-app-body">
                                {m.fullName}
                              </p>
                              <p className="flex items-center gap-1.5 text-xs text-app-body-muted">
                                {m.username && (
                                  <span className="truncate">
                                    @{m.username}
                                  </span>
                                )}
                                <span
                                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                    m.relationship === "OWNER"
                                      ? "bg-app-primary/20 text-app-primary"
                                      : "bg-default-200 text-app-body-muted"
                                  }`}
                                >
                                  {RELATIONSHIP_LABELS[m.relationship] ??
                                    m.relationship}
                                </span>
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>
              )}

              {(() => {
                const pendingForCurrentHouse =
                  houseId && profile.pendingJoinRequests?.length
                    ? profile.pendingJoinRequests.filter(
                        (r) => r.houseId === houseId,
                      )
                    : (profile.pendingJoinRequests ?? []);
                return (
                  currentHouse &&
                  pendingForCurrentHouse.length > 0 && (
                    <section className="mt-6 rounded-xl border border-default-200 bg-white shadow-sm overflow-hidden">
                      <div className="p-4">
                        <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-app-body-muted">
                          Permintaan bergabung
                        </h3>
                        {respondError && (
                          <p className="mb-3 text-sm text-danger">
                            {respondError}
                          </p>
                        )}
                        <ul className="space-y-3" role="list">
                          {pendingForCurrentHouse.map((req) => (
                            <li
                              key={req.id}
                              className="flex flex-col gap-2 rounded-lg border border-default-100 bg-default-50/50 p-3"
                            >
                              <p className="text-sm font-medium text-app-body">
                                {req.requesterFullName}
                              </p>
                              <p className="text-xs text-app-body-muted">
                                Blok {req.blokRumah} ·{" "}
                                {formatDate(req.createdAt)}
                              </p>
                              <div className="mt-1 flex gap-2">
                                <PrimaryButton
                                  type="button"
                                  onPress={() =>
                                    handleRespondToJoinRequest(
                                      req.id,
                                      "approve",
                                    )
                                  }
                                  isLoading={respondingRequestId === req.id}
                                  isDisabled={respondingRequestId !== null}
                                  className="min-w-20 py-2 text-sm"
                                >
                                  Setuju
                                </PrimaryButton>
                                <SecondaryButton
                                  type="button"
                                  onClick={() =>
                                    handleRespondToJoinRequest(req.id, "reject")
                                  }
                                  disabled={respondingRequestId !== null}
                                  className="min-w-20 border-red-200 text-red-700 hover:bg-red-50"
                                >
                                  Tolak
                                </SecondaryButton>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </section>
                  )
                );
              })()}

              {!currentHouse && profile.pendingJoinRequest && (
                <section className="mt-6 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                  <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-amber-800">
                    Menunggu persetujuan
                  </h3>
                  <p className="text-sm text-amber-900">
                    Permintaan bergabung ke rumah blok{" "}
                    {profile.pendingJoinRequest.blokRumah} menunggu persetujuan
                    pemilik ({profile.pendingJoinRequest.ownerFullName}). Anda
                    akan dapat mengakses fitur warga setelah disetujui.
                  </p>
                </section>
              )}
            </div>

            {/* Penampilan / Appearance — single line with Edit dropdown */}
            <section className="mt-6 rounded-xl border border-default-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-app-body-muted">
                Penampilan
              </h3>
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="text-sm text-app-body-muted">
                    Warna tema
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-app-body">
                    <span
                      className="h-4 w-4 shrink-0 rounded-full ring-1 ring-black/10"
                      style={{
                        backgroundColor: getTheme(themeId).colors.primary,
                      }}
                      aria-hidden
                    />
                    {getTheme(themeId).nameId}
                  </span>
                </div>
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setAppearanceDropdownOpen((o) => !o)}
                    disabled={appearanceSaving}
                    className="rounded-lg border border-default-200 bg-default-50 px-3 py-1.5 text-xs font-medium text-app-primary transition-colors hover:bg-default-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-app-primary/30 disabled:opacity-60"
                  >
                    {appearanceDropdownOpen ? "Tutup" : "Edit"}
                  </button>
                  {appearanceDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        aria-hidden
                        onClick={() => setAppearanceDropdownOpen(false)}
                      />
                      <div className="absolute right-0 top-full z-20 mt-1 min-w-[140px] rounded-xl border border-default-200 bg-white py-1 shadow-lg">
                        {THEMES.map((theme) => (
                          <button
                            key={theme.id}
                            type="button"
                            onClick={async () => {
                              setAppearanceSaving(true);
                              try {
                                const res = await apiFetch("/api/profile", {
                                  method: "PATCH",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({ theme_id: theme.id }),
                                });
                                const data = await res.json();
                                if (!res.ok) {
                                  setSaveError(
                                    data.error ?? "Gagal menyimpan tema",
                                  );
                                  return;
                                }
                                setThemeId(theme.id);
                                setProfile((p) =>
                                  p ? { ...p, themeId: theme.id } : null,
                                );
                                setAppearanceDropdownOpen(false);
                              } catch {
                                setSaveError("Gagal menyimpan tema");
                              } finally {
                                setAppearanceSaving(false);
                              }
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-app-body transition-colors hover:bg-default-100 focus:outline-none focus-visible:bg-default-100"
                          >
                            <span
                              className="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-black/10"
                              style={{ backgroundColor: theme.colors.primary }}
                              aria-hidden
                            />
                            {theme.nameId}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </section>

            <div className="mt-8 flex flex-col gap-3">
              <SecondaryButton
                type="button"
                onClick={() => setIsChangingPin(true)}
                className="w-full"
              >
                Ubah PIN
              </SecondaryButton>
              <SecondaryButton
                type="button"
                onClick={handleLogout}
                className="w-full border-red-200 text-red-700 hover:bg-red-50"
              >
                Keluar
              </SecondaryButton>
            </div>
          </>
        )}

        {profile && isManagingFamily && currentHouse && (
          <div className="space-y-4">
            <div className="rounded-xl border border-default-200 bg-white p-4 shadow-sm">
              <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-app-body-muted">
                Kelola Anggota Keluarga
              </h3>
              <p className="mb-4 text-sm text-app-body-muted">
                Ubah kepala keluarga, keluarkan anggota, atau tambah anggota
                baru.
              </p>
              {familyActionError && (
                <p className="mb-3 text-sm text-danger">{familyActionError}</p>
              )}
              <ul className="space-y-2" role="list">
                {currentHouse.members.map((m) => (
                  <li
                    key={m.userId}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-default-100 bg-default-50/50 py-2 pl-2 pr-3"
                  >
                    <Avatar name={m.fullName} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-app-body">
                        {m.fullName}
                      </p>
                      <p className="flex items-center gap-1.5 text-xs text-app-body-muted">
                        {m.username && (
                          <span className="truncate">@{m.username}</span>
                        )}
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            m.relationship === "OWNER"
                              ? "bg-app-primary/20 text-app-primary"
                              : "bg-default-200 text-app-body-muted"
                          }`}
                        >
                          {RELATIONSHIP_LABELS[m.relationship] ??
                            m.relationship}
                        </span>
                      </p>
                    </div>
                    {m.userId !== profile.id && m.relationship === "FAMILY" && (
                      <div className="flex gap-2">
                        <PrimaryButton
                          type="button"
                          onPress={() => handleTransferOwner(m.userId)}
                          isLoading={transferLoadingId === m.userId}
                          isDisabled={
                            transferLoadingId !== null ||
                            removeLoadingId !== null
                          }
                          className="min-w-0 py-2 text-xs"
                        >
                          Jadikan Kepala Keluarga
                        </PrimaryButton>
                        <SecondaryButton
                          type="button"
                          onClick={() => handleRemoveMember(m.userId)}
                          disabled={
                            transferLoadingId !== null ||
                            removeLoadingId !== null
                          }
                          className="border-red-200 text-red-700 hover:bg-red-50 text-xs py-1.5 px-3"
                        >
                          Keluarkan
                        </SecondaryButton>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              <div className="mt-4 border-t border-default-200 pt-4">
                {!showAddMemberForm ? (
                  <SecondaryButton
                    type="button"
                    onClick={() => {
                      setShowAddMemberForm(true);
                      setAddMemberError(null);
                    }}
                    className="w-full"
                  >
                    + Tambah anggota keluarga
                  </SecondaryButton>
                ) : (
                  <form onSubmit={handleAddMemberSubmit} className="space-y-3">
                    <h4 className="text-xs font-medium uppercase tracking-wider text-app-body-muted">
                      Tambah anggota baru
                    </h4>
                    <Input
                      label="Nama lengkap"
                      placeholder="Contoh: Siti Aminah"
                      value={addMemberFullName}
                      onValueChange={(v) => {
                        setAddMemberFullName(v);
                        setAddMemberError(null);
                      }}
                      size="sm"
                      variant="bordered"
                      classNames={inputClassNames}
                      autoComplete="name"
                    />
                    <Input
                      label="Username (opsional)"
                      placeholder="Contoh: siti_aminah"
                      value={addMemberUsername}
                      onValueChange={(v) => setAddMemberUsername(v)}
                      size="sm"
                      variant="bordered"
                      classNames={inputClassNames}
                      autoComplete="username"
                    />
                    <Input
                      label="Nomor WhatsApp"
                      placeholder="08xxxxxxxxxx"
                      value={addMemberWaNumber}
                      onValueChange={(v) => {
                        setAddMemberWaNumber(v);
                        setAddMemberError(null);
                      }}
                      size="sm"
                      variant="bordered"
                      classNames={inputClassNames}
                      autoComplete="tel"
                    />
                    {addMemberError && (
                      <p className="text-sm text-danger">{addMemberError}</p>
                    )}
                    <div className="flex gap-2">
                      <SecondaryButton
                        type="button"
                        onClick={() => {
                          setShowAddMemberForm(false);
                          setAddMemberError(null);
                        }}
                        className="flex-1"
                      >
                        Batal
                      </SecondaryButton>
                      <PrimaryButton
                        type="submit"
                        isLoading={addMemberLoading}
                        isDisabled={addMemberLoading}
                        className="flex-1"
                      >
                        Tambah
                      </PrimaryButton>
                    </div>
                  </form>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <SecondaryButton
                type="button"
                onClick={() => {
                  setIsManagingFamily(false);
                  setFamilyActionError(null);
                  setShowAddMemberForm(false);
                  setAddMemberError(null);
                }}
                className="flex-1"
              >
                Selesai
              </SecondaryButton>
            </div>
          </div>
        )}

        {profile && isChangingPin && (
          <form onSubmit={handleChangePin} className="space-y-4">
            <div className="rounded-xl border border-default-200 bg-white p-4 shadow-sm">
              <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-app-body-muted">
                Ubah PIN
              </h3>
              <p className="mb-4 text-sm text-app-body-muted">
                Masukkan PIN saat ini, lalu PIN baru 4 digit.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-app-body-muted">
                    PIN saat ini
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
                  <label className="mb-2 block text-sm font-medium text-app-body-muted">
                    PIN baru
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
                  <label className="mb-2 block text-sm font-medium text-app-body-muted">
                    Konfirmasi PIN baru
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
            </div>
            {pinError && (
              <p className="text-center text-sm text-red-600">{pinError}</p>
            )}
            <div className="flex gap-3">
              <SecondaryButton
                type="button"
                onClick={() => {
                  setIsChangingPin(false);
                  setPinError(null);
                  setCurrentPin("");
                  setNewPin("");
                  setConfirmNewPin("");
                }}
                className="flex-1"
              >
                Batal
              </SecondaryButton>
              <PrimaryButton
                type="submit"
                isLoading={pinLoading}
                isDisabled={
                  pinLoading ||
                  currentPin.length !== 4 ||
                  newPin.length !== 4 ||
                  confirmNewPin.length !== 4
                }
                className="flex-1"
              >
                Simpan PIN
              </PrimaryButton>
            </div>
          </form>
        )}

        {profile && isEditing && (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="rounded-xl border border-default-200 bg-white p-4 shadow-sm">
              <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-app-body-muted">
                Ubah data
              </h3>
              <div className="space-y-4">
                <Input
                  label="Nama lengkap"
                  placeholder="Contoh: Budi Santoso"
                  value={editFullName}
                  onValueChange={setEditFullName}
                  size="md"
                  variant="bordered"
                  classNames={inputClassNames}
                  autoComplete="name"
                />
                <Input
                  label="Username (opsional)"
                  placeholder="Contoh: budi_santoso"
                  value={editUsername}
                  onValueChange={setEditUsername}
                  size="md"
                  variant="bordered"
                  classNames={inputClassNames}
                  autoComplete="username"
                />
                <Input
                  label="Email (opsional)"
                  placeholder="budi@email.com"
                  type="email"
                  value={editEmail}
                  onValueChange={setEditEmail}
                  size="md"
                  variant="bordered"
                  classNames={inputClassNames}
                  autoComplete="email"
                />
                <div>
                  <label
                    htmlFor="dob"
                    className="mb-1.5 block text-sm text-app-body-muted"
                  >
                    Tanggal lahir (opsional)
                  </label>
                  <input
                    id="dob"
                    type="date"
                    value={editDateOfBirth}
                    onChange={(e) => setEditDateOfBirth(e.target.value)}
                    className="w-full min-h-12 rounded-xl border border-default-200 bg-white px-3 py-2 text-base text-app-body outline-none transition-colors focus:border-app-primary focus:ring-2 focus:ring-app-primary/20"
                  />
                </div>
              </div>
            </div>
            {saveError && (
              <p className="text-center text-sm text-red-600">{saveError}</p>
            )}
            <div className="flex gap-3">
              <SecondaryButton
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setSaveError(null);
                  setEditFullName(profile.fullName);
                  setEditUsername(profile.username ?? "");
                  setEditEmail(profile.email ?? "");
                  setEditDateOfBirth(toDateInputValue(profile.dateOfBirth));
                }}
                className="flex-1"
              >
                Batal
              </SecondaryButton>
              <PrimaryButton
                type="submit"
                isLoading={saving}
                isDisabled={saving}
                className="flex-1"
              >
                Simpan
              </PrimaryButton>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
