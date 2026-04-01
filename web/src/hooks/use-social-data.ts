"use client";

import { useEffect, useState } from "react";
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

    try {
      const response = await sendFriendRequest(token, user._id);
      patchDirectoryUser(user._id, response.profile);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to send request");
    }
  };

  const acceptRequest = async (user: BackendUser) => {
    return acceptRequestByUserId(user._id);
  };

  const acceptRequestByUserId = async (userId: string) => {
    if (!token) {
      return;
    }

    try {
      const response = await acceptFriendRequest(token, userId);
      patchRelationship(userId, response.profile);
      return response.profile;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to accept request");
    }
  };

  const rejectRequest = async (user: BackendUser) => {
    return rejectRequestByUserId(user._id);
  };

  const rejectRequestByUserId = async (userId: string) => {
    if (!token) {
      return;
    }

    try {
      const response = await rejectFriendRequest(token, userId);
      patchRelationship(userId, response.profile);
      return response.profile;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to reject request");
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
