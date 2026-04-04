import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ScreenShell } from "@/components/screen-shell";
import { useMobileChats } from "@/hooks/use-mobile-chats";
import { useSessionStore } from "@/store/session-store";
import NewChatModal from "@/app/new-chat";

const getPreview = (content?: string, type?: string) => {
  if (!type || type === "text") {
    return content || "No messages yet";
  }

  if (type === "image") return "Sent an image";
  if (type === "file") return "Sent a file";

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
  const { chats, isLoading, error, refresh } = useMobileChats({
    token: session?.accessToken,
  });
  const [showNewChat, setShowNewChat] = useState(false);

  const subtitle = useMemo(() => {
    if (isLoading && chats.length === 0) {
      return "Loading conversations from the live backend.";
    }

    if (error) {
      return error;
    }

    return "Your conversations appear here.";
  }, [chats.length, error, isLoading]);

  return (
    <ScreenShell
      eyebrow="Conversations"
      title="Chats"
      subtitle={subtitle}
      rightAction={
        <Pressable style={styles.addButton} onPress={() => setShowNewChat(true)}>
          <Ionicons name="add" size={24} color="#155e75" />
        </Pressable>
      }
    >
      {isLoading && chats.length === 0 ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#155e75" />
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item._id}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => void refresh()} />}
          contentContainerStyle={chats.length === 0 ? styles.emptyContent : styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No chats yet</Text>
              <Text style={styles.emptyBody}>
                Start a new conversation by tapping the + button above.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isGroup = item.isGroup;
            const displayName = isGroup ? item.groupName || "Group" : item.otherParticipant?.name || "Unknown";
            const avatarInitial = isGroup ? (item.groupName?.charAt(0) || "G") : (item.otherParticipant?.name?.charAt(0) || "?");
            const avatarColor = isGroup ? "#0f172a" : "#cffafe";
            const textColor = isGroup ? "#fff" : "#155e75";

            return (
              <Pressable
                style={styles.chatCard}
                onPress={() => router.push(`/chat/${item._id}`)}
                onLongPress={() => {
                  if (isGroup) {
                    // @ts-expect-error - group-info is a modal route
                    router.push("/group-info?chatId=" + item._id);
                  }
                }}
              >
                <View style={[styles.avatar, isGroup && styles.groupAvatar, { backgroundColor: avatarColor }]}>
                  <Text style={[styles.avatarText, { color: textColor }]}>
                    {avatarInitial.toUpperCase()}
                  </Text>
                  {isGroup && <View style={styles.groupBadge}><Ionicons name="people" size={12} color="#fff" /></View>}
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
                    <Text style={styles.chatPreview} numberOfLines={2}>
                      {getPreview(item.lastMessage?.content, item.lastMessage?.type)}
                    </Text>
                    {item.unreadCount > 0 ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.unreadCount > 99 ? "99+" : item.unreadCount}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}
      <NewChatModal visible={showNewChat} onClose={() => setShowNewChat(false)} />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e0f2fe",
    alignItems: "center",
    justifyContent: "center",
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingBottom: 24,
    gap: 12,
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  emptyCard: {
    borderRadius: 28,
    backgroundColor: "#fffdf8",
    padding: 20,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 21,
    color: "#64748b",
  },
  chatCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 24,
    backgroundColor: "#fffdf8",
    padding: 16,
    marginBottom: 12,
    shadowColor: "#0f172a",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  avatar: {
    height: 52,
    width: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  groupAvatar: {
    backgroundColor: "#0f172a",
  },
  avatarText: {
    color: "#155e75",
    fontWeight: "800",
    fontSize: 20,
  },
  groupBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#155e75",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fffdf8",
  },
  chatMeta: {
    flex: 1,
    gap: 6,
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  chatName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  chatTime: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "600",
  },
  chatPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  chatPreview: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: "#64748b",
  },
  badge: {
    minWidth: 24,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: "center",
    backgroundColor: "#155e75",
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
});