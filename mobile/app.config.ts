import type { ConfigContext, ExpoConfig } from "expo/config";

const easProjectId =
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID || "5864abce-0112-448e-8801-8aaa03ca57ca";
const expoOwner = process.env.EXPO_PUBLIC_EXPO_OWNER || "parasmani";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Canvas Chat Mobile",
  slug: "canvas-chat-mobile",
  owner: expoOwner,
  version: "1.0.0",
  orientation: "portrait",
  scheme: process.env.EXPO_PUBLIC_APP_SCHEME || "canvaschat",
  userInterfaceStyle: "automatic",
  icon: "./assets/images/icon.png",
  runtimeVersion: {
    policy: "appVersion",
  },
  updates: {
    enabled: true,
    fallbackToCacheTimeout: 0,
    url: `https://u.expo.dev/${easProjectId}`,
  },
  ios: {
    bundleIdentifier: "com.canvaschat.mobile",
    supportsTablet: true,
  },
  android: {
    package: "com.canvaschat.mobile",
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-notifications",
    "expo-secure-store",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#0f172a",
        image: "./assets/images/splash-icon.png",
        imageWidth: 84,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    eas: {
      projectId: easProjectId,
    },
  },
});
