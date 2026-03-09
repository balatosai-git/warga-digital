"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@nextui-org/react";
import { PrimaryButton } from "@/components/ui";
import { usePendingPinStore } from "@/stores/pending-pin-store";
import { parseBlokRumah } from "@/lib/blok-rumah";

const WA_REGEX = /^(\+62|62|0)8[1-9][0-9]{6,10}$/;

function normalizeWaNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("62")) return "+" + digits;
  if (digits.startsWith("0")) return "+62" + digits.slice(1);
  return "+62" + digits;
}

export function RegisterForm() {
  const router = useRouter();
  const setPendingPin = usePendingPinStore((s) => s.setPending);
  const [fullName, setFullName] = useState("");
  const [waNumber, setWaNumber] = useState("");
  const [username, setUsername] = useState("");
  const [blokRumah, setBlokRumah] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!fullName.trim()) {
      setError("Nama lengkap wajib diisi");
      return false;
    }
    const normalized = normalizeWaNumber(waNumber);
    if (!WA_REGEX.test(normalized.replace("+", ""))) {
      setError("Format nomor WhatsApp tidak valid");
      return false;
    }
    const { error: blokError } = parseBlokRumah(blokRumah);
    if (blokError) {
      setError(blokError);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!validate()) return;

    setLoading(true);
    try {
      const normalized = normalizeWaNumber(waNumber);
      const { normalized: blokNormalized } = parseBlokRumah(blokRumah);
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          waNumber: normalized,
          blokRumah: blokNormalized,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Gagal mendaftar");
        return;
      }

      setPendingPin({
        userId: data.userId,
        fullName: data.fullName,
        houseId: data.houseId,
        blokRumah: data.blokRumah,
      });
      router.push("/auth/add-family");
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-6 px-6">
      <div className="space-y-4">
        <Input
          label="Nama Lengkap"
          placeholder="Masukkan nama lengkap"
          value={fullName}
          onValueChange={(v) => {
            setFullName(v);
            setError("");
          }}
          isInvalid={!!error}
          errorMessage={error}
          size="lg"
          variant="bordered"
          classNames={{
            label: "text-app-body-muted",
            input: "text-base text-app-body",
            inputWrapper: "min-h-14 bg-white border-default-200 data-[hover=true]:bg-white data-[focus=true]:bg-white data-[focus=true]:border-app-primary",
          }}
          autoComplete="name"
        />
        <Input
          label="Nomor WhatsApp"
          placeholder="08xxxxxxxxxx"
          value={waNumber}
          onValueChange={(v) => {
            setWaNumber(v);
            setError("");
          }}
          isInvalid={!!error}
          size="lg"
          variant="bordered"
          classNames={{
            label: "text-app-body-muted",
            input: "text-base text-app-body",
            inputWrapper: "min-h-14 bg-white border-default-200 data-[hover=true]:bg-white data-[focus=true]:bg-white data-[focus=true]:border-app-primary",
          }}
          autoComplete="tel"
        />
        <Input
          label="Username (opsional)"
          placeholder="Untuk masuk tanpa WhatsApp"
          value={username}
          onValueChange={(v) => {
            setUsername(v);
            setError("");
          }}
          size="lg"
          variant="bordered"
          description="3–30 karakter, huruf/angka/underscore. Dipakai untuk login jika tidak punya nomor WhatsApp."
          classNames={{
            label: "text-app-body-muted",
            input: "text-base text-app-body",
            inputWrapper: "min-h-14 bg-white border-default-200 data-[hover=true]:bg-white data-[focus=true]:bg-white data-[focus=true]:border-app-primary",
          }}
          autoComplete="username"
        />
        <Input
          label="Blok Rumah"
          placeholder="Contoh: N2, J12A"
          value={blokRumah}
          onValueChange={(v) => {
            setBlokRumah(v);
            setError("");
          }}
          isInvalid={!!error}
          size="lg"
          variant="bordered"
          description="Wajib. Blok + nomor, mis. N2 atau J12A. Slash/titik/spasi akan dinormalkan."
          classNames={{
            label: "text-app-body-muted",
            input: "text-base text-app-body",
            inputWrapper: "min-h-14 bg-white border-default-200 data-[hover=true]:bg-white data-[focus=true]:bg-white data-[focus=true]:border-app-primary",
          }}
          autoComplete="off"
        />
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 bg-background border-t border-divider">
        <PrimaryButton
          type="submit"
          isLoading={loading}
          isDisabled={loading}
        >
          Lanjutkan
        </PrimaryButton>
      </div>
    </form>
  );
}
