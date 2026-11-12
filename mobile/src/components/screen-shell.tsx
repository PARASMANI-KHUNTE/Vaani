import { PropsWithChildren, ReactNode } from "react";
import { StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { typography } from "@/theme/tokens";
import { useAppTheme, useThemedStyles } from "@/theme/use-app-theme";
import type { AppColors } from "@/theme/tokens";

type ScreenShellProps = PropsWithChildren<{
  eyebrow?: string;
  title: string;
  subtitle?: string;
  rightAction?: ReactNode;
}>;

export const ScreenShell = ({ eyebrow, title, subtitle, rightAction, children }: ScreenShellProps) => {
  const { colors, contentWidth, isDark, isTablet } = useAppTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.canvas}
        animated
      />
      <View style={styles.container}>
        <View style={[styles.inner, { maxWidth: contentWidth }]}>
          <View style={[styles.header, isTablet && styles.headerWide]}>
            <View style={styles.headerRow}>
              <View style={styles.headerText}>
                {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
                <Text style={styles.title} numberOfLines={2}>
                  {title}
                </Text>
              </View>
              {rightAction ? <View style={styles.rightAction}>{rightAction}</View> : null}
            </View>
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={3}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          <View style={styles.content}>{children}</View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const createStyles = (c: AppColors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: c.canvas,
    },
    container: {
      flex: 1,
      backgroundColor: c.canvas,
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 12,
    },
    inner: {
      flex: 1,
      width: "100%",
      alignSelf: "center",
    },
    header: {
      gap: 4,
      marginBottom: 16,
    },
    headerWide: {
      marginBottom: 22,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
    },
    headerText: {
      flex: 1,
    },
    rightAction: {
      marginLeft: 12,
    },
    eyebrow: {
      ...typography.caption,
      color: c.brand,
      marginBottom: 4,
    },
    title: {
      ...typography.h1,
      color: c.fg,
    },
    subtitle: {
      ...typography.small,
      color: c.muted,
      marginTop: 2,
    },
    content: {
      flex: 1,
    },
  });
