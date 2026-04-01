import {
  BackendUser,
  Chat,
  MediaAttachment,
  Message,
  MessageListResponse,
  MessageType,
  UserProfile,
} from "@/lib/types";

const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

type RequestOptions = RequestInit & {
  token?: string;
};

const uploadWithProgress = async <T>(
  url: string,
  {
    body,
    headers,
    onProgress,
    onXhrChange,
  }: {
    body: FormData;
    headers?: Record<string, string>;
    onProgress?: (progress: number) => void;
    onXhrChange?: (xhr: XMLHttpRequest | null) => void;
  }
) =>
  new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    onXhrChange?.(xhr);
    xhr.open("POST", url, true);

    Object.entries(headers || {}).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) {
        return;
      }

      onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    };

    xhr.onload = () => {
      try {
        const payload = JSON.parse(xhr.responseText || "{}");
        const errorMessage =
          payload?.message ||
          payload?.error?.message ||
          payload?.error?.details ||
          `Request failed with status ${xhr.status}`;

        if (xhr.status >= 200 && xhr.status < 300) {
          onXhrChange?.(null);
          resolve(payload);
          return;
        }

        onXhrChange?.(null);
        reject(new Error(errorMessage));
      } catch (err) {
        onXhrChange?.(null);
        reject(new Error(`Request failed with status ${xhr.status}: ${err instanceof Error ? err.message : "Unknown error"}`));
      }
    };

    xhr.onerror = () => {
      onXhrChange?.(null);
      reject(new Error("Network error during upload"));
    };
    xhr.onabort = () => {
      onXhrChange?.(null);
      reject(new Error("Upload cancelled"));
    };
    xhr.send(body);
  });

const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  if (!apiBaseUrl) {
    throw new Error("API base URL is not configured");
  }

  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {}),
    },
    cache: "no-store",
  });

  let payload: { message?: string; data?: unknown };
  try {
    payload = await response.json();
  } catch (err) {
    throw new Error(`Request failed with status ${response.status}: ${err instanceof Error ? err.message : "Invalid JSON response"}`);
  }

  if (!response.ok) {
    throw new Error(payload.message || `Request failed with status ${response.status}`);
  }

  return payload.data as T;
};

export const exchangeGoogleLogin = async (idToken: string) =>
  request<{
    user: {
      _id: string;
      name: string;
      email: string;
      avatar: string | null;
      lastSeen: string | null;
    };
    accessToken: string;
  }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ idToken }),
  });

export const getAuthMe = async (token: string) =>
  request<{
    user: {
      _id: string;
      name: string;
      email: string;
      avatar: string | null;
      lastSeen: string | null;
    };
  }>("/auth/me", {
    method: "GET",
    token,
  });

export const issueMobileAuthCode = async (token: string) =>
  request<{ code: string; ttlMs: number }>("/auth/mobile/code", {
    method: "POST",
    token,
  });

export const getChats = async (token: string) =>
  request<{ chats: Chat[] }>("/chats", {
    method: "GET",
    token,
  });

export const getChatById = async (token: string, chatId: string) =>
  request<{ chat: Chat }>(`/chats/${encodeURIComponent(chatId)}`, {
    method: "GET",
    token,
  });

export const getMessages = async (
  token: string,
  chatId: string,
  page = 1,
  limit = 20,
  signal?: AbortSignal
) =>
  request<MessageListResponse>(`/messages/${chatId}?page=${page}&limit=${limit}`, {
    method: "GET",
    token,
    signal,
  });

export const searchUsers = async (token: string, query: string, signal?: AbortSignal) =>
  request<{ users: BackendUser[] }>(`/users/search?q=${encodeURIComponent(query)}`, {
    method: "GET",
    token,
    signal,
  });

export const exploreUsers = async (token: string) =>
  request<{ users: BackendUser[] }>("/users/explore", {
    method: "GET",
    token,
  });

export const getMyProfile = async (token: string) =>
  request<{ profile: UserProfile }>("/users/me", {
    method: "GET",
    token,
  });

export const updateMyProfile = async (
  token: string,
  input: { name?: string; tagline?: string; bio?: string }
) =>
  request<{ profile: UserProfile }>("/users/me", {
    method: "PATCH",
    token,
    body: JSON.stringify(input),
  });

export const disableMyAccount = async (token: string) =>
  request<{ disabled: boolean }>("/users/me/disable", {
    method: "POST",
    token,
  });

