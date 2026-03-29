"use client";

import {
  ShieldCheckIcon,
  LockClosedIcon,
  IdentificationIcon,
  CheckBadgeIcon,
  MapPinIcon,
} from "@heroicons/react/24/solid";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { DotIndicators } from "@/components/ui";
import { OnboardingScreenProps } from "./onboarding-shared";

export function ScreenTrust({
  currentIndex,
  totalScreens,
}: OnboardingScreenProps) {
  const router = useRouter();
  const setCompleted = useOnboardingStore((s) => s.setCompleted);

  const handleMulai = () => {
    setCompleted(true);
    router.replace("/auth/register");
  };

  const handleLogin = () => {
    setCompleted(true);
    router.replace("/auth/login");
  };

  return (
    <div className="flex h-full w-full flex-col">
      {/* ── Gradient hero ── */}
      <div
        className="relative shrink-0 overflow-hidden"
        style={{
          height: "56%",
          background:
            "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)",
        }}
      >
        {/* Decorative blobs */}
        <div
          className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-white/[0.07]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-16 right-14 h-16 w-16 rounded-full bg-white/[0.06]"
          aria-hidden
        />

        {/* Brand label (top center) */}
        <div
          className="absolute left-0 right-0 z-10 flex justify-center"
          style={{ top: "max(1rem, env(safe-area-inset-top))" }}
        >
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-1.5 backdrop-blur-sm">
            <ShieldCheckIcon className="h-3 w-3 text-white/90" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/90">
              Warga Digital
            </span>
          </div>
        </div>

        {/* Illustration */}
        <div className="relative z-10 flex h-full items-center justify-center pt-10">
          <TrustIllustration />
        </div>
      </div>

      {/* ── White content card ── */}
      <div
        className="relative -mt-6 flex flex-1 flex-col rounded-t-[2rem] bg-white px-6 pt-7 shadow-[0_-8px_40px_rgba(0,40,5,0.13)]"
        style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
      >
        {/* Text */}
        <div className="flex-1">
          <p
            className="text-[11px] font-bold uppercase tracking-[0.1em]"
            style={{ color: "var(--color-primary)" }}
          >
            Keamanan &amp; Kepercayaan
          </p>
          <h1 className="mt-1.5 text-2xl font-extrabold leading-tight text-app-title">
            Aman, Resmi, dan
            <br />
            Terverifikasi
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-app-body-muted">
            Akun terverifikasi, identitas jelas, domisili valid. Satu platform
            terintegrasi untuk administrasi, kas, usaha, dan seluruh kebutuhan
            warga RT 03.
          </p>
        </div>

        {/* Footer: indicators + CTA + login link */}
        <div className="flex shrink-0 flex-col gap-3 pt-5">
          <DotIndicators total={totalScreens} current={currentIndex} />

          <button
            type="button"
            onClick={handleMulai}
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold text-white transition-all hover:-translate-y-[1px] active:translate-y-0"
            style={{
              background: "var(--color-primary)",
              boxShadow: "0 8px 22px -12px var(--color-primary-shadow)",
            }}
          >
            Mulai Sekarang
            <ArrowRightIcon className="h-4 w-4" />
          </button>

          <p className="text-center text-sm text-app-body-muted">
            Sudah punya akun?{" "}
            <button
              type="button"
              onClick={handleLogin}
              className="font-semibold transition-opacity hover:opacity-70 active:opacity-50"
              style={{ color: "var(--color-primary)" }}
            >
              Masuk
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Illustration ── */

const TRUST_FEATURES = [
  { icon: ShieldCheckIcon, label: "Akun\nTerverifikasi" },
  { icon: LockClosedIcon, label: "Enkripsi\nData" },
  { icon: IdentificationIcon, label: "Identitas\nJelas" },
  { icon: MapPinIcon, label: "Domisili\nValid" },
] as const;

function TrustIllustration() {
  return (
    <div className="flex flex-col items-center gap-3">
      {/* Hero shield */}
      <div className="relative flex h-[60px] w-[60px] items-center justify-center rounded-[18px] bg-white/25 shadow-lg backdrop-blur-sm">
        <ShieldCheckIcon className="h-8 w-8 text-white" />
        {/* Verified badge */}
        <div className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm">
          <CheckBadgeIcon
            className="h-3.5 w-3.5"
            style={{ color: "var(--color-primary)" }}
          />
        </div>
      </div>

      {/* 2×2 feature grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {TRUST_FEATURES.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-2 rounded-2xl bg-white/20 px-5 py-3.5 backdrop-blur-sm"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-white/25">
              <Icon className="h-5 w-5 text-white" />
            </div>
            <span className="whitespace-pre-line text-center text-[10px] font-semibold leading-tight text-white/90">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
