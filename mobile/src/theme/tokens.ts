import { Platform } from "react-native";

/**
 * Shared design tokens for the LinkUp mobile app.
 *
 * These values intentionally mirror `web/tailwind.config.js` and the CSS
 * variables in `web/src/globals.css` so the web client and the native app
 * render the same product:
 *
 *   brand   #635BFF  (Iris)   dark #817AFF
 *   canvas  #F6F7FB           dark #0B0D17
 *   surface #FFFFFF           dark #12151F
 *   line    #E3E6F0           dark #2A3043
 */

export type AppColors = {
  canvas: string;
  surface: string;
  elevated: string;
  subtle: string;
  line: string;
  fg: string;
  muted: string;
  faint: string;
  brand: string;
  brandHover: string;
  brandSoft: string;
  onBrand: string;
  accent: string;
  accentSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  overlay: string;
  glass: string;
  bubbleOwn: string;
  bubbleOwnText: string;
  bubbleOther: string;
  bubbleOtherText: string;
};

export const lightColors: AppColors = {
  canvas: "#F6F7FB",
  surface: "#FFFFFF",
  elevated: "#FFFFFF",
  subtle: "#EEF0F7",
  line: "#E3E6F0",
  fg: "#14172B",
  muted: "#5B6076",
  faint: "#8B90A6",
  brand: "#635BFF",
  brandHover: "#4F46E5",
  brandSoft: "#EEEDFF",
  onBrand: "#FFFFFF",
  accent: "#0891B2",
  accentSoft: "#E0F7FB",
  success: "#059669",
  successSoft: "#E7F8F1",
  warning: "#D97706",
  warningSoft: "#FEF4E6",
  danger: "#E11D48",
  dangerSoft: "#FEECF0",
  overlay: "rgba(10, 12, 24, 0.48)",
  glass: "rgba(255, 255, 255, 0.86)",
  bubbleOwn: "#635BFF",
  bubbleOwnText: "#FFFFFF",
  bubbleOther: "#FFFFFF",
  bubbleOtherText: "#14172B",
};

export const darkColors: AppColors = {
  canvas: "#0B0D17",
  surface: "#12151F",
  elevated: "#171B27",
  subtle: "#1C2131",
  line: "#2A3043",
  fg: "#F4F5FA",
  muted: "#A5ABC0",
  faint: "#737A90",
  brand: "#817AFF",
  brandHover: "#9A94FF",
  brandSoft: "#201E4D",
  onBrand: "#0B0D17",
  accent: "#22D3EE",
  accentSoft: "#10323A",
  success: "#34D399",
  successSoft: "#102B23",
  warning: "#FBBF24",
  warningSoft: "#2E2512",
  danger: "#FB7185",
  dangerSoft: "#311722",
  overlay: "rgba(3, 4, 10, 0.66)",
  glass: "rgba(18, 21, 31, 0.86)",
  bubbleOwn: "#5B54E8",
  bubbleOwnText: "#FFFFFF",
  bubbleOther: "#1C2131",
  bubbleOtherText: "#F4F5FA",
};

export const palettes = { light: lightColors, dark: darkColors };

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const radii = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  xxl: 28,
  pill: 999,
} as const;

export const layout = {
  tablet: 768,
  desktop: 1024,
  maxContent: 780,
  maxThread: 880,
  maxForm: 480,
} as const;

const fontFamily = Platform.select({
  ios: "System",
  android: "sans-serif",
  default: "System",
});

export const fontSize = {
  display: 34,
  h1: 28,
  h2: 22,
  h3: 18,
  body: 15,
  small: 13,
  caption: 11,
} as const;

/** Shared text presets. Titles use tight tracking like the web app. */
export const typography = {
  display: {
    fontFamily,
    fontSize: fontSize.display,
    lineHeight: 40,
    fontWeight: "800" as const,
    letterSpacing: -0.9,
  },
  h1: {
    fontFamily,
    fontSize: fontSize.h1,
    lineHeight: 34,
    fontWeight: "800" as const,
    letterSpacing: -0.6,
  },
  h2: {
    fontFamily,
    fontSize: fontSize.h2,
    lineHeight: 28,
    fontWeight: "700" as const,
    letterSpacing: -0.4,
  },
  h3: {
    fontFamily,
    fontSize: fontSize.h3,
    lineHeight: 24,
    fontWeight: "700" as const,
    letterSpacing: -0.2,
  },
  body: {
    fontFamily,
    fontSize: fontSize.body,
    lineHeight: 22,
    fontWeight: "400" as const,
  },
  small: {
    fontFamily,
    fontSize: fontSize.small,
    lineHeight: 19,
    fontWeight: "400" as const,
  },
  caption: {
    fontFamily,
    fontSize: fontSize.caption,
    lineHeight: 14,
    fontWeight: "700" as const,
    letterSpacing: 1.4,
    textTransform: "uppercase" as const,
  },
};

export const shadow = {
  card: Platform.select({
    ios: {
      shadowColor: "#0A0C18",
      shadowOpacity: 0.08,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
    },
    android: { elevation: 3 },
    default: {
      shadowColor: "#0A0C18",
      shadowOpacity: 0.08,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
    },
  }) as object,
  raised: Platform.select({
    ios: {
      shadowColor: "#0A0C18",
      shadowOpacity: 0.16,
      shadowRadius: 32,
      shadowOffset: { width: 0, height: 18 },
    },
    android: { elevation: 8 },
    default: {
      shadowColor: "#0A0C18",
      shadowOpacity: 0.16,
      shadowRadius: 32,
      shadowOffset: { width: 0, height: 18 },
    },
  }) as object,
};
