const assertEnv = (value: string | undefined, key: string) => {
  if (!value) {
    throw new Error(`Missing required mobile environment variable: ${key}`);
  }

  return value;
};

export const mobileConfig = {
  apiUrl: assertEnv(process.env.EXPO_PUBLIC_API_URL, "EXPO_PUBLIC_API_URL"),
  webUrl: process.env.EXPO_PUBLIC_WEB_URL || "http://localhost:3000",
  scheme: process.env.EXPO_PUBLIC_APP_SCHEME || "canvaschat",
  googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || "",
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "",
  googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || "",
  googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || "",
  googleExpoClientId: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID || "",
};
