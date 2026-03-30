const User = require("./user.model");
const ApiError = require("../../utils/apiError");
const {
  notifyFriendRequestReceived,
  notifyFriendRequestAccepted,
  notifyFriendRequestRejected,
} = require("../socket/socket.notifications");

const findUserById = async (userId) => {
  return User.findById(userId).lean();
};

const sanitizeUsername = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 24);

const createUsernameSeed = ({ email, name }) => {
  const emailPrefix = email.split("@")[0] || "";
  const nameSeed = name.replace(/\s+/g, "").slice(0, 12);
  return sanitizeUsername(nameSeed || emailPrefix || "user") || "user";
};

const generateUniqueUsername = async ({ email, name }) => {
  const baseUsername = createUsernameSeed({ email, name });
  let username = baseUsername;
  let suffix = 1;

  while (await User.exists({ username })) {
    username = `${baseUsername}${suffix}`;
    suffix += 1;
  }

  return username;
};

const mapUserProfile = (user, currentUserId = null, currentUserMeta = null) => {
  const friendIds = (user.friends || []).map((friend) =>
    typeof friend === "string" ? friend : friend._id?.toString?.() || friend.toString()
  );
  const sentRequestIds = (user.sentFriendRequests || []).map((entry) =>
    typeof entry === "string" ? entry : entry._id?.toString?.() || entry.toString()
  );
  const receivedRequestIds = (user.receivedFriendRequests || []).map((entry) =>
    typeof entry === "string" ? entry : entry._id?.toString?.() || entry.toString()
  );
  const blockedUserIds = (user.blockedUsers || []).map((entry) =>
    typeof entry === "string" ? entry : entry._id?.toString?.() || entry.toString()
  );
  const currentId = currentUserId ? currentUserId.toString() : null;
  const currentBlockedIds = (currentUserMeta?.blockedUsers || []).map((entry) =>
    typeof entry === "string" ? entry : entry._id?.toString?.() || entry.toString()
  );

  const isOwnProfile = currentId && user._id.toString() === currentId.toString();
  
  return {
    _id: user._id,
    username: user.username,
    name: user.name,
    avatar: user.avatar,
    tagline: user.tagline || "",
    bio: user.bio || "",
    lastSeen: user.lastSeen,
    createdAt: user.createdAt,
    friendsCount: friendIds.length,
    isFriend: currentId ? friendIds.includes(currentId) : false,
    requestSent: currentId ? receivedRequestIds.includes(currentId) : false,
    requestReceived: currentId ? sentRequestIds.includes(currentId) : false,
    isBlocked: currentId ? blockedUserIds.includes(currentId) : false,
    hasBlocked: currentId ? currentBlockedIds.includes(user._id.toString()) : false,
    ...(isOwnProfile ? { email: user.email } : {}),
  };
};

const findOrCreateUser = async ({ email, name, avatar }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail }).lean();

  let user;

  if (existingUser) {
    user = await User.findOneAndUpdate(
      { email: normalizedEmail },
      {
        $set: {
          name: name.trim(),
          avatar: avatar || null,
          lastSeen: new Date(),
        },
      },
      {
        returnDocument: "after",
      }
    ).lean();
  } else {
    const username = await generateUniqueUsername({
      email: normalizedEmail,
      name,
    });

    user = await User.create({
      username,
      name: name.trim(),
      email: normalizedEmail,
      avatar: avatar || null,
      tagline: "",
      bio: "",
      friends: [],
      sentFriendRequests: [],
      receivedFriendRequests: [],
      blockedUsers: [],
      lastSeen: new Date(),
    });

    user = await User.findById(user._id).lean();
  }

  return user;
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const searchUsers = async ({ query, excludeUserId, limit = 8 }) => {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return [];
  }

  const searchPattern = new RegExp(escapeRegex(normalizedQuery), "i");

  const users = await User.find({
    _id: { $ne: excludeUserId },
    $or: [
      { name: searchPattern },
      { email: searchPattern },
      { username: searchPattern },
      { tagline: searchPattern },
    ],
  })
    .select(
      "username name email avatar tagline bio lastSeen createdAt friends sentFriendRequests receivedFriendRequests blockedUsers"
    )
    .sort({ name: 1 })
    .limit(limit)
    .lean();

  const currentUser = await User.findById(excludeUserId).select("blockedUsers").lean();
  return users.map((user) => mapUserProfile(user, excludeUserId, currentUser));
};

