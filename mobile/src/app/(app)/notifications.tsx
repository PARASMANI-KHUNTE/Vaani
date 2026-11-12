import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useRef } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { ScreenShell } from "@/components/screen-shell";
import { useMobileSocial } from "@/hooks/use-mobile-social";
import { useNotificationStore } from "@/store/notification-store";
import { useSessionStore } from "@/store/session-store";
import { radii, spacing, typography, type AppColors } from "@/theme/tokens";
import { useAppTheme, useThemedStyles } from "@/theme/use-app-theme";

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

const getNotificationColor = (kind: string, colors: AppColors) => {
  switch (kind) {
    case "friend_request":
      return colors.brand;
    case "reaction":
      return colors.danger;
    case "message":
    default:
      return colors.accent;
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
  const { colors, isTablet } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const columns = isTablet ? 2 : 1;
  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  );

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
      if (previousAction && previousAction !== "received") {
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
      if (previousAction && previousAction !== "received") {
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
    <ScreenShell
      eyebrow="Alerts"
      title="Notifications"
      subtitle="Realtime messages and relationship updates from the existing socket system."
    >
      <View style={styles.headerRow}>
        <Text style={styles.count}>{unreadCount} unread</Text>
        <Pressable
          onPress={markAllRead}
          style={styles.markAllButton}
          accessibilityRole="button"
          accessibilityLabel="Mark all notifications as read"
        >
          <Text style={styles.markAllText}>Mark all read</Text>
        </Pressable>
      </View>

      <FlatList
        key={`notifications-${columns}`}
        data={notifications}
        numColumns={columns}
        columnWrapperStyle={columns > 1 ? styles.column : undefined}
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
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: getNotificationColor(item.kind, colors) },
                ]}
              >
                <Ionicons
                  name={getNotificationIcon(item.kind) as any}
                  size={18}
                  color={colors.onBrand}
                />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.title} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.body} numberOfLines={2}>
                  {item.body}
                </Text>
                <Text style={styles.time}>
                  {new Date(item.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
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
                  color={item.action === "accepted" ? colors.success : colors.muted}
                />
                <Text
                  style={[
                    styles.actionText,
                    { color: item.action === "accepted" ? colors.success : colors.muted },
                  ]}
                >
                  You {item.action === "accepted" ? "accepted" : "declined"}
                </Text>
              </View>
            ) : null}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="notifications-outline" size={30} color={colors.faint} />
            </View>
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptyBody}>
              Messages, friend requests, and reactions will land here.
            </Text>
          </View>
        }
      />
    </ScreenShell>
  );
}

const createStyles = (c: AppColors) =>
  StyleSheet.create({
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14,
      gap: spacing.sm,
    },
    count: { fontSize: 13, fontWeight: "700", color: c.brand },
    markAllButton: {
      borderRadius: radii.pill,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    markAllText: { color: c.brand, fontWeight: "700", fontSize: 12 },
    listContent: { paddingBottom: 24 },
    column: { gap: spacing.sm },
    card: {
      flex: 1,
      borderRadius: radii.xl,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      padding: 16,
      marginBottom: spacing.sm,
    },
    cardUnread: { borderColor: c.brand },
    cardContent: { flexDirection: "row", gap: 12 },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
    },
    textContainer: { flex: 1, minWidth: 0 },
    title: { fontSize: 15, fontWeight: "700", color: c.fg },
    body: { marginTop: 2, fontSize: 13, lineHeight: 19, color: c.muted },
    time: { marginTop: 4, fontSize: 11, color: c.faint },
    inlineActions: { flexDirection: "row", gap: 8, marginTop: 12, marginLeft: 52 },
    acceptButton: {
      borderRadius: radii.pill,
      backgroundColor: c.brand,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    acceptText: { color: c.onBrand, fontWeight: "700", fontSize: 12 },
    rejectButton: {
      borderRadius: radii.pill,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    rejectText: { color: c.fg, fontWeight: "700", fontSize: 12 },
    actionStatus: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 12, marginLeft: 52 },
    actionText: { fontSize: 12, fontWeight: "600" },
    emptyCard: {
      borderRadius: radii.xxl,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      padding: 32,
      gap: 12,
      alignItems: "center",
    },
    emptyIcon: {
      width: 60,
      height: 60,
      borderRadius: radii.lg,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.subtle,
    },
    emptyTitle: { ...typography.h3, color: c.fg },
    emptyBody: { ...typography.small, color: c.muted, textAlign: "center" },
  });
