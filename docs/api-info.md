# API Info

## REST Endpoints

### Auth
- POST /auth/login
- GET /auth/me
- POST /auth/mobile/code
- POST /auth/mobile/redeem

### Users
- GET /users/me
- PATCH /users/me
- POST /users/me/disable
- DELETE /users/me
- GET /users/profile/:username
- GET /users/search?q=
- GET /users/explore
- POST /users/:id/friend-request
- POST /users/:id/friend-request/accept
- POST /users/:id/friend-request/reject
- DELETE /users/:id/friend
- POST /users/:id/block
- DELETE /users/:id/block

### Chats
- GET /chats
- POST /chats
- PATCH /chats/:chatId/read
- PATCH /chats/:chatId/unread
- POST /chats/:chatId/clear
- DELETE /chats/:chatId

### Messages
- GET /messages/:chatId?page=&limit=
- POST /messages
- DELETE /messages/:messageId?scope=me|everyone
- POST /messages/:messageId/reaction
- DELETE /messages/:messageId/reaction?emoji=
- POST /messages/upload/signature
- POST /messages/upload

## Socket Events

- message:send / message:new
- message:delivered / message:seen
- message:reaction / message:reaction-removed
- typing:start / typing:stop
- presence:update
- notification:new
