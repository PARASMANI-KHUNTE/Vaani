/**
 * Chat Service
 * Business logic for chat creation, membership, settings, system messages
 */

import mongoose, { ClientSession } from 'mongoose';
import { Chat, IChat, GroupInvite, IChatParticipant } from './model';
import { SystemEventData } from '@chat-app/shared/types';
import { Message } from '../message/model';
import { User } from '../user/model';
import { ApiError } from '../../shared/utils/apiError';
import { logger } from '../../shared/utils/logger';
import { Limits } from '@chat-app/shared/constants';
import { isTransactionSupported, withTransaction, runInTransaction } from '../../core/mongoose';
import { socketEmitters } from '../../core/socket/server';
import { generateId } from '@chat-app/shared/utils';
import {
  enqueueOfflineMessage,
  dequeueOfflineMessages,
  peekOfflineQueue,
  getOfflineQueueStats,
  clearOfflineQueue,
  requeueOfflineMessage,
  getUsersWithOfflineMessages,
  processOfflineQueue,
} from '../../shared/utils/offlineQueue';

// ============================================================================
// Types
// ============================================================================

interface CreateDirectChatInput {
  participantId: string;
  currentUserId: string;
}

interface CreateGroupChatInput {
  groupName: string;
  participantIds: string[];
  currentUserId: string;
  groupDescription?: string;
  groupAvatar?: string;
}

interface UpdateGroupInput {
  groupName?: string;
  groupAvatar?: string | null;
  groupDescription?: string;
  settings?: Record<string, unknown>;
}

interface AddMembersInput {
  chatId: string;
  memberIds: string[];
  currentUserId: string;
}

// ============================================================================
// Direct Chat
// ============================================================================

export const createDirectChat = async (input: CreateDirectChatInput): Promise<IChat> => {
  const { participantId, currentUserId } = input;

  if (participantId === currentUserId) {
    throw new ApiError(400, 'Cannot create chat with yourself', 'CANNOT_CHAT_WITH_SELF');
  }

  // Check if direct chat already exists
  const existingChat = await Chat.findDirectChat(
    new mongoose.Types.ObjectId(currentUserId),
    new mongoose.Types.ObjectId(participantId)
  );

  if (existingChat) {
    return existingChat;
  }

  // Verify both users exist and are active
  const [user1, user2] = await Promise.all([
    User.findById(currentUserId),
    User.findById(participantId),
  ]);

  if (!user1 || !user2) {
    throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  }

  if (user1.accountStatus !== 'active' || user2.accountStatus !== 'active') {
    throw new ApiError(403, 'Account is disabled or deleted', 'ACCOUNT_INACTIVE');
  }

  // Check if blocked
  if (user1.blockedUsers.some((id) => id.equals(participantId)) ||
      user2.blockedUsers.some((id) => id.equals(currentUserId))) {
    throw new ApiError(403, 'Unable to create chat', 'BLOCKED');
  }

  // Create chat
  const chat = await Chat.create({
    type: 'direct',
    participants: [
      { userId: currentUserId, role: 'member' },
      { userId: participantId, role: 'member' },
    ],
  });

  logger.info('Direct chat created', { chatId: chat._id, participants: [currentUserId, participantId] });
  return chat;
};

// ============================================================================
// Group Chat
// ============================================================================

