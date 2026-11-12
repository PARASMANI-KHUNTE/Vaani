import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ScreenShell } from "@/components/screen-shell";
import { useMobileChats } from "@/hooks/use-mobile-chats";
import { useSessionStore } from "@/store/session-store";
import { radii, spacing, typography, type AppColors } from "@/theme/tokens";
import { useAppTheme, useThemedStyles } from "@/theme/use-app-theme";
import NewChatModal from "@/app/new-chat";

const getPreview = (content?: string, type?: string) => {
  if (!type || type === "text") {
    return content || "No messages yet";
  }

  if (type === "image") return "Sent an image";
  if (type === "file") return "Sent a file";
  if (type === "video") return "Sent a video";
  if (type === "voice") return "Sent a voice message";

  return "Sent a message";
};

const formatChatTime = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Now";
  if (diffMins < 60) return `${diffMins}m`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;

  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(date);
};

export default function ChatsScreen() {
  const session = useSessionStore((state) => state.session);
  const { chats, isLoading, isLoadingMore, error, refresh, loadMoreChats } = useMobileChats({
    token: session?.accessToken,
  });
  const [showNewChat, setShowNewChat] = useState(false);
  const [query, setQuery] = useState("");
  const { colors, isTablet } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const columns = isTablet ? 2 : 1;

  const subtitle = useMemo(() => {
    if (isLoading && chats.length === 0) {
      return "Loading conversations from the live backend.";
    }

    if (error) {
      return error;
    }

    return "Your conversations appear here.";
  }, [chats.length, error, isLoading]);

  const filteredChats = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chats;

    return chats.filter((item) => {
      const displayName = item.isGroup
        ? item.groupName || "Group"
        : item.otherParticipant?.name || "Unknown";
      return displayName.toLowerCase().includes(q);
    });
  }, [chats, query]);

  return (
    <ScreenShell
      eyebrow="Conversations"
      title="Chats"
      subtitle={subtitle}
      rightAction={
        <Pressable
          style={styles.addButton}
          onPress={() => setShowNewChat(true)}
          accessibilityRole="button"
          accessibilityLabel="Start a new chat"
        >
          <Ionicons name="add" size={22} color={colors.brand} />
        </Pressable>
      }
    >
      {isLoading && chats.length === 0 ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : (
        <View style={styles.stack}>
          <View style={styles.searchRow}>
            <Ionicons name="search" size={18} color={colors.faint} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search chats..."
              placeholderTextColor={colors.faint}
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Search chats"
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

          <FlatList
            key={`chats-${columns}`}
            data={filteredChats}
            numColumns={columns}
            columnWrapperStyle={columns > 1 ? styles.column : undefined}
            keyExtractor={(item) => item._id}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={() => void refresh()}
                tintColor={colors.brand}
                colors={[colors.brand]}
              />
            }
            contentContainerStyle={
              filteredChats.length === 0 ? styles.emptyContent : styles.listContent
            }
            onEndReached={() => {
              if (!query.trim()) {
                void loadMoreChats();
              }
            }}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              isLoadingMore && !query.trim() ? (
                <View style={styles.loadingMore}>
                  <ActivityIndicator size="small" color={colors.brand} />
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="chatbubbles-outline" size={30} color={colors.faint} />
                </View>
                <Text style={styles.emptyTitle}>
                  {query.trim() ? "No matches" : "No chats yet"}
                </Text>
                <Text style={styles.emptyBody}>
                  {query.trim()
                    ? "Try a different search."
                    : "Start a new conversation by tapping the + button above."}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const isGroup = item.isGroup;
              const displayName = isGroup
                ? item.groupName || "Group"
                : item.otherParticipant?.name || "Unknown";
              const avatarInitial = isGroup
                ? item.groupName?.charAt(0) || "G"
                : item.otherParticipant?.name?.charAt(0) || "?";
              const avatarUrl = isGroup ? item.groupAvatar : item.otherParticipant?.avatar;

              return (
                <Pressable
                  style={({ pressed }) => [styles.chatCard, pressed && styles.chatCardPressed]}
                  onPress={() => router.push(`/chat/${item._id}`)}
                  onLongPress={() => {
                    if (isGroup) {
                      // @ts-expect-error - group-info is a modal route
                      router.push("/group-info?chatId=" + item._id);
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Open chat with ${displayName}`}
                >
                  <View style={styles.avatar}>
                    {avatarUrl ? (
                      <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                    ) : (
                      <Text style={styles.avatarText}>{avatarInitial.toUpperCase()}</Text>
                    )}
                    {isGroup && (
                      <View style={styles.groupBadge}>
                        <Ionicons name="people" size={11} color={colors.onBrand} />
                      </View>
                    )}
                  </View>
                  <View style={styles.chatMeta}>
                    <View style={styles.chatHeader}>
                      <Text style={styles.chatName} numberOfLines={1}>
                        {displayName}
                      </Text>
                      <Text style={styles.chatTime}>
                        {formatChatTime(item.lastMessage?.createdAt)}
                      </Text>
                    </View>
                    <View style={styles.chatPreviewRow}>
                      <Text style={styles.chatPreview} numberOfLines={1}>
                        {getPreview(item.lastMessage?.content, item.lastMessage?.type)}
                      </Text>
                      {item.unreadCount > 0 ? (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>
                            {item.unreadCount > 99 ? "99+" : item.unreadCount}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </Pressable>
              );
            }}
          />
        </View>
      )}
      <NewChatModal visible={showNewChat} onClose={() => setShowNewChat(false)} />
    </ScreenShell>
  );
}

const createStyles = (c: AppColors) =>
  StyleSheet.create({
    stack: { flex: 1, gap: spacing.sm },
    addButton: {
      width: 42,
      height: 42,
      borderRadius: radii.md,
      backgroundColor: c.brandSoft,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: c.line,
    },
    centerState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
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
    listContent: {
      paddingBottom: spacing.xl,
    },
    loadingMore: {
      paddingVertical: spacing.md,
      alignItems: "center",
    },
    emptyContent: {
      flexGrow: 1,
      justifyContent: "center",
    },
    column: {
      gap: spacing.sm,
    },
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
    emptyTitle: {
      ...typography.h3,
      color: c.fg,
    },
    emptyBody: {
      ...typography.small,
      color: c.muted,
      textAlign: "center",
    },
    chatCard: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.surface,
      padding: 14,
      marginBottom: spacing.sm,
    },
    chatCardPressed: {
      backgroundColor: c.subtle,
    },
    avatar: {
      height: 50,
      width: 50,
      borderRadius: radii.md,
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      backgroundColor: c.brandSoft,
      overflow: "visible",
    },
    avatarImage: {
      height: 50,
      width: 50,
      borderRadius: radii.md,
    },
    avatarText: {
      color: c.brand,
      fontWeight: "800",
      fontSize: 19,
    },
    groupBadge: {
      position: "absolute",
      bottom: -3,
      right: -3,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: c.brand,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: c.surface,
    },
    chatMeta: {
      flex: 1,
      gap: 5,
      minWidth: 0,
    },
    chatHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.xs,
    },
    chatName: {
      flex: 1,
      fontSize: 15,
      fontWeight: "700",
      color: c.fg,
      letterSpacing: -0.2,
    },
    chatTime: {
      fontSize: 11,
      color: c.faint,
      fontWeight: "600",
    },
    chatPreviewRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
    },
    chatPreview: {
      flex: 1,
      fontSize: 13,
      lineHeight: 18,
      color: c.muted,
    },
    badge: {
      minWidth: 22,
      borderRadius: 999,
      paddingHorizontal: 7,
      paddingVertical: 3,
      alignItems: "center",
      backgroundColor: c.brand,
    },
    badgeText: {
      color: c.onBrand,
      fontSize: 10,
      fontWeight: "700",
    },
  });
