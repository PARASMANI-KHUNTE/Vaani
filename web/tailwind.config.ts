import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        shell: "#f5f1e8",
        sand: "#eadfcb",
        ember: "#b45309",
        lagoon: "#155e75",
        cream: "#fdf8f3",
        parchment: "#faf5eb",
        sepia: "#8b7355",
        terracotta: "#c2703a",
        copper: "#b87333",
        gold: "#d4a853",
        jade: "#2d8a6e",
        teal: "#0d9488",
      },
      fontFamily: {
        sans: ["DM Sans", "Segoe UI", "sans-serif"],
        display: ["Fraunces", "Georgia", "serif"],
      },
      boxShadow: {
        panel: "0 22px 80px rgba(15, 23, 42, 0.12), 0 8px 32px rgba(15, 23, 42, 0.08)",
        "panel-hover": "0 28px 90px rgba(110, 78, 36, 0.18), 0 12px 40px rgba(15, 23, 42, 0.12)",
        float: "0 28px 90px rgba(110, 78, 36, 0.16)",
        soft: "0 12px 40px rgba(15, 23, 42, 0.08)",
        "soft-lg": "0 20px 60px rgba(15, 23, 42, 0.12)",
        glow: "0 0 40px rgba(180, 83, 9, 0.15)",
        "inner-soft": "inset 0 2px 8px rgba(15, 23, 42, 0.06)",
      },
      backgroundImage: {
        "paper-grid":
          "radial-gradient(circle at 1px 1px, rgba(15,23,42,0.06) 1px, transparent 0)",
        "warm-radial":
          "radial-gradient(circle at top left, rgba(180,83,9,0.18), transparent 34%), radial-gradient(circle at bottom right, rgba(21,94,117,0.14), transparent 38%)",
        "warm-gradient": "linear-gradient(135deg, #fdf8f3 0%, #faf5eb 50%, #f5ede3 100%)",
        shimmer: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
        glass: "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,250,244,0.85) 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
