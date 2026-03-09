import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PendingPinUser {
  userId: string;
  fullName: string;
  /** Set after register; used by add-family and set-pin (PIN propagation). */
  houseId?: string;
  blokRumah?: string;
}

interface PendingPinState {
  pending: PendingPinUser | null;
  setPending: (data: PendingPinUser | null) => void;
  clearPending: () => void;
}

export const usePendingPinStore = create<PendingPinState>()(
  persist(
    (set) => ({
      pending: null,
      setPending: (pending) => set({ pending }),
      clearPending: () => set({ pending: null }),
    }),
    { name: "warga-pending-pin" }
  )
);
