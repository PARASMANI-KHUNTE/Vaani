import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
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
import { ChatParticipant } from "@/lib/types";
import { useMobileSocial } from "@/hooks/use-mobile-social";
import { useChatStore } from "@/store/chat-store";
import { useSessionStore } from "@/store/session-store";

interface NewChatModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function NewChatModal({ visible, onClose }: NewChatModalProps) {
  const session = useSessionStore((state) => state.session);
  const token = session?.accessToken;
  const upsertChat = useChatStore((state) => state.upsertChat);

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
        <View style={styles.header}>
          <Pressable onPress={handleClose}>
            <Ionicons name="close" size={24} color="#0f172a" />
          </Pressable>
          <Text style={styles.title}>New Chat</Text>
          <Pressable
            style={[styles.modeButton, isGroupMode && styles.modeButtonActive]}
            onPress={() => {
              setIsGroupMode(!isGroupMode);
              setSelectedUserIds([]);
            }}
          >
            <Ionicons name="people" size={18} color={isGroupMode ? "#fff" : "#155e75"} />
          </Pressable>
        </View>

        {isGroupMode && (
          <View style={styles.groupNameContainer}>
            <TextInput
              value={groupName}
              onChangeText={setGroupName}
              placeholder="Group name"
              style={styles.groupNameInput}
            />
            <Text style={styles.selectedCount}>
              {selectedUserIds.length} selected
            </Text>
          </View>
        )}

        {!isGroupMode && (
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color="#94a3b8" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search friends..."
              style={styles.searchInput}
            />
          </View>
        )}

        {isLoadingDirectory ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#155e75" />
          </View>
        ) : (
          <FlatList
            data={filteredUsers}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyCard}>
                <Ionicons name="people-outline" size={40} color="#94a3b8" />
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
                  style={[styles.userCard, isSelected && styles.userCardSelected, isDisabled && styles.userCardDisabled]}
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
                    <Text style={styles.userName}>{item.name}</Text>
                    <Text style={styles.userUsername}>@{item.username || "user"}</Text>
                    {!item.isFriend && !isGroupMode && (
                      <Text style={styles.notFriendText}>Not a friend</Text>
                    )}
                  </View>
                  {isGroupMode && isSelected && (
                    <Ionicons name="checkmark-circle" size={24} color="#155e75" />
                  )}
                </Pressable>
              );
            }}
          />
        )}

        {isGroupMode && selectedUserIds.length >= 2 && (
          <View style={styles.createButtonContainer}>
            <Pressable
              style={[styles.createButton, (!groupName.trim() || isCreating) && styles.createButtonDisabled]}
              disabled={!groupName.trim() || isCreating}
              onPress={handleCreateGroup}
            >
              {isCreating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="chatbubbles" size={20} color="#fff" />
                  <Text style={styles.createButtonText}>Create Group</Text>
                </>
              )}
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f2e8" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  title: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  modeButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#e0f2fe", alignItems: "center", justifyContent: "center" },
  modeButtonActive: { backgroundColor: "#155e75" },
  groupNameContainer: { padding: 16, gap: 8 },
  groupNameInput: { backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, borderWidth: 1, borderColor: "#e2e8f0" },
  selectedCount: { fontSize: 13, color: "#64748b" },
  searchContainer: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, marginVertical: 12, paddingHorizontal: 14, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0" },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: "#0f172a" },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { padding: 16, gap: 10 },
  userCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fffdf8", padding: 14, borderRadius: 18 },
  userCardSelected: { backgroundColor: "#e0f2fe" },
  userCardDisabled: { opacity: 0.5 },
  avatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: "#cffafe", alignItems: "center", justifyContent: "center" },
  avatarSelected: { backgroundColor: "#155e75" },
  avatarText: { fontSize: 20, fontWeight: "800", color: "#155e75" },
  avatarTextSelected: { color: "#fff" },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  userUsername: { fontSize: 13, color: "#64748b" },
  notFriendText: { fontSize: 11, color: "#f59e0b", marginTop: 2 },
  emptyCard: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  emptyBody: { fontSize: 14, color: "#64748b", textAlign: "center", maxWidth: 240 },
  createButtonContainer: { padding: 16, borderTopWidth: 1, borderTopColor: "#e2e8f0" },
  createButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#155e75", paddingVertical: 16, borderRadius: 16 },
  createButtonDisabled: { opacity: 0.5 },
  createButtonText: { fontSize: 16, fontWeight: "700", color: "#fff" },
});