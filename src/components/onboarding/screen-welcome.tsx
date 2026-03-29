"use client";

import {
  HomeModernIcon,
  UserGroupIcon,
  SparklesIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/solid";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { DotIndicators } from "@/components/ui";
import { OnboardingScreenProps } from "./onboarding-shared";

export function ScreenWelcome({
  onNext,
  onSkip,
  currentIndex,
  totalScreens,
}: OnboardingScreenProps) {
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
          className="pointer-events-none absolute bottom-16 right-10 h-20 w-20 rounded-full bg-white/[0.06]"
          aria-hidden
        />

        {/* Skip button */}
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="absolute right-4 top-4 z-10 rounded-xl bg-white/20 px-3.5 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-sm transition hover:bg-white/30 active:scale-95"
          >
            Lewati
          </button>
        )}

        {/* Illustration */}
        <div className="relative z-10 flex h-full items-center justify-center pt-8">
          <WelcomeIllustration />
        </div>
      </div>

      {/* ── White content card ── */}
      <div className="relative -mt-6 flex flex-1 flex-col rounded-t-[2rem] bg-white px-6 pt-7 pb-6 shadow-[0_-8px_40px_rgba(0,40,5,0.14)]">
        {/* Drag handle hint */}
        <div className="absolute left-1/2 top-3 h-1 w-10 -translate-x-1/2 rounded-full bg-gray-200" />

        {/* Text content */}
        <div className="flex-1">
          <p
            className="text-[11px] font-bold uppercase tracking-[0.1em]"
            style={{ color: "var(--color-primary)" }}
          >
            Sawangan Regensi · RT 03
          </p>
          <h1 className="mt-2 text-[26px] font-extrabold leading-tight text-app-title">
            Selamat datang di{" "}
            <span style={{ color: "var(--color-primary)" }}>Warga Digital</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-app-body-muted">
            Platform resmi warga yang menghubungkan, memperlancar administrasi,
            dan membangun lingkungan yang lebih solid bersama.
          </p>
        </div>

        {/* Footer */}
        <div className="mt-5 flex shrink-0 flex-col gap-3.5">
          <DotIndicators total={totalScreens} current={currentIndex} />
          <button
            type="button"
            onClick={onNext}
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold text-white transition-all hover:-translate-y-[1px] active:translate-y-0"
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
    </div>
  );
}

function WelcomeIllustration() {
  return (
    <div className="relative h-[180px] w-[220px]">
      {/* Connection lines (SVG) */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 220 180"
        fill="none"
        aria-hidden
      >
        <line
          x1="52"
          y1="42"
          x2="98"
          y2="84"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="1.5"
          strokeDasharray="5 4"
        />
        <line
          x1="168"
          y1="42"
          x2="122"
          y2="84"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="1.5"
          strokeDasharray="5 4"
        />
        <line
          x1="168"
          y1="140"
          x2="122"
          y2="108"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="1.5"
          strokeDasharray="5 4"
        />
        <line
          x1="52"
          y1="140"
          x2="98"
          y2="108"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="1.5"
          strokeDasharray="5 4"
        />
      </svg>

      {/* Centre: Home */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-[72px] w-[72px] items-center justify-center rounded-[22px] bg-white/30 shadow-lg backdrop-blur-sm">
        <HomeModernIcon className="h-9 w-9 text-white" />
      </div>

      {/* Top-left: Community */}
      <div className="absolute left-2 top-4 flex h-[46px] w-[46px] items-center justify-center rounded-[14px] bg-white/20 backdrop-blur-sm">
        <UserGroupIcon className="h-[22px] w-[22px] text-white/90" />
      </div>

      {/* Top-right: Sparkles */}
      <div className="absolute right-2 top-4 flex h-[46px] w-[46px] items-center justify-center rounded-[14px] bg-white/20 backdrop-blur-sm">
        <SparklesIcon className="h-[22px] w-[22px] text-white/90" />
      </div>

      {/* Bottom-right: Shield */}
      <div className="absolute bottom-4 right-2 flex h-[46px] w-[46px] items-center justify-center rounded-[14px] bg-white/20 backdrop-blur-sm">
        <ShieldCheckIcon className="h-[22px] w-[22px] text-white/90" />
      </div>

      {/* Bottom-left: Users */}
      <div className="absolute bottom-4 left-2 flex h-[46px] w-[46px] items-center justify-center rounded-[14px] bg-white/15 backdrop-blur-sm">
        <UserGroupIcon className="h-[20px] w-[20px] text-white/80" />
      </div>

      {/* Floating accent dots */}
      <div className="absolute right-14 top-1 h-2 w-2 rounded-full bg-white/35" />
      <div className="absolute left-16 bottom-1 h-1.5 w-1.5 rounded-full bg-white/25" />
      <div className="absolute right-0 top-20 h-1.5 w-1.5 rounded-full bg-white/20" />
    </div>
  );
}
