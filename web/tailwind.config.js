/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
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
        sans: ["DM Sans", "system-ui", "sans-serif"],
        display: ["Fraunces", "serif"],
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
        "shimmer": "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
        "glass": "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,250,244,0.85) 100%)",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out forwards",
        "fade-up": "fadeUp 0.5s ease-out forwards",
        "fade-down": "fadeDown 0.4s ease-out forwards",
        "slide-in-right": "slideInRight 0.35s ease-out forwards",
        "slide-in-left": "slideInLeft 0.35s ease-out forwards",
        "scale-in": "scaleIn 0.3s ease-out forwards",
        "bounce-in": "bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
        "shimmer": "shimmer 2s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
        "wave": "wave 1.5s ease-in-out infinite",
        "drift": "drift 7.5s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeDown: {
          "0%": { opacity: "0", transform: "translateY(-16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(24px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideInLeft: {
          "0%": { opacity: "0", transform: "translateX(-24px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        bounceIn: {
          "0%": { opacity: "0", transform: "scale(0.3)" },
          "50%": { transform: "scale(1.05)" },
          "70%": { transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        glow: {
          "0%": { boxShadow: "0 0 20px rgba(180, 83, 9, 0.1)" },
          "100%": { boxShadow: "0 0 40px rgba(180, 83, 9, 0.25)" },
        },
        wave: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.1)" },
        },
        drift: {
          "0%, 100%": { transform: "translate(0, 0)" },
          "33%": { transform: "translate(30px, -30px)" },
          "66%": { transform: "translate(-20px, 20px)" },
        },
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
        "4xl": "32px",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
