import { 
  Chat, 
  UserProfile,
  Message, 
  MessageType, 
  BackendUser, 
  MediaAttachment 
} from "./types";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: {
    method?: string;
    token?: string | null;
    body?: string | FormData;
    headers?: Record<string, string>;
    signal?: AbortSignal;
  } = {}
): Promise<T> {
  const { method = "GET", token, body, headers = {}, signal } = options;
  const url = `${API_BASE_URL}${path}`;

  const requestHeaders: Record<string, string> = {
    ...headers,
  };

  if (token) {
    requestHeaders["Authorization"] = `Bearer ${token}`;
  }

  if (!(body instanceof FormData) && !requestHeaders["Content-Type"]) {
    requestHeaders["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body,
    signal,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMessage = payload?.message || `Request failed with status ${response.status}`;
    throw new ApiError(response.status, errorMessage);
  }

  return (payload?.data ?? null) as T;
}

async function uploadWithProgress<T>(
  url: string,
  options: {
    body: FormData;
    headers?: Record<string, string>;
    onProgress?: (progress: number) => void;
    onXhrChange?: (xhr: XMLHttpRequest | null) => void;
  }
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    options.onXhrChange?.(xhr);
    
    xhr.open("POST", url);

    Object.entries(options.headers || {}).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        options.onProgress?.(progress);
      }
    };

    xhr.onload = () => {
      options.onXhrChange?.(null);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error("Failed to parse response"));
        }
      } else {
        try {
          const errorData = JSON.parse(xhr.responseText);
          reject(new ApiError(xhr.status, errorData.message || "Upload failed"));
        } catch {
          reject(new ApiError(xhr.status, "Upload failed"));
        }
      }
    };

    xhr.onerror = () => {
      options.onXhrChange?.(null);
      reject(new Error("Network error"));
    };
    
    xhr.send(options.body);
  });
}

export const getChats = async (token: string) =>
  request<{ chats: Chat[] }>("/chats", { token });

export const getChatById = async (token: string, chatId: string) =>
  request<{ chat: Chat }>(`/chats/${chatId}`, { token });

export const createChat = async (token: string, participantId: string) =>
  request<{ chat: Chat }>("/chats", {
    method: "POST",
    token,
    body: JSON.stringify({ participantId }),
  });

export const createGroupChat = async (token: string, input: { groupName: string; participantIds: string[] }) =>
  request<{ chat: Chat }>("/chats", {
    method: "POST",
    token,
    body: JSON.stringify({
      isGroup: true,
      groupName: input.groupName,
      participantIds: input.participantIds,
    }),
  });

export const createGroup = createGroupChat;

export const searchUsers = async (token: string, query: string, signal?: AbortSignal) =>
  request<{ users: BackendUser[] }>(`/users/search?q=${encodeURIComponent(query)}`, { token, signal });

export const exploreUsers = async (token: string) =>
  request<{ users: BackendUser[] }>("/users/explore", { token });

export const getMyProfile = async (token: string) =>
  request<{ profile: UserProfile }>("/users/me", { token });

export const updateMyProfile = async (
  token: string,
  input: { name?: string; tagline?: string; bio?: string }
) =>
  request<{ profile: UserProfile }>("/users/me", {
    method: "PATCH",
    token,
    body: JSON.stringify(input),
  });

export const getProfileByUsername = async (token: string, username: string) =>
  request<{ profile: UserProfile }>(`/users/profile/${encodeURIComponent(username)}`, {
    method: "GET",
    token,
  });

export const getProfileByUserId = async (token: string, userId: string) =>
  request<{ profile: UserProfile }>(`/users/${encodeURIComponent(userId)}/profile`, {
    method: "GET",
    token,
  });

export const sendFriendRequest = async (token: string, userId: string) =>
  request<{ profile: UserProfile }>(`/users/${encodeURIComponent(userId)}/friend-request`, {
    method: "POST",
    token,
  });

export const acceptFriendRequest = async (token: string, userId: string) =>
  request<{ profile: UserProfile }>(`/users/${encodeURIComponent(userId)}/friend-request/accept`, {
    method: "POST",
    token,
  });

