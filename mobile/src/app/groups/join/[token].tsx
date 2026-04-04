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

export default function GroupInviteJoinScreen() {
  const { token: inviteToken = "" } = useLocalSearchParams<{ token?: string }>();
  const session = useSessionStore((state) => state.session);
  const upsertChat = useChatStore((state) => state.upsertChat);

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
          <Pressable onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons name="chevron-back" size={22} color="#0f172a" />
          </Pressable>
          <Text style={styles.headerTitle}>Join group</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.centerState}>
          <View style={styles.bigIcon}>
            <Ionicons name="people-outline" size={44} color="#94a3b8" />
          </View>
          <Text style={styles.title}>Sign in required</Text>
          <Text style={styles.subtitle}>You need to sign in to preview and join this group invite.</Text>
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
        <Pressable onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </Pressable>
        <Text style={styles.headerTitle}>Group invite</Text>
        <Pressable
          onPress={() => {
            if (!inviteLinks) return;
            void Share.share({
              message: `Join my Canvas Chat group:\n${inviteLinks.web}\n\nApp link: ${inviteLinks.deep}`,
            });
          }}
          style={styles.iconButton}
        >
          <Ionicons name="share-outline" size={20} color="#155e75" />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#155e75" />
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <View style={styles.bigIcon}>
            <Ionicons name="alert-circle-outline" size={44} color="#94a3b8" />
          </View>
          <Text style={styles.title}>Invite unavailable</Text>
          <Text style={styles.subtitle}>{error}</Text>
          <Pressable style={styles.secondaryButton} onPress={() => router.replace("/(app)/chats")}>
            <Text style={styles.secondaryButtonText}>Go to chats</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.card}>
            <View style={styles.groupIcon}>
              <Ionicons name="people" size={32} color="#ffffff" />
            </View>
            <Text style={styles.groupName}>{preview?.groupName || "Group"}</Text>
            <Text style={styles.groupMeta}>{preview?.memberCount ?? 0} members</Text>
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
                <ActivityIndicator size="small" color="#ffffff" />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f2e8" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#fffdf8",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  iconButton: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: "800", color: "#0f172a", textAlign: "center" },
  headerSpacer: { width: 40 },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, gap: 12 },
  bigIcon: { width: 84, height: 84, borderRadius: 26, backgroundColor: "#fffdf8", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e2e8f0" },
  title: { fontSize: 20, fontWeight: "900", color: "#0f172a", textAlign: "center" },
  subtitle: { fontSize: 14, lineHeight: 20, color: "#64748b", textAlign: "center" },
  content: { flex: 1, padding: 20 },
  card: { borderRadius: 28, backgroundColor: "#fffdf8", padding: 20, alignItems: "center", gap: 10 },
  groupIcon: { width: 72, height: 72, borderRadius: 22, backgroundColor: "#155e75", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  groupName: { fontSize: 24, fontWeight: "900", color: "#0f172a", textAlign: "center" },
  groupMeta: { fontSize: 13, fontWeight: "700", color: "#0f766e" },
  helperText: { fontSize: 14, lineHeight: 20, color: "#64748b", textAlign: "center", marginTop: 2 },
  primaryButton: { marginTop: 14, borderRadius: 999, backgroundColor: "#155e75", paddingVertical: 14, paddingHorizontal: 18, minWidth: "70%", alignItems: "center" },
  primaryButtonDisabled: { opacity: 0.75 },
  primaryButtonText: { color: "#ffffff", fontSize: 15, fontWeight: "800" },
  secondaryButton: { borderRadius: 999, backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#dbe4ef", paddingVertical: 12, paddingHorizontal: 18 },
  secondaryButtonText: { color: "#0f172a", fontSize: 14, fontWeight: "800" },
});

