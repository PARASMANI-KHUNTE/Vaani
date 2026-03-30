const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/apiResponse");
const {
  acceptFriendRequest,
  blockUser,
  exploreUsers,
  getOwnProfile,
  getProfileByUsername,
  rejectFriendRequest,
  removeFriend,
  requestFriend,
  searchUsers,
  unblockUser,
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

const profileByUsername = asyncHandler(async (req, res) => {
  const profile = await getProfileByUsername({
    username: req.params.username,
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

module.exports = {
  acceptFriend,
  block,
  explore,
  me,
  profileByUsername,
  rejectFriend,
  search,
  sendFriendRequest,
  unblock,
  unfriend,
  updateMe,
};
