# API Information

Base URL is configured in `web/.env` as `VITE_API_URL`.

## Auth

- `POST /auth/login` -> exchange Google ID token for app JWT
- `GET /auth/me` -> fetch current user
- `POST /auth/mobile/code` -> issue one-time mobile auth code
- `POST /auth/mobile/redeem` -> redeem one-time mobile auth code

## Users / Social

- `GET /users/me`
- `PATCH /users/me`
- `POST /users/me/disable`
- `DELETE /users/me`
- `GET /users/profile/:username`
- `GET /users/:userId/profile`
- `GET /users/search?q=`
- `GET /users/explore`
- `POST /users/:id/friend-request`
- `POST /users/:id/friend-request/accept`
- `POST /users/:id/friend-request/reject`
- `DELETE /users/:id/friend`
- `POST /users/:id/block`
- `DELETE /users/:id/block`

## Chats

- `GET /chats`
- `POST /chats`
- `PATCH /chats/:chatId/read`
- `PATCH /chats/:chatId/unread`
- `POST /chats/:chatId/clear`
- `DELETE /chats/:chatId`
- `PATCH /chats/:chatId/group`
- `POST /chats/:chatId/members`
- `DELETE /chats/:chatId/members/:memberId`
- `POST /chats/:chatId/admins/:memberId`
- `DELETE /chats/:chatId/admins/:memberId`
- `POST /chats/:chatId/owner`
- `POST /chats/:chatId/leave`
- `POST /chats/:chatId/invite-link`
- `GET /chats/invite/:token`
- `POST /chats/invite/:token/join`

Notes:
- Mutation endpoints support optional `Idempotency-Key` header for safe retries.

## Messages

- `GET /messages/:chatId?page=&limit=`
- `POST /messages`
- `DELETE /messages/:messageId?scope=me|everyone`
- `POST /messages/:messageId/reaction`
- `DELETE /messages/:messageId/reaction?emoji=`
- `POST /messages/upload/signature`
- `POST /messages/upload` (fallback)

## Calls

- `GET /calls/config`
- `GET /calls/history?limit=`

## Socket.IO (high level)

- Message send/deliver/seen
- Typing indicators
- Presence updates
- Notifications
- Direct call signaling (offer/answer/ICE)
- Group call signaling (start/join/leave/end/signal/state updates)
