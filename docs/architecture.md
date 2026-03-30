# Architecture

## High-Level Architecture

The system is implemented as a modular monolith with a clear separation between frontend and backend responsibilities.

```text
Next.js Client
  -> REST API for CRUD, profile, upload, history, and configuration
  -> Socket.IO for realtime events and signaling

Express Server
  -> REST modules
  -> Socket.IO realtime handlers
  -> MongoDB persistence
  -> Redis-ready presence/scaling layer
  -> Cloudinary for media storage
```

## Backend Architecture

The backend follows a modular monolithic structure under `server/src/modules`.

### Active modules

- `auth`
- `user`
- `chat`
- `message`
- `call`
- `socket`

### Supporting layers

- `config`
- `middlewares`
- `utils`

## Architectural Principles Used

- Controllers handle HTTP input/output only
- Services own business logic
- Routes declare the API contract
- Models define persistence structure
- Socket logic is isolated from HTTP controllers
- Auth middleware protects private endpoints
- Media is stored outside the app server
- WebRTC media stays peer-to-peer

## Realtime Architecture

### Messaging

- Socket.IO is used for:
  - new messages
  - delivery and seen status
  - typing indicators
  - presence updates
  - friend request notifications

### Calling

- Socket.IO is used only for signaling
- WebRTC handles peer-to-peer audio/video media
- The server never transports media streams

### Room Strategy

- `user:{userId}` for user-specific events
- `chat:{chatId}` for chat-specific events

## Frontend Architecture

The frontend is a Next.js App Router application using client components where realtime and interactivity are required.

### Main frontend layers

- `app/` routes and layout
- `components/` UI sections
- `hooks/` feature orchestration
- `lib/` APIs, socket client, WebRTC helper, utilities, auth
- `store/` Zustand state

## Data and Integration Flow

### Auth flow

1. User signs in with Google through NextAuth.
2. Google `id_token` is exchanged with the backend.
3. Backend verifies Google identity and issues app JWT.
4. JWT is used for protected REST and socket auth.

### Messaging flow

1. Client emits `SEND_MESSAGE`.
2. Backend validates the sender and chat access.
3. Message is persisted to MongoDB.
4. Socket event fans out to receiver and sender rooms.
5. Chat list and message view update in realtime.

### Calling flow

1. Caller emits `CALL_USER`.
2. Receiver gets `INCOMING_CALL`.
3. Receiver accepts or rejects.
4. Offer/answer/ICE signaling moves through Socket.IO.
5. Media connects directly over WebRTC.
6. Call cleanup resets client and server state.

## Scalability Notes

- Current call state is in-memory for active sessions
- Redis is present and can be extended for distributed presence/call coordination
- Socket room design is compatible with a future Socket.IO adapter
- Cloudinary keeps file/media transport off the app server
