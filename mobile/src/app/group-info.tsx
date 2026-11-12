import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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
import { radii, spacing, typography, type AppColors } from "@/theme/tokens";
import { useAppTheme, useThemedStyles } from "@/theme/use-app-theme";

type MemberWithAction = ChatParticipant & { isOwner: boolean; isAdmin: boolean; actionMenuOpen: boolean };

export default function GroupInfoScreen() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const session = useSessionStore((state) => state.session);
  const token = session?.accessToken;
  const currentUserId = session?.user?.userId;
  const { colors, contentWidth } = useAppTheme();
  const styles = useThemedStyles(createStyles);

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

  const { directoryUsers } = useMobileSocial({ token });

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
    } catch {
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
    } catch {
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
    } catch {
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
        message: `Join "${chat?.groupName || "LinkUp group"}":\n${webLink}\n\nApp link: ${deepLink}`,
      });
    } catch {
      // ignore share dismissal
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!token) return;
    try {
      setActionLoading(memberId);
      await removeMobileGroupMember(token, chatId!, memberId);
      await loadChat();
    } catch {
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
    } catch {
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
    } catch {
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
            } catch {
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
    } catch {
      Alert.alert("Error", "Failed to leave group");
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  if (!chat || !chat.isGroup) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.centerState}>
          <Text style={styles.errorText}>{error || "Group not found"}</Text>
          <Pressable style={styles.button} onPress={() => router.back()}>
            <Text style={styles.buttonText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const owner = membersWithActions.find((p) => p.isOwner);
  const admins = membersWithActions.filter((p) => p.isAdmin && !p.isOwner);
  const members = membersWithActions.filter((p) => !p.isAdmin);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={colors.fg} />
        </Pressable>
        <Text style={styles.headerTitle}>Group info</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { maxWidth: contentWidth }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileSection}>
          {chat.groupAvatar ? (
            <View style={styles.avatarImage}>
              <Text style={styles.avatarText}>{chat.groupName?.charAt(0) || "G"}</Text>
            </View>
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="people" size={36} color={colors.onBrand} />
            </View>
          )}
          <Text style={styles.groupName}>{chat.groupName || "Unnamed group"}</Text>
          <Text style={styles.memberCount}>{chat.participants.length} members</Text>

          {isAdmin && (
            <Pressable style={styles.editButton} onPress={() => setShowEditGroup(true)}>
              <Ionicons name="pencil" size={16} color={colors.brand} />
              <Text style={styles.editButtonText}>Edit group</Text>
            </Pressable>
          )}
        </View>

        {isAdmin && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="link" size={16} color={colors.brand} />
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
                        <ActivityIndicator size="small" color={colors.brand} />
                      ) : (
                        <Text style={styles.inviteSecondaryText}>Refresh</Text>
                      )}
                    </Pressable>
                    <Pressable style={styles.invitePrimaryButton} onPress={() => void handleShareInvite()}>
                      <Ionicons name="share-outline" size={18} color={colors.onBrand} />
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
                    <ActivityIndicator size="small" color={colors.onBrand} />
                  ) : (
                    <>
                      <Ionicons name="sparkles" size={18} color={colors.onBrand} />
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
            <Ionicons name="key" size={16} color={colors.warning} />
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
            <Ionicons name="key" size={18} color={colors.warning} />
          </View>
        </View>

        {admins.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="shield-checkmark" size={16} color={colors.brand} />
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
                    <Ionicons name="ellipsis-vertical" size={20} color={colors.muted} />
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="people" size={16} color={colors.muted} />
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
                  <Ionicons name="ellipsis-vertical" size={20} color={colors.muted} />
                </Pressable>
              )}
            </View>
          ))}
        </View>

        {isAdmin && (
          <Pressable style={styles.actionButton} onPress={() => setShowAddMembers(true)}>
            <Ionicons name="person-add" size={20} color={colors.onBrand} />
            <Text style={styles.actionButtonText}>Add members</Text>
          </Pressable>
        )}

        {isMember && !isOwner && (
          <Pressable style={styles.leaveButton} onPress={() => setShowLeaveConfirm(true)}>
            <Ionicons name="exit-outline" size={20} color={colors.danger} />
            <Text style={styles.leaveButtonText}>Leave group</Text>
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
                <Ionicons name="person-remove-outline" size={20} color={colors.danger} />
                <Text style={styles.actionRowDangerText}>Remove from group</Text>
                {actionLoading === memberActionTarget._id ? <ActivityIndicator size="small" color={colors.danger} /> : null}
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
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.brand} />
                <Text style={styles.actionRowText}>Promote to admin</Text>
                {actionLoading === memberActionTarget._id ? <ActivityIndicator size="small" color={colors.brand} /> : null}
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
                <Ionicons name="shield-outline" size={20} color={colors.brand} />
                <Text style={styles.actionRowText}>Demote admin</Text>
                {actionLoading === memberActionTarget._id ? <ActivityIndicator size="small" color={colors.brand} /> : null}
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
                <Ionicons name="key-outline" size={20} color={colors.warning} />
                <Text style={styles.actionRowText}>Transfer ownership</Text>
                {actionLoading === memberActionTarget._id ? <ActivityIndicator size="small" color={colors.warning} /> : null}
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
              <Text style={styles.modalTitle}>Add members</Text>
              <Pressable onPress={() => { setShowAddMembers(false); setSearchQuery(""); setSelectedUserIds([]); }}>
                <Ionicons name="close" size={24} color={colors.fg} />
              </Pressable>
            </View>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search users..."
              placeholderTextColor={colors.faint}
              style={styles.searchInput}
            />
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item._id}
              style={styles.searchList}
              keyboardShouldPersistTaps="handled"
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
                    <Ionicons name="checkmark-circle" size={24} color={colors.brand} />
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
                  <ActivityIndicator size="small" color={colors.onBrand} />
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
            <Text style={styles.confirmTitle}>Leave group?</Text>
            <Text style={styles.confirmBody}>
              {`Are you sure you want to leave "${chat.groupName}"?`}
            </Text>
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
              <Text style={styles.modalTitle}>Edit group</Text>
              <Pressable onPress={() => setShowEditGroup(false)}>
                <Ionicons name="close" size={24} color={colors.fg} />
              </Pressable>
            </View>
            <Text style={styles.inputLabel}>Group name</Text>
            <TextInput
              value={editGroupName}
              onChangeText={setEditGroupName}
              placeholder="Enter group name"
              placeholderTextColor={colors.faint}
              style={styles.textInput}
            />
            <Text style={styles.inputLabel}>Avatar URL (optional)</Text>
            <TextInput
              value={editGroupAvatar}
              onChangeText={setEditGroupAvatar}
              placeholder="https://example.com/image.jpg"
              placeholderTextColor={colors.faint}
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
                  <ActivityIndicator size="small" color={colors.onBrand} />
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

