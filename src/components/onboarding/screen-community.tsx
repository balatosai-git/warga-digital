"use client";

import {
  BellIcon,
  BuildingOffice2Icon,
  CurrencyDollarIcon,
  BriefcaseIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/solid";
import { DotIndicators } from "@/components/ui";
import { OnboardingScreenProps } from "./onboarding-shared";

export function ScreenCommunity({
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
          className="pointer-events-none absolute -left-10 -top-10 h-36 w-36 rounded-full bg-white/10"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-white/[0.07]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-16 left-10 h-16 w-16 rounded-full bg-white/[0.06]"
          aria-hidden
        />

        {/* Skip */}
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="absolute right-4 z-10 rounded-xl bg-white/20 px-3.5 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-sm transition hover:bg-white/30 active:scale-95"
            style={{ top: "max(1rem, env(safe-area-inset-top))" }}
          >
            Lewati
          </button>
        )}

        {/* Illustration */}
        <div className="relative z-10 flex h-full items-center justify-center pt-10">
          <CommunityIllustration />
        </div>
      </div>

      {/* ── White content card ── */}
      <div className="relative -mt-6 flex flex-1 flex-col rounded-t-[2rem] bg-white px-6 pt-7 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_40px_rgba(0,40,5,0.12)]">
        {/* Text */}
        <div className="flex-1">
          <p
            className="text-[11px] font-bold uppercase tracking-[0.1em]"
            style={{ color: "var(--color-primary)" }}
          >
            Fitur Unggulan
          </p>
          <h1 className="mt-1.5 text-2xl font-extrabold leading-tight text-app-title">
            Dari Warga,
            <br />
            Untuk Warga
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-app-body-muted">
            Informasi dan layanan ini sepenuhnya untuk warga. Transparan, aman,
            dan tanpa orientasi keuntungan. Mendorong produktivitas dan
            berkembang bersama.
          </p>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 flex-col gap-3.5 pt-4">
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

const FEATURES = [
  { icon: CurrencyDollarIcon, label: "Kas RT", desc: "Iuran & keuangan" },
  { icon: BellIcon, label: "Notifikasi", desc: "Info terkini" },
  { icon: BuildingOffice2Icon, label: "Organisasi", desc: "Data warga" },
  { icon: BriefcaseIcon, label: "Usaha", desc: "UMKM warga" },
];

function CommunityIllustration() {
  return (
    <div className="flex flex-col items-center gap-4">
      {/* Label chip */}
      <div className="flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 backdrop-blur-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
        <span className="text-[11px] font-bold uppercase tracking-widest text-white/90">
          Platform Warga
        </span>
        <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
      </div>

      {/* Feature grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {FEATURES.map(({ icon: Icon, label, desc }) => (
          <div
            key={label}
            className="flex items-center gap-2.5 rounded-2xl bg-white/18 px-3.5 py-3 backdrop-blur-sm"
            style={{ background: "rgba(255,255,255,0.18)" }}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-white/25">
              <Icon className="h-[18px] w-[18px] text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-bold leading-tight text-white">
                {label}
              </p>
              <p className="text-[10px] leading-tight text-white/65">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
