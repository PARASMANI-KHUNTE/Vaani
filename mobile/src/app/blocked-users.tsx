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

export default function BlockedUsersScreen() {
  const session = useSessionStore((state) => state.session);
  const token = session?.accessToken;

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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#0f172a" />
          </Pressable>
          <Text style={styles.headerTitle}>Blocked Users</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#155e75" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </Pressable>
        <Text style={styles.headerTitle}>Blocked Users</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.infoBanner}>
        <Ionicons name="shield-checkmark" size={18} color="#64748b" />
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
              <Text style={styles.userName}>{item.name}</Text>
              <Text style={styles.userUsername}>@{item.username || "user"}</Text>
            </View>
            <Pressable
              style={[styles.unblockButton, actionLoading === item._id && styles.unblockButtonDisabled]}
              disabled={actionLoading === item._id}
              onPress={() => handleUnblock(item._id)}
            >
              {actionLoading === item._id ? (
                <ActivityIndicator size="small" color="#155e75" />
              ) : (
                <Text style={styles.unblockButtonText}>Unblock</Text>
              )}
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="shield-checkmark-outline" size={40} color="#94a3b8" />
            </View>
            <Text style={styles.emptyTitle}>No blocked users</Text>
            <Text style={styles.emptyBody}>
              Users you block will appear here. You can unblock them anytime.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f2e8" },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 12, backgroundColor: "#fffdf8", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  backButton: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: "700", color: "#0f172a", textAlign: "center" },
  headerSpacer: { width: 32 },
  infoBanner: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fffdf8", paddingHorizontal: 16, paddingVertical: 12, marginHorizontal: 16, marginTop: 12, borderRadius: 14, borderWidth: 1, borderColor: "#e2e8f0" },
  infoText: { flex: 1, fontSize: 13, color: "#64748b", lineHeight: 18 },
  listContent: { padding: 16, gap: 12 },
  userCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fffdf8", padding: 14, borderRadius: 18 },
  avatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: "#cffafe", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 20, fontWeight: "800", color: "#155e75" },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: "700", color: "#0f172a" },
  userUsername: { fontSize: 13, color: "#64748b" },
  unblockButton: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: "#e0f2fe", borderRadius: 10 },
  unblockButtonDisabled: { opacity: 0.5 },
  unblockButtonText: { fontSize: 13, fontWeight: "700", color: "#155e75" },
  emptyCard: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 24 },
  emptyIcon: { width: 80, height: 80, borderRadius: 24, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a", marginBottom: 8 },
  emptyBody: { fontSize: 14, color: "#64748b", textAlign: "center", lineHeight: 20 },
});