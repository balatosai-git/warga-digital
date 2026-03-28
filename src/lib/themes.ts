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

const hitam: Theme = {
  id: "hitam",
  name: "Hitam",
  nameId: "Hitam",
  colors: {
    primary: "#1c1c1e",
    primaryHover: "#3a3a3c",
    primaryMuted: "#f0f0f2",
    surface: "#ffffff",
    surfaceAlt: "#f7f7f7",
    surfaceGradientStart: "#4a4a4c",
    surfaceGradientMid: "#2e2e30",
    surfaceGradientEnd: "#f0f0f2",
    title: "#2c2c2e",
    body: "#5a5a5c",
    bodyMuted: "#8e8e93",
    indicatorActive: "#1c1c1e",
    indicatorInactive: "#e5e5e7",
    bgGradientStart: "#fafafa",
    bgGradientEnd: "#f5f5f5",
    inputBorder: "#e0e0e2",
    primaryShadow: "rgba(28,28,30,0.35)",
  },
};

/* ─── NEW THEMES: Expanded color spectrum ─────────────────────────────── */

const red: Theme = {
  id: "red",
  name: "Merah",
  nameId: "Merah",
  colors: {
    primary: "#d32f2f",
    primaryHover: "#b71c1c",
    primaryMuted: "#ffcdd2",
    surface: "#ffffff",
    surfaceAlt: "#ffebee",
    surfaceGradientStart: "#ef5350",
    surfaceGradientMid: "#f44336",
    surfaceGradientEnd: "#ffcdd2",
    title: "#b71c1c",
    body: "#4a2c2c",
    bodyMuted: "#7d5c5c",
    indicatorActive: "#d32f2f",
    indicatorInactive: "#ffcdd2",
    bgGradientStart: "#fffbfb",
    bgGradientEnd: "#fff5f5",
    inputBorder: "#f5d9da",
    primaryShadow: "rgba(211,47,47,0.75)",
  },
};

const amber: Theme = {
  id: "amber",
  name: "Kuning Emas",
  nameId: "Kuning Emas",
  colors: {
    primary: "#f57f17",
    primaryHover: "#e65100",
    primaryMuted: "#ffe082",
    surface: "#ffffff",
    surfaceAlt: "#fffde7",
    surfaceGradientStart: "#fbc02d",
    surfaceGradientMid: "#fdd835",
    surfaceGradientEnd: "#ffe082",
    title: "#f57f17",
    body: "#4d4319",
    bodyMuted: "#7d7243",
    indicatorActive: "#f57f17",
    indicatorInactive: "#ffe082",
    bgGradientStart: "#fffef5",
    bgGradientEnd: "#fffbf0",
    inputBorder: "#f5e8d5",
    primaryShadow: "rgba(245,127,23,0.75)",
  },
};

const cyan: Theme = {
  id: "cyan",
  name: "Sian",
  nameId: "Sian",
  colors: {
    primary: "#0097a7",
    primaryHover: "#006064",
    primaryMuted: "#b3e5fc",
    surface: "#ffffff",
    surfaceAlt: "#f0f7fa",
    surfaceGradientStart: "#26c6da",
    surfaceGradientMid: "#4dd0e1",
    surfaceGradientEnd: "#b3e5fc",
    title: "#00546b",
    body: "#36525b",
    bodyMuted: "#667d86",
    indicatorActive: "#0097a7",
    indicatorInactive: "#b3e5fc",
    bgGradientStart: "#f5fbfd",
    bgGradientEnd: "#eef6f9",
    inputBorder: "#d9eef3",
    primaryShadow: "rgba(0,151,167,0.75)",
  },
};

const indigo: Theme = {
  id: "indigo",
  name: "Indigo",
  nameId: "Indigo",
  colors: {
    primary: "#303f9f",
    primaryHover: "#1a237e",
    primaryMuted: "#c5cae9",
    surface: "#ffffff",
    surfaceAlt: "#f3f5fb",
    surfaceGradientStart: "#5c6bc0",
    surfaceGradientMid: "#7986cb",
    surfaceGradientEnd: "#c5cae9",
    title: "#1a237e",
    body: "#3f3d4f",
    bodyMuted: "#6b6d7f",
    indicatorActive: "#303f9f",
    indicatorInactive: "#c5cae9",
    bgGradientStart: "#f7f8fc",
    bgGradientEnd: "#f1f2f9",
    inputBorder: "#dfe1ed",
    primaryShadow: "rgba(48,63,159,0.75)",
  },
};

