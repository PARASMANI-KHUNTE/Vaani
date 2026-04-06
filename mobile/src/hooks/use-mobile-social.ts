import { useEffect, useState } from "react";
import {
  acceptMobileFriendRequest,
  blockMobileUser,
  createMobileChat,
  getMobileExploreUsers,
  getMobileProfile,
  rejectMobileFriendRequest,
  searchMobileUsers,
  sendMobileFriendRequest,
  unblockMobileUser,
  unfriendMobileUser,
  updateMobileProfile,
} from "@/lib/api/client";
import { ChatParticipant, MobileProfile } from "@/lib/types";
import { useNotificationStore } from "@/store/notification-store";

type UseMobileSocialParams = {
  token?: string;
  query?: string;
};

const pendingRequests = new Set<string>();

export const useMobileSocial = ({ token, query }: UseMobileSocialParams) => {
  const [profile, setProfile] = useState<MobileProfile | null>(null);
  const [directoryUsers, setDirectoryUsers] = useState<ChatParticipant[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingDirectory, setIsLoadingDirectory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setProfile(null);
      return;
    }

    let active = true;

    const loadProfile = async () => {
      try {
        setIsLoadingProfile(true);
        const response = await getMobileProfile(token);

        if (active) {
          setProfile(response.profile);
          setError(null);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load profile");
        }
      } finally {
        if (active) {
          setIsLoadingProfile(false);
        }
      }
    };

    void loadProfile();

    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (!token) {
      setDirectoryUsers([]);
      return;
    }

    let active = true;

    const loadDirectory = async () => {
      try {
        setIsLoadingDirectory(true);
        const response = query?.trim()
          ? await searchMobileUsers(token, query)
          : await getMobileExploreUsers(token);

        if (active) {
          setDirectoryUsers(response.users);
          setError(null);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load users");
        }
      } finally {
        if (active) {
          setIsLoadingDirectory(false);
        }
      }
    };

    void loadDirectory();

    return () => {
      active = false;
    };
  }, [query, token]);

  const patchDirectoryUser = (userId: string, nextProfile: MobileProfile) => {
    setDirectoryUsers((current) =>
      current.map((entry) =>
        entry._id === userId
          ? {
              ...entry,
              isFriend: nextProfile.isFriend,
              requestSent: nextProfile.requestSent,
              requestReceived: nextProfile.requestReceived,
              isBlocked: nextProfile.isBlocked,
              hasBlocked: nextProfile.hasBlocked,
            }
          : entry
      )
    );
  };

  const sendRequest = async (userId: string) => {
    if (!token) return;

    const requestKey = `send:${userId}`;
    if (pendingRequests.has(requestKey)) return;
    pendingRequests.add(requestKey);

    const previousState = useNotificationStore.getState().directoryUsers[userId];
    useNotificationStore.getState().updateFriendStatus({
      userId,
      isFriend: false,
      requestSent: true,
      requestReceived: false,
    });

    try {
      const response = await sendMobileFriendRequest(token, userId);
      if (!response?.profile) {
        throw new Error("Invalid server response");
      }
      patchDirectoryUser(userId, response.profile);
    } catch (requestError) {
      if (previousState) {
        useNotificationStore.getState().updateFriendStatus({
          userId,
          isFriend: previousState.isFriend,
          requestSent: previousState.requestSent,
          requestReceived: previousState.requestReceived,
          friendsCount: previousState.friendsCount,
        });
      } else {
        useNotificationStore.getState().removeFriendRequest(userId);
      }
      setError(requestError instanceof Error ? requestError.message : "Failed to send friend request");
    } finally {
      pendingRequests.delete(requestKey);
    }
  };

  const acceptRequest = async (userId: string) => {
    if (!token) return;

    const requestKey = `accept:${userId}`;
    if (pendingRequests.has(requestKey)) return;
    pendingRequests.add(requestKey);

    const previousState = useNotificationStore.getState().directoryUsers[userId];
    useNotificationStore.getState().updateFriendStatus({
      userId,
      isFriend: true,
      requestSent: false,
      requestReceived: false,
      friendsCount: (previousState?.friendsCount ?? 0) + 1,
    });

    try {
      const response = await acceptMobileFriendRequest(token, userId);
      if (!response?.profile) {
        throw new Error("Invalid server response");
      }
      patchDirectoryUser(userId, response.profile);
    } catch (requestError) {
      if (previousState) {
        useNotificationStore.getState().updateFriendStatus({
          userId,
          isFriend: previousState.isFriend,
          requestSent: previousState.requestSent,
          requestReceived: previousState.requestReceived,
          friendsCount: previousState.friendsCount,
        });
      }
      setError(requestError instanceof Error ? requestError.message : "Failed to accept request");
    } finally {
      pendingRequests.delete(requestKey);
    }
  };

  const rejectRequest = async (userId: string) => {
    if (!token) return;

    const requestKey = `reject:${userId}`;
    if (pendingRequests.has(requestKey)) return;
    pendingRequests.add(requestKey);

    const previousState = useNotificationStore.getState().directoryUsers[userId];
    useNotificationStore.getState().removeFriendRequest(userId);

    try {
      const response = await rejectMobileFriendRequest(token, userId);
      if (!response?.profile) {
        throw new Error("Invalid server response");
      }
      patchDirectoryUser(userId, response.profile);
    } catch (requestError) {
      if (previousState) {
        useNotificationStore.getState().updateFriendStatus({
          userId,
          isFriend: previousState.isFriend,
          requestSent: previousState.requestSent,
          requestReceived: previousState.requestReceived,
          friendsCount: previousState.friendsCount,
        });
      }
      setError(requestError instanceof Error ? requestError.message : "Failed to reject request");
    } finally {
      pendingRequests.delete(requestKey);
    }
  };

  const unfriend = async (userId: string) => {
    if (!token) return;
    try {
      const response = await unfriendMobileUser(token, userId);
      patchDirectoryUser(userId, response.profile);
    } catch (unfriendError) {
      setError(unfriendError instanceof Error ? unfriendError.message : "Failed to unfriend user");
    }
  };

  const toggleBlock = async (user: ChatParticipant) => {
    if (!token) return;
    try {
      const response = user.hasBlocked
        ? await unblockMobileUser(token, user._id)
        : await blockMobileUser(token, user._id);
      patchDirectoryUser(user._id, response.profile);
    } catch (blockError) {
      setError(blockError instanceof Error ? blockError.message : "Failed to update block state");
    }
  };

  const saveProfile = async (input: { name?: string; tagline?: string; bio?: string }) => {
    if (!token) return;
    try {
      const response = await updateMobileProfile(token, input);
      setProfile(response.profile);
      setError(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save profile");
    }
  };

  const startChatWithUser = async (userId: string) => {
    if (!token) {
      return null;
    }

    const response = await createMobileChat(token, userId);
    return response.chat;
  };

  return {
    profile,
    directoryUsers,
    isLoadingProfile,
    isLoadingDirectory,
    error,
    clearError: () => setError(null),
    saveProfile,
    sendRequest,
    acceptRequest,
    rejectRequest,
    unfriend,
    toggleBlock,
    startChatWithUser,
  };
};
