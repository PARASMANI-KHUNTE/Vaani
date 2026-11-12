import { useMemo } from "react";
import {
  StyleSheet,
  useColorScheme,
  useWindowDimensions,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { darkColors, layout, lightColors, palettes, type AppColors } from "./tokens";

export type AppTheme = {
  colors: AppColors;
  scheme: "light" | "dark";
  isDark: boolean;
  /** Screen width and height, safe for orientation changes. */
  width: number;
  height: number;
  /** Tablet-class width (>= 768pt). */
  isTablet: boolean;
  /** Desktop-class width (>= 1024pt), e.g. web or split view. */
  isDesktop: boolean;
  /** True in landscape orientation. */
  isLandscape: boolean;
  /** Responsive horizontal padding for page content. */
  gutter: number;
  /** Max width for readable content on large screens. */
  contentWidth: number;
  /** Max width for a conversation thread. */
  threadWidth: number;
};

export const useAppTheme = (): AppTheme => {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const { width, height } = useWindowDimensions();
  const isDark = scheme === "dark";
  const isTablet = width >= layout.tablet;
  const isDesktop = width >= layout.desktop;
  const isLandscape = width > height;
  const gutter = width < 380 ? 16 : isTablet ? 32 : 20;

  return useMemo(
    () => ({
      colors: isDark ? darkColors : lightColors,
      scheme,
      isDark,
      width,
      height,
      isTablet,
      isDesktop,
      isLandscape,
      gutter,
      contentWidth: Math.min(width - gutter * 2, layout.maxContent),
      threadWidth: Math.min(width - gutter * 2, layout.maxThread),
    }),
    [gutter, height, isDark, isDesktop, isLandscape, isTablet, scheme, width]
  );
};

export { palettes };

export type NamedStyles = StyleSheet.NamedStyles<Record<string, ViewStyle | TextStyle>>;

/**
 * Build a themed StyleSheet once per colour scheme.
 *
 * Usage:
 *   const createStyles = (c: AppColors) => StyleSheet.create({ ... });
 *   const styles = useThemedStyles(createStyles);
 */
export const useThemedStyles = <T extends StyleSheet.NamedStyles<T>>(
  factory: (colors: AppColors) => T
): T => {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  return useMemo(() => StyleSheet.create(factory(palettes[scheme])), [factory, scheme]);
};

export const selectColors = (isDark: boolean): AppColors => (isDark ? darkColors : lightColors);
