import { useEffect, useState, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { 
  ArrowLeft, Home, LogOut, Shield, Users, Crown, ShieldCheck,
  UserPlus, MoreVertical, Check, X, RefreshCw, UserMinus, ArrowRightCircle,
  Pencil, Palette, Image as ImageIcon
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
import { formatConversationDate } from "@/lib/utils";

type MemberWithAction = BackendUser & { isOwner: boolean; isAdmin: boolean; actionMenuOpen: boolean };

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
      <main className="flex h-screen items-center justify-center bg-white dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest leading-none">Loading Group Info</p>
        </div>
      </main>
    );
  }

  if (!session?.backendAccessToken) {
    return (
      <main className="flex h-screen items-center justify-center bg-white dark:bg-slate-950">
        <div className="flex max-w-sm flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <Users className="h-8 w-8 text-slate-400" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-slate-900 dark:text-white">Authentication Required</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">You must be signed in to view group information.</p>
          <Link to="/" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-slate-800 active:scale-95 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">
            <Home className="h-4 w-4" />
            Go to App
          </Link>
        </div>
      </main>
    );
  }

  if (error && !chat) {
    return (
      <main className="flex h-screen items-center justify-center bg-white dark:bg-slate-950">
        <div className="flex max-w-sm flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-900/30">
            <Users className="h-8 w-8 text-rose-500" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-slate-900 dark:text-white">Group Unavailable</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">{error}</p>
          <Link to="/" className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-slate-800 active:scale-95 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">
            <ArrowLeft className="h-4 w-4" />
            Back to App
          </Link>
        </div>
      </main>
    );
  }

  if (!chat || !chat.isGroup) {
    return (
      <main className="flex h-screen items-center justify-center bg-white dark:bg-slate-950">
        <div className="flex max-w-sm flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-900/30">
            <Users className="h-8 w-8 text-rose-500" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-slate-900 dark:text-white">Group Unavailable</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">This group could not be located.</p>
          <Link to="/" className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-slate-800 active:scale-95 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">
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

  return (
    <main className="flex h-screen flex-col bg-white dark:bg-slate-950">
      <NavHeader
        title="Group Information"
        showBackButton
        backTo="/"
        showNav={false}
        rightContent={
          isAdmin && (
            <button
              onClick={() => setShowInviteOptions(true)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-900 transition-all hover:bg-slate-50 dark:border-slate-800 dark:text-white dark:hover:bg-slate-800 flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              New Invite
            </button>
          )
        }
      />

      {error && (
        <div className="mx-6 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/10">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto pb-24">
        <div className="grid border-b border-slate-200 dark:border-slate-800 lg:grid-cols-[400px_1fr]">
          <section className="border-r border-slate-200 p-5 sm:p-8 dark:border-slate-800">
            <div className="flex flex-col items-center text-center">
              <div className="relative h-28 w-28 overflow-hidden rounded-2xl border-4 border-white bg-slate-100 shadow-xl ring-1 ring-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:ring-slate-700">
                {chat.groupAvatar ? (
                  <img src={chat.groupAvatar} alt={chat.groupName || ""} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-900">
                    <Users className="h-10 w-10 text-white/50" />
                  </div>
                )}
                {isAdmin && (
                  <button 
                    onClick={() => setShowEditGroup(true)}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100"
                  >
                    <Pencil className="h-8 w-8 text-white" />
                  </button>
                )}
              </div>
              <div className="mt-6 flex items-center justify-center gap-3">
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{chat.groupName || "Unnamed Group"}</p>
                {isAdmin && (
                  <button onClick={() => setShowEditGroup(true)} className="text-slate-400 hover:text-blue-500 transition-colors">
                    <Pencil className="h-5 w-5" />
                  </button>
                )}
              </div>
              <p className="text-sm font-medium text-slate-500">Created {formatConversationDate(chat.createdAt)}</p>
              
              <div className="mt-8 grid w-full grid-cols-2 gap-4 border-t border-slate-100 pt-8 dark:border-slate-800">
                <div>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{chat.participants.length}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Members</p>
                </div>
                <div>
                  <button 
                    onClick={copyInviteLink} 
                    className="text-sm font-bold text-blue-600 hover:underline"
                  >
                    {copied ? "Link Copied!" : "Copy Invite Link"}
                  </button>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Invite</p>
                </div>
              </div>

              {isAdmin && (
                <div className="mt-6 flex flex-wrap gap-2">
                  <button
                    onClick={() => setShowAddMembers(true)}
                    className="flex flex-1 min-w-[120px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-blue-700 shadow-sm shadow-blue-600/20"
                  >
                    <UserPlus className="h-4 w-4" />
                    Invite
                  </button>
                  <button
                    onClick={() => setShowAppearanceModal(true)}
                    className="flex flex-1 min-w-[120px] items-center justify-center gap-2 rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                  >
                    <Palette className="h-4 w-4 text-blue-500" />
                    Design
                  </button>
                  <button
                    onClick={() => setShowEditGroup(true)}
                    className="flex flex-1 min-w-[120px] items-center justify-center gap-2 rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                  >
                    <Pencil className="h-4 w-4 text-emerald-500" />
                    Edit
                  </button>
                </div>
              )}

              {isMember && !isOwner && (
                <button
                  onClick={() => setShowLeaveConfirm(true)}
                  className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-bold text-rose-600 transition-all hover:bg-rose-100 dark:border-rose-900/30 dark:bg-rose-900/10 dark:text-rose-400"
                >
                  <LogOut className="h-4 w-4" />
                  Leave Group
                </button>
              )}
            </div>
          </section>

          <section className="p-5 sm:p-8">
            <div className="max-w-3xl space-y-12">
              <div>
                <div className="mb-6 flex items-center gap-2">
                  <Crown className="h-4 w-4 text-amber-500" />
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Owner</h3>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-amber-50/50 p-4 dark:bg-amber-900/5 border border-amber-100 dark:border-amber-900/20">
                  <div className="flex items-center gap-4">
                    <Avatar src={owner?.avatar} name={owner?.name || "U"} className="h-12 w-12 rounded-xl" textClassName="text-lg font-bold" />
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{owner?.name || "Unknown Owner"}</p>
                      <p className="text-xs font-medium text-slate-500">@{owner?.username || "unknown"}</p>
                    </div>
                  </div>
                  <Crown className="h-5 w-5 text-amber-500" />
                </div>
              </div>

              {admins.length > 0 && (
                <div>
                  <div className="mb-6 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-blue-500" />
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Administrators</h3>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {admins.map((admin) => (
                      <div key={admin._id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                        <div className="flex items-center gap-3">
                          <Avatar src={admin.avatar} name={admin.name} className="h-10 w-10 rounded-lg" textClassName="text-sm font-bold" />
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{admin.name}</p>
                            <p className="text-[10px] font-medium text-slate-500">@{admin.username}</p>
                          </div>
                        </div>
                        {isOwner && (
                          <div className="relative">
                            <button
                              onClick={() => {
                                setMembersWithActions(prev => 
                                  prev.map(m => m._id === admin._id ? { ...m, actionMenuOpen: !m.actionMenuOpen } : { ...m, actionMenuOpen: false })
                                );
                              }}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                              disabled={actionLoading === admin._id}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                            {admin.actionMenuOpen && (
                              <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                                <button
                                  onClick={() => { handleDemoteFromAdmin(admin._id); setMembersWithActions(prev => prev.map(m => ({ ...m, actionMenuOpen: false }))); }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                                >
                                  <Shield className="h-4 w-4" />
                                  Remove Admin
                                </button>
                                <button
                                  onClick={() => { handleRemoveMember(admin._id); setMembersWithActions(prev => prev.map(m => ({ ...m, actionMenuOpen: false }))); }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-400"
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
                <div className="mb-6 flex items-center gap-2">
                  <Users className="h-4 w-4 text-slate-400" />
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Members</h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {members.map((member) => (
                    <div key={member._id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                      <div className="flex items-center gap-3">
                        <Avatar src={member.avatar} name={member.name} className="h-10 w-10 rounded-lg" textClassName="text-sm font-bold" />
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{member.name}</p>
                          <p className="text-[10px] font-medium text-slate-500">@{member.username}</p>
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="relative">
                          <button
                            onClick={() => {
                              setMembersWithActions(prev => 
                                prev.map(m => m._id === member._id ? { ...m, actionMenuOpen: !m.actionMenuOpen } : { ...m, actionMenuOpen: false })
                              );
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                            disabled={actionLoading === member._id}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          {member.actionMenuOpen && (
                            <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                              {isOwner && (
                                <button
                                  onClick={() => { handlePromoteToAdmin(member._id); setMembersWithActions(prev => prev.map(m => ({ ...m, actionMenuOpen: false }))); }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                                >
                                  <ShieldCheck className="h-4 w-4" />
                                  Make Admin
                                </button>
                              )}
                              {isOwner && (
                                <button
                                  onClick={() => { handleTransferOwnership(member._id); setMembersWithActions(prev => prev.map(m => ({ ...m, actionMenuOpen: false }))); }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-amber-600 hover:bg-amber-50 dark:text-amber-400"
                                >
                                  <ArrowRightCircle className="h-4 w-4" />
                                  Transfer Ownership
                                </button>
                              )}
                              <button
                                onClick={() => { handleRemoveMember(member._id); setMembersWithActions(prev => prev.map(m => ({ ...m, actionMenuOpen: false }))); }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-400"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Add Members</h2>
              <button onClick={() => { setShowAddMembers(false); setSearchQuery(""); setSelectedUserIds([]); }} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            
            <div className="mt-4 max-h-60 space-y-2 overflow-y-auto">
              {isSearching && <p className="text-center text-sm text-slate-500">Searching...</p>}
              {!isSearching && searchResults.length === 0 && searchQuery && (
                <p className="text-center text-sm text-slate-500">No users found</p>
              )}
              {searchResults.map((user) => (
                <button
                  key={user._id}
                  onClick={() => toggleUserSelection(user._id)}
                  className={`flex w-full items-center justify-between rounded-xl border p-3 transition-colors ${
                    selectedUserIds.includes(user._id)
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar src={user.avatar} name={user.name} className="h-10 w-10 rounded-lg" />
                    <div className="text-left">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{user.name}</p>
                      <p className="text-xs text-slate-500">@{user.username}</p>
                    </div>
                  </div>
                  {selectedUserIds.includes(user._id) && <Check className="h-5 w-5 text-blue-600" />}
                </button>
              ))}
            </div>
            
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => { setShowAddMembers(false); setSearchQuery(""); setSelectedUserIds([]); }}
                className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMembers}
                disabled={selectedUserIds.length === 0 || isAddingMembers}
                className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isAddingMembers ? "Adding..." : `Add ${selectedUserIds.length} Member${selectedUserIds.length !== 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Group Confirmation */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Leave Group?</h2>
            <p className="mt-2 text-sm text-slate-500">Are you sure you want to leave "{chat.groupName}"? You can rejoin later with an invite link.</p>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleLeaveGroup}
                className="flex-1 rounded-xl bg-rose-600 py-3 text-sm font-bold text-white hover:bg-rose-700"
              >
                Leave Group
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Group Modal */}
      {showEditGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Edit Group Profile</h2>
            
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-700 dark:text-slate-300">Group Name</label>
                <input
                  type="text"
                  value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  placeholder="Enter group name"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-slate-700 dark:text-slate-300">Avatar</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editGroupAvatar}
                    onChange={(e) => setEditGroupAvatar(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    placeholder="Avatar URL..."
                  />
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-50 dark:bg-blue-900/30 dark:text-blue-400"
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

              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-2">
                  <Palette className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Design Settings</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Chat theme and wallpaper have been moved to the separate Appearance menu for better control.</p>
                <button 
                  type="button"
                  onClick={() => { setShowEditGroup(false); setShowAppearanceModal(true); }}
                  className="w-full rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 transition-colors"
                >
                  Open Appearance Settings
                </button>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowEditGroup(false)}
                className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateGroup}
                disabled={isSaving || !editGroupName.trim()}
                className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Link Options Modal */}
      {showInviteOptions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Invite Link Options</h3>
              <button onClick={() => setShowInviteOptions(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Expires In
                </label>
                <select
                  value={inviteExpiresInHours}
                  onChange={(e) => setInviteExpiresInHours(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
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
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Max Uses (optional)
                </label>
                <select
                  value={inviteMaxUses ?? ""}
                  onChange={(e) => setInviteMaxUses(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
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
              <button
                onClick={() => setShowInviteOptions(false)}
                className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={generateNewInviteLink}
                className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700"
              >
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
