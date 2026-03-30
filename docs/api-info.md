# API Information

## Base URLs

### Local development

- Web client: `http://localhost:3000`
- API server: `http://localhost:5000`

## Response Style

Successful REST responses generally follow:

```json
{
  "success": true,
  "message": "Human readable message",
  "data": {}
}
```

## REST Endpoints

### Health

- `GET /health`

### Auth

- `POST /auth/login`
- `GET /auth/me`

### Users

- `GET /users/me`
- `PATCH /users/me`
- `GET /users/explore`
- `GET /users/search?q=...`
- `GET /users/profile/:username`
- `POST /users/:userId/friend-request`
- `POST /users/:userId/friend-request/accept`
- `POST /users/:userId/friend-request/reject`
- `DELETE /users/:userId/friend`
- `POST /users/:userId/block`
- `DELETE /users/:userId/block`

### Chats

- `GET /chats`
- `POST /chats`
- `POST /chats/:chatId/clear`
- `PATCH /chats/:chatId/read`
- `PATCH /chats/:chatId/unread`
- `DELETE /chats/:chatId`

### Messages

- `POST /messages/upload/signature`
- `POST /messages/upload`
- `GET /messages/:chatId?page=1&limit=20`
- `POST /messages`
- `DELETE /messages/:messageId?scope=me|everyone`

### Calls

- `GET /calls/config`
- `GET /calls/active`
- `GET /calls/history`

## Socket Events

### Messaging and social

Client to server:

- `SEND_MESSAGE`
- `JOIN_CHAT`
- `TYPING`
- `STOP_TYPING`
- `DELETE_MESSAGE`

Server to client:

- `NEW_MESSAGE`
- `MESSAGE_DELIVERED`
- `MESSAGE_SEEN`
- `MESSAGE_DELETED`
- `CHAT_UPDATED`
- `USER_ONLINE`
- `USER_OFFLINE`
- `PRESENCE_SYNC`
- `FRIEND_REQUEST_RECEIVED`
- `FRIEND_REQUEST_ACCEPTED`
- `FRIEND_REQUEST_REJECTED`

### Calling

Client to server:

- `CALL_USER`
- `ACCEPT_CALL`
- `REJECT_CALL`
- `OFFER`
- `ANSWER`
- `ICE_CANDIDATE`
- `END_CALL`

Server to client:

- `INCOMING_CALL`
- `CALL_ACCEPTED`
- `CALL_REJECTED`
- `OFFER`
- `ANSWER`
- `ICE_CANDIDATE`
- `CALL_ENDED`

## Security Expectations

- Protected REST endpoints require `Authorization: Bearer <jwt>`
- Socket handshake requires JWT auth
- Chat and call access are validated server-side
- Blocked users are prevented from interacting

## Media Handling Notes

- Signed direct uploads are supported
- Cloudinary stores message media
- The backend can fallback to proxied upload when needed
- WebRTC call media is never stored or forwarded by the server
