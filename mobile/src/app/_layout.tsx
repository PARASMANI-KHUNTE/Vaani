import { SplashScreen, Stack } from "expo-router";
import { useEffect } from "react";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useMobileRealtime } from "@/hooks/use-mobile-realtime";
import { useSessionStore } from "@/store/session-store";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const hydrated = useSessionStore((state) => state.hydrated);
  const hydrate = useSessionStore((state) => state.hydrate);
  const session = useSessionStore((state) => state.session);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

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

  return <Stack screenOptions={{ headerShown: false }} />;
}
