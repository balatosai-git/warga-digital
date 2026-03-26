"use client";

import { SparklesIcon, UserCircleIcon, UserGroupIcon } from "@heroicons/react/24/solid";
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

function CommunityIllustration() {
  return (
    <div className="relative h-[240px] w-full max-w-[240px] rounded-full border-[6px] border-emerald-500 bg-emerald-50">
      <div className="absolute inset-[14px] rounded-full border-2 border-emerald-200" />
      <UserCircleIcon className="absolute left-1/2 top-[58px] h-16 w-16 -translate-x-1/2 text-emerald-600" />
      <UserGroupIcon className="absolute bottom-[42px] left-1/2 h-16 w-16 -translate-x-1/2 text-emerald-500/70" />
      <UserCircleIcon className="absolute bottom-[56px] left-[38px] h-10 w-10 text-emerald-500/50" />
      <UserCircleIcon className="absolute bottom-[56px] right-[38px] h-10 w-10 text-emerald-500/50" />
      <SparklesIcon className="absolute right-[20px] top-[20px] h-8 w-8 rotate-[28deg] text-emerald-400/80" />
      <SparklesIcon className="absolute bottom-[20px] left-[20px] h-7 w-7 -rotate-[24deg] text-emerald-300" />
    </div>
  );
}
