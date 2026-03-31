import * as Google from "expo-auth-session/providers/google";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { loginMobileWithGoogle } from "@/lib/api/client";
import { mobileConfig } from "@/lib/config";
import { useSessionStore } from "@/store/session-store";

WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen() {
  const [error, setError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const setSession = useSessionStore((state) => state.setSession);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(
    {
      clientId: mobileConfig.googleWebClientId,
      webClientId: mobileConfig.googleWebClientId,
      scopes: ["openid", "profile", "email"],
      selectAccount: true,
    },
    {
      native: `${mobileConfig.scheme}:/oauthredirect`,
    }
  );

  useEffect(() => {
    if (!response) {
      return;
    }

    if (response.type === "error") {
      setError("Google sign-in failed. Please try again.");
      setIsGoogleLoading(false);
      return;
    }

    if (response.type !== "success") {
      setIsGoogleLoading(false);
      return;
    }

    const finalizeLogin = async () => {
      try {
        setError(null);
        const idToken =
          response.params?.id_token || response.authentication?.idToken;

        if (!idToken) {
          throw new Error("No Google ID token was returned");
        }

        const session = await loginMobileWithGoogle(idToken);

        await setSession({
          accessToken: session.accessToken,
          user: {
            userId: session.user._id,
            name: session.user.name,
            email: session.user.email,
            avatar: session.user.avatar,
          },
        });

        router.replace("/(app)/chats");
      } catch (authError) {
        setError(
          authError instanceof Error
            ? authError.message
            : "We couldn't finish signing you in."
        );
      } finally {
        setIsGoogleLoading(false);
      }
    };

    void finalizeLogin();
  }, [response, setSession]);

  const handleGoogleSignIn = async () => {
    if (!mobileConfig.googleWebClientId) {
      setError("Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in mobile/.env");
      return;
    }

    try {
      setIsGoogleLoading(true);
      setError(null);
      await promptAsync();
    } catch {
      setError("Failed to open Google sign-in.");
      setIsGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.screen}>
        <View style={styles.heroGlow} />
        <View style={styles.heroGlowSecondary} />

        <View style={styles.brandWrap}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoEmoji}>C</Text>
          </View>
          <Text style={styles.kicker}>Canvas Chat</Text>
          <Text style={styles.title}>Warm conversations, beautifully connected.</Text>
          <Text style={styles.subtitle}>
            Sign in with Google to connect with friends across web and mobile.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Welcome back</Text>
            <Text style={styles.cardBody}>
              Continue securely with your Google account. You&apos;ll return directly into the app after sign-in.
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.googleButton,
              pressed && styles.googleButtonPressed,
              (isGoogleLoading || !request) && styles.googleButtonDisabled,
            ]}
            disabled={isGoogleLoading || !request}
            onPress={() => void handleGoogleSignIn()}
          >
            <View style={styles.googleIconWrap}>
              <Text style={styles.googleGlyph}>G</Text>
            </View>
            <Text style={styles.googleButtonText}>
              {isGoogleLoading ? "Finishing sign-in..." : "Continue with Google"}
            </Text>
            {isGoogleLoading ? (
              <ActivityIndicator size="small" color="#155e75" />
            ) : (
              <Text style={styles.arrow}>{"->"}</Text>
            )}
          </Pressable>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.footnote}>
            This flow uses secure OAuth and deep-links back to the app.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5efe3",
  },
  screen: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 24,
    backgroundColor: "#f5efe3",
    justifyContent: "space-between",
    overflow: "hidden",
  },
  heroGlow: {
    position: "absolute",
    top: -90,
    right: -40,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(21, 94, 117, 0.14)",
  },
  heroGlowSecondary: {
    position: "absolute",
    bottom: 120,
    left: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(217, 119, 6, 0.08)",
  },
  brandWrap: {
    marginTop: 24,
    gap: 12,
  },
  logoBadge: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#155e75",
    shadowColor: "#0f172a",
    shadowOpacity: 0.15,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  logoEmoji: {
    fontSize: 28,
    fontWeight: "900",
    color: "#fffdf8",
  },
  kicker: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 2.2,
    textTransform: "uppercase",
    color: "#0f766e",
  },
  title: {
    maxWidth: 300,
    fontSize: 38,
    lineHeight: 42,
    fontWeight: "900",
    color: "#111827",
  },
  subtitle: {
    maxWidth: 340,
    fontSize: 16,
    lineHeight: 24,
    color: "#475569",
  },
  card: {
    borderRadius: 30,
    padding: 22,
    gap: 18,
    backgroundColor: "rgba(255, 253, 248, 0.96)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  cardHeader: {
    gap: 8,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0f172a",
  },
  cardBody: {
    fontSize: 15,
    lineHeight: 22,
    color: "#64748b",
  },
  googleButton: {
    minHeight: 58,
    borderRadius: 999,
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dbe4ef",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  googleButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  googleButtonDisabled: {
    opacity: 0.75,
  },
  googleIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  googleGlyph: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ea4335",
  },
  googleButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  arrow: {
    fontSize: 18,
    color: "#155e75",
  },
  error: {
    fontSize: 13,
    color: "#dc2626",
    fontWeight: "600",
    textAlign: "center",
  },
  footnote: {
    fontSize: 13,
    lineHeight: 19,
    color: "#64748b",
    textAlign: "center",
  },
});