export const rejectFriendRequest = async (token: string, userId: string) =>
  request<{ profile: UserProfile }>(`/users/${encodeURIComponent(userId)}/friend-request/reject`, {
    method: "POST",
    token,
  });

export const removeFriend = async (token: string, userId: string) =>
  request<{ profile: UserProfile }>(`/users/${encodeURIComponent(userId)}/friend`, {
    method: "DELETE",
    token,
  });

export const blockUser = async (token: string, userId: string) =>
  request<{ profile: UserProfile }>(`/users/${encodeURIComponent(userId)}/block`, {
    method: "POST",
    token,
  });

export const unblockUser = async (token: string, userId: string) =>
  request<{ profile: UserProfile }>(`/users/${encodeURIComponent(userId)}/block`, {
    method: "DELETE",
    token,
  });

export const disableMyAccount = async (token: string) =>
  request<{ ok: boolean }>("/users/me/disable", {
    method: "POST",
    token,
  });

export const deleteMyAccount = async (token: string) =>
  request<{ ok: boolean }>("/users/me", {
    method: "DELETE",
    token,
  });

export const createGroupInviteLink = async (
  token: string,
  chatId: string,
  input?: { expiresInHours?: number; maxUses?: number }
) =>
  request<{
    invite: {
      token: string;
      expiresAt: string;
      maxUses?: number;
    };
  }>(`/chats/${chatId}/invite-link`, {
    method: "POST",
    token,
    body: JSON.stringify(input),
  });

export const getGroupInvitePreview = async (token: string, inviteToken: string) =>
  request<{
    invite: {
      chatId: string;
      groupName: string;
      groupAvatar: string | null;
      memberCount: number;
      isAlreadyMember: boolean;
      expiresAt: string;
      maxUses: number;
      useCount: number;
    };
  }>(`/chats/invite/${encodeURIComponent(inviteToken)}`, {
    method: "GET",
    token,
  });

export const joinGroupViaInvite = async (token: string, inviteToken: string) =>
  request<{
    chat: Chat | null;
    joined: boolean;
  }>(`/chats/invite/${encodeURIComponent(inviteToken)}/join`, {
    method: "POST",
    token,
  });

export const getMessages = async (token: string, chatId: string, page = 1, limit = 30, signal?: AbortSignal) =>
  request<{
    messages: Message[];
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
    signal,
  });

export const sendMessage = async (
  token: string,
  input: {
    chatId: string;
    content?: string;
    type?: MessageType;
    replyToId?: string | null;
    media?: MediaAttachment | null;
  }
) =>
  request<{ message: Message }>("/messages", {
    method: "POST",
    token,
    body: JSON.stringify(input),
  });

export const deleteMessage = async (token: string, messageId: string, scope: "me" | "everyone") =>
  request<{ messageId: string; chatId: string; message?: Message }>(`/messages/${messageId}?scope=${scope}`, {
    method: "DELETE",
    token,
  });

export const uploadMessageMedia = async (
  token: string,
  file: File,
  onProgress?: (progress: number) => void,
  onXhrChange?: (xhr: XMLHttpRequest | null) => void
) => {
  const body = new FormData();
  body.append("file", file);

  const payload = await uploadWithProgress<{
    media: MediaAttachment;
  }>(`${API_BASE_URL}/messages/upload`, {
    body,
    headers: {
      Authorization: `Bearer ${token}`,
    },
    onProgress,
    onXhrChange,
  });

  onProgress?.(100);
  return payload;
};

export const uploadMedia = async (
  token: string,
  file: File,
  onProgress?: (progress: number) => void,
  onXhrChange?: (xhr: XMLHttpRequest | null) => void
) => (await uploadMessageMedia(token, file, onProgress, onXhrChange)).media;

export const addGroupMembers = async (token: string, chatId: string, memberIds: string[]) =>
  request<{ chat: Chat }>(`/chats/${chatId}/members`, {
    method: "POST",
    token,
    body: JSON.stringify({ memberIds }),
  });

export const removeGroupMember = async (token: string, chatId: string, memberId: string) =>
  request<{ chat: Chat }>(`/chats/${chatId}/members/${memberId}`, {
    method: "DELETE",
    token,
  });