export const createGroupChat = async (input: CreateGroupChatInput): Promise<IChat> => {
  const { groupName, participantIds, currentUserId, groupDescription, groupAvatar } = input;

  if (participantIds.length < 1) {
    throw new ApiError(400, 'At least one participant required', 'MIN_PARTICIPANTS');
  }

  if (participantIds.length > Limits.MAX_GROUP_MEMBERS - 1) {
    throw new ApiError(400, `Maximum ${Limits.MAX_GROUP_MEMBERS - 1} participants allowed`, 'MAX_PARTICIPANTS');
  }

  // Verify all users exist and are active
  const users = await User.find({ _id: { $in: [...participantIds, currentUserId] } });
  if (users.length !== participantIds.length + 1) {
    throw new ApiError(404, 'One or more users not found', 'USER_NOT_FOUND');
  }

  for (const user of users) {
    if (user.accountStatus !== 'active') {
      throw new ApiError(403, 'Account is disabled or deleted', 'ACCOUNT_INACTIVE');
    }
  }

  // Check if current user is blocked by any participant
  for (const participantId of participantIds) {
    const participant = users.find((u) => u._id.equals(participantId));
    if (participant?.blockedUsers.some((id) => id.equals(currentUserId))) {
      throw new ApiError(403, 'Unable to create group', 'BLOCKED');
    }
  }

  // Create group chat
  const chat = await Chat.create({
    type: 'group',
    groupName,
    groupDescription,
    groupAvatar,
    ownerId: currentUserId,
    admins: [currentUserId],
    participants: [
      { userId: currentUserId, role: 'owner' },
      ...participantIds.map((id) => ({ userId: id, role: 'member' })),
    ],
  });

  // Notify added members via socket
  for (const participantId of participantIds) {
    socketEmitters.memberAddedToGroup(chat._id.toString(), currentUserId, users.find((u) => u._id.equals(currentUserId))?.name || 'Someone');
  }

  logger.info('Group chat created', { chatId: chat._id, owner: currentUserId, memberCount: participantIds.length + 1 });
  return chat;
};

// ============================================================================
// Group Management
// ============================================================================

export const updateGroup = async (
  chatId: string,
  currentUserId: string,
  input: UpdateGroupInput
): Promise<IChat> => {
  const chat = await Chat.findById(chatId);
  if (!chat) throw new ApiError(404, 'Chat not found', 'CHAT_NOT_FOUND');

  if (chat.type !== 'group') {
    throw new ApiError(400, 'Not a group chat', 'NOT_GROUP_CHAT');
  }

  const role = chat.getParticipantRole(new mongoose.Types.ObjectId(currentUserId));
  if (!role || (role !== 'admin' && role !== 'owner')) {
    throw new ApiError(403, 'Only admins can update group', 'NOT_GROUP_ADMIN');
  }

  if (input.groupName !== undefined) chat.groupName = input.groupName;
  if (input.groupAvatar !== undefined) chat.groupAvatar = input.groupAvatar;
  if (input.groupDescription !== undefined) chat.groupDescription = input.groupDescription;
  if (input.settings !== undefined) {
    chat.settings = { ...chat.settings, ...input.settings };
  }

  await chat.save();
  logger.info('Group updated', { chatId, updatedBy: currentUserId });

  return chat;
};

export const addGroupMembers = async (input: AddMembersInput): Promise<IChat> => {
  const { chatId, memberIds, currentUserId } = input;

  const chat = await Chat.findById(chatId);
  if (!chat) throw new ApiError(404, 'Chat not found', 'CHAT_NOT_FOUND');

  if (chat.type !== 'group') {
    throw new ApiError(400, 'Not a group chat', 'NOT_GROUP_CHAT');
  }

  const role = chat.getParticipantRole(new mongoose.Types.ObjectId(currentUserId));
  if (!role || (role !== 'admin' && role !== 'owner')) {
    throw new ApiError(403, 'Only admins can add members', 'NOT_GROUP_ADMIN');
  }

  if (memberIds.length === 0) {
    throw new ApiError(400, 'No members to add', 'NO_MEMBERS');
  }

  if (chat.participants.length + memberIds.length > Limits.MAX_GROUP_MEMBERS) {
    throw new ApiError(400, `Group would exceed maximum of ${Limits.MAX_GROUP_MEMBERS} members`, 'MAX_MEMBERS_EXCEEDED');
  }

  // Verify users exist and are active
  const users = await User.find({ _id: { $in: memberIds } });
  if (users.length !== memberIds.length) {
    throw new ApiError(404, 'One or more users not found', 'USER_NOT_FOUND');
  }

  for (const user of users) {
    if (user.accountStatus !== 'active') {
      throw new ApiError(403, 'Account is disabled or deleted', 'ACCOUNT_INACTIVE');
    }
  }

  // Check for blocks
  for (const memberId of memberIds) {
    // Check if any current member blocks the new member
    for (const participant of chat.participants) {
      const currentMember = users.find((u) => u._id.equals(participant.userId));
      if (currentMember?.blockedUsers.some((id) => id.equals(memberId))) {
        throw new ApiError(403, 'Unable to add member', 'BLOCKED');
      }
    }
    // Check if new member blocks any current member
    const newMember = users.find((u) => u._id.equals(memberId));
    if (newMember?.blockedUsers.some((id) => chat.participants.some((p) => p.userId.equals(id)))) {
      throw new ApiError(403, 'Unable to add member', 'BLOCKED');
    }
  }

  // Add members
  for (const memberId of memberIds) {
    if (!chat.isParticipant(new mongoose.Types.ObjectId(memberId))) {
      await chat.addParticipant(new mongoose.Types.ObjectId(memberId));
    }
  }

  // Notify via socket
  for (const memberId of memberIds) {
    const user = users.find((u) => u._id.equals(memberId));
    socketEmitters.memberAddedToGroup(chatId, memberId, user?.name || 'Someone');
  }

  await chat.save();
  logger.info('Members added to group', { chatId, addedBy: currentUserId, memberIds });

  return chat;
};

