import { BackendUser, Chat, MediaAttachment, Message, MessageListResponse, MessageType, UserProfile } from "@/lib/types";

const apiBaseUrl =
  typeof window === "undefined"
    ? process.env.SERVER_API_URL
    : process.env.NEXT_PUBLIC_API_URL;

type RequestOptions = RequestInit & {
  token?: string;
};

const uploadWithProgress = async <T>(
  url: string,
  {
    body,
    headers,
    onProgress,
  }: {
    body: FormData;
    headers?: Record<string, string>;
    onProgress?: (progress: number) => void;
  }
) =>
  new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
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
          resolve(payload);
          return;
        }

        reject(new Error(errorMessage));
      } catch {
        reject(new Error(`Request failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
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
  } catch {
    throw new Error(`Request failed with status ${response.status}`);
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

export const getChats = async (token: string) =>
  request<{ chats: Chat[] }>("/chats", {
    method: "GET",
    token,
  });

export const getMessages = async (token: string, chatId: string, page = 1, limit = 20) =>
  request<MessageListResponse>(`/messages/${chatId}?page=${page}&limit=${limit}`, {
    method: "GET",
    token,
  });

export const searchUsers = async (token: string, query: string) =>
  request<{ users: BackendUser[] }>(`/users/search?q=${encodeURIComponent(query)}`, {
    method: "GET",
    token,
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

export const getProfileByUsername = async (token: string, username: string) =>
  request<{ profile: UserProfile }>(`/users/profile/${encodeURIComponent(username)}`, {
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
  onProgress?: (progress: number) => void
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
  directUploadBody.append("api_key", signedUpload.signature.apiKey);
  directUploadBody.append("timestamp", String(signedUpload.signature.timestamp));
  directUploadBody.append("folder", signedUpload.signature.folder);
  directUploadBody.append("public_id", signedUpload.signature.publicId);
  directUploadBody.append("context", signedUpload.signature.context);
  directUploadBody.append("signature", signedUpload.signature.signature);

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
        headers: {
          Authorization: `Bearer ${token}`,
        },
        onProgress,
      });

      onProgress?.(100);
      return payload.data;
    } catch (fallbackError) {
      const directMessage =
        directUploadError instanceof Error ? directUploadError.message : "Direct upload failed";
      const fallbackMessage =
        fallbackError instanceof Error ? fallbackError.message : "Fallback upload failed";

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
