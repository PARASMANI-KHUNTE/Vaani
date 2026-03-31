# Group Collaboration Rollout (Production Plan)

## Phase 1 (Implemented)
- Dedicated profile route: `/me/profile`.
- User-card profile navigation: clicking a user card opens `/profile/:username`.
- Group chat backend foundation:
  - `Chat` schema supports `isGroup`, `groupName`, `groupAvatar`, `createdBy`, `admins`.
  - `POST /chats` supports:
    - direct: `{ participantId }`
    - group: `{ isGroup: true, groupName, participantIds[] }`
  - Validation for max members and required group fields.
  - Message sending now safely supports group chats without 1:1 interaction checks.
- Frontend foundation:
  - `Chat` type now includes group metadata.
  - `createGroupChat()` API client added.
  - `useChatData.createGroupConversation()` added.
  - Sidebar + chat header render group titles/avatars correctly.
  - Group call buttons intentionally disabled until signaling phase.

## Phase 2 (Implemented)
- Group management APIs:
  - add/remove members
  - promote/demote admins
  - rename group / change avatar
  - leave group / transfer ownership
- Authorization rules:
  - only admins can mutate membership/metadata
  - owner transfer safety for last-admin scenarios
- Audit events:
  - system events for membership and role changes

## Phase 3 (Implemented)
- Group audio/video call signaling:
  - room-based signaling (SFU-ready) via `group-call:{callId}` channels
  - participant join/leave state
  - mute/video/speaking state broadcast
  - active speaker and reconnection/disconnect handling
- Persistence:
  - group call sessions with participant timeline and outcomes (`GroupCallSession`)

## Phase 4 (Implemented)
- Reliability hardening:
  - idempotency keys for create/rename/member/owner/leave/invite operations
  - optimistic UI rollback contracts (bulk actions now `allSettled` based)
  - rate limits and abuse controls on high-churn chat/group mutations
- Testing:
  - regression coverage retained for API/socket constants and core helpers
  - foundation in place for websocket race/load suites