export const removeGroupMember = async (
  chatId: string,
  memberId: string,
  currentUserId: string
): Promise<IChat> => {
  const chat = await Chat.findById(chatId);
  if (!chat) throw new ApiError(404, 'Chat not found', 'CHAT_NOT_FOUND');

  if (chat.type !== 'group') {
    throw new ApiError(400, 'Not a group chat', 'NOT_GROUP_CHAT');
  }

  const currentUserRole = chat.getParticipantRole(new mongoose.Types.ObjectId(currentUserId));
  const targetRole = chat.getParticipantRole(new mongoose.Types.ObjectId(memberId));

  // Can't remove yourself (use leaveGroup instead)
  if (memberId === currentUserId) {
    throw new ApiError(400, 'Use leave group instead', 'USE_LEAVE_GROUP');
  }

  // Only admins/owner can remove others
  if (!currentUserRole || (currentUserRole !== 'admin' && currentUserRole !== 'owner')) {
    throw new ApiError(403, 'Only admins can remove members', 'NOT_GROUP_ADMIN');
  }

  // Can't remove owner
  if (targetRole === 'owner') {
    throw new ApiError(403, 'Cannot remove group owner', 'CANNOT_REMOVE_OWNER');
  }

  // Admins can only remove members, not other admins
  if (currentUserRole === 'admin' && targetRole === 'admin') {
    throw new ApiError(403, 'Admins cannot remove other admins', 'ADMIN_CANNOT_REMOVE_ADMIN');
  }

  await chat.removeParticipant(new mongoose.Types.ObjectId(memberId));
  await chat.save();

  logger.info('Member removed from group', { chatId, removedBy: currentUserId, memberId });

  return chat;
};

export const promoteGroupAdmin = async (
  chatId: string,
  memberId: string,
  currentUserId: string
): Promise<IChat> => {
  const chat = await Chat.findById(chatId);
  if (!chat) throw new ApiError(404, 'Chat not found', 'CHAT_NOT_FOUND');

  if (chat.type !== 'group') {
    throw new ApiError(400, 'Not a group chat', 'NOT_GROUP_CHAT');
  }

  const role = chat.getParticipantRole(new mongoose.Types.ObjectId(currentUserId));
  if (role !== 'owner') {
    throw new ApiError(403, 'Only owner can promote admins', 'NOT_GROUP_OWNER');
  }

  await chat.updateParticipantRole(new mongoose.Types.ObjectId(memberId), 'admin');
  await chat.save();

  logger.info('Member promoted to admin', { chatId, promotedBy: currentUserId, memberId });
  return chat;
};

