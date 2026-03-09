import { create } from "zustand";
import { persist } from "zustand/middleware";
import { clearHeaderProfileCookie } from "@/lib/header-profile-cookie";

interface UserInfo {
  id: string;
  fullName: string;
}

interface AuthState {
  user: UserInfo | null;
  isAuthenticated: boolean;
  setUser: (user: UserInfo | null) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      clearUser: () => {
        clearHeaderProfileCookie();
        set({ user: null, isAuthenticated: false });
      },
    }),
    { name: "warga-auth" }
  )
);
