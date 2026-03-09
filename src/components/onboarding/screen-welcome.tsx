"use client";

import { PageScreen, PrimaryButton, SecondaryButton, DotIndicators } from "@/components/ui";
import { OnboardingScreenProps, SkipButton } from "./onboarding-shared";

export function ScreenWelcome({
  onNext,
  onSkip,
  currentIndex,
  totalScreens,
}: OnboardingScreenProps) {
  return (
    <PageScreen
      header={<div className="w-full flex justify-start"><SkipButton onSkip={onSkip} /></div>}
      footer={
        <>
          <DotIndicators total={totalScreens} current={currentIndex} />
          <PrimaryButton onPress={onNext}>Berikutnya</PrimaryButton>
        </>
      }
    >
      <div className="flex shrink-0 items-center justify-center py-2">
        <WelcomeIllustration />
      </div>
      <div className="flex shrink-0 flex-col gap-2 pt-2">
        <h1 className="text-2xl font-bold leading-tight text-app-title">
          Selamat datang di <br /> Warga Digital <br /> Sawangan Regensi RT 03
        </h1>
        <p className="text-sm leading-relaxed text-app-body">
          Peran Anda sangat berarti dalam membangun rukun warga yang saling terhubung, produktif, dan berkembang bersama. Mari kita wujudkan lingkungan yang lebih baik, lebih solid, dan lebih sejahtera!
        </p>
      </div>
    </PageScreen>
  );
}

/* ─── SVG illustration: community / neighborhood motif ─── */

function WelcomeIllustration() {
  return (
    <svg
      viewBox="0 0 280 280"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-auto w-full max-w-[260px]"
    >
      {/* Background circle */}
      <circle cx="140" cy="140" r="130" fill="var(--color-surface-alt)" />

      {/* Recycling-style arrows forming a triangle */}
      <g opacity="0.15">
        <path
          d="M140 40 L220 180 L60 180 Z"
          stroke="#2E7D32"
          strokeWidth="3"
          fill="none"
        />
      </g>

      {/* Arrow 1 — top to right */}
      <path
        d="M150 55 C190 55, 220 100, 215 150"
        stroke="#4CAF50"
        strokeWidth="10"
        strokeLinecap="round"
        fill="none"
      />
      <polygon points="220,145 210,160 225,160" fill="#4CAF50" />

      {/* Arrow 2 — right to bottom-left */}
      <path
        d="M210 165 C195 200, 155 215, 110 200"
        stroke="#66BB6A"
        strokeWidth="10"
        strokeLinecap="round"
        fill="none"
      />
      <polygon points="115,205 105,192 100,208" fill="#66BB6A" />

      {/* Arrow 3 — bottom-left to top */}
      <path
        d="M100 190 C75 155, 85 105, 130 65"
        stroke="#81C784"
        strokeWidth="10"
        strokeLinecap="round"
        fill="none"
      />
      <polygon points="125,70 140,58 128,53" fill="#81C784" />

      {/* House icon in center */}
      <g transform="translate(108, 100)">
        <path d="M32 0 L0 28 L8 28 L8 52 L56 52 L56 28 L64 28 Z" fill="#2E7D32" />
        <rect x="24" y="32" width="16" height="20" rx="2" fill="#E8F5E9" />
        <rect x="12" y="22" width="10" height="8" rx="1" fill="#A5D6A7" />
        <rect x="42" y="22" width="10" height="8" rx="1" fill="#A5D6A7" />
      </g>

      {/* Small tree left */}
      <g transform="translate(55, 140)">
        <rect x="8" y="24" width="4" height="12" rx="2" fill="#795548" />
        <circle cx="10" cy="18" r="14" fill="#66BB6A" />
      </g>

      {/* Small tree right */}
      <g transform="translate(200, 130)">
        <rect x="7" y="22" width="4" height="10" rx="2" fill="#795548" />
        <circle cx="9" cy="16" r="12" fill="#81C784" />
      </g>

      {/* Sun */}
      <circle cx="215" cy="65" r="16" fill="#FDD835" />
      <circle cx="215" cy="65" r="10" fill="#FFEE58" />

      {/* Mountain/hills at bottom of circle */}
      <path
        d="M45 200 L100 145 L130 175 L170 130 L235 200"
        fill="#388E3C"
        opacity="0.3"
      />
      <path
        d="M45 200 L110 160 L140 185 L190 145 L235 200"
        fill="#4CAF50"
        opacity="0.25"
      />
    </svg>
  );
}