export const demoteGroupAdmin = async (
  chatId: string,
  memberId: string,
  currentUserId: string
): Promise<IChat> => {
  const chat = await Chat.findById(chatId);
  if (!chat) throw new ApiError(404, 'Chat not found', 'CHAT_NOT_FOUND');

  if (chat.type !== 'group') {
    throw new ApiError(400, 'Not a group chat', 'NOT_GROUP_CHAT');
  }

  const role = chat.getParticipantRole(new mongoose.Types.ObjectId(currentUserId));
  if (role !== 'owner') {
    throw new ApiError(403, 'Only owner can demote admins', 'NOT_GROUP_OWNER');
  }

  await chat.updateParticipantRole(new mongoose.Types.ObjectId(memberId), 'member');
  await chat.save();

  logger.info('Admin demoted to member', { chatId, demotedBy: currentUserId, memberId });
  return chat;
};

export const transferGroupOwnership = async (
  chatId: string,
  nextOwnerId: string,
  currentUserId: string
): Promise<IChat> => {
  const chat = await Chat.findById(chatId);
  if (!chat) throw new ApiError(404, 'Chat not found', 'CHAT_NOT_FOUND');

  if (chat.type !== 'group') {
    throw new ApiError(400, 'Not a group chat', 'NOT_GROUP_CHAT');
  }

  if (!chat.ownerId?.equals(currentUserId)) {
    throw new ApiError(403, 'Only owner can transfer ownership', 'NOT_GROUP_OWNER');
  }

  if (nextOwnerId === currentUserId) {
    throw new ApiError(400, 'Cannot transfer ownership to yourself', 'INVALID_TRANSFER');
  }

  // Verify new owner is a participant
  if (!chat.isParticipant(new mongoose.Types.ObjectId(nextOwnerId))) {
    throw new ApiError(400, 'New owner must be a group member', 'NOT_GROUP_MEMBER');
  }

  // Update roles
  await chat.updateParticipantRole(new mongoose.Types.ObjectId(currentUserId), 'admin');
  await chat.updateParticipantRole(new mongoose.Types.ObjectId(nextOwnerId), 'owner');
  chat.ownerId = new mongoose.Types.ObjectId(nextOwnerId);
  await chat.save();

  logger.info('Group ownership transferred', { chatId, from: currentUserId, to: nextOwnerId });
  return chat;
};

export const leaveGroup = async (chatId: string, currentUserId: string): Promise<{ chatId: string; deleted: boolean }> => {
  const chat = await Chat.findById(chatId);
  if (!chat) throw new ApiError(404, 'Chat not found', 'CHAT_NOT_FOUND');

  if (chat.type !== 'group') {
    throw new ApiError(400, 'Not a group chat', 'NOT_GROUP_CHAT');
  }

  const role = chat.getParticipantRole(new mongoose.Types.ObjectId(currentUserId));
  if (!role) {
    throw new ApiError(403, 'Not a member of this group', 'NOT_GROUP_MEMBER');
  }

  // If owner, transfer ownership or delete group
  if (role === 'owner') {
    // Find next admin or oldest member
    const admins = chat.participants.filter((p) => p.role === 'admin' && !p.userId.equals(currentUserId));
    let nextOwner = admins[0]?.userId;

    if (!nextOwner) {
      const members = chat.participants.filter((p) => p.role === 'member' && !p.userId.equals(currentUserId));
      nextOwner = members[0]?.userId;
    }

    if (nextOwner) {
      await transferGroupOwnership(chatId, nextOwner.toString(), currentUserId);
      // Now leave as admin
      await leaveGroup(chatId, currentUserId);
      return { chatId, deleted: false };
    } else {
      // No other members, delete group
      await Chat.findByIdAndDelete(chatId);
      await Message.deleteMany({ chatId });
      logger.info('Group deleted (last member left)', { chatId });
      return { chatId, deleted: true };
    }
  }

  // Regular member leaving
  await chat.removeParticipant(new mongoose.Types.ObjectId(currentUserId));
  await chat.save();

  logger.info('Member left group', { chatId, memberId: currentUserId });
  return { chatId, deleted: false };
};

// ============================================================================
// Group Invites
// ============================================================================

