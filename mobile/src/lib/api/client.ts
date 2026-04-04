import { mobileConfig } from "@/lib/config";
import {
  ChatParticipant,
  MobileChat,
  MobileGroupInvite,
  MobileGroupInvitePreview,
  MobileMessage,
  MobileProfile,
} from "@/lib/types";

type RequestOptions = RequestInit & {
  token?: string;
};

export const apiRequest = async <T>(path: string, options: RequestOptions = {}) => {
  const response = await fetch(`${mobileConfig.apiUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message || `Request failed with status ${response.status}`);
  }

  return payload?.data as T;
};

export const getMobileChats = (token: string) =>
  apiRequest<{ chats: MobileChat[] }>("/chats", {
    method: "GET",
    token,
  });

export const getMobileAuthMe = (token: string) =>
  apiRequest<{
    user: {
      _id: string;
      name: string;
      email: string;
      avatar: string | null;
    };
  }>("/auth/me", {
    method: "GET",
    token,
  });

export const redeemMobileWebAuthCode = async (code: string) => {
  const response = await fetch(`${mobileConfig.apiUrl}/auth/mobile/redeem`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message || `Code redemption failed with status ${response.status}`);
  }

  const accessToken = payload?.data?.accessToken;

  if (typeof accessToken !== "string" || !accessToken) {
    throw new Error("Code redeemed but no access token was returned");
  }

  return accessToken;
};

export const loginMobileWithGoogle = (idToken: string) =>
  apiRequest<{
    user: {
      _id: string;
      name: string;
      email: string;
      avatar: string | null;
    };
    accessToken: string;
  }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      idToken,
    }),
  });

export const getMobileMessages = (token: string, chatId: string, page = 1, limit = 30) =>
  apiRequest<{
    messages: MobileMessage[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
    };
  }>(`/messages/${chatId}?page=${page}&limit=${limit}`, {
    method: "GET",
    token,
  });

export const postMobileMessage = (token: string, input: { chatId: string; content: string; replyToId?: string | null }) =>
  apiRequest<{ message: MobileMessage }>("/messages", {
    method: "POST",
    token,
    body: JSON.stringify(input),
  });

export const registerMobilePushToken = (token: string, pushToken: string, platform: "android" | "ios") =>
  apiRequest("/users/push-token", {
    method: "POST",
    token,
    body: JSON.stringify({
      token: pushToken,
      platform,
    }),
  });

export const unregisterMobilePushToken = (token: string, pushToken: string) =>
  apiRequest("/users/push-token", {
    method: "DELETE",
    token,
    body: JSON.stringify({
      token: pushToken,
    }),
  });

export const getMobileProfile = (token: string) =>
  apiRequest<{ profile: MobileProfile }>("/users/me", {
    method: "GET",
    token,
  });

export const updateMobileProfile = (
  token: string,
  input: { name?: string; tagline?: string; bio?: string }
) =>
  apiRequest<{ profile: MobileProfile }>("/users/me", {
    method: "PATCH",
    token,
    body: JSON.stringify(input),
  });

export const getMobileExploreUsers = (token: string) =>
  apiRequest<{ users: ChatParticipant[] }>("/users/explore", {
    method: "GET",
    token,
  });

export const searchMobileUsers = (token: string, query: string) =>
  apiRequest<{ users: ChatParticipant[] }>(`/users/search?q=${encodeURIComponent(query)}`, {
    method: "GET",
    token,
  });

export const sendMobileFriendRequest = (token: string, userId: string) =>
  apiRequest<{ profile: MobileProfile }>(`/users/${userId}/friend-request`, {
    method: "POST",
    token,
  });

export const acceptMobileFriendRequest = (token: string, userId: string) =>
  apiRequest<{ profile: MobileProfile }>(`/users/${userId}/friend-request/accept`, {
    method: "POST",
    token,
  });

export const rejectMobileFriendRequest = (token: string, userId: string) =>
  apiRequest<{ profile: MobileProfile }>(`/users/${userId}/friend-request/reject`, {
    method: "POST",
    token,
  });

export const unfriendMobileUser = (token: string, userId: string) =>
  apiRequest<{ profile: MobileProfile }>(`/users/${userId}/friend`, {
    method: "DELETE",
    token,
  });

export const blockMobileUser = (token: string, userId: string) =>
  apiRequest<{ profile: MobileProfile }>(`/users/${userId}/block`, {
    method: "POST",
    token,
  });

export const unblockMobileUser = (token: string, userId: string) =>
  apiRequest<{ profile: MobileProfile }>(`/users/${userId}/block`, {
    method: "DELETE",
    token,
  });

export const createMobileChat = (token: string, participantId: string) =>
  apiRequest<{ chat: MobileChat }>("/chats", {
    method: "POST",
    token,
    body: JSON.stringify({ participantId }),
  });

export const markMobileChatRead = (token: string, chatId: string) =>
  apiRequest<{ chat: MobileChat }>(`/chats/${chatId}/read`, {
    method: "PATCH",
    token,
  });


export const addMobileReaction = (token: string, messageId: string, emoji: string) =>
  apiRequest<{ message: MobileMessage }>(`/messages/${messageId}/reaction`, {
    method: "POST",
    token,
    body: JSON.stringify({ emoji }),
  });

export const removeMobileReaction = (token: string, messageId: string, emoji: string) =>
  apiRequest<{ message: MobileMessage }>(`/messages/${messageId}/reaction?emoji=${encodeURIComponent(emoji)}`, {
    method: "DELETE",
    token,
  });

export const deleteMobileMessage = (token: string, messageId: string, scope: "me" | "everyone") =>
  apiRequest<{ messageId: string; chatId: string; message?: MobileMessage }>(`/messages/${messageId}?scope=${scope}`, {
    method: "DELETE",
    token,
  });

export const uploadMobileMedia = async (token: string, file: { uri: string; type: string; name: string }) => {
  const formData = new FormData();
  formData.append("file", {
    uri: file.uri,
    type: file.type,
    name: file.name,
  } as unknown as Blob);

  const response = await fetch(`${mobileConfig.apiUrl}/messages/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message || `Upload failed with status ${response.status}`);
  }

  return payload?.data as { media: MobileMessage["media"] };
};

