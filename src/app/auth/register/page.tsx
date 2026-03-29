"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@nextui-org/react";
import {
  ChevronLeftIcon,
  UserIcon,
  LockClosedIcon,
  UserPlusIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/solid";
import { PrimaryButton, SecondaryButton } from "@/components/ui";
import { OtpInput } from "@/components/auth/otp-input";
import { parseBlokRumah } from "@/lib/blok-rumah";
import { useAuthStore } from "@/stores/auth-store";
import { useOnboardingStore } from "@/stores/onboarding-store";
import {
  normalizeWaNumber,
  validateNormalizedWaNumber,
} from "@/lib/phone-utils";

const STEPS = [0, 1, 2] as const;
type StepIndex = (typeof STEPS)[number];

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

interface RegisterData {
  userId: string;
  fullName: string;
  houseId: string;
  blokRumah: string;
}

interface ExistingHouseInfo {
  ownerFullName: string;
  createdByFullName: string;
  blokRumah: string;
}

interface PendingApprovalData {
  userId: string;
  fullName: string;
  blokRumah: string;
  ownerFullName: string;
}

interface FamilyMemberRow {
  id: string;
  fullName: string;
  username: string;
  waNumber: string;
}

const inputClassNames = {
  label: "text-app-body-muted text-[11px] font-bold uppercase tracking-widest",
  input: "text-sm font-semibold text-app-title",
  inputWrapper:
    "min-h-[52px] bg-white border-default-200 data-[hover=true]:bg-white data-[focus=true]:bg-white data-[focus=true]:border-app-primary",
};

export default function RegisterWizardPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const setOnboardingCompleted = useOnboardingStore((s) => s.setCompleted);

  const [step, setStep] = useState<StepIndex>(0);

  // Step 0: Register
  const [fullName, setFullName] = useState("");
  const [waNumber, setWaNumber] = useState("");
  const [username, setUsername] = useState("");
  const [blokRumah, setBlokRumah] = useState("");
  const [registerData, setRegisterData] = useState<RegisterData | null>(null);
  const [existingHouseInfo, setExistingHouseInfo] =
    useState<ExistingHouseInfo | null>(null);
  const [pendingApprovalData, setPendingApprovalData] =
    useState<PendingApprovalData | null>(null);
  const [showPinFormInPending, setShowPinFormInPending] = useState(false);

  // Step 1: Add family
  const [members, setMembers] = useState<FamilyMemberRow[]>([]);
  const [addFullName, setAddFullName] = useState("");
  const [addUsername, setAddUsername] = useState("");
  const [addWaNumber, setAddWaNumber] = useState("");

  // Step 2: Set PIN
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    wa?: string;
    username?: string;
    blok?: string;
  }>({});
  const [addFieldErrors, setAddFieldErrors] = useState<{
    name?: string;
    username?: string;
    wa?: string;
  }>({});
  const [loading, setLoading] = useState(false);

  const clearStep0Errors = () => {
    setError("");
    setFieldErrors({});
  };

  const handleNextStep0 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    const nameE = !fullName.trim()
      ? "Nama lengkap wajib diisi"
      : fullName.trim().length < 2
        ? "Nama minimal 2 karakter"
        : undefined;
    const hasWa = waNumber.trim().length > 0;
    const hasUsername = username.trim().length > 0;
    if (!hasWa && !hasUsername) {
      setFieldErrors({
        wa: "Isi nomor WhatsApp atau username (minimal salah satu untuk login).",
      });
      return;
    }
    let waE: string | undefined;
    if (hasWa) {
      const normalized = normalizeWaNumber(waNumber);
      waE = validateNormalizedWaNumber(normalized) ?? undefined;
    }
    let userE: string | undefined;
    if (hasUsername) {
      if (!USERNAME_REGEX.test(username.trim()))
        userE = "Username 3–30 karakter, huruf/angka/underscore saja";
      else userE = undefined;
    }
    const { normalized: blokNormalized, error: blokError } =
      parseBlokRumah(blokRumah);
    const blokE = blokError;

    if (nameE || waE || userE || blokE) {
      setFieldErrors({ name: nameE, wa: waE, username: userE, blok: blokE });
      return;
    }

    setLoading(true);
    try {
      const checkRes = await fetch("/api/auth/register/check-blok", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blokRumah: blokNormalized }),
      });
      const checkData = await checkRes.json();
      if (!checkRes.ok) {
        setError(checkData.error ?? "Gagal memeriksa blok");
        return;
      }

      if (checkData.exists === true) {
        setExistingHouseInfo({
          ownerFullName: checkData.ownerFullName ?? "—",
          createdByFullName: checkData.createdByFullName ?? "—",
          blokRumah: checkData.blokRumah ?? blokNormalized,
        });
        return;
      }

      const payload: {
        fullName: string;
        waNumber?: string;
        username?: string;
        blokRumah: string;
      } = {
        fullName: fullName.trim(),
        blokRumah: blokNormalized,
      };
      if (waNumber.trim()) payload.waNumber = normalizeWaNumber(waNumber);
      if (username.trim()) payload.username = username.trim();

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error ?? "Gagal mendaftar";
        if (msg.includes("WhatsApp") || msg.includes("nomor"))
          setFieldErrors({ wa: msg });
        else if (msg.includes("Username") || msg.includes("username"))
          setFieldErrors({ username: msg });
        else setError(msg);
        return;
      }
      setRegisterData({
        userId: data.userId,
        fullName: data.fullName,
        houseId: data.houseId,
        blokRumah: data.blokRumah,
      });
      setStep(1);
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmProceed = async () => {
    if (!existingHouseInfo) return;
    setError("");
    setLoading(true);
    try {
      const payload: {
        fullName: string;
        waNumber?: string;
        username?: string;
        blokRumah: string;
        requestToJoinExisting: boolean;
      } = {
        fullName: fullName.trim(),
        blokRumah: existingHouseInfo.blokRumah,
        requestToJoinExisting: true,
      };
      if (waNumber.trim()) payload.waNumber = normalizeWaNumber(waNumber);
      if (username.trim()) payload.username = username.trim();

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal mengirim permintaan");
        return;
      }
      if (data.requiresApproval === true) {
        setPendingApprovalData({
          userId: data.userId,
          fullName: data.fullName,
          blokRumah: data.blokRumah,
          ownerFullName: data.ownerFullName ?? existingHouseInfo.ownerFullName,
        });
        setExistingHouseInfo(null);
      } else {
        setRegisterData({
          userId: data.userId,
          fullName: data.fullName,
          houseId: data.houseId,
          blokRumah: data.blokRumah,
        });
        setExistingHouseInfo(null);
        setStep(1);
      }
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handlePendingSetPin = async () => {
    if (!pendingApprovalData) return;
    setError("");
    if (pin.length !== 4 || confirmPin.length !== 4) {
      setError("PIN dan konfirmasi harus 4 digit");
      return;
    }
    if (pin !== confirmPin) {
      setError("PIN dan konfirmasi PIN tidak sama");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/set-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: pendingApprovalData.userId,
          pin,
          confirmPin,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menyimpan PIN");
        return;
      }
      setUser({ id: data.userId, fullName: data.fullName });
      setPendingApprovalData(null);
      setPin("");
      setConfirmPin("");
      router.replace("/profil");
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep1 = () => {
    setError("");
    setStep(2);
  };

  const clearAddMemberErrors = () => {
    setError("");
    setAddFieldErrors({});
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerData) return;
    setError("");
    setAddFieldErrors({});

    const trimmedName = addFullName.trim();
    const trimmedUsername = addUsername.trim();
    const trimmedWa = addWaNumber.trim();
    const normalizedWa = normalizeWaNumber(addWaNumber);

    const nameErr = !trimmedName
      ? "Nama lengkap wajib diisi"
      : trimmedName.length < 2
        ? "Nama lengkap minimal 2 karakter"
        : undefined;
    const userErr = !trimmedUsername
      ? "Username wajib untuk anggota"
      : !USERNAME_REGEX.test(trimmedUsername)
        ? "Username 3–30 karakter, huruf/angka/underscore saja"
        : undefined;
    const waErr = !trimmedWa
      ? "Nomor WhatsApp wajib untuk anggota"
      : (validateNormalizedWaNumber(normalizedWa) ?? undefined);

    if (nameErr || userErr || waErr) {
      setAddFieldErrors({ name: nameErr, username: userErr, wa: waErr });
      return;
    }

    setMembers((prev) => [
      ...prev,
      {
        id: `temp-${crypto.randomUUID()}`,
        fullName: trimmedName,
        username: trimmedUsername,
        waNumber: normalizedWa,
      },
    ]);
    setAddFullName("");
    setAddUsername("");
    setAddWaNumber("");
  };

  const handleSubmitStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerData) return;
    setError("");
    if (pin.length !== 4) {
      setError("PIN harus 4 digit");
      return;
    }
    if (confirmPin.length !== 4) {
      setError("Konfirmasi PIN harus 4 digit");
      return;
    }
    if (pin !== confirmPin) {
      setError("PIN dan konfirmasi PIN tidak sama");
      return;
    }

    setLoading(true);
    try {
      for (const member of members) {
        const res = await fetch("/api/auth/add-family-member", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ownerUserId: registerData.userId,
            houseId: registerData.houseId,
            fullName: member.fullName,
            username: member.username,
            waNumber: member.waNumber,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? `Gagal menambah anggota: ${member.fullName}`);
          return;
        }
      }

      const res = await fetch("/api/auth/set-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: registerData.userId,
          pin,
          confirmPin,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menyimpan PIN");
        return;
      }
      setUser({ id: data.userId, fullName: data.fullName });
      setOnboardingCompleted(true);
      router.replace("/landing");
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const goPrevious = () => {
    setError("");
    setStep((s) => (s - 1) as StepIndex);
  };

  /* ─── Derived state for header ─── */
  const isSpecialStep0 =
    step === 0 && (!!pendingApprovalData || !!existingHouseInfo);

  const STEP_META = [
    { icon: UserIcon, label: "Data Diri" },
    { icon: UserPlusIcon, label: "Keluarga" },
    { icon: LockClosedIcon, label: "PIN" },
  ];

  const headerTitle = (() => {
    if (pendingApprovalData) return "Menunggu Persetujuan";
    if (existingHouseInfo) return "Rumah Terdaftar";
    if (step === 0) return "Daftar Akun";
    if (step === 1) return "Anggota Keluarga";
    return "Atur PIN";
  })();

  const headerSubtitle = (() => {
    if (pendingApprovalData) return `Blok ${pendingApprovalData.blokRumah}`;
    if (existingHouseInfo) return `Blok ${existingHouseInfo.blokRumah}`;
    if (step === 0) return "Sawangan Regensi · RT 03";
    if (step === 1)
      return registerData ? `Pemilik · Blok ${registerData.blokRumah}` : "";
    return registerData ? `Blok ${registerData.blokRumah}` : "";
  })();

  return (
    <main className="flex h-full flex-col overflow-hidden">
      {/* ── Gradient sticky header ──────────────────────────── */}
      <section
        className="relative shrink-0 overflow-hidden px-4 pb-6 pt-5"
        style={{
          background:
            "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)",
        }}
      >
        {/* Decorative blobs */}
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-white/[0.07]"
          aria-hidden
        />

        <div className="relative z-10">
          {/* Nav row */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (step === 0) {
                  if (existingHouseInfo) {
                    setExistingHouseInfo(null);
                  } else if (pendingApprovalData) {
                    router.push("/auth/login");
                  } else {
                    router.push("/auth/login");
                  }
                } else {
                  goPrevious();
                }
              }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm transition hover:bg-white/30 active:scale-90"
              aria-label="Kembali"
            >
              <ChevronLeftIcon className="h-5 w-5 text-white" />
            </button>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                {headerSubtitle}
              </p>
              <h1 className="truncate text-lg font-extrabold leading-tight text-white">
                {headerTitle}
              </h1>
            </div>
          </div>

          {/* Step progress — only for normal flow */}
          {!isSpecialStep0 && !pendingApprovalData && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {STEP_META.map(({ icon: Icon, label }, idx) => {
                const isActive = step === idx;
                const isDone = step > idx;
                return (
                  <div
                    key={label}
                    className="flex flex-col items-center gap-1.5 rounded-xl px-2 py-2.5 backdrop-blur-sm transition-all"
                    style={{
                      background: isActive
                        ? "rgba(255,255,255,0.25)"
                        : isDone
                          ? "rgba(255,255,255,0.18)"
                          : "rgba(255,255,255,0.10)",
                    }}
                  >
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-lg"
                      style={{
                        background:
                          isActive || isDone
                            ? "rgba(255,255,255,0.30)"
                            : "rgba(255,255,255,0.15)",
                      }}
                    >
                      {isDone ? (
                        <CheckCircleIcon className="h-4 w-4 text-white" />
                      ) : (
                        <Icon
                          className="h-4 w-4"
                          style={{
                            color: isActive ? "white" : "rgba(255,255,255,0.6)",
                          }}
                        />
                      )}
                    </div>
                    <span
                      className="text-[10px] font-bold leading-none tracking-wide"
                      style={{
                        color: isActive
                          ? "white"
                          : isDone
                            ? "rgba(255,255,255,0.85)"
                            : "rgba(255,255,255,0.5)",
                      }}
                    >
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── Scrollable form body ─────────────────────────────── */}
      <div className="relative -mt-4 flex flex-1 flex-col overflow-y-auto rounded-t-[2rem] bg-app-surface shadow-[0_-8px_40px_rgba(0,40,5,0.14)]">
        <div className="px-5 pt-6 pb-10">
          {/* ═══ PENDING APPROVAL ═══ */}
          {step === 0 && pendingApprovalData && (
            <div className="flex flex-col gap-5">
              {/* Status card */}
              <div
                className="flex items-start gap-3 rounded-2xl px-4 py-4"
                style={{ background: "var(--color-surface-alt)" }}
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: "var(--color-primary-muted)" }}
                >
                  <ClockIcon
                    className="h-5 w-5"
                    style={{ color: "var(--color-primary)" }}
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-app-title">
                    Permintaan Terkirim
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-app-body-muted">
                    Pemilik rumah{" "}
                    <strong className="font-semibold text-app-body">
                      {pendingApprovalData.blokRumah}
                    </strong>{" "}
                    (
                    <strong className="font-semibold text-app-body">
                      {pendingApprovalData.ownerFullName}
                    </strong>
                    ) akan menerima notifikasi dan perlu menyetujui permintaan
                    Anda.
                  </p>
                </div>
              </div>

              {!showPinFormInPending ? (
                <>
                  <p className="text-sm leading-relaxed text-app-body-muted">
                    Atur PIN sekarang agar Anda bisa langsung masuk setelah
                    disetujui.
                  </p>
                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={() => setShowPinFormInPending(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold text-white transition-all hover:-translate-y-[1px] active:translate-y-0"
                      style={{
                        background: "var(--color-primary)",
                        boxShadow:
                          "0 8px 22px -12px var(--color-primary-shadow)",
                      }}
                    >
                      Atur PIN Sekarang
                      <ArrowRightIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPendingApprovalData(null);
                        router.replace("/auth/login");
                      }}
                      className="w-full rounded-2xl py-3.5 text-sm font-bold text-app-body transition-all hover:bg-app-surface-alt active:scale-[0.98]"
                      style={{ background: "var(--color-surface-alt)" }}
                    >
                      Selesai — Kembali ke Login
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-5">
                  <div>
                    <h2 className="text-base font-extrabold text-app-title">
                      Buat PIN
                    </h2>
                    <p className="mt-0.5 text-sm text-app-body-muted">
                      PIN 4 digit digunakan untuk masuk ke aplikasi.
                    </p>
                  </div>

                  <div>
                    <label className="mb-3 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                      PIN (4 digit)
                    </label>
                    <OtpInput
                      value={pin}
                      onChange={(v) => {
                        setPin(v);
                        setError("");
                      }}
                      length={4}
                      disabled={loading}
                      error={error}
                      masked
                    />
                  </div>

                  <div>
                    <label className="mb-3 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                      Konfirmasi PIN
                    </label>
                    <OtpInput
                      value={confirmPin}
                      onChange={(v) => {
                        setConfirmPin(v);
                        setError("");
                      }}
                      length={4}
                      disabled={loading}
                      masked
                      autoFocus={false}
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowPinFormInPending(false)}
                      className="flex-1 rounded-2xl py-3.5 text-sm font-bold text-app-body transition-all hover:bg-app-surface-alt active:scale-[0.98]"
                      style={{ background: "var(--color-surface-alt)" }}
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handlePendingSetPin}
                      disabled={
                        loading || pin.length !== 4 || confirmPin.length !== 4
                      }
                      className="flex-1 rounded-2xl py-3.5 text-sm font-bold text-white transition-all hover:-translate-y-[1px] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
                      style={{
                        background: "var(--color-primary)",
                        boxShadow:
                          "0 8px 22px -12px var(--color-primary-shadow)",
                      }}
                    >
                      {loading ? "Menyimpan..." : "Simpan PIN"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ EXISTING HOUSE CONFIRMATION ═══ */}
          {step === 0 && !pendingApprovalData && existingHouseInfo && (
            <div className="flex flex-col gap-5">
              {/* Info card */}
              <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-bold text-amber-800">
                    Rumah sudah terdaftar
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-amber-700">
                    Rumah blok <strong>{existingHouseInfo.blokRumah}</strong>{" "}
                    sudah terdaftar. Pemilik:{" "}
                    <strong>{existingHouseInfo.ownerFullName}</strong>.
                    Didaftarkan oleh:{" "}
                    <strong>{existingHouseInfo.createdByFullName}</strong>.
                  </p>
                </div>
              </div>

              <div
                className="rounded-2xl px-4 py-3.5"
                style={{ background: "var(--color-surface-alt)" }}
              >
                <p className="text-sm leading-relaxed text-app-body-muted">
                  Untuk bergabung ke rumah ini, Anda memerlukan{" "}
                  <strong className="text-app-body">
                    persetujuan dari pemilik rumah
                  </strong>
                  . Permintaan akan dikirim setelah Anda menekan Lanjutkan.
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setExistingHouseInfo(null)}
                  className="flex-1 rounded-2xl py-3.5 text-sm font-bold text-app-body transition-all hover:bg-app-surface-alt active:scale-[0.98]"
                  style={{ background: "var(--color-surface-alt)" }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmProceed}
                  disabled={loading}
                  className="flex-1 rounded-2xl py-3.5 text-sm font-bold text-white transition-all hover:-translate-y-[1px] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    background: "var(--color-primary)",
                    boxShadow: "0 8px 22px -12px var(--color-primary-shadow)",
                  }}
                >
                  {loading ? "Mengirim..." : "Lanjutkan"}
                </button>
              </div>
            </div>
          )}

          {/* ═══ STEP 0: REGISTRATION FORM ═══ */}
          {step === 0 && !pendingApprovalData && !existingHouseInfo && (
            <form onSubmit={handleNextStep0} className="flex flex-col gap-5">
              <div>
                <h2 className="text-xl font-extrabold text-app-title">
                  Data diri Anda
                </h2>
                <p className="mt-1 text-sm text-app-body-muted">
                  Lengkapi data untuk mendaftarkan akun dan rumah Anda.
                </p>
              </div>

              {/* Full name */}
              <Input
                label="Nama Lengkap"
                placeholder="Contoh: Budi Santoso"
                value={fullName}
                onValueChange={(v) => {
                  setFullName(v);
                  clearStep0Errors();
                }}
                isInvalid={!!fieldErrors.name}
                errorMessage={fieldErrors.name}
                size="lg"
                variant="bordered"
                classNames={inputClassNames}
                autoComplete="name"
              />

              {/* Login info banner */}
              <div
                className="flex items-start gap-2.5 rounded-2xl px-3.5 py-3"
                style={{ background: "var(--color-surface-alt)" }}
              >
                <CheckCircleIcon
                  className="mt-0.5 h-4 w-4 shrink-0"
                  style={{ color: "var(--color-primary)" }}
                />
                <p className="text-xs leading-relaxed text-app-body-muted">
                  Untuk login nanti — isi{" "}
                  <strong className="text-app-body">Nomor WhatsApp</strong> atau{" "}
                  <strong className="text-app-body">Username</strong> (minimal
                  salah satu). Keduanya boleh diisi.
                </p>
              </div>

              {/* WhatsApp */}
              <Input
                label="Nomor WhatsApp"
                placeholder="08xxxxxxxxxx (opsional jika isi username)"
                value={waNumber}
                onValueChange={(v) => {
                  setWaNumber(v);
                  clearStep0Errors();
                }}
                isInvalid={!!fieldErrors.wa}
                errorMessage={fieldErrors.wa}
                size="lg"
                variant="bordered"
                classNames={inputClassNames}
                autoComplete="tel"
              />

              {/* Username */}
              <Input
                label="Username"
                placeholder="Contoh: budi_santoso (opsional jika isi WhatsApp)"
                value={username}
                onValueChange={(v) => {
                  setUsername(v);
                  clearStep0Errors();
                }}
                isInvalid={!!fieldErrors.username}
                errorMessage={fieldErrors.username}
                size="lg"
                variant="bordered"
                classNames={inputClassNames}
                autoComplete="username"
              />

              {/* House block */}
              <Input
                label="Blok Rumah"
                placeholder="Contoh: N2, J12A"
                value={blokRumah}
                onValueChange={(v) => {
                  setBlokRumah(v);
                  clearStep0Errors();
                }}
                isInvalid={!!fieldErrors.blok}
                errorMessage={fieldErrors.blok}
                size="lg"
                variant="bordered"
                description="Blok + nomor rumah. Contoh: N2, J12A, B5. Wajib diisi."
                classNames={inputClassNames}
                autoComplete="off"
              />

              {error && (
                <div className="flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="flex flex-col gap-3 pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold text-white transition-all hover:-translate-y-[1px] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    background: "var(--color-primary)",
                    boxShadow: "0 8px 22px -12px var(--color-primary-shadow)",
                  }}
                >
                  {loading ? (
                    "Memproses..."
                  ) : (
                    <>
                      Berikutnya
                      <ArrowRightIcon className="h-4 w-4" />
                    </>
                  )}
                </button>

                <p className="text-center text-sm text-app-body-muted">
                  Sudah punya akun?{" "}
                  <button
                    type="button"
                    onClick={() => router.push("/auth/login")}
                    className="font-semibold transition-opacity hover:opacity-70"
                    style={{ color: "var(--color-primary)" }}
                  >
                    Masuk
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* ═══ STEP 1: FAMILY MEMBERS ═══ */}
          {step === 1 && registerData && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-xl font-extrabold text-app-title">
                  Tambahkan anggota keluarga
                </h2>
                <p className="mt-1 text-sm text-app-body-muted">
                  Anda pemilik rumah{" "}
                  <strong className="font-semibold text-app-body">
                    Blok {registerData.blokRumah}
                  </strong>
                  . Tambahkan anggota keluarga sekarang atau lewati untuk
                  dilakukan nanti.
                </p>
              </div>

              {/* PIN info */}
              <div
                className="flex items-start gap-2.5 rounded-2xl px-3.5 py-3"
                style={{ background: "var(--color-surface-alt)" }}
              >
                <LockClosedIcon
                  className="mt-0.5 h-4 w-4 shrink-0"
                  style={{ color: "var(--color-primary)" }}
                />
                <p className="text-xs leading-relaxed text-app-body-muted">
                  PIN yang Anda atur di langkah berikutnya akan menjadi PIN
                  default semua anggota keluarga yang ditambahkan.
                </p>
              </div>

              {/* Member list */}
              {members.length > 0 && (
                <div
                  className="rounded-2xl border px-4 py-4"
                  style={{ borderColor: "var(--color-input-border)" }}
                >
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                    Anggota ditambahkan ({members.length})
                  </p>
                  <ul className="space-y-2.5">
                    {members.map((m) => (
                      <li
                        key={m.id}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2.5"
                        style={{ background: "var(--color-surface-alt)" }}
                      >
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-xs font-extrabold text-white shadow-sm"
                          style={{ background: "var(--color-primary)" }}
                        >
                          {m.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-app-title">
                            {m.fullName}
                          </p>
                          <p className="text-[10px] text-app-body-muted">
                            @{m.username}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Add member form */}
              <div
                className="rounded-2xl border p-4"
                style={{ borderColor: "var(--color-input-border)" }}
              >
                <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                  Tambah Anggota
                </p>
                <form
                  onSubmit={handleAddMember}
                  className="flex flex-col gap-4"
                >
                  <Input
                    label="Nama Lengkap"
                    placeholder="Contoh: Siti Aminah"
                    value={addFullName}
                    onValueChange={(v) => {
                      setAddFullName(v);
                      clearAddMemberErrors();
                    }}
                    isInvalid={!!addFieldErrors.name}
                    errorMessage={addFieldErrors.name}
                    size="lg"
                    variant="bordered"
                    classNames={inputClassNames}
                    autoComplete="name"
                  />
                  <Input
                    label="Username"
                    placeholder="Contoh: siti_aminah"
                    value={addUsername}
                    onValueChange={(v) => {
                      setAddUsername(v);
                      clearAddMemberErrors();
                    }}
                    isInvalid={!!addFieldErrors.username}
                    errorMessage={addFieldErrors.username}
                    size="lg"
                    variant="bordered"
                    classNames={inputClassNames}
                    autoComplete="username"
                  />
                  <Input
                    label="Nomor WhatsApp"
                    placeholder="08xxxxxxxxxx"
                    value={addWaNumber}
                    onValueChange={(v) => {
                      setAddWaNumber(v);
                      clearAddMemberErrors();
                    }}
                    isInvalid={!!addFieldErrors.wa}
                    errorMessage={addFieldErrors.wa}
                    size="lg"
                    variant="bordered"
                    classNames={inputClassNames}
                    autoComplete="tel"
                  />
                  {error && (
                    <div className="flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-bold transition-all hover:bg-app-surface-alt active:scale-[0.98]"
                    style={{
                      borderColor: "var(--color-primary)",
                      color: "var(--color-primary)",
                    }}
                  >
                    <UserPlusIcon className="h-4 w-4" />
                    Tambah Anggota
                  </button>
                </form>
              </div>

              {/* Navigation */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={goPrevious}
                  className="flex-1 rounded-2xl py-3.5 text-sm font-bold text-app-body transition-all hover:bg-app-surface-alt active:scale-[0.98]"
                  style={{ background: "var(--color-surface-alt)" }}
                >
                  Sebelumnya
                </button>
                <button
                  type="button"
                  onClick={handleNextStep1}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white transition-all hover:-translate-y-[1px] active:translate-y-0"
                  style={{
                    background: "var(--color-primary)",
                    boxShadow: "0 8px 22px -12px var(--color-primary-shadow)",
                  }}
                >
                  Berikutnya
                  <ArrowRightIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ═══ STEP 2: SET PIN ═══ */}
          {step === 2 && registerData && (
            <form onSubmit={handleSubmitStep2} className="flex flex-col gap-5">
              <div>
                <h2 className="text-xl font-extrabold text-app-title">
                  Buat PIN
                </h2>
                <p className="mt-1 text-sm text-app-body-muted">
                  PIN 4 digit digunakan untuk masuk ke akun Anda. Jangan berikan
                  PIN kepada siapapun.
                </p>
              </div>

              {/* Security hint */}
              <div
                className="flex items-start gap-2.5 rounded-2xl px-3.5 py-3"
                style={{ background: "var(--color-surface-alt)" }}
              >
                <LockClosedIcon
                  className="mt-0.5 h-4 w-4 shrink-0"
                  style={{ color: "var(--color-primary)" }}
                />
                <p className="text-xs leading-relaxed text-app-body-muted">
                  PIN ini juga berlaku untuk semua anggota keluarga yang telah
                  Anda tambahkan. Simpan dengan baik.
                </p>
              </div>

              {/* PIN */}
              <div>
                <label className="mb-3 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                  PIN (4 digit)
                </label>
                <OtpInput
                  value={pin}
                  onChange={(v) => {
                    setPin(v);
                    setError("");
                  }}
                  length={4}
                  disabled={loading}
                  error={error}
                  masked
                />
              </div>

              {/* Confirm PIN */}
              <div>
                <label className="mb-3 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                  Konfirmasi PIN
                </label>
                <OtpInput
                  value={confirmPin}
                  onChange={(v) => {
                    setConfirmPin(v);
                    setError("");
                  }}
                  length={4}
                  disabled={loading}
                  masked
                  autoFocus={false}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={goPrevious}
                  className="flex-1 rounded-2xl py-3.5 text-sm font-bold text-app-body transition-all hover:bg-app-surface-alt active:scale-[0.98]"
                  style={{ background: "var(--color-surface-alt)" }}
                >
                  Sebelumnya
                </button>
                <button
                  type="submit"
                  disabled={
                    loading || pin.length !== 4 || confirmPin.length !== 4
                  }
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white transition-all hover:-translate-y-[1px] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    background: "var(--color-primary)",
                    boxShadow: "0 8px 22px -12px var(--color-primary-shadow)",
                  }}
                >
                  {loading ? "Menyimpan..." : "Simpan & Mulai"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