export const createGroupInviteLink = async (
  chatId: string,
  currentUserId: string,
  input?: { expiresInHours?: number; maxUses?: number }
): Promise<{ token: string; expiresAt: Date; maxUses?: number }> => {
  const chat = await Chat.findById(chatId);
  if (!chat) throw new ApiError(404, 'Chat not found', 'CHAT_NOT_FOUND');

  if (chat.type !== 'group') {
    throw new ApiError(400, 'Not a group chat', 'NOT_GROUP_CHAT');
  }

  const role = chat.getParticipantRole(new mongoose.Types.ObjectId(currentUserId));
  if (!role || (role !== 'admin' && role !== 'owner')) {
    throw new ApiError(403, 'Only admins can create invite links', 'NOT_GROUP_ADMIN');
  }

  const token = generateId('invite_');
  const expiresInHours = input?.expiresInHours || 168; // 1 week default
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  const invite = await GroupInvite.create({
    chatId,
    token,
    expiresAt,
    maxUses: input?.maxUses,
    createdBy: currentUserId,
  });

  // Update chat with invite link
  chat.inviteLink = {
    _id: invite._id,
    token: invite.token,
    chatId: invite.chatId,
    expiresAt: invite.expiresAt,
    maxUses: invite.maxUses,
    useCount: invite.useCount,
    createdBy: new mongoose.Types.ObjectId(invite.createdBy.toString()),
    createdAt: invite.createdAt,
  };
  await chat.save();

  logger.info('Group invite link created', { chatId, createdBy: currentUserId, expiresAt });
  return { token: invite.token, expiresAt: invite.expiresAt, maxUses: invite.maxUses };
};

export const getGroupInvitePreview = async (inviteToken: string): Promise<{
  chatId: string;
  groupName: string;
  groupAvatar: string | null;
  memberCount: number;
  isAlreadyMember: boolean;
  expiresAt: Date;
  maxUses: number;
  useCount: number;
} | null> => {
  const invite = await GroupInvite.findOne({ token: inviteToken })
    .populate('chatId', 'groupName groupAvatar participants')
    .lean();

  if (!invite) return null;

  if (invite.expiresAt < new Date()) {
    return null;
  }

  const chat = invite.chatId as unknown as IChat;
  return {
    chatId: chat._id.toString(),
    groupName: chat.groupName || '',
    groupAvatar: chat.groupAvatar || null,
    memberCount: chat.participants.length,
    isAlreadyMember: false, // Would need current user to check
    expiresAt: invite.expiresAt,
    maxUses: invite.maxUses || 0,
    useCount: invite.useCount,
  };
};

export const joinGroupViaInvite = async (
  inviteToken: string,
  currentUserId: string
): Promise<{ chat: IChat | null; joined: boolean }> => {
  const invite = await GroupInvite.findOne({ token: inviteToken });
  if (!invite) {
    throw new ApiError(404, 'Invite not found or expired', 'INVITE_NOT_FOUND');
  }

  if (invite.expiresAt < new Date()) {
    throw new ApiError(400, 'Invite has expired', 'INVITE_EXPIRED');
  }

  if (invite.maxUses && invite.useCount >= invite.maxUses) {
    throw new ApiError(400, 'Invite has reached maximum uses', 'INVITE_MAX_USES');
  }

  const chat = await Chat.findById(invite.chatId);
  if (!chat) {
    throw new ApiError(404, 'Group not found', 'CHAT_NOT_FOUND');
  }

  // Check if already a member
  if (chat.isParticipant(new mongoose.Types.ObjectId(currentUserId))) {
    return { chat, joined: false };
  }

  // Check for blocks
  const user = await User.findById(currentUserId);
  if (!user || user.accountStatus !== 'active') {
    throw new ApiError(403, 'Account is disabled or deleted', 'ACCOUNT_INACTIVE');
  }

  for (const participant of chat.participants) {
    const member = await User.findById(participant.userId);
    if (member?.blockedUsers.some((id) => id.equals(currentUserId)) ||
        user.blockedUsers.some((id) => id.equals(participant.userId))) {
      throw new ApiError(403, 'Unable to join group', 'BLOCKED');
    }
  }

  // Add member
  await chat.addParticipant(new mongoose.Types.ObjectId(currentUserId));
  await chat.save();

  // Increment use count
  invite.useCount += 1;
  await invite.save();

  logger.info('User joined group via invite', { chatId: chat._id, userId: currentUserId, inviteToken });
  return { chat, joined: true };
};

