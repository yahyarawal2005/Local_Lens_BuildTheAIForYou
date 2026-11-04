import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#E85028",
          dark: "#CF3E18",
          light: "#FA7252",
          soft: "#FDF0ED",
        },
        secondary: {
          DEFAULT: "#5A7363",
          dark: "#4B6454",
          light: "#728D7C",
          soft: "#EBF1ED",
        },
        tertiary: {
          DEFAULT: "#D4A373",
          dark: "#B88959",
          light: "#E4BE97",
          soft: "#F7EFE6",
        },
        canvas: {
          DEFAULT: "#FAF9F6",
          dark: "#0F172A",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          cream: "#FAF9F6",
          peach: "#F7E2D5",
          muted: "#F5F4F0",
          card: "#FFFFFF",
          dark: "#1E293B",
          darker: "#0F172A",
        },
        ink: {
          DEFAULT: "#1A1A1A",
          secondary: "#6E6D7A",
          muted: "#8A8998",
          light: "#FAF9F6",
        },
        outline: {
          subtle: "#EAE8E3",
          hairline: "#F0EEE9",
          dark: "#334155",
        },
        status: {
          success: "#5A7363",
          warning: "#D4A373",
          error: "#BA1A1A",
        },
      },
      fontFamily: {
        display: ["'Plus Jakarta Sans'", "'Outfit'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        sans: ["'Plus Jakarta Sans'", "'Inter'", "sans-serif"],
      },
      boxShadow: {
        soft: "0 8px 30px rgba(26, 26, 26, 0.05)",
        floating: "0 12px 36px rgba(26, 26, 26, 0.08)",
        nav: "0 -4px 24px rgba(26, 26, 26, 0.04)",
      },
      borderRadius: {
        card: "20px",
        sheet: "28px",
      },
    },
  },
  plugins: [],
};

export default config;
