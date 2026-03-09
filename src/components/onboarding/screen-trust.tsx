"use client";

import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { PageScreen, PrimaryButton, DotIndicators } from "@/components/ui";
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

  return (
    <PageScreen
      header={
        <span className="w-full text-center text-sm font-semibold tracking-wide text-app-primary">
          Warga Digital
        </span>
      }
      footer={
        <>
          <DotIndicators total={totalScreens} current={currentIndex} />
          <PrimaryButton onPress={handleMulai}>Mulai sekarang</PrimaryButton>
        </>
      }
    >
      <div className="flex shrink-0 items-center justify-center py-2">
        <TrustIllustration />
      </div>
      <div className="flex shrink-0 flex-col gap-2 pt-2">
        <h1 className="text-2xl font-bold leading-tight text-app-title">
          Aman, Resmi, dan Terverifikasi
        </h1>
        <p className="text-sm leading-relaxed text-app-body">
          Akun terverifikasi. Identitas jelas. Domisili valid. Tanpa anonim. Tanpa kepalsuan. Tanpa kebocoran. Satu platform untuk administrasi resmi, kebutuhan warga, jasa, acara, donasi, dan informasi terintegrasi.
        </p>
      </div>
    </PageScreen>
  );
}

/* ─── SVG illustration: progress / trust bars ─── */

function TrustIllustration() {
  return (
    <svg
      viewBox="0 0 240 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-auto w-full max-w-[220px]"
    >
      {/* Checkmark circle */}
      <circle cx="195" cy="28" r="18" fill="#4CAF50" />
      <path
        d="M186 28 L192 34 L206 22"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Bar 1 — 100% filled */}
      <g transform="translate(10, 55) rotate(-3)">
        <rect
          x="0"
          y="0"
          width="210"
          height="28"
          rx="14"
          fill="#E8F5E9"
        />
        <rect
          x="0"
          y="0"
          width="210"
          height="28"
          rx="14"
          fill="#4CAF50"
        />
      </g>

      {/* Bar 2 — 60% filled */}
      <g transform="translate(15, 100) rotate(-2)">
        <rect
          x="0"
          y="0"
          width="210"
          height="28"
          rx="14"
          fill="#E8F5E9"
        />
        <rect
          x="0"
          y="0"
          width="126"
          height="28"
          rx="14"
          fill="#66BB6A"
        />
        <text
          x="180"
          y="19"
          fontSize="13"
          fontWeight="600"
          fill="#4CAF50"
        >
          60%
        </text>
      </g>

      {/* Bar 3 — ~5% filled */}
      <g transform="translate(20, 145) rotate(-1)">
        <rect
          x="0"
          y="0"
          width="210"
          height="28"
          rx="14"
          fill="#E8F5E9"
        />
        <rect
          x="0"
          y="0"
          width="15"
          height="28"
          rx="14"
          fill="#A5D6A7"
        />
        <text
          x="185"
          y="19"
          fontSize="13"
          fontWeight="600"
          fill="#A5D6A7"
        >
          0%
        </text>
      </g>
    </svg>
  );
}
