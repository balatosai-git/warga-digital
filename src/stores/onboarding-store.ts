import { create } from "zustand";
import { persist } from "zustand/middleware";

interface OnboardingState {
  completed: boolean;
  setCompleted: (completed: boolean) => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      completed: false,
      setCompleted: (completed) => set({ completed }),
    }),
    { name: "warga-onboarding" }
  )
);
