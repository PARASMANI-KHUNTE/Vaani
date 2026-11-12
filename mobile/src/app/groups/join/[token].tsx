import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { joinMobileGroupViaInvite, previewMobileGroupInviteLink } from "@/lib/api/client";
import { mobileConfig } from "@/lib/config";
import type { MobileGroupInvitePreview } from "@/lib/types";
import { useChatStore } from "@/store/chat-store";
import { useSessionStore } from "@/store/session-store";
import { radii, spacing, typography, type AppColors } from "@/theme/tokens";
import { useAppTheme, useThemedStyles } from "@/theme/use-app-theme";

export default function GroupInviteJoinScreen() {
  const { token: inviteToken = "" } = useLocalSearchParams<{ token?: string }>();
  const session = useSessionStore((state) => state.session);
  const upsertChat = useChatStore((state) => state.upsertChat);
  const { colors, contentWidth } = useAppTheme();
  const styles = useThemedStyles(createStyles);

  const [preview, setPreview] = useState<MobileGroupInvitePreview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inviteLinks = useMemo(() => {
    if (!inviteToken) return null;
    return {
      web: `${mobileConfig.webUrl}/groups/join/${inviteToken}`,
      deep: `${mobileConfig.scheme}://groups/join/${inviteToken}`,
    };
  }, [inviteToken]);

  useEffect(() => {
    if (!inviteToken) {
      setIsLoading(false);
      setError("Missing invite token");
      return;
    }

    if (!session?.accessToken) {
      setIsLoading(false);
      return;
    }

    let active = true;

    previewMobileGroupInviteLink(session.accessToken, inviteToken)
      .then((response) => {
        if (!active) return;
        setPreview(response.invite);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load invite preview");
      })
      .finally(() => {
        if (!active) return;
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [inviteToken, session?.accessToken]);

  const handleJoin = useCallback(async () => {
    if (!session?.accessToken || !inviteToken) return;

    try {
      setIsJoining(true);
      setError(null);
      const response = await joinMobileGroupViaInvite(session.accessToken, inviteToken);
      if (response.chat) {
        upsertChat(response.chat);
        router.replace(`/chat/${response.chat._id}` as any);
        return;
      }

      if (preview?.chatId) {
        router.replace(`/chat/${preview.chatId}` as any);
        return;
      }

      router.replace("/(app)/chats");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to join group");
    } finally {
      setIsJoining(false);
    }
  }, [inviteToken, preview?.chatId, session?.accessToken, upsertChat]);

  if (!session?.accessToken) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={22} color={colors.fg} />
          </Pressable>
          <Text style={styles.headerTitle}>Join group</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.centerState}>
          <View style={styles.bigIcon}>
            <Ionicons name="people-outline" size={38} color={colors.faint} />
          </View>
          <Text style={styles.title}>Sign in required</Text>
          <Text style={styles.subtitle}>
            You need to sign in to preview and join this group invite.
          </Text>
          <Pressable
            style={styles.primaryButton}
            onPress={() => {
              const redirect = inviteToken ? `/groups/join/${inviteToken}` : "/(app)/chats";
              router.replace(`/auth?redirect=${encodeURIComponent(redirect)}` as any);
            }}
          >
            <Text style={styles.primaryButtonText}>Continue to sign in</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={22} color={colors.fg} />
        </Pressable>
        <Text style={styles.headerTitle}>Group invite</Text>
        <Pressable
          onPress={() => {
            if (!inviteLinks) return;
            void Share.share({
              message: `Join my LinkUp group:\n${inviteLinks.web}\n\nApp link: ${inviteLinks.deep}`,
            });
          }}
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityLabel="Share invite"
        >
          <Ionicons name="share-outline" size={20} color={colors.brand} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <View style={styles.bigIcon}>
            <Ionicons name="alert-circle-outline" size={38} color={colors.faint} />
          </View>
          <Text style={styles.title}>Invite unavailable</Text>
          <Text style={styles.subtitle}>{error}</Text>
          <Pressable style={styles.secondaryButton} onPress={() => router.replace("/(app)/chats")}>
            <Text style={styles.secondaryButtonText}>Go to chats</Text>
          </Pressable>
        </View>
      ) : (
        <View style={[styles.content, { maxWidth: contentWidth }]}>
          <View style={styles.card}>
            <View style={styles.groupIcon}>
              <Ionicons name="people" size={32} color={colors.onBrand} />
            </View>
            <Text style={styles.groupName}>{preview?.groupName || "Group"}</Text>
            <View style={styles.memberPill}>
              <Ionicons name="person" size={12} color={colors.brand} />
              <Text style={styles.groupMeta}>{preview?.memberCount ?? 0} members</Text>
            </View>
            <Text style={styles.helperText}>
              {preview?.isAlreadyMember
                ? "You're already a member of this group."
                : "Join this group to start chatting with everyone inside."}
            </Text>

            <Pressable
              style={[styles.primaryButton, isJoining && styles.primaryButtonDisabled]}
              disabled={isJoining}
              onPress={handleJoin}
            >
              {isJoining ? (
                <ActivityIndicator size="small" color={colors.onBrand} />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {preview?.isAlreadyMember ? "Open group chat" : "Join group"}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const createStyles = (c: AppColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.canvas },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      backgroundColor: c.surface,
      borderBottomWidth: 1,
      borderBottomColor: c.line,
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: radii.sm,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      flex: 1,
      ...typography.h3,
      color: c.fg,
      textAlign: "center",
    },
    headerSpacer: { width: 40 },
    centerState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 24,
      gap: spacing.sm,
    },
    bigIcon: {
      width: 80,
      height: 80,
      borderRadius: radii.xl,
      backgroundColor: c.surface,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: c.line,
    },
    title: { ...typography.h2, color: c.fg, textAlign: "center" },
    subtitle: { ...typography.small, color: c.muted, textAlign: "center", maxWidth: 320 },
    content: {
      flex: 1,
      width: "100%",
      alignSelf: "center",
      padding: spacing.lg,
      justifyContent: "center",
    },
    card: {
      borderRadius: radii.xxl,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      padding: spacing.xl,
      alignItems: "center",
      gap: 10,
    },
    groupIcon: {
      width: 72,
      height: 72,
      borderRadius: radii.xl,
      backgroundColor: c.brand,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 4,
    },
    groupName: { ...typography.h1, color: c.fg, textAlign: "center" },
    memberPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radii.pill,
      backgroundColor: c.brandSoft,
    },
    groupMeta: { fontSize: 12, fontWeight: "700", color: c.brand },
    helperText: {
      ...typography.small,
      color: c.muted,
      textAlign: "center",
      marginTop: 2,
    },
    primaryButton: {
      marginTop: 14,
      borderRadius: radii.pill,
      backgroundColor: c.brand,
      paddingVertical: 14,
      paddingHorizontal: 18,
      minWidth: "70%",
      alignItems: "center",
    },
    primaryButtonDisabled: { opacity: 0.75 },
    primaryButtonText: { color: c.onBrand, fontSize: 15, fontWeight: "800" },
    secondaryButton: {
      borderRadius: radii.pill,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      paddingVertical: 12,
      paddingHorizontal: 18,
    },
    secondaryButtonText: { color: c.fg, fontSize: 14, fontWeight: "800" },
  });
