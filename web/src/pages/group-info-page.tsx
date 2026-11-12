import { useEffect, useState, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft, Home, LogOut, Shield, Users, Crown, ShieldCheck,
  UserPlus, MoreVertical, Check, X, RefreshCw, UserMinus, ArrowRightCircle,
  Pencil, Palette, Image as ImageIcon, Link2,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { NavHeader } from "@/components/nav-header";
import {
  getChatById,
  addGroupMembers,
  removeGroupMember,
  promoteGroupAdmin,
  demoteGroupAdmin,
  transferGroupOwnership,
  leaveGroup,
  createGroupInviteLink,
  searchUsers,
  patchChatSettings,
  uploadMedia,
} from "@/lib/api";
import { ChatAppearanceModal } from "@/components/ChatAppearanceModal";
import { useAuth } from "@/lib/auth-context";
import { Chat, BackendUser } from "@/lib/types";
import { cn, formatConversationDate } from "@/lib/utils";

type MemberWithAction = BackendUser & { isOwner: boolean; isAdmin: boolean; actionMenuOpen: boolean };

const menuItemClass =
  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-fg/85 transition-colors hover:bg-subtle hover:text-fg";

export const GroupInfoPage = () => {
  const { chatId = "" } = useParams();
  const { session, status } = useAuth();
  const [chat, setChat] = useState<Chat | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [membersWithActions, setMembersWithActions] = useState<MemberWithAction[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Add members modal
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BackendUser[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAddingMembers, setIsAddingMembers] = useState(false);

  // Leave group modal
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // Edit group modal
  const [showEditGroup, setShowEditGroup] = useState(false);

  // Invite link options modal
  const [showInviteOptions, setShowInviteOptions] = useState(false);
  const [showAppearanceModal, setShowAppearanceModal] = useState(false);
  const [inviteExpiresInHours, setInviteExpiresInHours] = useState<number>(24);
  const [inviteMaxUses, setInviteMaxUses] = useState<number | undefined>(undefined);
  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupAvatar, setEditGroupAvatar] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);

  const currentUserId = session?.backendUser?._id;
  const isOwner = chat?.createdBy === currentUserId;
  const isAdmin = chat?.adminIds?.includes(currentUserId || "") || isOwner;
  const isMember = chat?.participants.some(p => p._id === currentUserId);

  useEffect(() => {
    if (status === "loading" || !chat) {
      return;
    }

    const mapped = chat.participants.map(p => ({
      ...p,
      isOwner: p._id === chat.createdBy,
      isAdmin: chat.adminIds?.includes(p._id) || p._id === chat.createdBy,
      actionMenuOpen: false,
    }));
    setMembersWithActions(mapped);
  }, [chat, status]);

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    if (!session?.backendAccessToken) {
      setIsLoading(false);
      return;
    }

    let active = true;

    const loadChat = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await getChatById(session.backendAccessToken, chatId);
        if (active) {
          setChat(response.chat);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load group info");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadChat();

    return () => {
      active = false;
    };
  }, [session?.backendAccessToken, status, chatId]);

  useEffect(() => {
    if (chat && showEditGroup) {
      setEditGroupName(chat.groupName || "");
      setEditGroupAvatar(chat.groupAvatar || "");
    }
  }, [chat, showEditGroup]);

  const copyInviteLink = async () => {
    if (!session?.backendAccessToken || !chat) return;
    try {
      const response = await createGroupInviteLink(session.backendAccessToken, chatId, {
        expiresInHours: 24,
      });
      const inviteUrl = `${window.location.origin}/groups/join/${response.invite.token}`;
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate invite link");
    }
  };

  const generateNewInviteLink = async () => {
    if (!session?.backendAccessToken || !chat) return;
    setShowInviteOptions(false);
    try {
      const response = await createGroupInviteLink(session.backendAccessToken, chatId, {
        expiresInHours: inviteExpiresInHours,
        maxUses: inviteMaxUses,
      });
      const inviteUrl = `${window.location.origin}/groups/join/${response.invite.token}`;
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate invite link");
    }
  };

  const handleAddMembers = async () => {
    if (!session?.backendAccessToken || selectedUserIds.length === 0) return;
    try {
      setIsAddingMembers(true);
      await addGroupMembers(session.backendAccessToken, chatId, selectedUserIds);
      const response = await getChatById(session.backendAccessToken, chatId);
      setChat(response.chat);
      setShowAddMembers(false);
      setSelectedUserIds([]);
      setSearchQuery("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add members");
    } finally {
      setIsAddingMembers(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session?.backendAccessToken) return;

    try {
      setUploadingAvatar(true);
      const result = await uploadMedia(session.backendAccessToken, file);
      setEditGroupAvatar(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  const handleUpdateGroup = async () => {
    if (!session?.backendAccessToken || !editGroupName.trim()) return;
    try {
      setIsSaving(true);
      const result = await patchChatSettings(session.backendAccessToken, chatId, {
        groupName: editGroupName.trim(),
        groupAvatar: editGroupAvatar.trim() || null,
      });
      setChat(result.chat);
      setShowEditGroup(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update group");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!session?.backendAccessToken) return;
    try {
      setActionLoading(memberId);
      await removeGroupMember(session.backendAccessToken, chatId, memberId);
      const response = await getChatById(session.backendAccessToken, chatId);
      setChat(response.chat);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setActionLoading(null);
    }
  };

  const handlePromoteToAdmin = async (memberId: string) => {
    if (!session?.backendAccessToken) return;
    try {
      setActionLoading(memberId);
      await promoteGroupAdmin(session.backendAccessToken, chatId, memberId);
      const response = await getChatById(session.backendAccessToken, chatId);
      setChat(response.chat);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to promote member");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDemoteFromAdmin = async (memberId: string) => {
    if (!session?.backendAccessToken) return;
    try {
      setActionLoading(memberId);
      await demoteGroupAdmin(session.backendAccessToken, chatId, memberId);
      const response = await getChatById(session.backendAccessToken, chatId);
      setChat(response.chat);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to demote admin");
    } finally {
      setActionLoading(null);
    }
  };

  const handleTransferOwnership = async (memberId: string) => {
    if (!session?.backendAccessToken) return;
    try {
      setActionLoading(memberId);
      await transferGroupOwnership(session.backendAccessToken, chatId, memberId);
      const response = await getChatById(session.backendAccessToken, chatId);
      setChat(response.chat);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to transfer ownership");
    } finally {
      setActionLoading(null);
    }
  };

  const handleLeaveGroup = async () => {
    if (!session?.backendAccessToken) return;
    try {
      await leaveGroup(session.backendAccessToken, chatId);
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to leave group");
    }
  };

  useEffect(() => {
    if (!showAddMembers || !session?.backendAccessToken || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setIsSearching(true);
        const response = await searchUsers(session.backendAccessToken, searchQuery);
        const existingIds = chat?.participants.map(p => p._id) || [];
        setSearchResults(response.users.filter(u => !existingIds.includes(u._id)));
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [showAddMembers, searchQuery, session, chat]);

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  if (status === "loading" || isLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-canvas">
        <div className="flex flex-col items-center gap-4">
          <span className="h-10 w-10 animate-spin rounded-full border-[3px] border-brand/20 border-t-brand" />
          <p className="text-[11px] font-bold uppercase leading-none tracking-[0.24em] text-faint">Loading Group Info</p>
        </div>
      </main>
    );
  }

  if (!session?.backendAccessToken) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-canvas px-4">
        <div className="flex max-w-sm flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-line bg-surface text-faint">
            <Users className="h-8 w-8" />
          </div>
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-fg">Authentication Required</h1>
          <p className="mt-2 text-sm font-medium text-muted">You must be signed in to view group information.</p>
          <Link to="/" className="btn-primary mt-8">
            <Home className="h-4 w-4" />
            Go to App
          </Link>
        </div>
      </main>
    );
  }

  if (error && !chat) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-canvas px-4">
        <div className="flex max-w-sm flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/[0.07] text-rose-500">
            <Users className="h-8 w-8" />
          </div>
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-fg">Group Unavailable</h1>
          <p className="mt-2 text-sm font-medium text-muted">{error}</p>
          <Link to="/" className="btn-secondary mt-8">
            <ArrowLeft className="h-4 w-4" />
            Back to App
          </Link>
        </div>
      </main>
    );
  }

  if (!chat || !chat.isGroup) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-canvas px-4">
        <div className="flex max-w-sm flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/[0.07] text-rose-500">
            <Users className="h-8 w-8" />
          </div>
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-fg">Group Unavailable</h1>
          <p className="mt-2 text-sm font-medium text-muted">This group could not be located.</p>
          <Link to="/" className="btn-secondary mt-8">
            <ArrowLeft className="h-4 w-4" />
            Back to App
          </Link>
        </div>
      </main>
    );
  }

  const owner = chat.participants.find((p) => p._id === chat.createdBy);
  const admins = membersWithActions.filter((p) => p.isAdmin && !p.isOwner);
  const members = membersWithActions.filter((p) => !p.isAdmin);

  const closeMemberMenus = () => {
    setMembersWithActions(prev => prev.map(m => ({ ...m, actionMenuOpen: false })));
  };

  return (
    <main className="flex min-h-dvh flex-col bg-canvas">
      <NavHeader
        title="Group Information"
        showBackButton
        backTo="/"
        showNav={false}
        rightContent={
          isAdmin && (
            <button
              onClick={() => setShowInviteOptions(true)}
              className="btn-secondary !px-3.5 !py-2 !text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              New Invite
            </button>
          )
        }
      />

      {error && (
        <div className="mx-auto mt-4 flex w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex w-full items-center justify-between gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/[0.07] px-4 py-3 text-sm font-medium text-rose-600 dark:text-rose-300">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-rose-500/10"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto pb-24">
        <div className="grid border-b border-line lg:grid-cols-[400px_1fr]">
          <section className="border-b border-line p-5 sm:p-8 lg:border-b-0 lg:border-r">
            <div className="flex flex-col items-center text-center">
              <div className="group relative h-28 w-28 overflow-hidden rounded-[26px] bg-subtle shadow-float ring-4 ring-surface">
                {chat.groupAvatar ? (
                  <img src={chat.groupAvatar} alt={chat.groupName || ""} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-brand-gradient">
                    <Users className="h-10 w-10 text-white/70" />
                  </div>
                )}
                {isAdmin && (
                  <button
                    onClick={() => setShowEditGroup(true)}
                    className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Change group avatar"
                  >
                    <Pencil className="h-8 w-8 text-white" />
                  </button>
                )}
              </div>

              <div className="mt-6 flex items-center justify-center gap-2">
                <p className="text-2xl font-bold tracking-tight text-fg">{chat.groupName || "Unnamed Group"}</p>
                {isAdmin && (
                  <button
                    onClick={() => setShowEditGroup(true)}
                    className="text-faint transition-colors hover:text-brand"
                    aria-label="Edit group"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="text-sm font-medium text-muted">Created {formatConversationDate(chat.createdAt)}</p>

              <div className="mt-8 grid w-full grid-cols-2 gap-4 border-t border-line pt-6">
                <div>
                  <p className="text-xl font-bold tabular-nums text-fg">{chat.participants.length}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-faint">Members</p>
                </div>
                <div>
                  <button
                    onClick={copyInviteLink}
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-brand transition-colors hover:text-brand-hover"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    {copied ? "Link Copied!" : "Copy Invite Link"}
                  </button>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-faint">Invite</p>
                </div>
              </div>

              {isAdmin && (
                <div className="mt-6 flex flex-wrap gap-2">
                  <button
                    onClick={() => setShowAddMembers(true)}
                    className="btn-primary min-w-[120px] flex-1 !px-4 !py-2.5 !text-sm"
                  >
                    <UserPlus className="h-4 w-4" />
                    Invite
                  </button>
                  <button
                    onClick={() => setShowAppearanceModal(true)}
                    className="btn-secondary min-w-[120px] flex-1 !px-4 !py-2.5 !text-sm"
                  >
                    <Palette className="h-4 w-4 text-brand" />
                    Design
                  </button>
                  <button
                    onClick={() => setShowEditGroup(true)}
                    className="btn-secondary min-w-[120px] flex-1 !px-4 !py-2.5 !text-sm"
                  >
                    <Pencil className="h-4 w-4 text-emerald-500" />
                    Edit
                  </button>
                </div>
              )}

              {isMember && !isOwner && (
                <button
                  onClick={() => setShowLeaveConfirm(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-rose-500/25 bg-rose-500/[0.07] px-5 py-2.5 text-sm font-bold text-rose-600 transition-all hover:bg-rose-500/15 active:scale-[0.98] dark:text-rose-400"
                >
                  <LogOut className="h-4 w-4" />
                  Leave Group
                </button>
              )}
            </div>
          </section>

          <section className="p-5 sm:p-8">
            <div className="max-w-3xl space-y-10">
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <Crown className="h-4 w-4 text-amber-500" />
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-faint">Owner</h3>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-4">
                  <div className="flex min-w-0 items-center gap-4">
                    <Avatar src={owner?.avatar} name={owner?.name || "U"} className="h-12 w-12 rounded-xl" textClassName="text-lg font-bold" />
                    <div className="min-w-0">
                      <p className="truncate font-bold text-fg">{owner?.name || "Unknown Owner"}</p>
                      <p className="truncate text-xs font-medium text-muted">@{owner?.username || "unknown"}</p>
                    </div>
                  </div>
                  <Crown className="h-5 w-5 shrink-0 text-amber-500" />
                </div>
              </div>

              {admins.length > 0 && (
                <div>
                  <div className="mb-4 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-brand" />
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-faint">Administrators</h3>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {admins.map((admin) => (
                      <div key={admin._id} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-subtle/40 p-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar src={admin.avatar} name={admin.name} className="h-10 w-10 rounded-lg" textClassName="text-sm font-bold" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-fg">{admin.name}</p>
                            <p className="truncate text-[10px] font-medium text-muted">@{admin.username}</p>
                          </div>
                        </div>
                        {isOwner && (
                          <div className="relative shrink-0">
                            <button
                              onClick={() => {
                                setMembersWithActions(prev =>
                                  prev.map(m => m._id === admin._id ? { ...m, actionMenuOpen: !m.actionMenuOpen } : { ...m, actionMenuOpen: false })
                                );
                              }}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-faint transition-colors hover:bg-subtle hover:text-fg"
                              disabled={actionLoading === admin._id}
                              aria-label="Member options"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                            {admin.actionMenuOpen && (
                              <div className="absolute right-0 top-full z-10 mt-1 w-48 overflow-hidden rounded-xl border border-line bg-elevated py-1 shadow-float">
                                <button
                                  onClick={() => { handleDemoteFromAdmin(admin._id); closeMemberMenus(); }}
                                  className={menuItemClass}
                                >
                                  <Shield className="h-4 w-4" />
                                  Remove Admin
                                </button>
                                <button
                                  onClick={() => { handleRemoveMember(admin._id); closeMemberMenus(); }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-rose-600 transition-colors hover:bg-rose-500/10 dark:text-rose-400"
                                >
                                  <UserMinus className="h-4 w-4" />
                                  Remove from Group
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="mb-4 flex items-center gap-2">
                  <Users className="h-4 w-4 text-faint" />
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-faint">
                    Members <span className="ml-1 tabular-nums text-muted">({members.length})</span>
                  </h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {members.map((member) => (
                    <div key={member._id} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface p-3 transition-colors hover:border-brand/20">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar src={member.avatar} name={member.name} className="h-10 w-10 rounded-lg" textClassName="text-sm font-bold" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-fg">{member.name}</p>
                          <p className="truncate text-[10px] font-medium text-muted">@{member.username}</p>
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="relative shrink-0">
                          <button
                            onClick={() => {
                              setMembersWithActions(prev =>
                                prev.map(m => m._id === member._id ? { ...m, actionMenuOpen: !m.actionMenuOpen } : { ...m, actionMenuOpen: false })
                              );
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-faint transition-colors hover:bg-subtle hover:text-fg"
                            disabled={actionLoading === member._id}
                            aria-label="Member options"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          {member.actionMenuOpen && (
                            <div className="absolute right-0 top-full z-10 mt-1 w-48 overflow-hidden rounded-xl border border-line bg-elevated py-1 shadow-float">
                              {isOwner && (
                                <button
                                  onClick={() => { handlePromoteToAdmin(member._id); closeMemberMenus(); }}
                                  className={menuItemClass}
                                >
                                  <ShieldCheck className="h-4 w-4" />
                                  Make Admin
                                </button>
                              )}
                              {isOwner && (
                                <button
                                  onClick={() => { handleTransferOwnership(member._id); closeMemberMenus(); }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-amber-600 transition-colors hover:bg-amber-500/10 dark:text-amber-400"
                                >
                                  <ArrowRightCircle className="h-4 w-4" />
                                  Transfer Ownership
                                </button>
                              )}
                              <button
                                onClick={() => { handleRemoveMember(member._id); closeMemberMenus(); }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-rose-600 transition-colors hover:bg-rose-500/10 dark:text-rose-400"
                              >
                                <UserMinus className="h-4 w-4" />
                                Remove from Group
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Add Members Modal */}
      {showAddMembers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl border border-line bg-elevated p-6 shadow-float"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-members-title"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <UserPlus className="h-4 w-4" />
                </span>
                <h2 id="add-members-title" className="text-lg font-bold tracking-tight text-fg">Add Members</h2>
              </div>
              <button
                onClick={() => { setShowAddMembers(false); setSearchQuery(""); setSelectedUserIds([]); }}
                className="icon-btn"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input"
            />

            <div className="mt-4 max-h-60 space-y-1.5 overflow-y-auto">
              {isSearching && <p className="py-4 text-center text-sm text-muted">Searching...</p>}
              {!isSearching && searchResults.length === 0 && searchQuery && (
                <p className="py-4 text-center text-sm text-faint">No users found</p>
              )}
              {searchResults.map((user) => {
                const isSelected = selectedUserIds.includes(user._id);
                return (
                  <button
                    key={user._id}
                    onClick={() => toggleUserSelection(user._id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-xl border p-3 transition-colors",
                      isSelected
                        ? "border-brand/30 bg-brand/[0.06]"
                        : "border-transparent hover:bg-subtle"
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar src={user.avatar} name={user.name} className="h-10 w-10 rounded-lg" />
                      <div className="min-w-0 text-left">
                        <p className="truncate text-sm font-bold text-fg">{user.name}</p>
                        <p className="truncate text-xs text-muted">@{user.username}</p>
                      </div>
                    </div>
                    <span className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-colors",
                      isSelected ? "bg-brand text-white" : "border border-line text-transparent"
                    )}>
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => { setShowAddMembers(false); setSearchQuery(""); setSelectedUserIds([]); }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMembers}
                disabled={selectedUserIds.length === 0 || isAddingMembers}
                className="btn-primary flex-1"
              >
                {isAddingMembers ? "Adding..." : `Add ${selectedUserIds.length} Member${selectedUserIds.length !== 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Group Confirmation */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div
            className="w-full max-w-sm overflow-hidden rounded-3xl border border-line bg-elevated p-6 shadow-float"
            role="alertdialog"
            aria-modal="true"
          >
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 ring-1 ring-rose-500/20 dark:text-rose-400">
              <LogOut className="h-7 w-7" />
            </div>
            <h2 className="text-lg font-bold tracking-tight text-fg">Leave Group?</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Are you sure you want to leave "{chat.groupName}"? You can rejoin later with an invite link.
            </p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowLeaveConfirm(false)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button onClick={handleLeaveGroup} className="btn-danger flex-1">
                Leave Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Group Modal */}
      {showEditGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div
            className="w-full max-w-sm overflow-hidden rounded-2xl border border-line bg-elevated p-6 shadow-float"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-group-title"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <Pencil className="h-4 w-4" />
                </span>
                <h2 id="edit-group-title" className="text-lg font-bold tracking-tight text-fg">Edit Group Profile</h2>
              </div>
              <button onClick={() => setShowEditGroup(false)} className="icon-btn" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-faint">Group Name</label>
                <input
                  type="text"
                  value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  className="input"
                  placeholder="Enter group name"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-faint">Avatar</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editGroupAvatar}
                    onChange={(e) => setEditGroupAvatar(e.target.value)}
                    className="input flex-1"
                    placeholder="Avatar URL..."
                  />
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-brand transition-colors hover:bg-brand/5 disabled:opacity-50"
                    aria-label="Upload avatar"
                  >
                    {uploadingAvatar ? <RefreshCw className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
                  </button>
                </div>
                <input
                  type="file"
                  hidden
                  ref={avatarInputRef}
                  accept="image/*"
                  onChange={handleAvatarChange}
                />
              </div>

              <div className="border-t border-line pt-4">
                <div className="mb-2 flex items-center gap-2">
                  <Palette className="h-4 w-4 text-brand" />
                  <span className="text-sm font-bold text-fg">Design Settings</span>
                </div>
                <p className="mb-4 text-xs leading-relaxed text-muted">
                  Chat theme and wallpaper have been moved to the separate Appearance menu for better control.
                </p>
                <button
                  type="button"
                  onClick={() => { setShowEditGroup(false); setShowAppearanceModal(true); }}
                  className="btn-secondary w-full !py-2.5 !text-xs"
                >
                  Open Appearance Settings
                </button>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowEditGroup(false)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={handleUpdateGroup}
                disabled={isSaving || !editGroupName.trim()}
                className="btn-primary flex-1"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Link Options Modal */}
      {showInviteOptions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div
            className="w-full max-w-sm overflow-hidden rounded-2xl border border-line bg-elevated p-6 shadow-float"
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-options-title"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <Link2 className="h-4 w-4" />
                </span>
                <h3 id="invite-options-title" className="text-lg font-bold tracking-tight text-fg">Invite Link Options</h3>
              </div>
              <button onClick={() => setShowInviteOptions(false)} className="icon-btn" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-faint">
                  Expires In
                </label>
                <select
                  value={inviteExpiresInHours}
                  onChange={(e) => setInviteExpiresInHours(Number(e.target.value))}
                  className="input"
                >
                  <option value={1}>1 hour</option>
                  <option value={6}>6 hours</option>
                  <option value={24}>24 hours</option>
                  <option value={72}>3 days</option>
                  <option value={168}>7 days</option>
                  <option value={720}>30 days</option>
                  <option value={8760}>1 year</option>
                  <option value={87600}>10 years</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-faint">
                  Max Uses (optional)
                </label>
                <select
                  value={inviteMaxUses ?? ""}
                  onChange={(e) => setInviteMaxUses(e.target.value ? Number(e.target.value) : undefined)}
                  className="input"
                >
                  <option value="">Unlimited</option>
                  <option value={1}>1 use</option>
                  <option value={5}>5 uses</option>
                  <option value={10}>10 uses</option>
                  <option value={25}>25 uses</option>
                  <option value={50}>50 uses</option>
                  <option value={100}>100 uses</option>
                  <option value={200}>200 uses</option>
                  <option value={300}>300 uses</option>
                  <option value={500}>500 uses</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowInviteOptions(false)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button onClick={generateNewInviteLink} className="btn-primary flex-1">
                Generate Link
              </button>
            </div>
          </div>
        </div>
      )}

      {chat && (
        <ChatAppearanceModal
          chat={chat}
          isOpen={showAppearanceModal}
          onClose={() => setShowAppearanceModal(false)}
          onUpdate={(updatedChat) => setChat(updatedChat)}
        />
      )}
    </main>
  );
};
