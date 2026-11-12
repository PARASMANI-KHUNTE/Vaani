import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ScreenShell } from "@/components/screen-shell";
import { useDebounce } from "@/hooks/use-debounce";
import { useMobileSocial } from "@/hooks/use-mobile-social";
import { useChatStore } from "@/store/chat-store";
import { useSessionStore } from "@/store/session-store";
import { radii, spacing, typography, type AppColors } from "@/theme/tokens";
import { useAppTheme, useThemedStyles } from "@/theme/use-app-theme";

export default function ExploreScreen() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 350);
  const token = useSessionStore((state) => state.session?.accessToken);
  const upsertChat = useChatStore((state) => state.upsertChat);
  const { colors, isTablet } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const columns = isTablet ? 2 : 1;
  const {
    directoryUsers,
    isLoadingDirectory,
    error,
    sendRequest,
    unfriend,
    toggleBlock,
    startChatWithUser,
  } = useMobileSocial({
    token,
    query: debouncedQuery,
  });

  return (
    <ScreenShell
      eyebrow="Discover"
      title="Explore users"
      subtitle={error || "Search, connect, and start chats from the app."}
    >
      <View style={styles.stack}>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color={colors.faint} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name, username, or tagline"
            placeholderTextColor={colors.faint}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Search people"
          />
          {query.trim() ? (
            <Pressable
              onPress={() => setQuery("")}
              style={styles.clearButton}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Ionicons name="close" size={16} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>

        {isLoadingDirectory ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={colors.brand} />
          </View>
        ) : (
          <FlatList
            key={`explore-${columns}`}
            data={directoryUsers}
            numColumns={columns}
            columnWrapperStyle={columns > 1 ? styles.column : undefined}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <View style={styles.userCard}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.avatar}>
                    {item.avatar ? (
                      <Image source={{ uri: item.avatar }} style={styles.avatarImage} />
                    ) : (
                      <Text style={styles.avatarText}>
                        {item.name.charAt(0).toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <View style={styles.meta}>
                    <View style={styles.nameRow}>
                      <Text style={styles.name} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {item.isFriend ? (
                        <Ionicons name="checkmark-circle" size={15} color={colors.success} />
                      ) : null}
                    </View>
                    <Text style={styles.secondary} numberOfLines={1}>
                      @{item.username || "user"}
                      {item.tagline ? ` · ${item.tagline}` : ""}
                    </Text>
                  </View>
                </View>

                {item.bio ? (
                  <Text style={styles.bio} numberOfLines={2}>
                    {item.bio}
                  </Text>
                ) : null}

                <View style={styles.actions}>
                  <Pressable
                    style={styles.actionPrimary}
                    onPress={() => {
                      void startChatWithUser(item._id).then((chat) => {
                        if (chat) {
                          upsertChat(chat);
                          router.push(`/chat/${chat._id}`);
                        }
                      });
                    }}
                  >
                    <Ionicons name="chatbubble-outline" size={14} color={colors.onBrand} />
                    <Text style={styles.actionPrimaryText}>Chat</Text>
                  </Pressable>

                  {item.isFriend ? (
                    <Pressable
                      style={styles.actionSecondary}
                      onPress={() => void unfriend(item._id)}
                    >
                      <Text style={styles.actionSecondaryText}>Unfriend</Text>
                    </Pressable>
                  ) : item.requestSent ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>Request sent</Text>
                    </View>
                  ) : item.requestReceived ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>Respond in alerts</Text>
                    </View>
                  ) : (
                    <Pressable
                      style={styles.actionSecondary}
                      onPress={() => void sendRequest(item._id)}
                    >
                      <Text style={styles.actionSecondaryText}>Add friend</Text>
                    </Pressable>
                  )}

                  <Pressable style={styles.actionGhost} onPress={() => void toggleBlock(item)}>
                    <Text style={styles.actionGhostText}>
                      {item.hasBlocked ? "Unblock" : "Block"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="people-outline" size={28} color={colors.faint} />
                </View>
                <Text style={styles.emptyTitle}>No users found</Text>
                <Text style={styles.emptyBody}>
                  Try a different search or come back after more users join.
                </Text>
              </View>
            }
          />
        )}
      </View>
    </ScreenShell>
  );
}

const createStyles = (c: AppColors) =>
  StyleSheet.create({
    stack: { flex: 1, gap: spacing.sm },
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.surface,
      paddingHorizontal: spacing.md,
      paddingVertical: 11,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: c.fg,
      paddingVertical: 0,
    },
    clearButton: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.subtle,
    },
    centerState: { flex: 1, alignItems: "center", justifyContent: "center" },
    listContent: { paddingBottom: spacing.xl },
    column: { gap: spacing.sm },
    userCard: {
      flex: 1,
      gap: spacing.sm,
      borderRadius: radii.lg,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      padding: 14,
      marginBottom: spacing.sm,
    },
    cardHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    avatar: {
      height: 48,
      width: 48,
      borderRadius: radii.md,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.brandSoft,
      overflow: "hidden",
    },
    avatarImage: {
      height: 48,
      width: 48,
    },
    avatarText: { color: c.brand, fontWeight: "800", fontSize: 18 },
    meta: { flex: 1, gap: 2, minWidth: 0 },
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    name: { flexShrink: 1, fontSize: 15, fontWeight: "700", color: c.fg },
    secondary: { fontSize: 12, color: c.muted },
    bio: { fontSize: 13, lineHeight: 19, color: c.muted },
    actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 2 },
    actionPrimary: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: radii.pill,
      backgroundColor: c.brand,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    actionPrimaryText: { color: c.onBrand, fontWeight: "700", fontSize: 12 },
    actionSecondary: {
      borderRadius: radii.pill,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    actionSecondaryText: { color: c.fg, fontWeight: "700", fontSize: 12 },
    actionGhost: {
      borderRadius: radii.pill,
      backgroundColor: c.dangerSoft,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    actionGhostText: { color: c.danger, fontWeight: "700", fontSize: 12 },
    badge: {
      borderRadius: radii.pill,
      backgroundColor: c.subtle,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    badgeText: { color: c.muted, fontWeight: "600", fontSize: 12 },
    emptyCard: {
      borderRadius: radii.xxl,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      padding: spacing.xl,
      alignItems: "center",
      gap: spacing.xs,
    },
    emptyIcon: {
      width: 60,
      height: 60,
      borderRadius: radii.lg,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.subtle,
      marginBottom: 2,
    },
    emptyTitle: { ...typography.h3, color: c.fg },
    emptyBody: { ...typography.small, color: c.muted, textAlign: "center" },
  });
