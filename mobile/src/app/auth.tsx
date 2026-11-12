import * as Google from "expo-auth-session/providers/google";
import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { getMobileAuthMe, loginMobileWithGoogle, redeemMobileWebAuthCode } from "@/lib/api/client";
import { mobileConfig } from "@/lib/config";
import { useSessionStore } from "@/store/session-store";
import { radii, spacing, typography, type AppColors } from "@/theme/tokens";
import { useAppTheme, useThemedStyles } from "@/theme/use-app-theme";

WebBrowser.maybeCompleteAuthSession();

const getSafeRedirect = (value: unknown) => {
  if (typeof value !== "string") return "/(app)/chats";
  if (!value.startsWith("/")) return "/(app)/chats";
  if (value.startsWith("//")) return "/(app)/chats";
  return value;
};

const HIGHLIGHTS = [
  { icon: "flash-outline", label: "Realtime" },
  { icon: "people-outline", label: "Groups" },
  { icon: "images-outline", label: "Media" },
] as const;

export default function AuthScreen() {
  const { redirect, code } = useLocalSearchParams<{ redirect?: string; code?: string }>();
  const [error, setError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isCodeLoading, setIsCodeLoading] = useState(false);
  const setSession = useSessionStore((state) => state.setSession);
  const { colors, gutter, isDark, isTablet } = useAppTheme();
  const styles = useThemedStyles(createStyles);

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
    if (!code) {
      return;
    }

    let active = true;

    const redeem = async () => {
      try {
        setError(null);
        setIsCodeLoading(true);

        const accessToken = await redeemMobileWebAuthCode(code);
        const me = await getMobileAuthMe(accessToken);

        await setSession({
          accessToken,
          user: {
            userId: me.user._id,
            name: me.user.name,
            email: me.user.email,
            avatar: me.user.avatar,
          },
        });

        if (active) {
          router.replace(getSafeRedirect(redirect) as any);
        }
      } catch (redeemError) {
        if (!active) return;
        setError(
          redeemError instanceof Error
            ? redeemError.message
            : "We couldn't redeem the mobile auth code."
        );
      } finally {
        if (!active) return;
        setIsCodeLoading(false);
      }
    };

    void redeem();

    return () => {
      active = false;
    };
  }, [code, redirect, setSession]);

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

        router.replace(getSafeRedirect(redirect) as any);
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
  }, [redirect, response, setSession]);

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

  const busy = isGoogleLoading || isCodeLoading || !!code || !request;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} animated />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: gutter }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.layout, isTablet && styles.layoutWide]}>
          <View style={[styles.hero, isTablet && styles.heroWide]}>
            <View style={styles.glowPrimary} />
            <View style={styles.glowSecondary} />

            <View style={[styles.brandRow, isTablet && styles.brandRowWide]}>
              <View style={styles.logoBadge}>
                <Text style={styles.logoLetter}>L</Text>
              </View>
              <Text style={styles.brandName}>LinkUp</Text>
            </View>

            <Text style={[styles.title, isTablet && styles.titleWide]}>
              Conversations that feel instant.
            </Text>
            <Text style={[styles.subtitle, isTablet && styles.subtitleWide]}>
              Realtime chat, groups, and media — the same workspace you know on the web,
              now in your pocket.
            </Text>

            <View style={styles.highlights}>
              {HIGHLIGHTS.map((item) => (
                <View key={item.label} style={styles.highlight}>
                  <Ionicons name={item.icon} size={14} color={colors.brand} />
                  <Text style={styles.highlightText}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={[styles.card, isTablet && styles.cardWide]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Welcome back</Text>
              <Text style={styles.cardBody}>
                Continue securely with your Google account. You&apos;ll return directly
                to LinkUp after sign-in.
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
              style={({ pressed }) => [
                styles.googleButton,
                pressed && styles.googleButtonPressed,
                busy && styles.googleButtonDisabled,
              ]}
              disabled={busy}
              onPress={() => void handleGoogleSignIn()}
            >
              <View style={styles.googleIconWrap}>
                <Text style={styles.googleGlyph}>G</Text>
              </View>
              <Text style={styles.googleButtonText}>
                {isCodeLoading || isGoogleLoading
                  ? "Finishing sign-in..."
                  : "Continue with Google"}
              </Text>
              {isGoogleLoading || isCodeLoading ? (
                <ActivityIndicator size="small" color={colors.brand} />
              ) : (
                <Ionicons name="arrow-forward" size={18} color={colors.brand} />
              )}
            </Pressable>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={colors.danger} />
                <Text style={styles.error}>{error}</Text>
              </View>
            ) : null}

            <Text style={styles.footnote}>
              Secure OAuth · Deep-links back to the app · Works with your web session
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (c: AppColors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: c.canvas,
    },
    scroll: {
      flexGrow: 1,
      justifyContent: "center",
      paddingVertical: spacing.xxl,
    },
    layout: {
      width: "100%",
      maxWidth: 980,
      alignSelf: "center",
      gap: spacing.xxl,
    },
    layoutWide: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 56,
    },
    hero: {
      gap: spacing.sm,
      overflow: "hidden",
    },
    heroWide: {
      flex: 1,
      paddingVertical: spacing.xl,
    },
    glowPrimary: {
      position: "absolute",
      top: -120,
      right: -80,
      width: 260,
      height: 260,
      borderRadius: 130,
      backgroundColor: c.brand,
      opacity: 0.12,
    },
    glowSecondary: {
      position: "absolute",
      bottom: -140,
      left: -100,
      width: 240,
      height: 240,
      borderRadius: 120,
      backgroundColor: c.accent,
      opacity: 0.1,
    },
    brandRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: spacing.xs,
    },
    brandRowWide: {
      marginBottom: spacing.md,
    },
    logoBadge: {
      width: 46,
      height: 46,
      borderRadius: radii.md,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.brand,
    },
    logoLetter: {
      fontSize: 22,
      fontWeight: "800",
      color: c.onBrand,
    },
    brandName: {
      ...typography.h2,
      color: c.fg,
      letterSpacing: -0.4,
    },
    title: {
      ...typography.display,
      color: c.fg,
      maxWidth: 460,
    },
    titleWide: {
      fontSize: 42,
      lineHeight: 48,
      maxWidth: 480,
    },
    subtitle: {
      ...typography.body,
      color: c.muted,
      maxWidth: 460,
    },
    subtitleWide: {
      maxWidth: 440,
    },
    highlights: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs,
      marginTop: spacing.sm,
    },
    highlight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.surface,
    },
    highlightText: {
      fontSize: 12,
      fontWeight: "700",
      color: c.muted,
    },
    card: {
      borderRadius: radii.xxl,
      padding: spacing.lg,
      gap: spacing.md,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      shadowColor: "#0A0C18",
      shadowOpacity: 0.1,
      shadowRadius: 30,
      shadowOffset: { width: 0, height: 16 },
      elevation: 8,
    },
    cardWide: {
      width: 400,
      padding: spacing.xl,
    },
    cardHeader: {
      gap: 6,
    },
    cardTitle: {
      ...typography.h2,
      color: c.fg,
    },
    cardBody: {
      ...typography.small,
      color: c.muted,
    },
    googleButton: {
      minHeight: 56,
      borderRadius: radii.pill,
      paddingHorizontal: spacing.md,
      backgroundColor: c.elevated,
      borderWidth: 1,
      borderColor: c.line,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
    },
    googleButtonPressed: {
      opacity: 0.92,
      transform: [{ scale: 0.99 }],
    },
    googleButtonDisabled: {
      opacity: 0.7,
    },
    googleIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.subtle,
    },
    googleGlyph: {
      fontSize: 17,
      fontWeight: "800",
      color: "#EA4335",
    },
    googleButtonText: {
      flex: 1,
      fontSize: 15,
      fontWeight: "700",
      color: c.fg,
    },
    errorBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: radii.md,
      backgroundColor: c.dangerSoft,
    },
    error: {
      flex: 1,
      fontSize: 12,
      lineHeight: 17,
      color: c.danger,
      fontWeight: "600",
    },
    footnote: {
      ...typography.caption,
      fontSize: 10,
      lineHeight: 14,
      color: c.faint,
      textAlign: "center",
      letterSpacing: 0.6,
      textTransform: "none",
    },
  });
