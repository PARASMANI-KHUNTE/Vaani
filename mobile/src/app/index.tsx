import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useSessionStore } from "@/store/session-store";
import { typography } from "@/theme/tokens";
import { useAppTheme, useThemedStyles } from "@/theme/use-app-theme";
import type { AppColors } from "@/theme/tokens";

export default function IndexScreen() {
  const hydrated = useSessionStore((state) => state.hydrated);
  const session = useSessionStore((state) => state.session);
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);

  if (!hydrated) {
    return (
      <View style={styles.container}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>L</Text>
        </View>
        <ActivityIndicator size="large" color={colors.brand} />
        <Text style={styles.label}>Loading LinkUp</Text>
      </View>
    );
  }

  return <Redirect href={session?.accessToken ? "/(app)/chats" : "/auth"} />;
}

const createStyles = (c: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 18,
      backgroundColor: c.canvas,
    },
    logo: {
      width: 64,
      height: 64,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.brand,
    },
    logoText: {
      color: c.onBrand,
      fontSize: 30,
      fontWeight: "800",
    },
    label: {
      ...typography.caption,
      color: c.faint,
    },
  });