const exploreUsers = async ({ currentUserId, limit = 24 }) => {
  const [currentUser, users] = await Promise.all([
    User.findById(currentUserId).select("blockedUsers").lean(),
    User.find({
      _id: { $ne: currentUserId },
    })
      .select(
        "username name email avatar tagline bio lastSeen createdAt friends sentFriendRequests receivedFriendRequests blockedUsers"
      )
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
  ]);

  return users.map((user) => mapUserProfile(user, currentUserId, currentUser));
};

const getOwnProfile = async (userId) => {
  const user = await User.findById(userId)
    .select(
      "username name email avatar tagline bio lastSeen createdAt friends sentFriendRequests receivedFriendRequests blockedUsers"
    )
    .lean();

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return mapUserProfile(user, userId, user);
};

const updateOwnProfile = async ({ userId, name, tagline, bio }) => {
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(tagline !== undefined ? { tagline: tagline.trim() } : {}),
        ...(bio !== undefined ? { bio: bio.trim() } : {}),
      },
    },
    {
      returnDocument: "after",
    }
  )
    .select(
      "username name email avatar tagline bio lastSeen createdAt friends sentFriendRequests receivedFriendRequests blockedUsers"
    )
    .lean();

  if (!updatedUser) {
    throw new ApiError(404, "User not found");
  }

  return mapUserProfile(updatedUser, userId, updatedUser);
};

const getProfileByUserId = async ({ userId, currentUserId }) => {
  const [currentUser, profile] = await Promise.all([
    currentUserId ? User.findById(currentUserId).select("blockedUsers").lean() : null,
    User.findById(userId)
      .select(
        "username name email avatar tagline bio lastSeen createdAt friends sentFriendRequests receivedFriendRequests blockedUsers"
      )
      .lean(),
  ]);

  if (!profile) {
    throw new ApiError(404, "Profile not found");
  }

  return mapUserProfile(profile, currentUserId, currentUser);
};

const getProfileByUsername = async ({ username, currentUserId }) => {
  if (!username || typeof username !== "string") {
    throw new ApiError(400, "username is required");
  }

  const [currentUser, profile] = await Promise.all([
    currentUserId ? User.findById(currentUserId).select("blockedUsers").lean() : null,
    User.findOne({ username: username.toLowerCase() })
      .select(
        "username name email avatar tagline bio lastSeen createdAt friends sentFriendRequests receivedFriendRequests blockedUsers"
      )
      .lean(),
  ]);

  if (!profile) {
    throw new ApiError(404, "Profile not found");
  }

  return mapUserProfile(profile, currentUserId, currentUser);
};

const getRelationship = (user, targetUserId) => {
  const targetId = targetUserId.toString();
  const includes = (list) =>
    (list || []).some((entry) => (entry._id?.toString?.() || entry.toString()) === targetId);

  return {
    isFriend: includes(user.friends),
    hasSentRequest: includes(user.sentFriendRequests),
    hasReceivedRequest: includes(user.receivedFriendRequests),
    hasBlocked: includes(user.blockedUsers),
  };
};

const assertRelationshipAllowed = (currentUser, targetUser, targetUserId) => {
  if (currentUser._id.toString() === targetUserId.toString()) {
    throw new ApiError(400, "You cannot perform this action on yourself");
  }

  const currentBlocksTarget = getRelationship(currentUser, targetUserId).hasBlocked;
  const targetBlocksCurrent = getRelationship(targetUser, currentUser._id).hasBlocked;

  if (currentBlocksTarget || targetBlocksCurrent) {
    throw new ApiError(403, "This relationship is blocked");
  }
};

const requestFriend = async ({ currentUserId, targetUserId }) => {
  const [currentUser, targetUser] = await Promise.all([
    User.findById(currentUserId).lean(),
    User.findById(targetUserId).lean(),
  ]);

  if (!currentUser || !targetUser) {
    throw new ApiError(404, "User not found");
  }

  assertRelationshipAllowed(currentUser, targetUser, targetUserId);

  const relationship = getRelationship(currentUser, targetUserId);

  if (relationship.isFriend) {
    throw new ApiError(400, "You are already friends");
  }

  if (relationship.hasSentRequest) {
    throw new ApiError(400, "Friend request already sent");
  }

  if (relationship.hasReceivedRequest) {
    throw new ApiError(400, "This user has already sent you a request");
  }

  await Promise.all([
    User.findByIdAndUpdate(currentUserId, {
      $addToSet: { sentFriendRequests: targetUserId },
    }),
    User.findByIdAndUpdate(targetUserId, {
      $addToSet: { receivedFriendRequests: currentUserId },
    }),
  ]);

  notifyFriendRequestReceived(targetUserId, currentUser);

  return getProfileByUserId({
    userId: targetUserId,
    currentUserId,
  });
};

