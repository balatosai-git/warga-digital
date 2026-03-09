"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@nextui-org/react";
import { PrimaryButton, SecondaryButton } from "@/components/ui";
import { OtpInput } from "@/components/auth/otp-input";
import { parseBlokRumah } from "@/lib/blok-rumah";
import { useAuthStore } from "@/stores/auth-store";
import { useOnboardingStore } from "@/stores/onboarding-store";

const STEPS = [0, 1, 2] as const;
type StepIndex = (typeof STEPS)[number];

const WA_REGEX = /^(\+62|62|0)8[1-9][0-9]{6,10}$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

function normalizeWaNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("62")) return "+" + digits;
  if (digits.startsWith("0")) return "+62" + digits.slice(1);
  return "+62" + digits;
}

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
  label: "text-app-body-muted",
  input: "text-base text-app-body",
  inputWrapper:
    "min-h-14 bg-white border-default-200 data-[hover=true]:bg-white data-[focus=true]:bg-white data-[focus=true]:border-app-primary",
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
  const [existingHouseInfo, setExistingHouseInfo] = useState<ExistingHouseInfo | null>(null);
  const [pendingApprovalData, setPendingApprovalData] = useState<PendingApprovalData | null>(null);
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
  const [addFieldErrors, setAddFieldErrors] = useState<{ name?: string; username?: string; wa?: string }>({});
  const [loading, setLoading] = useState(false);

  const clearStep0Errors = () => {
    setError("");
    setFieldErrors({});
  };

  const handleNextStep0 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    const nameE = !fullName.trim() ? "Nama lengkap wajib diisi" : fullName.trim().length < 2 ? "Nama minimal 2 karakter" : undefined;
    const hasWa = waNumber.trim().length > 0;
    const hasUsername = username.trim().length > 0;
    if (!hasWa && !hasUsername) {
      setFieldErrors({ wa: "Isi nomor WhatsApp atau username (minimal salah satu untuk login)." });
      return;
    }
    let waE: string | undefined;
    if (hasWa) {
      const normalized = normalizeWaNumber(waNumber);
      if (!WA_REGEX.test(normalized.replace("+", ""))) waE = "Format nomor WhatsApp tidak valid (contoh: 08123456789)";
      else waE = undefined;
    }
    let userE: string | undefined;
    if (hasUsername) {
      if (!USERNAME_REGEX.test(username.trim())) userE = "Username 3–30 karakter, huruf/angka/underscore saja";
      else userE = undefined;
    }
    const { normalized: blokNormalized, error: blokError } = parseBlokRumah(blokRumah);
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

      const payload: { fullName: string; waNumber?: string; username?: string; blokRumah: string } = {
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
        if (msg.includes("WhatsApp") || msg.includes("nomor")) setFieldErrors({ wa: msg });
        else if (msg.includes("Username") || msg.includes("username")) setFieldErrors({ username: msg });
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
      const payload: { fullName: string; waNumber?: string; username?: string; blokRumah: string; requestToJoinExisting: boolean } = {
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

    const nameErr = !trimmedName ? "Nama lengkap wajib diisi" : trimmedName.length < 2 ? "Nama lengkap minimal 2 karakter" : undefined;
    const userErr = !trimmedUsername ? "Username wajib untuk anggota" : !USERNAME_REGEX.test(trimmedUsername) ? "Username 3–30 karakter, huruf/angka/underscore saja" : undefined;
    const waErr = !trimmedWa ? "Nomor WhatsApp wajib untuk anggota" : !WA_REGEX.test(normalizedWa.replace("+", "")) ? "Format nomor WhatsApp tidak valid (contoh: 08123456789)" : undefined;

    if (nameErr || userErr || waErr) {
      setAddFieldErrors({ name: nameErr, username: userErr, wa: waErr });
      return;
    }

    setMembers((prev) => [
      ...prev,
      { id: `temp-${crypto.randomUUID()}`, fullName: trimmedName, username: trimmedUsername, waNumber: normalizedWa },
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
      // Insert family members first (only on final submit, after main user exists)
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

      // Set PIN for main user; set-pin API propagates same PIN to all family in the house
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

  return (
    <main className="flex min-h-[var(--app-height,100dvh)] flex-col px-6 pt-8 pb-32">
      {/* Pending approval (after submitting join request) */}
      {step === 0 && pendingApprovalData && (
        <>
          <h1 className="text-xl font-semibold text-app-title">Menunggu persetujuan</h1>
          <p className="mt-2 text-sm text-app-body-muted">
            Permintaan bergabung Anda telah dikirim. Pemilik rumah {pendingApprovalData.blokRumah} ({pendingApprovalData.ownerFullName}) akan menerima notifikasi. Anda dapat mengatur PIN sekarang agar bisa masuk setelah disetujui.
          </p>
          {!showPinFormInPending ? (
            <div className="mt-8 flex flex-col gap-3">
              <PrimaryButton
                type="button"
                onPress={() => setShowPinFormInPending(true)}
                className="w-full"
              >
                Atur PIN
              </PrimaryButton>
              <SecondaryButton
                type="button"
                onClick={() => {
                  setPendingApprovalData(null);
                  router.replace("/auth/login");
                }}
                className="w-full"
              >
                Selesai
              </SecondaryButton>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-app-body-muted">PIN (4 digit)</label>
                <OtpInput
                  value={pin}
                  onChange={(v) => { setPin(v); setError(""); }}
                  length={4}
                  disabled={loading}
                  error={error}
                  masked
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-app-body-muted">Konfirmasi PIN</label>
                <OtpInput
                  value={confirmPin}
                  onChange={(v) => { setConfirmPin(v); setError(""); }}
                  length={4}
                  disabled={loading}
                  masked
                />
              </div>
              {error && <p className="text-sm text-danger">{error}</p>}
              <div className="flex gap-3">
                <SecondaryButton
                  type="button"
                  onClick={() => setShowPinFormInPending(false)}
                  className="flex-1"
                >
                  Batal
                </SecondaryButton>
                <PrimaryButton
                  type="button"
                  onPress={handlePendingSetPin}
                  isLoading={loading}
                  isDisabled={loading || pin.length !== 4 || confirmPin.length !== 4}
                  className="flex-1"
                >
                  Simpan PIN
                </PrimaryButton>
              </div>
            </div>
          )}
        </>
      )}

      {/* Step 0: Konfirmasi (rumah sudah ada) */}
      {step === 0 && !pendingApprovalData && existingHouseInfo && (
        <>
          <button
            type="button"
            onClick={() => router.push("/auth/login")}
            className="mb-4 flex items-center gap-2 text-sm font-medium text-app-body-muted hover:text-app-body"
          >
            <span aria-hidden>←</span>
            Kembali ke Login
          </button>
          <h1 className="text-xl font-semibold text-app-title">Rumah sudah terdaftar</h1>
          <p className="mt-2 text-sm text-app-body-muted">
            Rumah blok {existingHouseInfo.blokRumah} sudah terdaftar. Didaftarkan oleh {existingHouseInfo.createdByFullName}. Pemilik: {existingHouseInfo.ownerFullName}. Untuk bergabung perlu persetujuan pemilik.
          </p>
          {error && <p className="mt-4 text-sm text-danger">{error}</p>}
          <div className="mt-6 flex gap-3">
            <SecondaryButton
              type="button"
              onClick={() => setExistingHouseInfo(null)}
              className="flex-1"
            >
              Batal
            </SecondaryButton>
            <PrimaryButton
              type="button"
              onPress={handleConfirmProceed}
              isLoading={loading}
              isDisabled={loading}
              className="flex-1"
            >
              Lanjutkan
            </PrimaryButton>
          </div>
        </>
      )}

      {/* Step 0: Daftar (form) */}
      {step === 0 && !pendingApprovalData && !existingHouseInfo && (
        <>
          <button
            type="button"
            onClick={() => router.push("/auth/login")}
            className="mb-4 flex items-center gap-2 text-sm font-medium text-app-body-muted hover:text-app-body"
          >
            <span aria-hidden>←</span>
            Kembali ke Login
          </button>
          <h1 className="text-xl font-semibold text-app-title">Daftar</h1>
          <p className="mt-1 text-sm text-app-body-muted">
            Data Anda untuk Sawangan Regensi RT 03
          </p>
          <form onSubmit={handleNextStep0} className="mt-6 flex flex-col gap-5">
            <Input
              label="Nama lengkap"
              placeholder="Contoh: Budi Santoso"
              value={fullName}
              onValueChange={(v) => { setFullName(v); clearStep0Errors(); }}
              isInvalid={!!fieldErrors.name}
              errorMessage={fieldErrors.name}
              size="lg"
              variant="bordered"
              classNames={inputClassNames}
              autoComplete="name"
            />
            <div className="rounded-xl border border-default-200 bg-default-50/50 p-3">
              <p className="text-xs font-medium text-app-body-muted">
                Untuk login nanti — pilih salah satu atau isi keduanya:
              </p>
              <p className="mt-0.5 text-xs text-app-body-muted">
                Nomor WhatsApp atau username (3–30 karakter, huruf/angka/underscore). Minimal salah satu wajib diisi.
              </p>
            </div>
            <Input
              label="Nomor WhatsApp"
              placeholder="08xxxxxxxxxx (opsional jika isi username)"
              value={waNumber}
              onValueChange={(v) => { setWaNumber(v); clearStep0Errors(); }}
              isInvalid={!!fieldErrors.wa}
              errorMessage={fieldErrors.wa}
              size="lg"
              variant="bordered"
              classNames={inputClassNames}
              autoComplete="tel"
            />
            <Input
              label="Username"
              placeholder="Contoh: budi_santoso (opsional jika isi WhatsApp)"
              value={username}
              onValueChange={(v) => { setUsername(v); clearStep0Errors(); }}
              isInvalid={!!fieldErrors.username}
              errorMessage={fieldErrors.username}
              size="lg"
              variant="bordered"
              classNames={inputClassNames}
              autoComplete="username"
            />
            <Input
              label="Blok rumah"
              placeholder="Contoh: N2, J12A"
              value={blokRumah}
              onValueChange={(v) => { setBlokRumah(v); clearStep0Errors(); }}
              isInvalid={!!fieldErrors.blok}
              errorMessage={fieldErrors.blok}
              size="lg"
              variant="bordered"
              description="Blok + nomor rumah. Wajib diisi."
              classNames={inputClassNames}
              autoComplete="off"
            />
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="mt-2 flex justify-end">
              <PrimaryButton type="submit" isLoading={loading} isDisabled={loading}>
                Berikutnya
              </PrimaryButton>
            </div>
          </form>
        </>
      )}

      {/* Step 1: Tambah keluarga */}
      {step === 1 && registerData && (
        <>
          <h1 className="text-xl font-semibold text-app-title">Tambahkan anggota keluarga</h1>
          <p className="mt-1 text-sm text-app-body-muted">
            Anda pemilik rumah ({registerData.blokRumah}). Tambahkan anggota keluarga. PIN yang Anda atur nanti menjadi PIN default mereka.
          </p>
          {members.length > 0 && (
            <div className="mt-6 rounded-xl border border-default-200 bg-default-50 p-4">
              <p className="mb-2 text-sm font-medium text-app-body-muted">
                Anggota yang ditambahkan ({members.length})
              </p>
              <ul className="space-y-2">
                {members.map((m) => (
                  <li key={m.id} className="text-sm text-app-body">
                    <span className="font-medium">{m.fullName}</span>
                    <span className="ml-1 text-app-body-muted">
                      @{m.username} · {m.waNumber.replace(/(\+62)(\d{3})(\d{4})(\d+)/, "$1 $2-$3-$4")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <form onSubmit={handleAddMember} className="mt-6 space-y-4">
            <div>
              <Input
                label="Nama lengkap"
                placeholder="Contoh: Siti Aminah"
                value={addFullName}
                onValueChange={(v) => { setAddFullName(v); clearAddMemberErrors(); }}
                isInvalid={!!addFieldErrors.name}
                size="lg"
                variant="bordered"
                classNames={inputClassNames}
                autoComplete="name"
              />
              {addFieldErrors.name && <p className="mt-1 text-sm text-danger">{addFieldErrors.name}</p>}
            </div>
            <div>
              <Input
                label="Username"
                placeholder="Contoh: siti_aminah (3–30 karakter)"
                value={addUsername}
                onValueChange={(v) => { setAddUsername(v); clearAddMemberErrors(); }}
                isInvalid={!!addFieldErrors.username}
                size="lg"
                variant="bordered"
                classNames={inputClassNames}
                autoComplete="username"
              />
              {addFieldErrors.username && <p className="mt-1 text-sm text-danger">{addFieldErrors.username}</p>}
            </div>
            <div>
              <Input
                label="Nomor WhatsApp"
                placeholder="08xxxxxxxxxx"
                value={addWaNumber}
                onValueChange={(v) => { setAddWaNumber(v); clearAddMemberErrors(); }}
                isInvalid={!!addFieldErrors.wa}
                size="lg"
                variant="bordered"
                classNames={inputClassNames}
                autoComplete="tel"
              />
              {addFieldErrors.wa && <p className="mt-1 text-sm text-danger">{addFieldErrors.wa}</p>}
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <SecondaryButton type="submit" className="w-full">
              Tambah anggota
            </SecondaryButton>
          </form>
          <div className="mt-8 flex gap-3">
            <SecondaryButton type="button" onClick={goPrevious} className="flex-1">
              Sebelumnya
            </SecondaryButton>
            <PrimaryButton type="button" onPress={handleNextStep1} className="flex-1">
              Berikutnya
            </PrimaryButton>
          </div>
        </>
      )}

      {/* Step 2: Atur PIN */}
      {step === 2 && registerData && (
        <>
          <h1 className="text-xl font-semibold text-app-title">Atur PIN</h1>
          <p className="mt-1 text-sm text-app-body-muted">
            Buat PIN 4 digit untuk masuk. Jangan berikan PIN ke orang lain.
          </p>
          <form onSubmit={handleSubmitStep2} className="mt-8 flex flex-1 flex-col">
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-app-body-muted">PIN (4 digit)</label>
                <OtpInput
                  value={pin}
                  onChange={(v) => { setPin(v); setError(""); }}
                  length={4}
                  disabled={loading}
                  error={error}
                  masked
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-app-body-muted">Konfirmasi PIN</label>
                <OtpInput
                  value={confirmPin}
                  onChange={(v) => { setConfirmPin(v); setError(""); }}
                  length={4}
                  disabled={loading}
                  masked
                  autoFocus={false}
                />
              </div>
            </div>
            {error && <p className="mt-4 text-center text-sm text-danger">{error}</p>}
            <div className="mt-8 flex gap-3">
              <SecondaryButton type="button" onClick={goPrevious} className="flex-1">
                Sebelumnya
              </SecondaryButton>
              <PrimaryButton
                type="submit"
                isLoading={loading}
                isDisabled={loading || pin.length !== 4 || confirmPin.length !== 4}
                className="flex-1"
              >
                Simpan PIN
              </PrimaryButton>
            </div>
          </form>
        </>
      )}
    </main>
  );
}
