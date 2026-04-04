import Constants from "expo-constants";
import * as Device from "expo-device";
import { router } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";
import { registerMobilePushToken } from "@/lib/api/client";
import { useNotificationStore } from "@/store/notification-store";
import { useSessionStore } from "@/store/session-store";

const isExpoGo =
  Constants.executionEnvironment === "storeClient" ||
  Constants.appOwnership === "expo";

const loadNotificationsModule = async () => import("expo-notifications");

const configureNotificationsAsync = async () => {
  const Notifications = await loadNotificationsModule();

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: useNotificationStore.getState().soundEnabled,
      shouldSetBadge: false,
    }),
  });

  return Notifications;
};

const registerForPushNotificationsAsync = async () => {
  if (Platform.OS === "web" || isExpoGo) {
    return null;
  }

  const Notifications = await configureNotificationsAsync();

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("messages", {
      name: "Messages",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: "default",
    });
  }

  if (!Device.isDevice) {
    return null;
  }

  const existingPermission = await Notifications.getPermissionsAsync();
  let finalStatus = existingPermission.status;

  if (finalStatus !== "granted") {
    const requestedPermission = await Notifications.requestPermissionsAsync();
    finalStatus = requestedPermission.status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  const easProjectId =
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId ||
    undefined;

  const pushToken = await Notifications.getExpoPushTokenAsync({
    projectId: easProjectId,
  });

  return pushToken.data;
};

export const usePushNotifications = () => {
  const session = useSessionStore((state) => state.session);

  useEffect(() => {
    if (!session?.accessToken || Platform.OS === "web" || isExpoGo) {
      return;
    }

    let cancelled = false;
    let responseSubscription: { remove: () => void } | null = null;

    registerForPushNotificationsAsync()
      .then(async (token) => {
        if (!token || cancelled) {
          return;
        }

        await registerMobilePushToken(
          session.accessToken,
          token,
          Platform.OS === "ios" ? "ios" : "android"
        );

        const Notifications = await loadNotificationsModule();

        responseSubscription =
          Notifications.addNotificationResponseReceivedListener((response) => {
            const chatId = response.notification.request.content.data?.chatId;

            if (typeof chatId === "string" && chatId) {
              router.push(`/chat/${chatId}`);
            }
          });
      })
      .catch((error) => {
        console.warn("Push registration failed", error);
      });

    return () => {
      cancelled = true;
      responseSubscription?.remove();
    };
  }, [session?.accessToken]);
};
