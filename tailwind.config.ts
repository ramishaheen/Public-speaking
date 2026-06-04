import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Etihad Speaking Room palette
        ink: "#05070a", // near-black background
        panel: "#0a0f14", // dark navy panel
        carbon: "#0e1620",
        steel: "#1a2430",
        neon: "#39ff88", // neon green
        neonDim: "#1faf5e",
        deepgreen: "#0c3a24",
        teal: "#34e0d6",
        gold: "#e7c873",
        mist: "#8aa0a8", // soft gray
      },
      fontFamily: {
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        neon: "0 0 0 1px rgba(57,255,136,0.35), 0 0 24px -6px rgba(57,255,136,0.55)",
        neonSoft: "0 0 18px -8px rgba(57,255,136,0.4)",
        glass: "0 8px 40px -12px rgba(0,0,0,0.6)",
      },
      keyframes: {
        blink: {
          "0%, 49%": { opacity: "1" },
          "50%, 100%": { opacity: "0" },
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 0 1px rgba(57,255,136,0.25), 0 0 14px -6px rgba(57,255,136,0.4)" },
          "50%": { boxShadow: "0 0 0 1px rgba(57,255,136,0.6), 0 0 28px -4px rgba(57,255,136,0.7)" },
        },
        flicker: {
          "0%, 100%": { opacity: "1" },
          "92%": { opacity: "1" },
          "94%": { opacity: "0.6" },
          "96%": { opacity: "1" },
        },
      },
      animation: {
        blink: "blink 1s steps(1) infinite",
        scan: "scan 6s linear infinite",
        fadeUp: "fadeUp 0.5s ease-out both",
        pulseGlow: "pulseGlow 2.4s ease-in-out infinite",
        flicker: "flicker 5s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
