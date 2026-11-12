import { SplashScreen, Stack } from "expo-router";
import { useEffect, useMemo } from "react";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useMobileRealtime } from "@/hooks/use-mobile-realtime";
import { useNotificationStore } from "@/store/notification-store";
import { useSessionStore } from "@/store/session-store";
import { useAppTheme } from "@/theme/use-app-theme";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const hydrated = useSessionStore((state) => state.hydrated);
  const hydrate = useSessionStore((state) => state.hydrate);
  const session = useSessionStore((state) => state.session);
  const hydratePreferences = useNotificationStore((state) => state.hydratePreferences);
  const { colors, isDark } = useAppTheme();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    void hydratePreferences();
  }, [hydratePreferences]);

  useEffect(() => {
    if (hydrated) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [hydrated]);

  usePushNotifications();
  useMobileRealtime({
    token: session?.accessToken,
    currentUserId: session?.user?.userId,
  });

  const navigationTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;

    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.brand,
        background: colors.canvas,
        card: colors.surface,
        text: colors.fg,
        border: colors.line,
        notification: colors.brand,
      },
    };
  }, [colors, isDark]);

  return (
    <ThemeProvider value={navigationTheme}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
        <Stack.Screen name="auth" options={{ gestureEnabled: false }} />
        <Stack.Screen name="index" options={{ gestureEnabled: false }} />
        <Stack.Screen name="new-chat" options={{ presentation: "modal" }} />
        <Stack.Screen name="group-info" options={{ presentation: "modal" }} />
        <Stack.Screen name="user-profile" options={{ presentation: "modal" }} />
        <Stack.Screen name="blocked-users" options={{ presentation: "modal" }} />
      </Stack>
    </ThemeProvider>
  );
}