const lime: Theme = {
  id: "lime",
  name: "Jeruk Lemon",
  nameId: "Jeruk Lemon",
  colors: {
    primary: "#9ccc65",
    primaryHover: "#7cb342",
    primaryMuted: "#dcedc8",
    surface: "#ffffff",
    surfaceAlt: "#f9fbf5",
    surfaceGradientStart: "#aed581",
    surfaceGradientMid: "#c5e1a5",
    surfaceGradientEnd: "#dcedc8",
    title: "#558b2f",
    body: "#444933",
    bodyMuted: "#6d7962",
    indicatorActive: "#9ccc65",
    indicatorInactive: "#dcedc8",
    bgGradientStart: "#fcfdf8",
    bgGradientEnd: "#faf9f3",
    inputBorder: "#f0f2e4",
    primaryShadow: "rgba(156,204,101,0.75)",
  },
};

const brown: Theme = {
  id: "brown",
  name: "Coklat",
  nameId: "Coklat",
  colors: {
    primary: "#6d4c41",
    primaryHover: "#4e342e",
    primaryMuted: "#d7ccc8",
    surface: "#ffffff",
    surfaceAlt: "#faf9f7",
    surfaceGradientStart: "#8d6e63",
    surfaceGradientMid: "#a1887f",
    surfaceGradientEnd: "#d7ccc8",
    title: "#3e2723",
    body: "#4a3f38",
    bodyMuted: "#76695e",
    indicatorActive: "#6d4c41",
    indicatorInactive: "#d7ccc8",
    bgGradientStart: "#fcfbf9",
    bgGradientEnd: "#faf7f5",
    inputBorder: "#f0ebe5",
    primaryShadow: "rgba(109,76,65,0.75)",
  },
};

const deepGreen: Theme = {
  id: "deep-green",
  name: "Hijau Gelap",
  nameId: "Hijau Gelap",
  colors: {
    primary: "#1b5e20",
    primaryHover: "#0d3817",
    primaryMuted: "#c8e6c9",
    surface: "#ffffff",
    surfaceAlt: "#f1f8f5",
    surfaceGradientStart: "#388e3c",
    surfaceGradientMid: "#66bb6a",
    surfaceGradientEnd: "#c8e6c9",
    title: "#0d3817",
    body: "#354e3f",
    bodyMuted: "#657975",
    indicatorActive: "#1b5e20",
    indicatorInactive: "#c8e6c9",
    bgGradientStart: "#f6faf8",
    bgGradientEnd: "#f0f5f2",
    inputBorder: "#e0ede9",
    primaryShadow: "rgba(27,94,32,0.75)",
  },
};

const coral: Theme = {
  id: "coral",
  name: "Karang",
  nameId: "Karang",
  colors: {
    primary: "#ff6f60",
    primaryHover: "#ff5252",
    primaryMuted: "#ffcccc",
    surface: "#ffffff",
    surfaceAlt: "#fff5f3",
    surfaceGradientStart: "#ff8a80",
    surfaceGradientMid: "#ff9e80",
    surfaceGradientEnd: "#ffcccc",
    title: "#d32f2f",
    body: "#4a3734",
    bodyMuted: "#7d6962",
    indicatorActive: "#ff6f60",
    indicatorInactive: "#ffcccc",
    bgGradientStart: "#fffcfb",
    bgGradientEnd: "#fff7f5",
    inputBorder: "#f5dcd9",
    primaryShadow: "rgba(255,111,96,0.75)",
  },
};

export const THEMES: Theme[] = [
  green,
  blue,
  purple,
  orange,
  teal,
  rose,
  hitam,
  red,
  amber,
  cyan,
  indigo,
  lime,
  brown,
  deepGreen,
  coral,
];

export const DEFAULT_THEME_ID = "green";

export function getTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]!;
}
