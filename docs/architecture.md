# Architecture

## High-Level Architecture

```text
React + Vite Web App
  -> REST API for auth, chat, users, media, calls
  -> Socket.IO for realtime events and signaling

Express Server
  -> REST controllers/services
  -> Socket.IO handlers
  -> MongoDB persistence
  -> Cloudinary media storage
  -> WebRTC signaling coordination
```

## Frontend Architecture (`web/`)

- `src/main.tsx`: app bootstrap and providers
- `src/App.tsx`: route map
- `src/components/`: chat shell, sidebar, chat window, profile/explore/notifications, call UI
- `src/hooks/`: feature orchestration (`use-chat-data`, `use-social-data`, `use-call`)
- `src/lib/`: API client, auth context, socket client, WebRTC helper, utilities, theme context
- `src/store/`: Zustand chat state
- `src/pages/`: route pages (`/`, `/profile/:username`, `/mobile-auth`, fallback)

## Backend Architecture (`server/`)

- Modular monolith under `server/src/modules`
- Active modules:
  - `auth`
  - `user`
  - `chat`
  - `message`
  - `call`
  - `socket`
- Supporting layers:
  - `config`
  - `middlewares`
  - `utils`

## Realtime Model

- Per-user room: `user:{userId}`
- Per-chat room: `chat:{chatId}`
- Socket events cover:
  - message delivery
  - typing
  - read/delivered updates
  - presence
  - notifications
  - WebRTC signaling (offer/answer/ICE)

## Auth Model

1. Web app gets Google identity token (GIS).
2. Token is exchanged with backend `/auth/login`.
3. Backend returns app JWT.
4. JWT authenticates REST + Socket.IO.

## Media Model

- Primary upload path uses signed Cloudinary direct upload.
- Fallback path uploads through backend endpoint when needed.
- Chat payload stores normalized media metadata.

## Scalability Notes

- Current deployment is single-node friendly.
- Socket room design is compatible with horizontal scaling.
- Presence/call state patterns are ready for Redis-backed distribution.
