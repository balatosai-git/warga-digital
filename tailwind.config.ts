import type { Config } from "tailwindcss";
import { nextui } from "@nextui-org/theme";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* App design system – use these for consistent UI */
        app: {
          primary: "var(--color-primary)",
          "primary-hover": "var(--color-primary-hover)",
          "primary-muted": "var(--color-primary-muted)",
          surface: "var(--color-surface)",
          "surface-alt": "var(--color-surface-alt)",
          title: "var(--color-title)",
          body: "var(--color-body)",
          "body-muted": "var(--color-body-muted)",
          "indicator-active": "var(--color-indicator-active)",
          "indicator-inactive": "var(--color-indicator-inactive)",
        },
      },
    },
  },
  darkMode: "class",
  plugins: [nextui()],
};

export default config;
