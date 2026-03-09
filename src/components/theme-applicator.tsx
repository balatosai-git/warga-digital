"use client";

import { useEffect } from "react";
import { applyThemeToDocument } from "@/stores/appearance-store";
import { useAppearanceStore } from "@/stores/appearance-store";

const STORAGE_KEY = "warga-digital-appearance";

/** Applies saved theme on mount and when themeId changes. Reads localStorage early to avoid flash. */
export function ThemeApplicator() {
  const themeId = useAppearanceStore((s) => s.themeId);

  useEffect(() => {
    applyThemeToDocument(themeId);
  }, [themeId]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as { state?: { themeId?: string } };
      const id = data?.state?.themeId;
      if (id) applyThemeToDocument(id);
    } catch {
      // ignore
    }
  }, []);

  return null;
}