export const sendMobileMediaMessage = (
  token: string,
  input: { chatId: string; type: "image" | "file"; media: MobileMessage["media"]; content?: string }
) =>
  apiRequest<{ message: MobileMessage }>("/messages", {
    method: "POST",
    token,
    body: JSON.stringify(input),
  });

export const createMobileGroupChat = (
  token: string,
  input: { groupName: string; participantIds: string[] }
) =>
  apiRequest<{ chat: MobileChat }>("/chats", {
    method: "POST",
    token,
    body: JSON.stringify({
      isGroup: true,
      groupName: input.groupName,
      participantIds: input.participantIds,
    }),
  });

export const updateMobileGroupProfile = (
  token: string,
  chatId: string,
  input: { groupName?: string; groupAvatar?: string | null }
) =>
  apiRequest<{ chat: MobileChat }>(`/chats/${chatId}/group`, {
    method: "PATCH",
    token,
    body: JSON.stringify(input),
  });

export const addMobileGroupMembers = (
  token: string,
  chatId: string,
  memberIds: string[]
) =>
  apiRequest<{ chat: MobileChat }>(`/chats/${chatId}/members`, {
    method: "POST",
    token,
    body: JSON.stringify({ memberIds }),
  });

export const removeMobileGroupMember = (
  token: string,
  chatId: string,
  memberId: string
) =>
  apiRequest<{ chat: MobileChat }>(`/chats/${chatId}/members/${memberId}`, {
    method: "DELETE",
    token,
  });

export const promoteMobileGroupAdmin = (
  token: string,
  chatId: string,
  memberId: string
) =>
  apiRequest<{ chat: MobileChat }>(`/chats/${chatId}/admins/${memberId}`, {
    method: "POST",
    token,
  });

export const demoteMobileGroupAdmin = (
  token: string,
  chatId: string,
  memberId: string
) =>
  apiRequest<{ chat: MobileChat }>(`/chats/${chatId}/admins/${memberId}`, {
    method: "DELETE",
    token,
  });

export const transferMobileGroupOwnership = (
  token: string,
  chatId: string,
  nextOwnerId: string
) =>
  apiRequest<{ chat: MobileChat }>(`/chats/${chatId}/owner`, {
    method: "POST",
    token,
    body: JSON.stringify({ nextOwnerId }),
  });

export const leaveMobileGroup = (token: string, chatId: string) =>
  apiRequest<{ chatId: string; deleted: boolean }>(`/chats/${chatId}/leave`, {
    method: "POST",
    token,
  });

export const createMobileGroupInviteLink = (
  token: string,
  chatId: string,
  input?: { expiresInHours?: number; maxUses?: number }
) =>
  apiRequest<{ invite: MobileGroupInvite }>(`/chats/${chatId}/invite-link`, {
    method: "POST",
    token,
    body: JSON.stringify({
      expiresInHours: input?.expiresInHours,
      maxUses: input?.maxUses,
    }),
  });

export const previewMobileGroupInviteLink = (token: string, inviteToken: string) =>
  apiRequest<{ invite: MobileGroupInvitePreview }>(`/chats/invite/${encodeURIComponent(inviteToken)}`, {
    method: "GET",
    token,
  });

export const joinMobileGroupViaInvite = (token: string, inviteToken: string) =>
  apiRequest<{ chat: MobileChat | null; joined: boolean }>(
    `/chats/invite/${encodeURIComponent(inviteToken)}/join`,
    {
      method: "POST",
      token,
    }
  );

export const getMobileBlockedUsers = (token: string) =>
  apiRequest<{ blockedUsers: ChatParticipant[] }>("/users/me/blocked", {
    method: "GET",
    token,
  });

export const getMobileProfileByUserId = (token: string, userId: string) =>
  apiRequest<{ profile: MobileProfile }>(`/users/${userId}/profile`, {
    method: "GET",
    token,
  });

export const getMobileProfileByUsername = (token: string, username: string) =>
  apiRequest<{ profile: MobileProfile }>(`/users/profile/${encodeURIComponent(username)}`, {
    method: "GET",
    token,
  });

export const searchMobileUsersByQuery = (token: string, query: string) =>
  apiRequest<{ users: ChatParticipant[] }>(`/users/search?q=${encodeURIComponent(query)}`, {
    method: "GET",
    token,
  });

export const markMobileChatUnread = (token: string, chatId: string) =>
  apiRequest<{ chat: MobileChat }>(`/chats/${chatId}/unread`, {
    method: "PATCH",
    token,
  });

