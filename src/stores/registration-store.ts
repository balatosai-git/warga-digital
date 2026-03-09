import { create } from "zustand";
import { persist } from "zustand/middleware";

interface RegistrationPending {
  userId: string;
  waNumber: string;
}

interface RegistrationState {
  pending: RegistrationPending | null;
  setPending: (data: RegistrationPending | null) => void;
  clearPending: () => void;
}

export const useRegistrationStore = create<RegistrationState>()(
  persist(
    (set) => ({
      pending: null,
      setPending: (pending) => set({ pending }),
      clearPending: () => set({ pending: null }),
    }),
    { name: "warga-registration-pending" }
  )
);
