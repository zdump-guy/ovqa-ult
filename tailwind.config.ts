import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        oled: {
          black: "#000000",
          card: "#0a0a0a",
          surface: "#111111",
          elevated: "#171717",
          border: "#262626",
          borderLight: "#333333",
          white: "#ffffff",
          muted: "#888888",
        },
        brand: {
          50: "#f5f5f5",
          100: "#e5e5e5",
          200: "#cccccc",
          300: "#a3a3a3",
          400: "#737373",
          500: "#ffffff",
          600: "#ffffff",
          700: "#e5e5e5",
          800: "#262626",
          900: "#0a0a0a",
        },
        success: {
          50: "#111111",
          100: "#222222",
          500: "#ffffff",
          600: "#ffffff",
          700: "#e5e5e5",
        },
        danger: {
          50: "#111111",
          100: "#222222",
          500: "#ffffff",
          600: "#ffffff",
          700: "#e5e5e5",
        },
        warning: {
          50: "#111111",
          100: "#222222",
          500: "#ffffff",
          600: "#ffffff",
          700: "#e5e5e5",
        },
      },
      keyframes: {
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%, 60%": { transform: "translateX(-6px)" },
          "40%, 80%": { transform: "translateX(6px)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "1", filter: "drop-shadow(0 0 12px rgba(255, 255, 255, 0.5))" },
          "50%": { opacity: "0.6", filter: "drop-shadow(0 0 4px rgba(255, 255, 255, 0.2))" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        shake: "shake 0.4s ease-in-out",
        "pulse-glow": "pulseGlow 1s ease-in-out infinite",
        float: "float 3s ease-in-out infinite",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};

export default config;

