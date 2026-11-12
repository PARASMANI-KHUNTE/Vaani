import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createMobileChat, createMobileGroupChat } from "@/lib/api/client";
import { useMobileSocial } from "@/hooks/use-mobile-social";
import { useChatStore } from "@/store/chat-store";
import { useSessionStore } from "@/store/session-store";
import { radii, spacing, typography, type AppColors } from "@/theme/tokens";
import { useAppTheme, useThemedStyles } from "@/theme/use-app-theme";

interface NewChatModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function NewChatModal({ visible, onClose }: NewChatModalProps) {
  const session = useSessionStore((state) => state.session);
  const token = session?.accessToken;
  const upsertChat = useChatStore((state) => state.upsertChat);
  const { colors, contentWidth } = useAppTheme();
  const styles = useThemedStyles(createStyles);

  const { directoryUsers, isLoadingDirectory } = useMobileSocial({ token });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const friends = directoryUsers.filter((u) => u.isFriend);
  const filteredUsers = searchQuery.trim()
    ? directoryUsers.filter(
        (u) =>
          u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.username?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : friends;

  const handleStartChat = async (userId: string) => {
    if (!token) return;
    try {
      setIsCreating(true);
      const response = await createMobileChat(token, userId);
      upsertChat(response.chat);
      router.push(`/chat/${response.chat._id}`);
      onClose();
      setSelectedUserIds([]);
      setSearchQuery("");
    } catch (err) {
      console.error("Failed to start chat:", err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!token || selectedUserIds.length < 2 || !groupName.trim()) return;
    try {
      setIsCreating(true);
      const response = await createMobileGroupChat(token, {
        groupName: groupName.trim(),
        participantIds: selectedUserIds,
      });
      upsertChat(response.chat);
      router.push(`/chat/${response.chat._id}`);
      onClose();
      setSelectedUserIds([]);
      setGroupName("");
      setIsGroupMode(false);
    } catch (err) {
      console.error("Failed to create group:", err);
    } finally {
      setIsCreating(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleClose = () => {
    setSelectedUserIds([]);
    setSearchQuery("");
    setGroupName("");
    setIsGroupMode(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={[styles.inner, { maxWidth: contentWidth }]}>
          <View style={styles.header}>
            <Pressable
              onPress={handleClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close new chat"
            >
              <Ionicons name="close" size={22} color={colors.fg} />
            </Pressable>
            <Text style={styles.title}>New chat</Text>
            <Pressable
              style={[styles.modeButton, isGroupMode && styles.modeButtonActive]}
              onPress={() => {
                setIsGroupMode(!isGroupMode);
                setSelectedUserIds([]);
              }}
              accessibilityRole="button"
              accessibilityLabel={isGroupMode ? "Switch to direct chat" : "Create a group"}
            >
              <Ionicons
                name="people"
                size={18}
                color={isGroupMode ? colors.onBrand : colors.brand}
              />
            </Pressable>
          </View>

          {isGroupMode && (
            <View style={styles.groupNameContainer}>
              <TextInput
                value={groupName}
                onChangeText={setGroupName}
                placeholder="Group name"
                placeholderTextColor={colors.faint}
                style={styles.groupNameInput}
              />
              <Text style={styles.selectedCount}>{selectedUserIds.length} selected</Text>
            </View>
          )}

          {!isGroupMode && (
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={18} color={colors.faint} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search friends..."
                placeholderTextColor={colors.faint}
                style={styles.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.trim() ? (
                <Pressable
                  onPress={() => setSearchQuery("")}
                  style={styles.clearButton}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                >
                  <Ionicons name="close" size={14} color={colors.muted} />
                </Pressable>
              ) : null}
            </View>
          )}

          {isLoadingDirectory ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.brand} />
            </View>
          ) : (
            <FlatList
              data={filteredUsers}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={styles.emptyCard}>
                  <View style={styles.emptyIcon}>
                    <Ionicons name="people-outline" size={30} color={colors.faint} />
                  </View>
                  <Text style={styles.emptyTitle}>No friends yet</Text>
                  <Text style={styles.emptyBody}>
                    Add friends from the Explore tab to start chatting.
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const isSelected = selectedUserIds.includes(item._id);
                const isDisabled = !isGroupMode && !item.isFriend;

                return (
                  <Pressable
                    style={[
                      styles.userCard,
                      isSelected && styles.userCardSelected,
                      isDisabled && styles.userCardDisabled,
                    ]}
                    disabled={isDisabled}
                    onPress={() => {
                      if (isGroupMode) {
                        toggleUserSelection(item._id);
                      } else {
                        void handleStartChat(item._id);
                      }
                    }}
                  >
                    <View style={[styles.avatar, isSelected && styles.avatarSelected]}>
                      <Text style={[styles.avatarText, isSelected && styles.avatarTextSelected]}>
                        {item.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.userUsername} numberOfLines={1}>
                        @{item.username || "user"}
                      </Text>
                      {!item.isFriend && !isGroupMode && (
                        <Text style={styles.notFriendText}>Not a friend</Text>
                      )}
                    </View>
                    {isGroupMode && isSelected && (
                      <Ionicons name="checkmark-circle" size={24} color={colors.brand} />
                    )}
                  </Pressable>
                );
              }}
            />
          )}

          {isGroupMode && selectedUserIds.length >= 2 && (
            <View style={styles.createButtonContainer}>
              <Pressable
                style={[
                  styles.createButton,
                  (!groupName.trim() || isCreating) && styles.createButtonDisabled,
                ]}
                disabled={!groupName.trim() || isCreating}
                onPress={handleCreateGroup}
              >
                {isCreating ? (
                  <ActivityIndicator size="small" color={colors.onBrand} />
                ) : (
                  <>
                    <Ionicons name="chatbubbles" size={20} color={colors.onBrand} />
                    <Text style={styles.createButtonText}>Create group</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (c: AppColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.canvas },
    inner: { flex: 1, width: "100%", alignSelf: "center" },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: c.line,
    },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.subtle,
    },
    title: { ...typography.h3, color: c.fg },
    modeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.brandSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    modeButtonActive: { backgroundColor: c.brand },
    groupNameContainer: { padding: spacing.md, gap: 8 },
    groupNameInput: {
      backgroundColor: c.surface,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      fontSize: 16,
      color: c.fg,
      borderWidth: 1,
      borderColor: c.line,
    },
    selectedCount: { fontSize: 13, color: c.muted },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginHorizontal: spacing.md,
      marginVertical: spacing.sm,
      paddingHorizontal: 14,
      backgroundColor: c.surface,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: c.line,
    },
    searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: c.fg },
    clearButton: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.subtle,
    },
    loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
    listContent: { padding: spacing.md, gap: 10 },
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
    userCardSelected: { backgroundColor: c.brandSoft, borderColor: c.brand },
    userCardDisabled: { opacity: 0.5 },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: radii.md,
      backgroundColor: c.brandSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarSelected: { backgroundColor: c.brand },
    avatarText: { fontSize: 20, fontWeight: "800", color: c.brand },
    avatarTextSelected: { color: c.onBrand },
    userInfo: { flex: 1, minWidth: 0 },
    userName: { fontSize: 16, fontWeight: "700", color: c.fg },
    userUsername: { fontSize: 13, color: c.muted },
    notFriendText: { fontSize: 11, color: c.warning, marginTop: 2 },
    emptyCard: { alignItems: "center", paddingVertical: 60, gap: spacing.sm },
    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: radii.lg,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.subtle,
    },
    emptyTitle: { ...typography.h3, color: c.fg },
    emptyBody: { ...typography.small, color: c.muted, textAlign: "center", maxWidth: 260 },
    createButtonContainer: {
      padding: spacing.md,
      borderTopWidth: 1,
      borderTopColor: c.line,
      backgroundColor: c.surface,
    },
    createButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: c.brand,
      paddingVertical: 16,
      borderRadius: radii.lg,
    },
    createButtonDisabled: { opacity: 0.5 },
    createButtonText: { fontSize: 16, fontWeight: "700", color: c.onBrand },
  });
