const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/apiResponse");
const {
  acceptFriendRequest,
  blockUser,
  disableOwnAccount,
  deleteOwnAccount,
  exploreUsers,
  getOwnProfile,
  getProfileByUserId,
  getProfileByUsername,
  getBlockedUsers,
  registerPushToken,
  rejectFriendRequest,
  removeFriend,
  requestFriend,
  searchUsers,
  unblockUser,
  unregisterPushToken,
  updateOwnProfile,
} = require("./user.service");

const search = asyncHandler(async (req, res) => {
  const users = await searchUsers({
    query: req.query.q || "",
    excludeUserId: req.user._id.toString(),
  });

  return sendSuccess(res, 200, "Users fetched successfully", {
    users,
  });
});

const explore = asyncHandler(async (req, res) => {
  const users = await exploreUsers({
    currentUserId: req.user._id.toString(),
  });

  return sendSuccess(res, 200, "Explore users fetched successfully", {
    users,
  });
});

const me = asyncHandler(async (req, res) => {
  const profile = await getOwnProfile(req.user._id.toString());

  return sendSuccess(res, 200, "Profile fetched successfully", {
    profile,
  });
});

const updateMe = asyncHandler(async (req, res) => {
  const profile = await updateOwnProfile({
    userId: req.user._id.toString(),
    name: req.body.name,
    tagline: req.body.tagline,
    bio: req.body.bio,
  });

  return sendSuccess(res, 200, "Profile updated successfully", {
    profile,
  });
});

const registerDevicePushToken = asyncHandler(async (req, res) => {
  const token = await registerPushToken({
    userId: req.user._id.toString(),
    token: req.body.token,
    platform: req.body.platform,
  });

  return sendSuccess(res, 200, "Push token registered successfully", {
    token,
  });
});

const unregisterDevicePushToken = asyncHandler(async (req, res) => {
  const token = await unregisterPushToken({
    userId: req.user._id.toString(),
    token: req.body.token,
  });

  return sendSuccess(res, 200, "Push token removed successfully", {
    token,
  });
});

const profileByUsername = asyncHandler(async (req, res) => {
  const profile = await getProfileByUsername({
    username: req.params.username,
    currentUserId: req.user._id.toString(),
  });

  return sendSuccess(res, 200, "Profile fetched successfully", {
    profile,
  });
});

const profileByUserId = asyncHandler(async (req, res) => {
  const profile = await getProfileByUserId({
    userId: req.params.userId,
    currentUserId: req.user._id.toString(),
  });

  return sendSuccess(res, 200, "Profile fetched successfully", {
    profile,
  });
});

const sendFriendRequest = asyncHandler(async (req, res) => {
  const profile = await requestFriend({
    currentUserId: req.user._id.toString(),
    targetUserId: req.params.userId,
  });

  return sendSuccess(res, 200, "Friend request sent successfully", {
    profile,
  });
});

const acceptFriend = asyncHandler(async (req, res) => {
  const profile = await acceptFriendRequest({
    currentUserId: req.user._id.toString(),
    targetUserId: req.params.userId,
  });

  return sendSuccess(res, 200, "Friend request accepted", {
    profile,
  });
});

const rejectFriend = asyncHandler(async (req, res) => {
  const profile = await rejectFriendRequest({
    currentUserId: req.user._id.toString(),
    targetUserId: req.params.userId,
  });

  return sendSuccess(res, 200, "Friend request rejected", {
    profile,
  });
});

const unfriend = asyncHandler(async (req, res) => {
  const profile = await removeFriend({
    currentUserId: req.user._id.toString(),
    targetUserId: req.params.userId,
  });

  return sendSuccess(res, 200, "Friend removed successfully", {
    profile,
  });
});

const block = asyncHandler(async (req, res) => {
  const profile = await blockUser({
    currentUserId: req.user._id.toString(),
    targetUserId: req.params.userId,
  });

  return sendSuccess(res, 200, "User blocked successfully", {
    profile,
  });
});

const unblock = asyncHandler(async (req, res) => {
  const profile = await unblockUser({
    currentUserId: req.user._id.toString(),
    targetUserId: req.params.userId,
  });

  return sendSuccess(res, 200, "User unblocked successfully", {
    profile,
  });
});

const disableAccount = asyncHandler(async (req, res) => {
  const result = await disableOwnAccount({
    userId: req.user._id.toString(),
  });

  return sendSuccess(res, 200, "Account disabled successfully", result);
});

const deleteAccount = asyncHandler(async (req, res) => {
  const result = await deleteOwnAccount({
    userId: req.user._id.toString(),
  });

  return sendSuccess(res, 200, "Account deleted successfully", result);
});

const getBlocked = asyncHandler(async (req, res) => {
  const blockedUsers = await getBlockedUsers({
    userId: req.user._id.toString(),
  });

  return sendSuccess(res, 200, "Blocked users fetched successfully", {
    blockedUsers,
  });
});

module.exports = {
  acceptFriend,
  block,
  explore,
  me,
  profileByUserId,
  profileByUsername,
  registerDevicePushToken,
  rejectFriend,
  search,
  sendFriendRequest,
  unblock,
  unregisterDevicePushToken,
  unfriend,
  updateMe,
  disableAccount,
  deleteAccount,
  getBlocked,
};
