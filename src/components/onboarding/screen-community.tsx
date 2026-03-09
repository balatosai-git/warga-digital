"use client";

import { PageScreen, PrimaryButton, DotIndicators } from "@/components/ui";
import { OnboardingScreenProps, SkipButton } from "./onboarding-shared";

export function ScreenCommunity({
  onNext,
  onSkip,
  currentIndex,
  totalScreens,
}: OnboardingScreenProps) {
  return (
    <PageScreen
      header={<div className="w-full flex justify-end"><SkipButton onSkip={onSkip} /></div>}
      footer={
        <>
          <DotIndicators total={totalScreens} current={currentIndex} />
          <PrimaryButton onPress={onNext}>Berikutnya</PrimaryButton>
        </>
      }
    >
      <div className="flex shrink-0 items-center justify-center py-2">
        <CommunityIllustration />
      </div>
      <div className="flex shrink-0 flex-col gap-2 pt-2">
        <h1 className="text-2xl font-bold leading-tight text-app-title">
          Dari Warga, Untuk Warga
        </h1>
        <p className="text-sm leading-relaxed text-app-body">
          Informasi dan layanan ini sepenuhnya untuk warga. Transparan, aman, dan tanpa orientasi keuntungan. Guna mendorong produktivitas dan berkembang bersama.
        </p>
      </div>
    </PageScreen>
  );
}

/* ─── SVG illustration: community profile / avatar circle ─── */

function CommunityIllustration() {
  return (
    <svg
      viewBox="0 0 260 260"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-auto w-full max-w-[240px]"
    >
      {/* Outer ring */}
      <circle
        cx="130"
        cy="130"
        r="120"
        stroke="#4CAF50"
        strokeWidth="6"
        fill="none"
      />
      {/* Inner ring */}
      <circle
        cx="130"
        cy="130"
        r="105"
        stroke="#C8E6C9"
        strokeWidth="2"
        fill="#F1F8E9"
      />

      {/* Central person silhouette (large) */}
      <circle cx="130" cy="95" r="28" fill="#4CAF50" />
      <path
        d="M90 165 C90 135, 170 135, 170 165 L170 175 C170 178, 167 180, 164 180 L96 180 C93 180, 90 178, 90 175 Z"
        fill="#4CAF50"
      />

      {/* Left smaller person */}
      <g opacity="0.5">
        <circle cx="65" cy="155" r="14" fill="#66BB6A" />
        <path
          d="M45 195 C45 180, 85 180, 85 195 L85 200 C85 202, 83 204, 81 204 L49 204 C47 204, 45 202, 45 200 Z"
          fill="#66BB6A"
        />
      </g>

      {/* Right smaller person */}
      <g opacity="0.5">
        <circle cx="195" cy="155" r="14" fill="#66BB6A" />
        <path
          d="M175 195 C175 180, 215 180, 215 195 L215 200 C215 202, 213 204, 211 204 L179 204 C177 204, 175 202, 175 200 Z"
          fill="#66BB6A"
        />
      </g>

      {/* Leaf accent top-right */}
      <g transform="translate(185, 40) rotate(30)">
        <path
          d="M0 20 C0 0, 30 0, 30 20 C30 35, 15 40, 0 20Z"
          fill="#81C784"
        />
        <line
          x1="5"
          y1="20"
          x2="25"
          y2="10"
          stroke="#4CAF50"
          strokeWidth="1.5"
        />
      </g>

      {/* Leaf accent bottom-left */}
      <g transform="translate(30, 190) rotate(-20)">
        <path
          d="M0 15 C0 0, 22 0, 22 15 C22 26, 11 30, 0 15Z"
          fill="#A5D6A7"
        />
        <line
          x1="4"
          y1="15"
          x2="18"
          y2="8"
          stroke="#66BB6A"
          strokeWidth="1"
        />
      </g>

      {/* Connection dots */}
      <circle cx="85" cy="130" r="3" fill="#4CAF50" opacity="0.4" />
      <circle cx="175" cy="130" r="3" fill="#4CAF50" opacity="0.4" />
      <line
        x1="88"
        y1="130"
        x2="172"
        y2="130"
        stroke="#4CAF50"
        strokeWidth="1"
        strokeDasharray="4 3"
        opacity="0.3"
      />
    </svg>
  );
}