const acceptFriendRequest = async ({ currentUserId, targetUserId }) => {
  const [currentUser, targetUser] = await Promise.all([
    User.findById(currentUserId).lean(),
    User.findById(targetUserId).lean(),
  ]);

  if (!currentUser || !targetUser) {
    throw new ApiError(404, "User not found");
  }

  const relationship = getRelationship(currentUser, targetUserId);

  if (!relationship.hasReceivedRequest) {
    throw new ApiError(400, "No pending friend request found");
  }

  await Promise.all([
    User.findByIdAndUpdate(currentUserId, {
      $pull: { receivedFriendRequests: targetUserId },
      $addToSet: { friends: targetUserId },
    }),
    User.findByIdAndUpdate(targetUserId, {
      $pull: { sentFriendRequests: currentUserId },
      $addToSet: { friends: currentUserId },
    }),
  ]);

  notifyFriendRequestAccepted(targetUserId, currentUser);

  return getProfileByUserId({
    userId: targetUserId,
    currentUserId,
  });
};

const rejectFriendRequest = async ({ currentUserId, targetUserId }) => {
  const [currentUser, targetUser] = await Promise.all([
    User.findById(currentUserId).lean(),
    User.findById(targetUserId).lean(),
  ]);

  if (!currentUser || !targetUser) {
    throw new ApiError(404, "User not found");
  }

  await Promise.all([
    User.findByIdAndUpdate(currentUserId, {
      $pull: { receivedFriendRequests: targetUserId },
    }),
    User.findByIdAndUpdate(targetUserId, {
      $pull: { sentFriendRequests: currentUserId },
    }),
  ]);

  notifyFriendRequestRejected(targetUserId, currentUser);

  return getProfileByUserId({
    userId: targetUserId,
    currentUserId,
  });
};

const removeFriend = async ({ currentUserId, targetUserId }) => {
  const targetUser = await User.findById(targetUserId).lean();

  if (!targetUser) {
    throw new ApiError(404, "User not found");
  }

  await Promise.all([
    User.findByIdAndUpdate(currentUserId, {
      $pull: { friends: targetUserId },
    }),
    User.findByIdAndUpdate(targetUserId, {
      $pull: { friends: currentUserId },
    }),
  ]);

  return getProfileByUserId({
    userId: targetUserId,
    currentUserId,
  });
};

const blockUser = async ({ currentUserId, targetUserId }) => {
  const targetUser = await User.findById(targetUserId).lean();

  if (!targetUser) {
    throw new ApiError(404, "User not found");
  }

  await Promise.all([
    User.findByIdAndUpdate(currentUserId, {
      $addToSet: { blockedUsers: targetUserId },
      $pull: {
        friends: targetUserId,
        sentFriendRequests: targetUserId,
        receivedFriendRequests: targetUserId,
      },
    }),
    User.findByIdAndUpdate(targetUserId, {
      $pull: {
        friends: currentUserId,
        sentFriendRequests: currentUserId,
        receivedFriendRequests: currentUserId,
      },
    }),
  ]);

  return getProfileByUserId({
    userId: targetUserId,
    currentUserId,
  });
};

const unblockUser = async ({ currentUserId, targetUserId }) => {
  const targetUser = await User.findById(targetUserId).lean();

  if (!targetUser) {
    throw new ApiError(404, "User not found");
  }

  await User.findByIdAndUpdate(currentUserId, {
    $pull: {
      blockedUsers: targetUserId,
    },
  });

  return getProfileByUserId({
    userId: targetUserId,
    currentUserId,
  });
};

const assertUsersCanInteract = async ({ currentUserId, targetUserId }) => {
  const [currentUser, targetUser] = await Promise.all([
    User.findById(currentUserId).select("blockedUsers").lean(),
    User.findById(targetUserId).select("blockedUsers").lean(),
  ]);

  if (!currentUser || !targetUser) {
    throw new ApiError(404, "User not found");
  }

  const currentBlocksTarget = getRelationship(currentUser, targetUserId).hasBlocked;
  const targetBlocksCurrent = getRelationship(targetUser, currentUserId).hasBlocked;

  if (currentBlocksTarget || targetBlocksCurrent) {
    throw new ApiError(403, "This user is unavailable for interaction");
  }
};

module.exports = {
  acceptFriendRequest,
  assertUsersCanInteract,
  blockUser,
  exploreUsers,
  findUserById,
  findOrCreateUser,
  getOwnProfile,
  getProfileByUserId,
  getProfileByUsername,
  mapUserProfile,
  rejectFriendRequest,
  removeFriend,
  searchUsers,
  requestFriend,
  unblockUser,
  updateOwnProfile,
};