export const deleteMyAccount = async (token: string) =>
  request<{ deleted: boolean }>("/users/me", {
    method: "DELETE",
    token,
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
  request<{ profile: UserProfile }>(`/users/${userId}/friend-request`, {
    method: "POST",
    token,
  });

export const acceptFriendRequest = async (token: string, userId: string) =>
  request<{ profile: UserProfile }>(`/users/${userId}/friend-request/accept`, {
    method: "POST",
    token,
  });

export const rejectFriendRequest = async (token: string, userId: string) =>
  request<{ profile: UserProfile }>(`/users/${userId}/friend-request/reject`, {
    method: "POST",
    token,
  });

export const removeFriend = async (token: string, userId: string) =>
  request<{ profile: UserProfile }>(`/users/${userId}/friend`, {
    method: "DELETE",
    token,
  });

export const blockUser = async (token: string, userId: string) =>
  request<{ profile: UserProfile }>(`/users/${userId}/block`, {
    method: "POST",
    token,
  });

export const unblockUser = async (token: string, userId: string) =>
  request<{ profile: UserProfile }>(`/users/${userId}/block`, {
    method: "DELETE",
    token,
  });

export const createChat = async (token: string, participantId: string) =>
  request<{ chat: Chat }>("/chats", {
    method: "POST",
    token,
    body: JSON.stringify({ participantId }),
  });

export const createGroupChat = async (
  token: string,
  input: { groupName: string; participantIds: string[] }
) =>
  request<{ chat: Chat }>("/chats", {
    method: "POST",
    token,
    body: JSON.stringify({
      isGroup: true,
      groupName: input.groupName,
      participantIds: input.participantIds,
    }),
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

export const deleteChat = async (token: string, chatId: string) =>
  request<{ chatId: string }>(`/chats/${chatId}`, {
    method: "DELETE",
    token,
  });

export const clearChatMessages = async (token: string, chatId: string) =>
  request<{ chat: Chat }>(`/chats/${chatId}/clear`, {
    method: "POST",
    token,
  });

export const updateGroupProfile = async (
  token: string,
  chatId: string,
  input: { groupName?: string; groupAvatar?: string | null }
) =>
  request<{ chat: Chat }>(`/chats/${chatId}/group`, {
    method: "PATCH",
    token,
    body: JSON.stringify(input),
  });

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

export const createGroupInviteLink = async (
  token: string,
  chatId: string,
  input?: { expiresInHours?: number; maxUses?: number }
) =>
  request<{
    invite: {
      token: string;
      expiresAt: string;
      maxUses: number;
    };
  }>(`/chats/${chatId}/invite-link`, {
    method: "POST",
    token,
    body: JSON.stringify(input || {}),
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

export const uploadMessageMedia = async (
  token: string,
  file: File,
  onProgress?: (progress: number) => void,
  onXhrChange?: (xhr: XMLHttpRequest | null) => void
) => {
  const signedUpload = await request<{
    signature: {
      uploadUrl: string;
      apiKey: string;
      cloudName: string;
      timestamp: number;
      folder: string;
      publicId: string;
      context: string;
      signature: string;
      resourceType: "image" | "video";
      messageType: Exclude<MessageType, "text">;
    };
  }>("/messages/upload/signature", {
    method: "POST",
    token,
    body: JSON.stringify({
      mimeType: file.type,
      originalName: file.name,
    }),
  });

  const directUploadBody = new FormData();
  directUploadBody.append("file", file);
  
  // Dynamically append all received signature fields (except binary/metadata fields)
  // This ensures the frontend sends exactly what the backend signed.
  Object.entries(signedUpload.signature).forEach(([key, value]) => {
    if (["uploadUrl", "apiKey", "cloudName", "messageType", "publicId"].includes(key)) return;
    if (value !== undefined && value !== null) {
      directUploadBody.append(key, String(value));
    }
  });

  // Ensure public_id is definitely present (fallback to publicId if necessary)
  if (!directUploadBody.has("public_id") && (signedUpload.signature as any).publicId) {
    directUploadBody.append("public_id", (signedUpload.signature as any).publicId);
  }

  // api_key must be exactly 'api_key' for Cloudinary
  if (!directUploadBody.has("api_key")) {
    directUploadBody.append("api_key", signedUpload.signature.apiKey);
  }

  try {
    const payload = await uploadWithProgress<{
      secure_url: string;
      public_id: string;
      resource_type: "image" | "video" | "raw";
      format?: string | null;
      bytes?: number;
      width?: number | null;
      height?: number | null;
      duration?: number | null;
    }>(signedUpload.signature.uploadUrl, {
      body: directUploadBody,
      onProgress,
      onXhrChange,
    });

    onProgress?.(100);

    return {
      media: {
        url: payload.secure_url,
        publicId: payload.public_id,
        resourceType: payload.resource_type,
        mimeType: file.type,
        originalName: file.name,
        format: payload.format || null,
        bytes: payload.bytes || file.size,
        width: payload.width || null,
        height: payload.height || null,
        duration: payload.duration || null,
        messageType: signedUpload.signature.messageType,
      },
    };
  } catch (directUploadError) {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const payload = await uploadWithProgress<{
        success: boolean;
        data: { media: MediaAttachment & { messageType: Exclude<MessageType, "text"> } };
        message?: string;
      }>(`${apiBaseUrl}/messages/upload`, {
        body: formData,
        headers: token ? {
          Authorization: `Bearer ${token}`,
        } : {},
        onProgress,
        onXhrChange,
      });

      onProgress?.(100);
      return payload.data;
    } catch (fallbackError) {
      const directMessage =
        directUploadError instanceof Error ? directUploadError.message : "Direct upload failed";
      
      let fallbackMessage = "Fallback upload failed";
      if (typeof fallbackError === 'object' && fallbackError !== null && 'message' in fallbackError) {
        fallbackMessage = String(fallbackError.message);
      }

      throw new Error(`${fallbackMessage}. Direct upload also failed: ${directMessage}`);
    }
  }
};

export const deleteMessage = async (
  token: string,
  messageId: string,
  scope: "me" | "everyone"
) =>
  request<{
    message?: Message;
    messageId?: string;
    chatId?: string;
    scope: "me" | "everyone";
  }>(`/messages/${messageId}?scope=${scope}`, {
    method: "DELETE",
    token,
  });

export const editMessage = async (
  token: string,
  messageId: string,
  chatId: string,
  content: string
) =>
  request<{ message: Message }>(`/messages/${messageId}`, {
    method: "PATCH",
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

export const unregisterPushToken = async (token: string) =>
  request<{ success: boolean }>("/users/push-token", {
    method: "DELETE",
    token,
  });

export const getBlockedUsers = async (token: string) =>
  request<{
    blockedUsers: BackendUser[];
  }>("/users/me/blocked", {
    method: "GET",
    token,
  });
