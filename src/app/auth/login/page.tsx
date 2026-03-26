"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@nextui-org/react";
import { KeyIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import { PrimaryButton, SecondaryButton } from "@/components/ui";
import { OtpInput } from "@/components/auth/otp-input";
import { useAuthStore } from "@/stores/auth-store";
import { useOnboardingStore } from "@/stores/onboarding-store";

const inputClassNames = {
  label: "text-app-body-muted font-medium",
  input: "text-base text-app-body",
  inputWrapper:
    "min-h-14 bg-white/95 border-default-200 shadow-sm data-[hover=true]:bg-white data-[focus=true]:bg-white data-[focus=true]:border-app-primary data-[focus=true]:shadow-[0_0_0_3px_var(--color-primary-muted)]",
};

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const setOnboardingCompleted = useOnboardingStore((s) => s.setCompleted);

  const [step, setStep] = useState<1 | 2>(1);
  const [login, setLogin] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const step1WrapperRef = useRef<HTMLDivElement>(null);

  // Focus step 1 input when on step 1
  useEffect(() => {
    if (step === 1) {
      step1WrapperRef.current?.querySelector<HTMLInputElement>("input")?.focus();
    }
  }, [step]);

  const goToStep2 = async () => {
    setError("");
    const trimmed = login.trim();
    if (!trimmed) {
      setError("Isi Username atau Nomor WhatsApp untuk melanjutkan.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/check-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: trimmed }),
      });
      const data = await res.json();
      if (!res.ok || !data.exists) {
        setError(data.error ?? "Username atau nomor WhatsApp tidak ditemukan.");
        return;
      }
      if (data.canProceed === false) {
        setError(data.error ?? "Akun belum dapat digunakan.");
        return;
      }
      setStep(2);
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (pin.length !== 4) {
      setError("PIN harus 4 digit.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: login.trim(), pin }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Login gagal. Periksa data dan coba lagi.");
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

  return (
    <main className="auth-login-page flex min-h-[var(--app-height,100dvh)] flex-col items-center justify-center overflow-auto px-4 py-8 sm:px-6">
      {/* Background */}
      <div className="auth-login-bg pointer-events-none fixed inset-0 -z-10" aria-hidden />

      {/* Card */}
      <div className="auth-login-card w-full max-w-[400px] flex-shrink-0 rounded-2xl border border-white/60 bg-white/90 p-6 shadow-xl shadow-app-primary/10 backdrop-blur-sm sm:p-8">
        {/* Step indicator */}
        <div className="mb-6 flex justify-center gap-2" aria-label="Langkah">
          <span
            className={`h-2 w-8 rounded-full transition-colors ${
              step >= 1 ? "bg-app-primary" : "bg-app-primary-muted"
            }`}
          />
          <span
            className={`h-2 w-8 rounded-full transition-colors ${
              step >= 2 ? "bg-app-primary" : "bg-app-primary-muted"
            }`}
          />
        </div>

        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="auth-login-logo mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-app-primary text-white shadow-lg shadow-app-primary/30">
            <KeyIcon className="h-8 w-8" aria-hidden />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-app-title sm:text-[1.75rem]">
            {step === 1 ? "Masuk" : "Masukkan PIN"}
          </h1>
          <p className="mt-2 text-sm text-app-body-muted">
            {step === 1
              ? "Gunakan Username atau Nomor WhatsApp yang terdaftar."
              : `Masukkan PIN 4 digit untuk ${login.trim()}.`}
          </p>
        </div>

        {/* Step 1: Username / WhatsApp only */}
        {step === 1 && (
          <>
            <div className="mb-6 inline-flex w-full justify-center">
              <span className="badge-info rounded-full border border-app-primary-muted/50 bg-app-primary-muted/40 px-4 py-2 text-center text-xs font-medium text-app-body-muted">
                Isi salah satu: Username atau No Whatsapp, lalu masukkan PIN 4 digit.
              </span>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); goToStep2(); }} className="flex flex-col gap-5">
              <div ref={step1WrapperRef}>
                <Input
                  label="Username atau Nomor WhatsApp"
                  placeholder="Contoh: budi_santoso atau 08123456789"
                  value={login}
                  onValueChange={(v) => {
                    setLogin(v);
                    setError("");
                  }}
                  isInvalid={!!error}
                  size="lg"
                  variant="bordered"
                  classNames={inputClassNames}
                  autoComplete="username"
                  radius="lg"
                />
              </div>
              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}
              <div className="mt-2 flex flex-col gap-4">
                <PrimaryButton type="submit" isDisabled={!login.trim() || loading} isLoading={loading}>
                  Lanjut
                </PrimaryButton>
                <p className="text-center text-sm text-app-body-muted">
                  Belum punya akun?{" "}
                  <Link
                    href="/auth/register"
                    className="font-semibold text-app-primary underline-offset-2 hover:underline"
                  >
                    Daftar
                  </Link>
                </p>
              </div>
            </form>
          </>
        )}

        {/* Step 2: PIN only */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-app-body-muted">
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
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            <div className="mt-2 flex flex-col gap-3">
              <PrimaryButton
                type="submit"
                isLoading={loading}
                isDisabled={loading || pin.length !== 4}
              >
                Masuk
              </PrimaryButton>
              <SecondaryButton type="button" onClick={() => { setStep(1); setError(""); setPin(""); }}>
                Ubah username / nomor
              </SecondaryButton>
              <p className="text-center text-sm text-app-body-muted">
                Belum punya akun?{" "}
                <Link
                  href="/auth/register"
                  className="font-semibold text-app-primary underline-offset-2 hover:underline"
                >
                  Daftar
                </Link>
              </p>
            </div>
          </form>
        )}
      </div>

      {/* Footer trust line */}
      <p className="mt-6 flex items-center gap-1.5 text-xs text-app-body-muted">
        <span className="auth-login-lock inline-flex h-4 w-4 items-center justify-center rounded-full bg-app-primary-muted/50 text-app-primary">
          <LockClosedIcon className="h-2.5 w-2.5" aria-hidden />
        </span>
        Encrypted by Supabase
      </p>
    </main>
  );
}
