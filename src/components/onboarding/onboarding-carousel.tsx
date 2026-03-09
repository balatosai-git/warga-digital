"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { ScreenWelcome } from "./screen-welcome";
import { ScreenCommunity } from "./screen-community";
import { ScreenTrust } from "./screen-trust";

const SCREENS = [
  { id: 0, Component: ScreenWelcome },
  { id: 1, Component: ScreenCommunity },
  { id: 2, Component: ScreenTrust },
];

export function OnboardingCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const router = useRouter();
  const setCompleted = useOnboardingStore((s) => s.setCompleted);

  const goNext = useCallback(() => {
    setCurrentIndex((i) =>
      i < SCREENS.length - 1 ? i + 1 : i
    );
  }, []);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => (i > 0 ? i - 1 : i));
  }, []);

  const handleSkip = useCallback(() => {
    setCompleted(true);
    router.replace("/auth/register");
  }, [setCompleted, router]);

  const slideWidthPercent = 100 / SCREENS.length;

  return (
    <div className="relative h-full w-full min-h-0 overflow-hidden">
      <motion.div
        className="flex h-full shrink-0"
        style={{
          width: `${SCREENS.length * 100}%`,
        }}
        animate={{ x: `-${currentIndex * slideWidthPercent}%` }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 40,
        }}
      >
        {SCREENS.map(({ id, Component }) => (
          <div
            key={id}
            className="flex h-full flex-shrink-0 items-stretch"
            style={{
              width: `${slideWidthPercent}%`,
              minWidth: 0,
            }}
          >
            <Component
              onNext={goNext}
              onPrev={goPrev}
              onSkip={handleSkip}
              currentIndex={currentIndex}
              totalScreens={SCREENS.length}
            />
          </div>
        ))}
      </motion.div>
    </div>
  );
}
