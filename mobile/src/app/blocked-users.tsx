import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getMobileBlockedUsers, unblockMobileUser } from "@/lib/api/client";
import { ChatParticipant } from "@/lib/types";
import { useSessionStore } from "@/store/session-store";
import { radii, spacing, typography, type AppColors } from "@/theme/tokens";
import { useAppTheme, useThemedStyles } from "@/theme/use-app-theme";

export default function BlockedUsersScreen() {
  const session = useSessionStore((state) => state.session);
  const token = session?.accessToken;
  const { colors, contentWidth } = useAppTheme();
  const styles = useThemedStyles(createStyles);

  const [blockedUsers, setBlockedUsers] = useState<ChatParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadBlockedUsers = useCallback(async () => {
    if (!token) return;
    try {
      const response = await getMobileBlockedUsers(token);
      setBlockedUsers(response.blockedUsers);
    } catch (err) {
      console.error("Failed to load blocked users:", err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadBlockedUsers();
  }, [loadBlockedUsers]);

  const handleUnblock = async (userId: string) => {
    if (!token) return;
    try {
      setActionLoading(userId);
      await unblockMobileUser(token, userId);
      setBlockedUsers((prev) => prev.filter((u) => u._id !== userId));
    } catch (err) {
      console.error("Failed to unblock user:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const header = (
    <View style={styles.header}>
      <Pressable
        onPress={() => router.back()}
        style={styles.backButton}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="chevron-back" size={24} color={colors.fg} />
      </Pressable>
      <Text style={styles.headerTitle}>Blocked users</Text>
      <View style={styles.headerSpacer} />
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        {header}
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {header}
      <View style={[styles.body, { maxWidth: contentWidth }]}>
        <View style={styles.infoBanner}>
          <Ionicons name="shield-checkmark" size={18} color={colors.muted} />
          <Text style={styles.infoText}>
            Blocked users cannot send you messages or see your profile.
          </Text>
        </View>

        <FlatList
          data={blockedUsers}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.userCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.userUsername} numberOfLines={1}>
                  @{item.username || "user"}
                </Text>
              </View>
              <Pressable
                style={[
                  styles.unblockButton,
                  actionLoading === item._id && styles.unblockButtonDisabled,
                ]}
                disabled={actionLoading === item._id}
                onPress={() => handleUnblock(item._id)}
                accessibilityRole="button"
                accessibilityLabel={`Unblock ${item.name}`}
              >
                {actionLoading === item._id ? (
                  <ActivityIndicator size="small" color={colors.brand} />
                ) : (
                  <Text style={styles.unblockButtonText}>Unblock</Text>
                )}
              </Pressable>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Ionicons name="shield-checkmark-outline" size={32} color={colors.faint} />
              </View>
              <Text style={styles.emptyTitle}>No blocked users</Text>
              <Text style={styles.emptyBody}>
                Users you block will appear here. You can unblock them anytime.
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const createStyles = (c: AppColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.canvas },
    body: { flex: 1, width: "100%", alignSelf: "center" },
    centerState: { flex: 1, alignItems: "center", justifyContent: "center" },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      backgroundColor: c.surface,
      borderBottomWidth: 1,
      borderBottomColor: c.line,
    },
    backButton: { padding: 4 },
    headerTitle: {
      flex: 1,
      ...typography.h3,
      color: c.fg,
      textAlign: "center",
    },
    headerSpacer: { width: 32 },
    infoBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: c.surface,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: c.line,
    },
    infoText: { flex: 1, fontSize: 13, color: c.muted, lineHeight: 18 },
    listContent: { padding: spacing.md, gap: spacing.sm },
    userCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      padding: 14,
      borderRadius: radii.lg,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: radii.md,
      backgroundColor: c.brandSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: { fontSize: 20, fontWeight: "800", color: c.brand },
    userInfo: { flex: 1, minWidth: 0 },
    userName: { fontSize: 15, fontWeight: "700", color: c.fg },
    userUsername: { fontSize: 13, color: c.muted },
    unblockButton: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: c.brandSoft,
      borderRadius: radii.sm,
    },
    unblockButtonDisabled: { opacity: 0.5 },
    unblockButtonText: { fontSize: 13, fontWeight: "700", color: c.brand },
    emptyCard: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 24, gap: spacing.sm },
    emptyIcon: {
      width: 72,
      height: 72,
      borderRadius: radii.xl,
      backgroundColor: c.subtle,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyTitle: { ...typography.h3, color: c.fg },
    emptyBody: { ...typography.small, color: c.muted, textAlign: "center" },
  });
