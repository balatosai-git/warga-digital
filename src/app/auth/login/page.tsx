"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  KeyIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
} from "@heroicons/react/24/solid";
import { OtpInput } from "@/components/auth/otp-input";
import { useAuthStore } from "@/stores/auth-store";
import { useOnboardingStore } from "@/stores/onboarding-store";

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const setOnboardingCompleted = useOnboardingStore((s) => s.setCompleted);

  const [step, setStep] = useState<1 | 2>(1);
  const [login, setLogin] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const loginInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 1) {
      const timer = setTimeout(() => loginInputRef.current?.focus(), 120);
      return () => clearTimeout(timer);
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

  const handleLogin = async () => {
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

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    goToStep2();
  };

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin();
  };

  const initials = login.trim() ? login.trim().charAt(0).toUpperCase() : "?";

  return (
    <main className="flex h-full flex-col overflow-hidden">
      {/* ── Gradient hero ─────────────────────────────────────── */}
      <section
        className="relative shrink-0 overflow-hidden px-5 pb-14 pt-8"
        style={{
          background:
            "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)",
        }}
      >
        {/* Decorative blobs */}
        <div
          className="pointer-events-none absolute -right-14 -top-14 h-52 w-52 rounded-full bg-white/10"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-12 -left-10 h-40 w-40 rounded-full bg-white/[0.07]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-16 right-10 h-20 w-20 rounded-full bg-white/[0.06]"
          aria-hidden
        />

        {/* Brand identity */}
        <div className="relative z-10 flex flex-col items-center gap-4 text-center">
          {/* Logo */}
          <div className="flex h-[72px] w-[72px] items-center justify-center rounded-[22px] bg-white/25 shadow-xl backdrop-blur-sm">
            <KeyIcon className="h-9 w-9 text-white" />
          </div>

          {/* Name & community */}
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 backdrop-blur-sm">
              <ShieldCheckIcon className="h-3 w-3 text-white/80" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">
                Sawangan Regensi · RT 03
              </span>
            </div>
            <h1 className="text-[24px] font-extrabold leading-tight text-white">
              Warga Digital
            </h1>
            <p className="mt-1 text-sm text-white/70">
              {step === 1 ? "Masuk ke akun Anda" : "Verifikasi identitas"}
            </p>
          </div>
        </div>
      </section>

      {/* ── Form card ─────────────────────────────────────────── */}
      <div className="relative -mt-6 flex flex-1 flex-col overflow-y-auto rounded-t-[2rem] bg-app-surface shadow-[0_-8px_40px_rgba(0,40,5,0.16)]">
        <div className="px-5 pt-6 pb-10">
          {/* Step indicator */}
          <div className="mb-7 flex justify-center gap-2" aria-label="Langkah">
            {([1, 2] as const).map((s) => (
              <div
                key={s}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: step >= s ? 32 : 8,
                  background:
                    step >= s
                      ? "var(--color-primary)"
                      : "var(--color-indicator-inactive)",
                }}
              />
            ))}
          </div>

          {/* ── Step 1: username / whatsapp ── */}
          {step === 1 && (
            <form onSubmit={handleStep1Submit} className="flex flex-col gap-5">
              <div>
                <h2 className="text-xl font-extrabold text-app-title">
                  Masuk ke akun
                </h2>
                <p className="mt-1 text-sm text-app-body-muted">
                  Gunakan Username atau Nomor WhatsApp yang terdaftar.
                </p>
              </div>

              {/* Hint banner */}
              <div
                className="flex items-start gap-2.5 rounded-2xl px-3.5 py-3"
                style={{ background: "var(--color-surface-alt)" }}
              >
                <CheckCircleIcon
                  className="mt-0.5 h-4 w-4 shrink-0"
                  style={{ color: "var(--color-primary)" }}
                />
                <p className="text-xs leading-relaxed text-app-body-muted">
                  Isi salah satu:{" "}
                  <strong className="font-semibold text-app-body">
                    Username
                  </strong>{" "}
                  atau{" "}
                  <strong className="font-semibold text-app-body">
                    Nomor WhatsApp
                  </strong>
                  , lalu masukkan PIN 4 digit.
                </p>
              </div>

              {/* Input */}
              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                  Username atau Nomor WhatsApp
                </label>
                <input
                  ref={loginInputRef}
                  type="text"
                  value={login}
                  onChange={(e) => {
                    setLogin(e.target.value);
                    setError("");
                  }}
                  placeholder="Contoh: budi_santoso atau 08123456789"
                  className="w-full rounded-2xl border bg-white px-4 py-3.5 text-sm font-semibold text-app-title placeholder:font-normal placeholder:text-app-body-muted/50 focus:outline-none"
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
                  autoComplete="username"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* CTA */}
              <button
                type="submit"
                disabled={!login.trim() || loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold text-white transition-all hover:-translate-y-[1px] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  background: "var(--color-primary)",
                  boxShadow: "0 8px 22px -12px var(--color-primary-shadow)",
                }}
              >
                {loading ? (
                  "Memeriksa..."
                ) : (
                  <>
                    Lanjut
                    <ArrowRightIcon className="h-4 w-4" />
                  </>
                )}
              </button>

              <p className="text-center text-sm text-app-body-muted">
                Belum punya akun?{" "}
                <Link
                  href="/auth/register"
                  className="font-semibold transition-opacity hover:opacity-70"
                  style={{ color: "var(--color-primary)" }}
                >
                  Daftar sekarang
                </Link>
              </p>
            </form>
          )}

          {/* ── Step 2: PIN ── */}
          {step === 2 && (
            <form onSubmit={handleStep2Submit} className="flex flex-col gap-5">
              <div>
                <h2 className="text-xl font-extrabold text-app-title">
                  Masukkan PIN
                </h2>
                <p className="mt-1 text-sm text-app-body-muted">
                  Masukkan PIN 4 digit untuk masuk ke akun Anda.
                </p>
              </div>

              {/* User identity chip */}
              <div
                className="flex items-center gap-3 rounded-2xl px-3.5 py-3"
                style={{ background: "var(--color-surface-alt)" }}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold text-white shadow-sm"
                  style={{ background: "var(--color-primary)" }}
                >
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-app-title">
                    {login.trim()}
                  </p>
                  <p className="text-[11px] text-app-body-muted">
                    Akun ditemukan ✓
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setError("");
                    setPin("");
                  }}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition hover:bg-app-primary-muted active:scale-90"
                  style={{ color: "var(--color-primary)" }}
                  aria-label="Ubah akun"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </button>
              </div>

              {/* PIN input */}
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

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* CTA */}
              <button
                type="submit"
                disabled={loading || pin.length !== 4}
                className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold text-white transition-all hover:-translate-y-[1px] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  background: "var(--color-primary)",
                  boxShadow: "0 8px 22px -12px var(--color-primary-shadow)",
                }}
              >
                {loading ? "Masuk..." : "Masuk ke Akun"}
              </button>

              <p className="text-center text-sm text-app-body-muted">
                Belum punya akun?{" "}
                <Link
                  href="/auth/register"
                  className="font-semibold transition-opacity hover:opacity-70"
                  style={{ color: "var(--color-primary)" }}
                >
                  Daftar sekarang
                </Link>
              </p>
            </form>
          )}

          {/* Trust footer */}
          <div className="mt-8 flex items-center justify-center gap-1.5">
            <div
              className="flex h-4 w-4 items-center justify-center rounded-full"
              style={{ background: "var(--color-primary-muted)" }}
            >
              <LockClosedIcon
                className="h-2.5 w-2.5"
                style={{ color: "var(--color-primary)" }}
              />
            </div>
            <p className="text-[11px] text-app-body-muted/70">
              Terenkripsi &amp; aman oleh Supabase
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