const createStyles = (c: AppColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.canvas },
    centerState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
    errorText: { ...typography.body, color: c.danger, marginBottom: 16, textAlign: "center" },
    button: {
      backgroundColor: c.brand,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: radii.pill,
    },
    buttonText: { color: c.onBrand, fontWeight: "700" },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      backgroundColor: c.surface,
      borderBottomWidth: 1,
      borderBottomColor: c.line,
    },
    backButton: { padding: 4 },
    headerTitle: { flex: 1, ...typography.h3, color: c.fg, textAlign: "center" },
    headerSpacer: { width: 32 },
    content: {
      width: "100%",
      alignSelf: "center",
      padding: spacing.md,
      paddingBottom: spacing.xxl,
      gap: spacing.lg,
    },
    profileSection: { alignItems: "center", gap: 8, paddingTop: spacing.xs },
    avatarImage: {
      width: 80,
      height: 80,
      borderRadius: radii.xl,
      backgroundColor: c.brand,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarPlaceholder: {
      width: 80,
      height: 80,
      borderRadius: radii.xl,
      backgroundColor: c.fg,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: { fontSize: 32, fontWeight: "800", color: c.onBrand },
    groupName: { ...typography.h2, color: c.fg, textAlign: "center" },
    memberCount: { fontSize: 14, color: c.muted },
    editButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 8,
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: c.brandSoft,
      borderRadius: radii.pill,
    },
    editButtonText: { fontSize: 13, fontWeight: "700", color: c.brand },
    section: { gap: 8 },
    sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
    sectionTitle: {
      ...typography.caption,
      color: c.muted,
    },
    inviteCard: {
      borderRadius: radii.lg,
      backgroundColor: c.surface,
      padding: 14,
      borderWidth: 1,
      borderColor: c.line,
      gap: 10,
    },
    inviteBody: { fontSize: 13, lineHeight: 18, color: c.muted },
    inviteError: { fontSize: 12, fontWeight: "700", color: c.danger },
    inviteDetails: { gap: 6 },
    inviteLink: { fontSize: 13, fontWeight: "700", color: c.fg },
    inviteMeta: { fontSize: 11, color: c.faint },
    inviteActions: { flexDirection: "row", gap: 10, marginTop: 6 },
    invitePrimaryButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: c.brand,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: radii.md,
      flex: 1,
    },
    invitePrimaryText: { fontSize: 13, fontWeight: "800", color: c.onBrand },
    inviteSecondaryButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.brandSoft,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: radii.md,
      width: 110,
    },
    inviteSecondaryText: { fontSize: 13, fontWeight: "800", color: c.brand },
    inviteButtonDisabled: { opacity: 0.6 },
    ownerCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: c.warningSoft,
      padding: 12,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: c.warning,
    },
    memberCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      padding: 12,
      borderRadius: radii.md,
      marginBottom: 8,
    },
    memberAvatar: {
      width: 44,
      height: 44,
      borderRadius: radii.md,
      backgroundColor: c.brandSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    memberAvatarText: { fontSize: 18, fontWeight: "800", color: c.brand },
    memberInfo: { flex: 1, minWidth: 0 },
    memberName: { fontSize: 15, fontWeight: "700", color: c.fg },
    memberUsername: { fontSize: 12, color: c.muted },
    menuButton: { padding: 8 },
    actionButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: c.brand,
      paddingVertical: 14,
      borderRadius: radii.md,
    },
    actionButtonText: { fontSize: 15, fontWeight: "700", color: c.onBrand },
    leaveButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: c.dangerSoft,
      paddingVertical: 14,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: c.danger,
    },
    leaveButtonText: { fontSize: 15, fontWeight: "700", color: c.danger },
    modalOverlay: { flex: 1, backgroundColor: c.overlay, justifyContent: "flex-end" },
    actionSheet: {
      width: "100%",
      maxWidth: 640,
      alignSelf: "center",
      backgroundColor: c.surface,
      borderTopLeftRadius: radii.xxl,
      borderTopRightRadius: radii.xxl,
      padding: 18,
      gap: 8,
    },
    actionSheetHeader: { gap: 2, paddingBottom: 8 },
    actionSheetTitle: { fontSize: 18, fontWeight: "900", color: c.fg },
    actionSheetSubtitle: { fontSize: 12, color: c.muted, fontWeight: "600" },
    actionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 14,
      paddingHorizontal: 12,
      borderRadius: radii.md,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
    },
    actionRowDisabled: { opacity: 0.6 },
    actionRowText: { flex: 1, fontSize: 14, fontWeight: "800", color: c.fg },
    actionRowDangerText: { flex: 1, fontSize: 14, fontWeight: "800", color: c.danger },
    actionCancelRow: { paddingVertical: 14, alignItems: "center" },
    actionCancelText: { fontSize: 14, fontWeight: "800", color: c.muted },
    confirmOverlay: {
      flex: 1,
      backgroundColor: c.overlay,
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    confirmContent: {
      backgroundColor: c.surface,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: c.line,
      padding: 20,
      width: "100%",
      maxWidth: 340,
    },
    confirmTitle: { fontSize: 18, fontWeight: "800", color: c.fg, textAlign: "center" },
    confirmBody: {
      fontSize: 14,
      color: c.muted,
      textAlign: "center",
      marginTop: 8,
      marginBottom: 20,
    },
    confirmActions: { flexDirection: "row", gap: 12 },
    confirmCancel: {
      flex: 1,
      paddingVertical: 12,
      alignItems: "center",
      backgroundColor: c.subtle,
      borderRadius: radii.md,
    },
    confirmCancelText: { fontSize: 15, fontWeight: "700", color: c.muted },
    confirmLeave: {
      flex: 1,
      paddingVertical: 12,
      alignItems: "center",
      backgroundColor: c.danger,
      borderRadius: radii.md,
    },
    confirmLeaveText: { fontSize: 15, fontWeight: "700", color: c.onBrand },
    modalContent: {
      width: "100%",
      maxWidth: 640,
      alignSelf: "center",
      backgroundColor: c.surface,
      borderTopLeftRadius: radii.xxl,
      borderTopRightRadius: radii.xxl,
      padding: 20,
      maxHeight: "80%",
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    modalTitle: { fontSize: 20, fontWeight: "800", color: c.fg },
    searchInput: {
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radii.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: c.fg,
      backgroundColor: c.elevated,
      marginBottom: 12,
    },
    searchList: { maxHeight: 300 },
    userOption: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 12,
      backgroundColor: c.elevated,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radii.md,
      marginBottom: 8,
    },
    userOptionSelected: { backgroundColor: c.brandSoft, borderColor: c.brand },
    userOptionAvatar: {
      width: 40,
      height: 40,
      borderRadius: radii.sm,
      backgroundColor: c.brandSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    userOptionAvatarText: { fontSize: 16, fontWeight: "800", color: c.brand },
    userOptionInfo: { flex: 1, minWidth: 0 },
    userOptionName: { fontSize: 15, fontWeight: "700", color: c.fg },
    userOptionUsername: { fontSize: 12, color: c.muted },
    emptyText: { textAlign: "center", color: c.muted, paddingVertical: 20 },
    modalActions: { flexDirection: "row", gap: 12, marginTop: 16 },
    cancelButton: {
      flex: 1,
      paddingVertical: 14,
      alignItems: "center",
      backgroundColor: c.subtle,
      borderRadius: radii.md,
    },
    cancelButtonText: { fontSize: 15, fontWeight: "700", color: c.muted },
    addButton: {
      flex: 1,
      paddingVertical: 14,
      alignItems: "center",
      backgroundColor: c.brand,
      borderRadius: radii.md,
    },
    addButtonDisabled: { opacity: 0.5 },
    addButtonText: { fontSize: 15, fontWeight: "700", color: c.onBrand },
    inputLabel: { fontSize: 13, fontWeight: "700", color: c.muted, marginBottom: 6, marginTop: 12 },
    textInput: {
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radii.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: c.fg,
      backgroundColor: c.elevated,
    },
  });