export const promoteGroupAdmin = async (token: string, chatId: string, memberId: string) =>
  request<{ chat: Chat }>(`/chats/${chatId}/admins/${memberId}`, {
    method: "POST",
    token,
  });

export const demoteGroupAdmin = async (token: string, chatId: string, memberId: string) =>
  request<{ chat: Chat }>(`/chats/${chatId}/admins/${memberId}`, {
    method: "DELETE",
    token,
  });

export const transferGroupOwnership = async (token: string, chatId: string, nextOwnerId: string) =>
  request<{ chat: Chat }>(`/chats/${chatId}/owner`, {
    method: "POST",
    token,
    body: JSON.stringify({ nextOwnerId }),
  });

export const leaveGroup = async (token: string, chatId: string) =>
  request<{ chatId: string; deleted: boolean }>(`/chats/${chatId}/leave`, {
    method: "POST",
    token,
  });

export const patchChatSettings = async (
  token: string,
  chatId: string,
  input: {
    groupName?: string;
    groupAvatar?: string | null;
    wallpaper?: string | null;
    theme?: string;
  }
) =>
  request<{ chat: Chat }>(`/chats/${chatId}/group`, {
    method: "PATCH",
    token,
    body: JSON.stringify(input),
  });

export const markChatRead = async (token: string, chatId: string) =>
  request<{ chat: Chat }>(`/chats/${chatId}/read`, {
    method: "PATCH",
    token,
  });

export const markChatUnread = async (token: string, chatId: string) =>
  request<{ chat: Chat }>(`/chats/${chatId}/unread`, {
    method: "PATCH",
    token,
  });

export const deleteChatForUser = async (token: string, chatId: string) =>
  request<{ chatId: string; deleted: boolean }>(`/chats/${chatId}`, {
    method: "DELETE",
    token,
  });

export const clearChatMessagesForUser = async (token: string, chatId: string) =>
  request<{ chat: Chat }>(`/chats/${chatId}/clear`, {
    method: "POST",
    token,
  });

export const updateMessageStatus = async (
  token: string,
  messageId: string,
  status: "delivered" | "seen"
) =>
  request<{ message: Message }>(`/messages/${messageId}/status`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ status }),
  });

export const editMessage = async (
  token: string,
  messageId: string,
  chatId: string,
  content: string
) =>
  request<{ message: Message }>(`/messages/${messageId}`, {
    method: "PUT",
    token,
    body: JSON.stringify({ chatId, content }),
  });

export const addReaction = async (
  token: string,
  messageId: string,
  emoji: string
) =>
  request<{ message: Message }>(`/messages/${messageId}/reaction`, {
    method: "POST",
    token,
    body: JSON.stringify({ emoji }),
  });

export const removeReaction = async (
  token: string,
  messageId: string,
  emoji: string
) =>
  request<{ message: Message }>(`/messages/${messageId}/reaction?emoji=${encodeURIComponent(emoji)}`, {
    method: "DELETE",
    token,
  });

export const registerPushToken = async (token: string, pushToken: string, platform: "web" | "android" | "ios") =>
  request<{ success: boolean }>("/users/push-token", {
    method: "POST",
    token,
    body: JSON.stringify({ pushToken, platform }),
  });

export const unregisterPushToken = async (token: string, pushEndpoint: string) =>
  request<{ success: boolean }>("/users/push-token", {
    method: "DELETE",
    token,
    body: JSON.stringify({ token: pushEndpoint }),
  });

export const getBlockedUsers = async (token: string) =>
  request<{
    blockedUsers: BackendUser[];
  }>("/users/me/blocked", {
    method: "GET",
    token,
  });

export const updateGroupProfile = patchChatSettings;
export const clearChatMessages = clearChatMessagesForUser;
export const deleteChat = deleteChatForUser;

export const exchangeGoogleLogin = async (idToken: string) =>
  request<{
    user: BackendUser & { email: string };
    accessToken: string;
  }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ idToken }),
  });

export const getAuthMe = async (token: string) =>
  request<{
    user: BackendUser & { email: string };
  }>("/auth/me", {
    method: "GET",
    token,
  });

export const issueMobileAuthCode = async (token: string) =>
  request<{ code: string; expiresAt: string }>("/auth/mobile/code", {
    method: "POST",
    token,
  });
