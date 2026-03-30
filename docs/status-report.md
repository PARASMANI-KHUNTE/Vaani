# Status Report

## Completed So Far

### Backend

- Modular Express backend with route, controller, and service separation
- MongoDB connection and environment configuration
- JWT-protected REST endpoints
- Google login exchange and backend token issuance
- Chat and message persistence
- Realtime messaging with Socket.IO
- Presence tracking
- Typing indicators
- Seen and delivered status
- Social graph support:
  - friend request
  - accept/reject
  - unfriend
  - block/unblock
- Cloudinary media upload and storage
- Voice note, image, video, and file messaging
- Message delete and clear behavior
- Chat read/unread/delete state management
- Call signaling module and WebRTC support hooks
- Call history persistence
- Retention cleanup for old chats/messages/media

### Frontend

- Next.js app shell with responsive layout
- Google auth integration through NextAuth
- Chat sidebar and chat window
- Realtime updates for messages and presence
- Notification panel and toast stack
- Explore and profile sections
- Profile sharing support
- Warmed-up UI system with responsive polish
- Voice notes and media sending UI
- 1-to-1 audio/video calling UI
- Recent call history in profile

## In Progress or Partially Complete

- Production hardening of calling beyond STUN-only connectivity
- Advanced call UX polish and resilience
- Redis-backed distributed realtime state
- deeper moderation and abuse tooling

## Not Yet Completed

- Group chat
- Group call
- TURN server integration
- Dedicated admin panel
- Push notifications for native mobile delivery
- Expo React Native app
- OTA mobile release pipeline
- Formal OpenAPI/Swagger docs
- Full observability/runbook suite

## Milestone View

### Phase 1

- Auth
- basic UI
- REST messaging

Status: complete

### Phase 2

- realtime messaging with Socket.IO

Status: complete

### Phase 3

- presence
- typing
- richer interaction features

Status: complete for current web scope

### Phase 4

- UI polish
- media
- social expansion
- call support

Status: substantially complete for current web scope, with infrastructure hardening still pending
