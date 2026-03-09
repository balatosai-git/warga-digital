"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getTheme, type Theme } from "@/lib/themes";

const STORAGE_KEY = "warga-digital-appearance";

/** Apply a theme by id to document (CSS variables). Safe to call on server (no-op). */
export function applyThemeToDocument(themeId: string): void {
  if (typeof document === "undefined") return;
  const theme = getTheme(themeId);
  const { colors } = theme;
  const root = document.documentElement;
  root.style.setProperty("--color-primary", colors.primary);
  root.style.setProperty("--color-primary-hover", colors.primaryHover);
  root.style.setProperty("--color-primary-muted", colors.primaryMuted);
  root.style.setProperty("--color-surface", colors.surface);
  root.style.setProperty("--color-surface-alt", colors.surfaceAlt);
  root.style.setProperty("--color-surface-gradient-start", colors.surfaceGradientStart);
  root.style.setProperty("--color-surface-gradient-mid", colors.surfaceGradientMid);
  root.style.setProperty("--color-surface-gradient-end", colors.surfaceGradientEnd);
  root.style.setProperty("--color-title", colors.title);
  root.style.setProperty("--color-body", colors.body);
  root.style.setProperty("--color-body-muted", colors.bodyMuted);
  root.style.setProperty("--color-indicator-active", colors.indicatorActive);
  root.style.setProperty("--color-indicator-inactive", colors.indicatorInactive);
  root.style.setProperty("--color-bg-gradient-start", colors.bgGradientStart);
  root.style.setProperty("--color-bg-gradient-end", colors.bgGradientEnd);
  root.style.setProperty("--color-input-border", colors.inputBorder);
  root.style.setProperty("--color-primary-shadow", colors.primaryShadow);
}

export interface AppearanceState {
  themeId: string;
  setThemeId: (id: string) => void;
  /** Current theme object (derived from themeId) */
  theme: Theme;
  /** Apply current theme to document. Call on mount and when themeId changes. */
  applyTheme: () => void;
}

export const useAppearanceStore = create<AppearanceState>()(
  persist(
    (set, get) => ({
      themeId: "green",
      theme: getTheme("green"),
      setThemeId: (id: string) => {
        const theme = getTheme(id);
        set({ themeId: id, theme });
        applyThemeToDocument(id);
      },
      applyTheme: () => applyThemeToDocument(get().themeId),
    }),
    {
      name: STORAGE_KEY,
      partialize: (s) => ({ themeId: s.themeId }),
      onRehydrateStorage: () => (state) => {
        if (state?.themeId) {
          state.theme = getTheme(state.themeId);
          applyThemeToDocument(state.themeId);
        }
      },
    }
  )
);
