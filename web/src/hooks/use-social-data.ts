"use client";

import { useEffect, useRef, useState } from "react";
import {
  acceptFriendRequest,
  blockUser,
  deleteMyAccount,
  disableMyAccount,
  exploreUsers,
  getMyProfile,
  getProfileByUsername,
  rejectFriendRequest,
  removeFriend,
  searchUsers,
  sendFriendRequest,
  unblockUser,
  updateMyProfile,
} from "@/lib/api";
import { BackendUser, UserProfile } from "@/lib/types";
import { useChatStore } from "@/store/chat-store";

type UseSocialDataParams = {
  token?: string;
  exploreQuery?: string;
};

export const useSocialData = ({ token, exploreQuery }: UseSocialDataParams) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [directoryUsers, setDirectoryUsers] = useState<BackendUser[]>([]);
  const [isLoadingDirectory, setIsLoadingDirectory] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingRequestsRef = useRef(new Set<string>());
  const storeRef = useRef<ReturnType<typeof useChatStore.getState> | null>(null);
  storeRef.current = useChatStore.getState();

  useEffect(() => {
    if (!token) {
      setProfile(null);
      return;
    }

    let active = true;

    const loadProfile = async () => {
      try {
        setIsLoadingProfile(true);
        const profileResponse = await getMyProfile(token);

        if (active) {
          setProfile(profileResponse.profile);
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
        const response = exploreQuery?.trim()
          ? await searchUsers(token, exploreQuery)
          : await exploreUsers(token);

        if (active) {
          setDirectoryUsers(response.users);
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
  }, [exploreQuery, token]);

  const saveProfile = async (input: { name?: string; tagline?: string; bio?: string }) => {
    if (!token) {
      return;
    }

    try {
      const response = await updateMyProfile(token, input);
      setProfile(response.profile);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to update profile");
    }
  };

  const patchDirectoryUser = (userId: string, nextProfile: UserProfile) => {
    setDirectoryUsers((currentUsers) =>
      currentUsers.map((entry) =>
        entry._id === userId
          ? {
              ...entry,
              isFriend: nextProfile.isFriend,
              friendsCount: nextProfile.friendsCount,
              requestSent: nextProfile.requestSent,
              requestReceived: nextProfile.requestReceived,
              isBlocked: nextProfile.isBlocked,
              hasBlocked: nextProfile.hasBlocked,
            }
          : entry
      )
    );
  };

  const patchRelationship = (userId: string, nextProfile: UserProfile) => {
    patchDirectoryUser(userId, nextProfile);

    setProfile((currentProfile) => {
      if (!currentProfile || currentProfile._id !== nextProfile._id) {
        return currentProfile;
      }

      return nextProfile;
    });
  };

  const sendRequest = async (user: BackendUser) => {
    if (!token) {
      return;
    }

    const requestKey = `send:${user._id}`;
    if (pendingRequestsRef.current.has(requestKey)) {
      return;
    }
    pendingRequestsRef.current.add(requestKey);

    const store = storeRef.current;
    const previousState = store?.directoryUsers[user._id];

    store?.updateFriendStatus({
      userId: user._id,
      isFriend: false,
      requestSent: true,
      requestReceived: false,
    });

    try {
      const response = await sendFriendRequest(token, user._id);
      if (!response?.profile) {
        throw new Error("Invalid server response");
      }
      patchDirectoryUser(user._id, response.profile);
    } catch (requestError) {
      const currentStore = storeRef.current;
      if (previousState) {
        currentStore?.updateFriendStatus({
          userId: user._id,
          isFriend: previousState.isFriend,
          requestSent: previousState.requestSent,
          requestReceived: previousState.requestReceived,
          friendsCount: previousState.friendsCount,
        });
      } else {
        currentStore?.removeFriendRequest(user._id);
      }
      setError(requestError instanceof Error ? requestError.message : "Failed to send request");
    } finally {
      pendingRequestsRef.current.delete(requestKey);
    }
  };

  const acceptRequest = async (user: BackendUser) => {
    return acceptRequestByUserId(user._id);
  };

  const acceptRequestByUserId = async (userId: string) => {
    if (!token) {
      return;
    }

    const requestKey = `accept:${userId}`;
    if (pendingRequestsRef.current.has(requestKey)) {
      return;
    }
    pendingRequestsRef.current.add(requestKey);

    const store = storeRef.current;
    const previousState = store?.directoryUsers[userId];

    store?.updateFriendStatus({
      userId,
      isFriend: true,
      requestSent: false,
      requestReceived: false,
      friendsCount: (previousState?.friendsCount ?? 0) + 1,
    });

    try {
      const response = await acceptFriendRequest(token, userId);
      if (!response?.profile) {
        throw new Error("Invalid server response");
      }
      patchRelationship(userId, response.profile);
      return response.profile;
    } catch (requestError) {
      const currentStore = storeRef.current;
      if (previousState) {
        currentStore?.updateFriendStatus({
          userId,
          isFriend: previousState.isFriend,
          requestSent: previousState.requestSent,
          requestReceived: previousState.requestReceived,
          friendsCount: previousState.friendsCount,
        });
      }
      setError(requestError instanceof Error ? requestError.message : "Failed to accept request");
    } finally {
      pendingRequestsRef.current.delete(requestKey);
    }
  };

  const rejectRequest = async (user: BackendUser) => {
    return rejectRequestByUserId(user._id);
  };

  const rejectRequestByUserId = async (userId: string) => {
    if (!token) {
      return;
    }

    const requestKey = `reject:${userId}`;
    if (pendingRequestsRef.current.has(requestKey)) {
      return;
    }
    pendingRequestsRef.current.add(requestKey);

    const store = storeRef.current;
    const previousState = store?.directoryUsers[userId];

    store?.removeFriendRequest(userId);

    try {
      const response = await rejectFriendRequest(token, userId);
      if (!response?.profile) {
        throw new Error("Invalid server response");
      }
      patchRelationship(userId, response.profile);
      return response.profile;
    } catch (requestError) {
      const currentStore = storeRef.current;
      if (previousState) {
        currentStore?.updateFriendStatus({
          userId,
          isFriend: previousState.isFriend,
          requestSent: previousState.requestSent,
          requestReceived: previousState.requestReceived,
          friendsCount: previousState.friendsCount,
        });
      }
      setError(requestError instanceof Error ? requestError.message : "Failed to reject request");
    } finally {
      pendingRequestsRef.current.delete(requestKey);
    }
  };

  const unfriend = async (user: BackendUser) => {
    if (!token) {
      return;
    }

    try {
      const response = await removeFriend(token, user._id);
      patchDirectoryUser(user._id, response.profile);
    } catch (unfriendError) {
      setError(unfriendError instanceof Error ? unfriendError.message : "Failed to unfriend user");
    }
  };

  const toggleBlock = async (user: BackendUser) => {
    if (!token) {
      return;
    }

    try {
      const response = user.hasBlocked
        ? await unblockUser(token, user._id)
        : await blockUser(token, user._id);
      patchDirectoryUser(user._id, response.profile);
    } catch (blockError) {
      setError(blockError instanceof Error ? blockError.message : "Failed to update block state");
    }
  };

  const fetchSharedProfile = async (username: string) => {
    if (!token) {
      return null;
    }

    const response = await getProfileByUsername(token, username);
    return response.profile;
  };

  const disableAccount = async () => {
    if (!token) {
      return false;
    }

    try {
      await disableMyAccount(token);
      return true;
    } catch (disableError) {
      setError(disableError instanceof Error ? disableError.message : "Failed to disable account");
      return false;
    }
  };

  const deleteAccount = async () => {
    if (!token) {
      return false;
    }

    try {
      await deleteMyAccount(token);
      return true;
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete account");
      return false;
    }
  };

  return {
    directoryUsers,
    error,
    fetchSharedProfile,
    isLoadingDirectory,
    isLoadingProfile,
    profile,
    clearError: () => setError(null),
    acceptRequest,
    acceptRequestByUserId,
    rejectRequest,
    rejectRequestByUserId,
    saveProfile,
    sendRequest,
    toggleBlock,
    unfriend,
    disableAccount,
    deleteAccount,
  };
};
