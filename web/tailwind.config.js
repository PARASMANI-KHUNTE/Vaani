/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    screens: {
      xs: "420px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {
      colors: {
        /* ------------------------------------------------------------------
         * Semantic surface + text tokens.
         * Defined as RGB channels so opacity modifiers work: bg-surface/80
         * ------------------------------------------------------------------ */
        canvas: "rgb(var(--canvas-rgb) / <alpha-value>)",
        surface: "rgb(var(--surface-rgb) / <alpha-value>)",
        elevated: "rgb(var(--elevated-rgb) / <alpha-value>)",
        subtle: "rgb(var(--subtle-rgb) / <alpha-value>)",
        line: "rgb(var(--line-rgb) / <alpha-value>)",
        fg: "rgb(var(--fg-rgb) / <alpha-value>)",
        muted: "rgb(var(--muted-rgb) / <alpha-value>)",
        faint: "rgb(var(--faint-rgb) / <alpha-value>)",

        /* Brand (theme-swappable via data-theme) */
        brand: {
          DEFAULT: "rgb(var(--brand-rgb) / <alpha-value>)",
          hover: "rgb(var(--brand-hover-rgb) / <alpha-value>)",
          soft: "rgb(var(--brand-rgb) / 0.10)",
          50: "#eef0ff",
          100: "#e0e3ff",
          200: "#c6caff",
          300: "#a3a6fd",
          400: "#857ffa",
          500: "#635bff",
          600: "#4f46e5",
          700: "#4038c7",
          800: "#352fa0",
          900: "#2d2a7e",
          950: "#1b1952",
        },

        /* Supporting accent */
        accent: {
          DEFAULT: "#06b6d4",
          soft: "rgba(6, 182, 212, 0.12)",
          hover: "#0891b2",
        },

        success: "#10b981",
        warning: "#f59e0b",
        danger: "#f43f5e",

        /* Legacy aliases kept so existing utilities keep resolving */
        ink: "rgb(var(--fg-rgb) / <alpha-value>)",
        shell: "rgb(var(--canvas-rgb) / <alpha-value>)",
        primary: {
          400: "#857ffa",
          500: "#635bff",
          600: "#4f46e5",
        },
        base: {
          50: "rgb(var(--canvas-rgb) / <alpha-value>)",
          100: "rgb(var(--subtle-rgb) / <alpha-value>)",
          800: "rgb(var(--elevated-rgb) / <alpha-value>)",
          900: "rgb(var(--surface-rgb) / <alpha-value>)",
          950: "rgb(var(--canvas-rgb) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: [
          "Plus Jakarta Sans",
          "DM Sans",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        display: ["Fraunces", "Georgia", "serif"],
      },
      boxShadow: {
        panel:
          "0 24px 70px -24px rgba(15, 19, 32, 0.18), 0 8px 24px -16px rgba(15, 19, 32, 0.12)",
        "panel-hover":
          "0 32px 90px -24px rgba(15, 19, 32, 0.22), 0 12px 32px -16px rgba(15, 19, 32, 0.14)",
        float: "0 28px 90px -28px rgba(15, 19, 32, 0.28)",
        soft: "0 1px 2px rgba(15, 19, 32, 0.04), 0 10px 30px -14px rgba(15, 19, 32, 0.12)",
        "soft-lg":
          "0 2px 4px rgba(15, 19, 32, 0.04), 0 20px 50px -20px rgba(15, 19, 32, 0.18)",
        glow: "0 10px 30px -10px rgb(var(--brand-rgb) / 0.45)",
        "inner-soft": "inset 0 1px 2px rgba(15, 19, 32, 0.06)",
        flat: "0 1px 2px rgba(15, 19, 32, 0.05), 0 4px 14px -8px rgba(15, 19, 32, 0.10)",
        "flat-dark": "0 1px 2px rgba(0, 0, 0, 0.4), 0 8px 24px -12px rgba(0, 0, 0, 0.55)",
      },
      backgroundImage: {
        "brand-gradient":
          "linear-gradient(135deg, rgb(var(--brand-rgb)) 0%, rgb(var(--brand-hover-rgb)) 100%)",
        "brand-gradient-soft":
          "linear-gradient(135deg, rgb(var(--brand-rgb) / 0.14) 0%, rgb(var(--brand-rgb) / 0.04) 100%)",
        "paper-grid":
          "radial-gradient(circle at 1px 1px, rgb(var(--fg-rgb) / 0.06) 1px, transparent 0)",
        shimmer:
          "linear-gradient(90deg, transparent 0%, rgb(255 255 255 / 0.35) 50%, transparent 100%)",
      },
      borderRadius: {
        xl: "12px",
        "2xl": "16px",
        "3xl": "22px",
        "4xl": "30px",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.34, 1.4, 0.64, 1)",
      },
      animation: {
        "fade-in": "fadeIn 0.35s ease-out forwards",
        "fade-up": "fadeUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "fade-down": "fadeDown 0.35s ease-out forwards",
        "slide-in-right": "slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slide-in-left": "slideInLeft 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "scale-in": "scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "bounce-in": "bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
        shimmer: "shimmer 1.8s ease-in-out infinite",
        float: "float 7s ease-in-out infinite",
        glow: "glow 2.4s ease-in-out infinite alternate",
        wave: "wave 1.5s ease-in-out infinite",
        drift: "drift 9s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeDown: {
          "0%": { opacity: "0", transform: "translateY(-14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideInLeft: {
          "0%": { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.96)" },
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
          "50%": { opacity: "0.65" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        glow: {
          "0%": { boxShadow: "0 0 24px rgb(var(--brand-rgb) / 0.10)" },
          "100%": { boxShadow: "0 0 48px rgb(var(--brand-rgb) / 0.28)" },
        },
        wave: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.12)" },
        },
        drift: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(28px, -24px) scale(1.04)" },
          "66%": { transform: "translate(-18px, 18px) scale(0.98)" },
        },
      },
      backdropBlur: { xs: "2px" },
    },
  },
  plugins: [],
};
