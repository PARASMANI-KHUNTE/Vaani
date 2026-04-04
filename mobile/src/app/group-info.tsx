import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  addMobileGroupMembers,
  createMobileGroupInviteLink,
  demoteMobileGroupAdmin,
  getMobileChats,
  leaveMobileGroup,
  promoteMobileGroupAdmin,
  removeMobileGroupMember,
  transferMobileGroupOwnership,
  updateMobileGroupProfile,
} from "@/lib/api/client";
import { mobileConfig } from "@/lib/config";
import { useMobileSocial } from "@/hooks/use-mobile-social";
import { useSessionStore } from "@/store/session-store";
import { MobileChat, ChatParticipant } from "@/lib/types";

type MemberWithAction = ChatParticipant & { isOwner: boolean; isAdmin: boolean; actionMenuOpen: boolean };

export default function GroupInfoScreen() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const session = useSessionStore((state) => state.session);
  const token = session?.accessToken;
  const currentUserId = session?.user?.userId;

  const [chat, setChat] = useState<MobileChat | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [membersWithActions, setMembersWithActions] = useState<MemberWithAction[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [memberActionsOpen, setMemberActionsOpen] = useState(false);
  const [memberActionTarget, setMemberActionTarget] = useState<MemberWithAction | null>(null);

  const [showAddMembers, setShowAddMembers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ChatParticipant[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAddingMembers, setIsAddingMembers] = useState(false);

  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showEditGroup, setShowEditGroup] = useState(false);
  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupAvatar, setEditGroupAvatar] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteExpiresAt, setInviteExpiresAt] = useState<string | null>(null);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const { directoryUsers, isLoadingDirectory } = useMobileSocial({ token });

  const isOwner = chat?.createdBy === currentUserId;
  const isAdmin = chat?.adminIds?.includes(currentUserId || "") || isOwner;
  const isMember = chat?.participants.some((p) => p._id === currentUserId);

  const loadChat = useCallback(async () => {
    if (!token) return;
    try {
      const response = await getMobileChats(token);
      const found = response.chats.find((c) => c._id === chatId && c.isGroup);
      if (found) {
        setChat(found);
      }
    } catch (err) {
      setError("Failed to load group info");
    } finally {
      setIsLoading(false);
    }
  }, [token, chatId]);

  useEffect(() => {
    void loadChat();
  }, [loadChat]);

  useEffect(() => {
    if (chat) {
      const mapped = chat.participants.map((p) => ({
        ...p,
        isOwner: p._id === chat.createdBy,
        isAdmin: chat.adminIds?.includes(p._id) || p._id === chat.createdBy,
        actionMenuOpen: false,
      }));
      setMembersWithActions(mapped);
    }
  }, [chat]);

  useEffect(() => {
    if (chat && showEditGroup) {
      setEditGroupName(chat.groupName || "");
      setEditGroupAvatar(chat.groupAvatar || "");
    }
  }, [chat, showEditGroup]);

  useEffect(() => {
    if (!showAddMembers || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timeoutId = setTimeout(() => {
      const existingIds = chat?.participants.map((p) => p._id) || [];
      setSearchResults(directoryUsers.filter((u) => !existingIds.includes(u._id)));
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [showAddMembers, searchQuery, directoryUsers, chat]);

  const handleAddMembers = async () => {
    if (!token || selectedUserIds.length === 0) return;
    try {
      setIsAddingMembers(true);
      await addMobileGroupMembers(token, chatId!, selectedUserIds);
      await loadChat();
      setShowAddMembers(false);
      setSelectedUserIds([]);
      setSearchQuery("");
    } catch (err) {
      Alert.alert("Error", "Failed to add members");
    } finally {
      setIsAddingMembers(false);
    }
  };

  const handleUpdateGroup = async () => {
    if (!token || !editGroupName.trim()) return;
    try {
      setIsSaving(true);
      await updateMobileGroupProfile(token, chatId!, {
        groupName: editGroupName.trim(),
        groupAvatar: editGroupAvatar.trim() || null,
      });
      await loadChat();
      setShowEditGroup(false);
    } catch (err) {
      Alert.alert("Error", "Failed to update group");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateInvite = async () => {
    if (!token || !chatId) return;

    try {
      setIsGeneratingInvite(true);
      setInviteError(null);
      const response = await createMobileGroupInviteLink(token, chatId);
      setInviteToken(response.invite.token);
      setInviteExpiresAt(response.invite.expiresAt);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to generate invite link");
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  const handleShareInvite = async () => {
    if (!inviteToken) return;

    const webLink = `${mobileConfig.webUrl}/groups/join/${inviteToken}`;
    const deepLink = `${mobileConfig.scheme}://groups/join/${inviteToken}`;

    try {
      await Share.share({
        message: `Join "${chat?.groupName || "Canvas Chat group"}":\n${webLink}\n\nApp link: ${deepLink}`,
      });
    } catch (err) {
      // ignore share dismissal
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!token) return;
    try {
      setActionLoading(memberId);
      await removeMobileGroupMember(token, chatId!, memberId);
      await loadChat();
    } catch (err) {
      Alert.alert("Error", "Failed to remove member");
    } finally {
      setActionLoading(null);
    }
  };

  const openMemberActions = (member: MemberWithAction) => {
    setMemberActionTarget(member);
    setMemberActionsOpen(true);
  };

  const closeMemberActions = () => {
    setMemberActionsOpen(false);
    setMemberActionTarget(null);
  };

  const handlePromoteAdmin = async (memberId: string) => {
    if (!token || !chatId) return;
    try {
      setActionLoading(memberId);
      await promoteMobileGroupAdmin(token, chatId, memberId);
      await loadChat();
    } catch (err) {
      Alert.alert("Error", "Failed to promote admin");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDemoteAdmin = async (memberId: string) => {
    if (!token || !chatId) return;
    try {
      setActionLoading(memberId);
      await demoteMobileGroupAdmin(token, chatId, memberId);
      await loadChat();
    } catch (err) {
      Alert.alert("Error", "Failed to demote admin");
    } finally {
      setActionLoading(null);
    }
  };

  const handleTransferOwnership = async (memberId: string) => {
    if (!token || !chatId) return;

    Alert.alert(
      "Transfer Ownership",
      "Transfer group ownership to this member? You will lose owner privileges.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Transfer",
          style: "destructive",
          onPress: async () => {
            try {
              setActionLoading(memberId);
              await transferMobileGroupOwnership(token, chatId, memberId);
              await loadChat();
              closeMemberActions();
            } catch (err) {
              Alert.alert("Error", "Failed to transfer ownership");
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleLeaveGroup = async () => {
    if (!token) return;
    try {
      await leaveMobileGroup(token, chatId!);
      router.back();
    } catch (err) {
      Alert.alert("Error", "Failed to leave group");
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#155e75" />
        </View>
      </SafeAreaView>
    );
  }

  if (!chat || !chat.isGroup) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerState}>
          <Text style={styles.errorText}>Group not found</Text>
          <Pressable style={styles.button} onPress={() => router.back()}>
            <Text style={styles.buttonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const owner = membersWithActions.find((p) => p.isOwner);
  const admins = membersWithActions.filter((p) => p.isAdmin && !p.isOwner);
  const members = membersWithActions.filter((p) => !p.isAdmin);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </Pressable>
        <Text style={styles.headerTitle}>Group Info</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            {chat.groupAvatar ? (
              <View style={styles.avatarImage}>
                <Text style={styles.avatarText}>{chat.groupName?.charAt(0) || "G"}</Text>
              </View>
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="people" size={40} color="#fff" />
              </View>
            )}
          </View>
          <Text style={styles.groupName}>{chat.groupName || "Unnamed Group"}</Text>
          <Text style={styles.memberCount}>{chat.participants.length} members</Text>

          {isAdmin && (
            <Pressable style={styles.editButton} onPress={() => setShowEditGroup(true)}>
              <Ionicons name="pencil" size={16} color="#155e75" />
              <Text style={styles.editButtonText}>Edit Group</Text>
            </Pressable>
          )}
        </View>

        {isAdmin && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="link" size={16} color="#155e75" />
              <Text style={styles.sectionTitle}>Invite link</Text>
            </View>
            <View style={styles.inviteCard}>
              <Text style={styles.inviteBody}>
                Generate a link to invite new members. Links expire automatically.
              </Text>
              {inviteError ? <Text style={styles.inviteError}>{inviteError}</Text> : null}

              {inviteToken ? (
                <View style={styles.inviteDetails}>
                  <Text style={styles.inviteLink} numberOfLines={2}>
                    {mobileConfig.webUrl}/groups/join/{inviteToken}
                  </Text>
                  {inviteExpiresAt ? (
                    <Text style={styles.inviteMeta}>
                      Expires {new Date(inviteExpiresAt).toLocaleString()}
                    </Text>
                  ) : null}
                  <View style={styles.inviteActions}>
                    <Pressable
                      style={[styles.inviteSecondaryButton, isGeneratingInvite && styles.inviteButtonDisabled]}
                      disabled={isGeneratingInvite}
                      onPress={handleGenerateInvite}
                    >
                      {isGeneratingInvite ? (
                        <ActivityIndicator size="small" color="#155e75" />
                      ) : (
                        <Text style={styles.inviteSecondaryText}>Refresh</Text>
                      )}
                    </Pressable>
                    <Pressable style={styles.invitePrimaryButton} onPress={() => void handleShareInvite()}>
                      <Ionicons name="share-outline" size={18} color="#ffffff" />
                      <Text style={styles.invitePrimaryText}>Share</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  style={[styles.invitePrimaryButton, isGeneratingInvite && styles.inviteButtonDisabled]}
                  disabled={isGeneratingInvite}
                  onPress={handleGenerateInvite}
                >
                  {isGeneratingInvite ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="sparkles" size={18} color="#ffffff" />
                      <Text style={styles.invitePrimaryText}>Generate invite</Text>
                    </>
                  )}
                </Pressable>
              )}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="key" size={16} color="#f59e0b" />
            <Text style={styles.sectionTitle}>Owner</Text>
          </View>
          <View style={styles.ownerCard}>
            <View style={styles.memberAvatar}>
              <Text style={styles.memberAvatarText}>{owner?.name?.charAt(0) || "?"}</Text>
            </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{owner?.name || "Unknown"}</Text>
              <Text style={styles.memberUsername}>@{owner?.username || "user"}</Text>
            </View>
            <Ionicons name="key" size={18} color="#f59e0b" />
          </View>
        </View>

        {admins.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="shield-checkmark" size={16} color="#155e75" />
              <Text style={styles.sectionTitle}>Administrators</Text>
            </View>
            {admins.map((admin) => (
              <View key={admin._id} style={styles.memberCard}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarText}>{admin.name.charAt(0)}</Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{admin.name}</Text>
                  <Text style={styles.memberUsername}>@{admin.username || "user"}</Text>
                </View>
                {isOwner && (
                  <Pressable
                    style={styles.menuButton}
                    onPress={() => openMemberActions(admin)}
                  >
                    <Ionicons name="ellipsis-vertical" size={20} color="#64748b" />
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="people" size={16} color="#64748b" />
            <Text style={styles.sectionTitle}>Members</Text>
          </View>
          {members.map((member) => (
            <View key={member._id} style={styles.memberCard}>
              <View style={styles.memberAvatar}>
                <Text style={styles.memberAvatarText}>{member.name.charAt(0)}</Text>
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{member.name}</Text>
                <Text style={styles.memberUsername}>@{member.username || "user"}</Text>
              </View>
              {isAdmin && member._id !== currentUserId && (
                <Pressable
                  style={styles.menuButton}
                  onPress={() => openMemberActions(member)}
                >
                  <Ionicons name="ellipsis-vertical" size={20} color="#64748b" />
                </Pressable>
              )}
            </View>
          ))}
        </View>

        {isAdmin && (
          <Pressable style={styles.actionButton} onPress={() => setShowAddMembers(true)}>
            <Ionicons name="person-add" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Add Members</Text>
          </Pressable>
        )}

        {isMember && !isOwner && (
          <Pressable style={styles.leaveButton} onPress={() => setShowLeaveConfirm(true)}>
            <Ionicons name="exit-outline" size={20} color="#dc2626" />
            <Text style={styles.leaveButtonText}>Leave Group</Text>
          </Pressable>
        )}
      </ScrollView>

      <Modal
        visible={memberActionsOpen}
        transparent
        animationType="slide"
        onRequestClose={closeMemberActions}
      >
        <Pressable style={styles.modalOverlay} onPress={closeMemberActions}>
          <Pressable style={styles.actionSheet} onPress={() => undefined}>
            <View style={styles.actionSheetHeader}>
              <Text style={styles.actionSheetTitle}>
                {memberActionTarget?.name || "Member actions"}
              </Text>
              <Text style={styles.actionSheetSubtitle}>
                @{memberActionTarget?.username || "user"}
              </Text>
            </View>

            {memberActionTarget &&
            isAdmin &&
            !memberActionTarget.isOwner &&
            memberActionTarget._id !== currentUserId ? (
              <Pressable
                style={[styles.actionRow, actionLoading === memberActionTarget._id && styles.actionRowDisabled]}
                disabled={actionLoading === memberActionTarget._id}
                onPress={() => {
                  closeMemberActions();
                  void handleRemoveMember(memberActionTarget._id);
                }}
              >
                <Ionicons name="person-remove-outline" size={20} color="#dc2626" />
                <Text style={styles.actionRowDangerText}>Remove from group</Text>
                {actionLoading === memberActionTarget._id ? <ActivityIndicator size="small" color="#dc2626" /> : null}
              </Pressable>
            ) : null}

            {memberActionTarget &&
            isAdmin &&
            !memberActionTarget.isOwner &&
            !memberActionTarget.isAdmin ? (
              <Pressable
                style={[styles.actionRow, actionLoading === memberActionTarget._id && styles.actionRowDisabled]}
                disabled={actionLoading === memberActionTarget._id}
                onPress={() => {
                  closeMemberActions();
                  void handlePromoteAdmin(memberActionTarget._id);
                }}
              >
                <Ionicons name="shield-checkmark-outline" size={20} color="#155e75" />
                <Text style={styles.actionRowText}>Promote to admin</Text>
                {actionLoading === memberActionTarget._id ? <ActivityIndicator size="small" color="#155e75" /> : null}
              </Pressable>
            ) : null}

            {memberActionTarget &&
            isOwner &&
            !memberActionTarget.isOwner &&
            memberActionTarget.isAdmin ? (
              <Pressable
                style={[styles.actionRow, actionLoading === memberActionTarget._id && styles.actionRowDisabled]}
                disabled={actionLoading === memberActionTarget._id}
                onPress={() => {
                  closeMemberActions();
                  void handleDemoteAdmin(memberActionTarget._id);
                }}
              >
                <Ionicons name="shield-outline" size={20} color="#155e75" />
                <Text style={styles.actionRowText}>Demote admin</Text>
                {actionLoading === memberActionTarget._id ? <ActivityIndicator size="small" color="#155e75" /> : null}
              </Pressable>
            ) : null}

            {memberActionTarget &&
            isOwner &&
            !memberActionTarget.isOwner &&
            memberActionTarget._id !== currentUserId ? (
              <Pressable
                style={[styles.actionRow, actionLoading === memberActionTarget._id && styles.actionRowDisabled]}
                disabled={actionLoading === memberActionTarget._id}
                onPress={() => void handleTransferOwnership(memberActionTarget._id)}
              >
                <Ionicons name="key-outline" size={20} color="#f59e0b" />
                <Text style={styles.actionRowText}>Transfer ownership</Text>
                {actionLoading === memberActionTarget._id ? <ActivityIndicator size="small" color="#f59e0b" /> : null}
              </Pressable>
            ) : null}

            <Pressable style={styles.actionCancelRow} onPress={closeMemberActions}>
              <Text style={styles.actionCancelText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showAddMembers} transparent animationType="slide" onRequestClose={() => setShowAddMembers(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Members</Text>
              <Pressable onPress={() => { setShowAddMembers(false); setSearchQuery(""); setSelectedUserIds([]); }}>
                <Ionicons name="close" size={24} color="#0f172a" />
              </Pressable>
            </View>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search users..."
              style={styles.searchInput}
            />
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item._id}
              style={styles.searchList}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.userOption, selectedUserIds.includes(item._id) && styles.userOptionSelected]}
                  onPress={() => {
                    setSelectedUserIds((prev) =>
                      prev.includes(item._id) ? prev.filter((id) => id !== item._id) : [...prev, item._id]
                    );
                  }}
                >
                  <View style={styles.userOptionAvatar}>
                    <Text style={styles.userOptionAvatarText}>{item.name.charAt(0)}</Text>
                  </View>
                  <View style={styles.userOptionInfo}>
                    <Text style={styles.userOptionName}>{item.name}</Text>
                    <Text style={styles.userOptionUsername}>@{item.username || "user"}</Text>
                  </View>
                  {selectedUserIds.includes(item._id) && (
                    <Ionicons name="checkmark-circle" size={24} color="#155e75" />
                  )}
                </Pressable>
              )}
              ListEmptyComponent={
                searchQuery ? (
                  <Text style={styles.emptyText}>No users found</Text>
                ) : (
                  <Text style={styles.emptyText}>Search for users to add</Text>
                )
              }
            />
            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => { setShowAddMembers(false); setSearchQuery(""); setSelectedUserIds([]); }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.addButton, selectedUserIds.length === 0 && styles.addButtonDisabled]}
                disabled={selectedUserIds.length === 0 || isAddingMembers}
                onPress={handleAddMembers}
              >
                {isAddingMembers ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.addButtonText}>Add {selectedUserIds.length}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showLeaveConfirm} transparent animationType="fade" onRequestClose={() => setShowLeaveConfirm(false)}>
        <Pressable style={styles.confirmOverlay} onPress={() => setShowLeaveConfirm(false)}>
          <View style={styles.confirmContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.confirmTitle}>Leave Group?</Text>
            <Text style={styles.confirmBody}>Are you sure you want to leave "{chat.groupName}"?</Text>
            <View style={styles.confirmActions}>
              <Pressable style={styles.confirmCancel} onPress={() => setShowLeaveConfirm(false)}>
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.confirmLeave} onPress={handleLeaveGroup}>
                <Text style={styles.confirmLeaveText}>Leave</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={showEditGroup} transparent animationType="slide" onRequestClose={() => setShowEditGroup(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Group</Text>
              <Pressable onPress={() => setShowEditGroup(false)}>
                <Ionicons name="close" size={24} color="#0f172a" />
              </Pressable>
            </View>
            <Text style={styles.inputLabel}>Group Name</Text>
            <TextInput
              value={editGroupName}
              onChangeText={setEditGroupName}
              placeholder="Enter group name"
              style={styles.textInput}
            />
            <Text style={styles.inputLabel}>Avatar URL (Optional)</Text>
            <TextInput
              value={editGroupAvatar}
              onChangeText={setEditGroupAvatar}
              placeholder="https://example.com/image.jpg"
              style={styles.textInput}
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.cancelButton} onPress={() => setShowEditGroup(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.addButton, (!editGroupName.trim() || isSaving) && styles.addButtonDisabled]}
                disabled={!editGroupName.trim() || isSaving}
                onPress={handleUpdateGroup}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.addButtonText}>Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f2e8" },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { fontSize: 16, color: "#dc2626", marginBottom: 16 },
  button: { backgroundColor: "#155e75", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  buttonText: { color: "#fff", fontWeight: "700" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 12, backgroundColor: "#fffdf8", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  backButton: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: "700", color: "#0f172a", textAlign: "center" },
  headerSpacer: { width: 32 },
  content: { padding: 16, gap: 20 },
  profileSection: { alignItems: "center", gap: 8 },
  avatarContainer: { width: 80, height: 80, borderRadius: 24, overflow: "hidden" },
  avatarImage: { width: 80, height: 80, backgroundColor: "#155e75", alignItems: "center", justifyContent: "center" },
  avatarPlaceholder: { width: 80, height: 80, backgroundColor: "#0f172a", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 32, fontWeight: "800", color: "#fff" },
  groupName: { fontSize: 22, fontWeight: "800", color: "#0f172a" },
  memberCount: { fontSize: 14, color: "#64748b" },
  editButton: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#e0f2fe", borderRadius: 20 },
  editButtonText: { fontSize: 13, fontWeight: "700", color: "#155e75" },
  section: { gap: 8 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 12, fontWeight: "800", color: "#64748b", textTransform: "uppercase", letterSpacing: 1 },
  inviteCard: { borderRadius: 18, backgroundColor: "#fffdf8", padding: 14, borderWidth: 1, borderColor: "#e2e8f0", gap: 10 },
  inviteBody: { fontSize: 13, lineHeight: 18, color: "#64748b" },
  inviteError: { fontSize: 12, fontWeight: "700", color: "#dc2626" },
  inviteDetails: { gap: 6 },
  inviteLink: { fontSize: 13, fontWeight: "700", color: "#0f172a" },
  inviteMeta: { fontSize: 11, color: "#94a3b8" },
  inviteActions: { flexDirection: "row", gap: 10, marginTop: 6 },
  invitePrimaryButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#155e75", paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, flex: 1 },
  invitePrimaryText: { fontSize: 13, fontWeight: "800", color: "#fff" },
  inviteSecondaryButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#e0f2fe", paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, width: 110 },
  inviteSecondaryText: { fontSize: 13, fontWeight: "800", color: "#155e75" },
  inviteButtonDisabled: { opacity: 0.6 },
  ownerCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fffbeb", padding: 12, borderRadius: 16, borderWidth: 1, borderColor: "#fcd34d" },
  memberCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fffdf8", padding: 12, borderRadius: 16 },
  memberAvatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#cffafe", alignItems: "center", justifyContent: "center" },
  memberAvatarText: { fontSize: 18, fontWeight: "800", color: "#155e75" },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: "700", color: "#0f172a" },
  memberUsername: { fontSize: 12, color: "#64748b" },
  menuButton: { padding: 8 },
  actionButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#155e75", paddingVertical: 14, borderRadius: 16 },
  actionButtonText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  leaveButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#fef2f2", paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderColor: "#fecaca" },
  leaveButtonText: { fontSize: 15, fontWeight: "700", color: "#dc2626" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  actionSheet: {
    backgroundColor: "#fffdf8",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    gap: 8,
  },
  actionSheetHeader: { gap: 2, paddingBottom: 8 },
  actionSheetTitle: { fontSize: 18, fontWeight: "900", color: "#0f172a" },
  actionSheetSubtitle: { fontSize: 12, color: "#64748b", fontWeight: "600" },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  actionRowDisabled: { opacity: 0.6 },
  actionRowText: { flex: 1, fontSize: 14, fontWeight: "800", color: "#0f172a" },
  actionRowDangerText: { flex: 1, fontSize: 14, fontWeight: "800", color: "#dc2626" },
  actionCancelRow: { paddingVertical: 14, alignItems: "center" },
  actionCancelText: { fontSize: 14, fontWeight: "800", color: "#475569" },
  confirmOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  confirmContent: { backgroundColor: "#fff", borderRadius: 20, padding: 20, width: "100%", maxWidth: 320 },
  confirmTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a", textAlign: "center" },
  confirmBody: { fontSize: 14, color: "#64748b", textAlign: "center", marginTop: 8, marginBottom: 20 },
  confirmActions: { flexDirection: "row", gap: 12 },
  confirmCancel: { flex: 1, paddingVertical: 12, alignItems: "center", backgroundColor: "#f1f5f9", borderRadius: 12 },
  confirmCancelText: { fontSize: 15, fontWeight: "700", color: "#475569" },
  confirmLeave: { flex: 1, paddingVertical: 12, alignItems: "center", backgroundColor: "#dc2626", borderRadius: 12 },
  confirmLeaveText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  modalContent: { backgroundColor: "#fffdf8", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "80%" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#0f172a" },
  searchInput: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, backgroundColor: "#fff", marginBottom: 12 },
  searchList: { maxHeight: 300 },
  userOption: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, backgroundColor: "#fff", borderRadius: 12, marginBottom: 8 },
  userOptionSelected: { backgroundColor: "#e0f2fe" },
  userOptionAvatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#cffafe", alignItems: "center", justifyContent: "center" },
  userOptionAvatarText: { fontSize: 16, fontWeight: "800", color: "#155e75" },
  userOptionInfo: { flex: 1 },
  userOptionName: { fontSize: 15, fontWeight: "700", color: "#0f172a" },
  userOptionUsername: { fontSize: 12, color: "#64748b" },
  emptyText: { textAlign: "center", color: "#64748b", paddingVertical: 20 },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 16 },
  cancelButton: { flex: 1, paddingVertical: 14, alignItems: "center", backgroundColor: "#f1f5f9", borderRadius: 12 },
  cancelButtonText: { fontSize: 15, fontWeight: "700", color: "#475569" },
  addButton: { flex: 1, paddingVertical: 14, alignItems: "center", backgroundColor: "#155e75", borderRadius: 12 },
  addButtonDisabled: { opacity: 0.5 },
  addButtonText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  inputLabel: { fontSize: 13, fontWeight: "700", color: "#475569", marginBottom: 6, marginTop: 12 },
  textInput: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, backgroundColor: "#fff" },
});
