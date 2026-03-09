/**
 * Theme definitions for app appearance.
 * Each theme provides values for CSS variables used across the app.
 */

export interface ThemeColors {
  primary: string;
  primaryHover: string;
  primaryMuted: string;
  surface: string;
  surfaceAlt: string;
  surfaceGradientStart: string;
  surfaceGradientMid: string;
  surfaceGradientEnd: string;
  title: string;
  body: string;
  bodyMuted: string;
  indicatorActive: string;
  indicatorInactive: string;
  /** Body/page background gradient */
  bgGradientStart: string;
  bgGradientEnd: string;
  /** Input border (neutral when not focused) */
  inputBorder: string;
  /** Primary button shadow (e.g. rgba for theme color) */
  primaryShadow: string;
}

export interface Theme {
  id: string;
  name: string;
  nameId: string;
  colors: ThemeColors;
}

const green: Theme = {
  id: "green",
  name: "Hijau",
  nameId: "Hijau",
  colors: {
    primary: "#43a047",
    primaryHover: "#2e7d32",
    primaryMuted: "#d5ead7",
    surface: "#ffffff",
    surfaceAlt: "#f2faf3",
    surfaceGradientStart: "#7bc67f",
    surfaceGradientMid: "#a2d8a5",
    surfaceGradientEnd: "#d5ead7",
    title: "#1f5d24",
    body: "#3f4b42",
    bodyMuted: "#6f7d72",
    indicatorActive: "#43a047",
    indicatorInactive: "#d5ead7",
    bgGradientStart: "#f8fdf9",
    bgGradientEnd: "#f3faf5",
    inputBorder: "#e5efe7",
    primaryShadow: "rgba(67,160,71,0.75)",
  },
};

const blue: Theme = {
  id: "blue",
  name: "Biru",
  nameId: "Biru",
  colors: {
    primary: "#1976d2",
    primaryHover: "#1565c0",
    primaryMuted: "#bbdefb",
    surface: "#ffffff",
    surfaceAlt: "#f5f9fc",
    surfaceGradientStart: "#64b5f6",
    surfaceGradientMid: "#90caf9",
    surfaceGradientEnd: "#bbdefb",
    title: "#0d47a1",
    body: "#37474f",
    bodyMuted: "#607d8b",
    indicatorActive: "#1976d2",
    indicatorInactive: "#bbdefb",
    bgGradientStart: "#f8fbfd",
    bgGradientEnd: "#f0f5fa",
    inputBorder: "#e3eef7",
    primaryShadow: "rgba(25,118,210,0.75)",
  },
};

const purple: Theme = {
  id: "purple",
  name: "Ungu",
  nameId: "Ungu",
  colors: {
    primary: "#7b1fa2",
    primaryHover: "#6a1b9a",
    primaryMuted: "#e1bee7",
    surface: "#ffffff",
    surfaceAlt: "#faf5fc",
    surfaceGradientStart: "#ba68c8",
    surfaceGradientMid: "#ce93d8",
    surfaceGradientEnd: "#e1bee7",
    title: "#4a148c",
    body: "#4a3f4d",
    bodyMuted: "#7b6d7f",
    indicatorActive: "#7b1fa2",
    indicatorInactive: "#e1bee7",
    bgGradientStart: "#faf8fb",
    bgGradientEnd: "#f5f0f8",
    inputBorder: "#eedef2",
    primaryShadow: "rgba(123,31,162,0.75)",
  },
};

const orange: Theme = {
  id: "orange",
  name: "Oranye",
  nameId: "Oranye",
  colors: {
    primary: "#e65100",
    primaryHover: "#bf360c",
    primaryMuted: "#ffe0b2",
    surface: "#ffffff",
    surfaceAlt: "#fff8f3",
    surfaceGradientStart: "#ff9800",
    surfaceGradientMid: "#ffb74d",
    surfaceGradientEnd: "#ffe0b2",
    title: "#e65100",
    body: "#4e4039",
    bodyMuted: "#7d6e65",
    indicatorActive: "#e65100",
    indicatorInactive: "#ffe0b2",
    bgGradientStart: "#fffaf5",
    bgGradientEnd: "#fff3eb",
    inputBorder: "#f5e6dc",
    primaryShadow: "rgba(230,81,0,0.75)",
  },
};

const teal: Theme = {
  id: "teal",
  name: "Teal",
  nameId: "Teal",
  colors: {
    primary: "#00897b",
    primaryHover: "#00695c",
    primaryMuted: "#b2dfdb",
    surface: "#ffffff",
    surfaceAlt: "#f2faf9",
    surfaceGradientStart: "#26a69a",
    surfaceGradientMid: "#4db6ac",
    surfaceGradientEnd: "#b2dfdb",
    title: "#004d40",
    body: "#3d4f4c",
    bodyMuted: "#6d7e7b",
    indicatorActive: "#00897b",
    indicatorInactive: "#b2dfdb",
    bgGradientStart: "#f5fbfa",
    bgGradientEnd: "#eef8f6",
    inputBorder: "#dcece9",
    primaryShadow: "rgba(0,137,123,0.75)",
  },
};

const rose: Theme = {
  id: "rose",
  name: "Merah Muda",
  nameId: "Merah Muda",
  colors: {
    primary: "#c2185b",
    primaryHover: "#ad1457",
    primaryMuted: "#f8bbd9",
    surface: "#ffffff",
    surfaceAlt: "#fef5f9",
    surfaceGradientStart: "#ec407a",
    surfaceGradientMid: "#f06292",
    surfaceGradientEnd: "#f8bbd9",
    title: "#880e4f",
    body: "#4a3d42",
    bodyMuted: "#7d6d72",
    indicatorActive: "#c2185b",
    indicatorInactive: "#f8bbd9",
    bgGradientStart: "#fef8fa",
    bgGradientEnd: "#fdf0f5",
    inputBorder: "#f5dce6",
    primaryShadow: "rgba(194,24,91,0.75)",
  },
};

export const THEMES: Theme[] = [green, blue, purple, orange, teal, rose];

export const DEFAULT_THEME_ID = "green";

export function getTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]!;
}
