import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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

export default function ExploreScreen() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 350);
  const token = useSessionStore((state) => state.session?.accessToken);
  const upsertChat = useChatStore((state) => state.upsertChat);
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
      subtitle={error || "Search, connect, and start chats from the Android app."}
    >
      <View style={styles.stack}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name, username, or tagline"
          placeholderTextColor="#94a3b8"
          style={styles.searchInput}
        />

        {isLoadingDirectory ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color="#155e75" />
          </View>
        ) : (
          <FlatList
            data={directoryUsers}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.userCard}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.meta}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.secondary}>@{item.username || "user"} {item.tagline ? `• ${item.tagline}` : ""}</Text>
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
                      <Text style={styles.actionPrimaryText}>Chat</Text>
                    </Pressable>

                    {item.isFriend ? (
                      <Pressable style={styles.actionSecondary} onPress={() => void unfriend(item._id)}>
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
                      <Pressable style={styles.actionSecondary} onPress={() => void sendRequest(item._id)}>
                        <Text style={styles.actionSecondaryText}>Add friend</Text>
                      </Pressable>
                    )}

                    <Pressable style={styles.actionGhost} onPress={() => void toggleBlock(item)}>
                      <Text style={styles.actionGhostText}>{item.hasBlocked ? "Unblock" : "Block"}</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No users found</Text>
                <Text style={styles.emptyBody}>Try a different search or come back after more users join.</Text>
              </View>
            }
          />
        )}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  stack: { flex: 1, gap: 14 },
  searchInput: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#dbe4ef",
    backgroundColor: "#fffdf8",
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: "#0f172a",
  },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { paddingBottom: 24, gap: 12 },
  userCard: {
    flexDirection: "row",
    gap: 14,
    borderRadius: 24,
    backgroundColor: "#fffdf8",
    padding: 16,
    marginBottom: 12,
  },
  avatar: {
    height: 52,
    width: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#cffafe",
  },
  avatarText: { color: "#155e75", fontWeight: "800", fontSize: 20 },
  meta: { flex: 1, gap: 5 },
  name: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  secondary: { fontSize: 13, color: "#64748b" },
  bio: { fontSize: 13, lineHeight: 19, color: "#475569" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  actionPrimary: {
    borderRadius: 999,
    backgroundColor: "#155e75",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionPrimaryText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  actionSecondary: {
    borderRadius: 999,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dbe4ef",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionSecondaryText: { color: "#0f172a", fontWeight: "700", fontSize: 13 },
  actionGhost: {
    borderRadius: 999,
    backgroundColor: "#fef2f2",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionGhostText: { color: "#b91c1c", fontWeight: "700", fontSize: 13 },
  badge: {
    borderRadius: 999,
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  badgeText: { color: "#475569", fontWeight: "600", fontSize: 12 },
  emptyCard: { borderRadius: 24, backgroundColor: "#fffdf8", padding: 18, gap: 6 },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: "#0f172a" },
  emptyBody: { fontSize: 14, lineHeight: 20, color: "#64748b" },
});