// ============================================================================
// Chat Settings
// ============================================================================

export const updateUserChatState = async (
  chatId: string,
  currentUserId: string,
  state: { clearedAt?: Date; hidden?: boolean; manualUnread?: boolean; archivedAt?: Date; pinnedAt?: Date; mutedUntil?: Date; notificationsMuted?: boolean }
): Promise<IChat> => {
  const chat = await Chat.findById(chatId);
  if (!chat) throw new ApiError(404, 'Chat not found', 'CHAT_NOT_FOUND');

  if (!chat.isParticipant(new mongoose.Types.ObjectId(currentUserId))) {
    throw new ApiError(403, 'Not a member of this chat', 'NOT_CHAT_MEMBER');
  }

  await chat.updateUserState(new mongoose.Types.ObjectId(currentUserId), state);
  await chat.save();

  return chat;
};

export const markChatRead = async (chatId: string, currentUserId: string): Promise<IChat> => {
  return updateUserChatState(chatId, currentUserId, { manualUnread: false });
};

export const markChatUnread = async (chatId: string, currentUserId: string): Promise<IChat> => {
  return updateUserChatState(chatId, currentUserId, { manualUnread: true });
};

export const clearChatMessages = async (chatId: string, currentUserId: string): Promise<IChat> => {
  return updateUserChatState(chatId, currentUserId, { clearedAt: new Date() });
};

export const deleteChatForUser = async (chatId: string, currentUserId: string): Promise<{ chatId: string; deleted: boolean }> => {
  const chat = await Chat.findById(chatId);
  if (!chat) throw new ApiError(404, 'Chat not found', 'CHAT_NOT_FOUND');

  if (!chat.isParticipant(new mongoose.Types.ObjectId(currentUserId))) {
    throw new ApiError(403, 'Not a member of this chat', 'NOT_CHAT_MEMBER');
  }

  // For direct chats, just hide for this user
  if (chat.type === 'direct') {
    await updateUserChatState(chatId, currentUserId, { hidden: true });
    return { chatId, deleted: true };
  }

  // For groups, leave the group
  return leaveGroup(chatId, currentUserId);
};

// ============================================================================
// System Messages
// ============================================================================

const createSystemMessage = async (
  chatId: string,
  type: SystemEventData['type'],
  actorId: string,
  actorName: string,
  metadata?: Record<string, unknown>
): Promise<void> => {
  const chat = await Chat.findById(chatId);
  if (!chat) return;

  const systemEvent: SystemEventData = {
    type,
    actorId,
    actorName,
    metadata,
  };

  await Message.create({
    chatId,
    senderId: actorId,
    type: 'system',
    content: '',
    systemEvent,
  });
};

export const notifyMemberAdded = async (chatId: string, actorId: string, actorName: string, targetId: string, targetName: string): Promise<void> => {
  await createSystemMessage(chatId, 'member_added', actorId, actorName, { targetId, targetName });
};

export const notifyMemberRemoved = async (chatId: string, actorId: string, actorName: string, targetId: string, targetName: string): Promise<void> => {
  await createSystemMessage(chatId, 'member_removed', actorId, actorName, { targetId, targetName });
};

export const notifyGroupNameChanged = async (chatId: string, actorId: string, actorName: string, oldName: string, newName: string): Promise<void> => {
  await createSystemMessage(chatId, 'group_name_changed', actorId, actorName, { oldName, newName });
};

export const notifyMemberPromoted = async (chatId: string, actorId: string, actorName: string, targetId: string, targetName: string): Promise<void> => {
  await createSystemMessage(chatId, 'member_promoted', actorId, actorName, { targetId, targetName });
};

export const notifyMemberDemoted = async (chatId: string, actorId: string, actorName: string, targetId: string, targetName: string): Promise<void> => {
  await createSystemMessage(chatId, 'member_demoted', actorId, actorName, { targetId, targetName });
};

export const notifyOwnershipTransferred = async (chatId: string, actorId: string, actorName: string, newOwnerId: string, newOwnerName: string): Promise<void> => {
  await createSystemMessage(chatId, 'ownership_transferred', actorId, actorName, { newOwnerId, newOwnerName });
};