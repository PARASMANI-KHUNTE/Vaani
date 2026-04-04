import { SplashScreen, Stack } from "expo-router";
import { useEffect } from "react";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useMobileRealtime } from "@/hooks/use-mobile-realtime";
import { useNotificationStore } from "@/store/notification-store";
import { useSessionStore } from "@/store/session-store";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const hydrated = useSessionStore((state) => state.hydrated);
  const hydrate = useSessionStore((state) => state.hydrate);
  const session = useSessionStore((state) => state.session);
  const hydratePreferences = useNotificationStore((state) => state.hydratePreferences);

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

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="auth" options={{ gestureEnabled: false }} />
      <Stack.Screen name="index" options={{ gestureEnabled: false }} />
      <Stack.Screen name="new-chat" options={{ presentation: "modal" }} />
      <Stack.Screen name="group-info" options={{ presentation: "modal" }} />
      <Stack.Screen name="user-profile" options={{ presentation: "modal" }} />
      <Stack.Screen name="blocked-users" options={{ presentation: "modal" }} />
    </Stack>
  );
}
