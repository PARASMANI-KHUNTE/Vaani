import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useRef } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { ScreenShell } from "@/components/screen-shell";
import { useMobileSocial } from "@/hooks/use-mobile-social";
import { useNotificationStore } from "@/store/notification-store";
import { useSessionStore } from "@/store/session-store";

const getNotificationIcon = (kind: string) => {
  switch (kind) {
    case "friend_request":
      return "person-add";
    case "reaction":
      return "heart";
    case "message":
    default:
      return "chatbubble";
  }
};

const getNotificationColor = (kind: string) => {
  switch (kind) {
    case "friend_request":
      return "#155e75";
    case "reaction":
      return "#dc2626";
    case "message":
    default:
      return "#155e75";
  }
};

export default function NotificationsScreen() {
  const token = useSessionStore((state) => state.session?.accessToken);
  const notifications = useNotificationStore((state) => state.notifications);
  const markRead = useNotificationStore((state) => state.markRead);
  const markAllRead = useNotificationStore((state) => state.markAllRead);
  const updateNotificationAction = useNotificationStore((state) => state.updateNotificationAction);
  const updateFriendStatus = useNotificationStore((state) => state.updateFriendStatus);
  const removeFriendRequest = useNotificationStore((state) => state.removeFriendRequest);
  const { acceptRequest, rejectRequest } = useMobileSocial({ token });
  const pendingRequestsRef = useRef<Set<string>>(new Set());

  const handleAccept = (userId: string, notificationId: string) => {
    const requestKey = `accept:${userId}:${notificationId}`;
    if (pendingRequestsRef.current.has(requestKey)) return;
    pendingRequestsRef.current.add(requestKey);

    const notification = useNotificationStore.getState().notifications.find(n => n.id === notificationId);
    const previousAction = notification?.action;
    const previousStatus = useNotificationStore.getState().directoryUsers[userId];

    updateNotificationAction(notificationId, "accepted");
    updateFriendStatus({
      userId,
      isFriend: true,
      requestSent: false,
      requestReceived: false,
    });
    markRead(notificationId);
    
    acceptRequest(userId).catch((err) => {
      if (previousAction) {
        updateNotificationAction(notificationId, previousAction);
      }
      if (previousStatus) {
        updateFriendStatus({
          userId,
          isFriend: previousStatus.isFriend,
          requestSent: previousStatus.requestSent,
          requestReceived: previousStatus.requestReceived,
          friendsCount: previousStatus.friendsCount,
        });
      }
      console.error("Failed to accept friend request:", err);
    }).finally(() => {
      pendingRequestsRef.current.delete(requestKey);
    });
  };

  const handleReject = (userId: string, notificationId: string) => {
    const requestKey = `reject:${userId}:${notificationId}`;
    if (pendingRequestsRef.current.has(requestKey)) return;
    pendingRequestsRef.current.add(requestKey);

    const notification = useNotificationStore.getState().notifications.find(n => n.id === notificationId);
    const previousAction = notification?.action;
    const previousStatus = useNotificationStore.getState().directoryUsers[userId];

    updateNotificationAction(notificationId, "rejected");
    removeFriendRequest(userId);
    markRead(notificationId);

    rejectRequest(userId).catch((err) => {
      if (previousAction) {
        updateNotificationAction(notificationId, previousAction);
      }
      if (previousStatus) {
        updateFriendStatus({
          userId,
          isFriend: previousStatus.isFriend,
          requestSent: previousStatus.requestSent,
          requestReceived: previousStatus.requestReceived,
          friendsCount: previousStatus.friendsCount,
        });
      }
      console.error("Failed to reject friend request:", err);
    }).finally(() => {
      pendingRequestsRef.current.delete(requestKey);
    });
  };

  return (
    <ScreenShell eyebrow="Alerts" title="Notifications" subtitle="Realtime messages and relationship updates from the existing socket system.">
      <View style={styles.headerRow}>
        <Text style={styles.count}>{notifications.filter((item) => !item.read).length} unread</Text>
        <Pressable onPress={markAllRead} style={styles.markAllButton}>
          <Text style={styles.markAllText}>Mark all read</Text>
        </Pressable>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={[styles.card, !item.read && styles.cardUnread]}>
            <Pressable
              style={styles.cardContent}
              onPress={() => {
                markRead(item.id);
                if (item.chatId) {
                  router.push(`/chat/${item.chatId}`);
                }
              }}
            >
              <View style={[styles.iconContainer, { backgroundColor: getNotificationColor(item.kind) }]}>
                <Ionicons name={getNotificationIcon(item.kind) as any} size={18} color="#ffffff" />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.body}>{item.body}</Text>
                <Text style={styles.time}>
                  {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
            </Pressable>

            {item.kind === "friend_request" && item.action === "received" && item.userId ? (
              <View style={styles.inlineActions}>
                <Pressable
                  style={styles.acceptButton}
                  onPress={() => handleAccept(item.userId!, item.id)}
                >
                  <Text style={styles.acceptText}>Accept</Text>
                </Pressable>
                <Pressable
                  style={styles.rejectButton}
                  onPress={() => handleReject(item.userId!, item.id)}
                >
                  <Text style={styles.rejectText}>Reject</Text>
                </Pressable>
              </View>
            ) : item.kind === "friend_request" && (item.action === "accepted" || item.action === "rejected") ? (
              <View style={styles.actionStatus}>
                <Ionicons
                  name={item.action === "accepted" ? "checkmark-circle" : "close-circle"}
                  size={14}
                  color={item.action === "accepted" ? "#059669" : "#64748b"}
                />
                <Text style={[
                  styles.actionText,
                  { color: item.action === "accepted" ? "#059669" : "#64748b" }
                ]}>
                  You {item.action === "accepted" ? "accepted" : "declined"}
                </Text>
              </View>
            ) : null}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Ionicons name="notifications-outline" size={48} color="#94a3b8" />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptyBody}>Messages, friend requests, and reactions will land here.</Text>
          </View>
        }
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  count: { fontSize: 13, fontWeight: "700", color: "#0f766e" },
  markAllButton: { borderRadius: 999, backgroundColor: "#fffdf8", paddingHorizontal: 12, paddingVertical: 8 },
  markAllText: { color: "#155e75", fontWeight: "700", fontSize: 12 },
  listContent: { paddingBottom: 24, gap: 12 },
  card: { borderRadius: 24, backgroundColor: "#fffdf8", padding: 16, marginBottom: 12 },
  cardUnread: { borderWidth: 1, borderColor: "#99f6e4" },
  cardContent: { flexDirection: "row", gap: 12 },
  iconContainer: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  textContainer: { flex: 1 },
  title: { fontSize: 15, fontWeight: "700", color: "#0f172a" },
  body: { marginTop: 2, fontSize: 13, lineHeight: 19, color: "#475569" },
  time: { marginTop: 4, fontSize: 11, color: "#94a3b8" },
  inlineActions: { flexDirection: "row", gap: 8, marginTop: 12, marginLeft: 52 },
  acceptButton: { borderRadius: 999, backgroundColor: "#155e75", paddingHorizontal: 12, paddingVertical: 10 },
  acceptText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  rejectButton: { borderRadius: 999, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", paddingHorizontal: 12, paddingVertical: 10 },
  rejectText: { color: "#0f172a", fontWeight: "700", fontSize: 12 },
  actionStatus: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 12, marginLeft: 52 },
  actionText: { fontSize: 12, fontWeight: "600" },
  emptyCard: { borderRadius: 24, backgroundColor: "#fffdf8", padding: 32, gap: 12, alignItems: "center" },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: "#0f172a" },
  emptyBody: { fontSize: 14, lineHeight: 20, color: "#64748b", textAlign: "center" },
});
