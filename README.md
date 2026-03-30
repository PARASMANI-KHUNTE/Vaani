# Canvas Chat

Canvas Chat is a production-oriented realtime communication platform built with Next.js, Express, Socket.IO, MongoDB, Cloudinary, and WebRTC. It currently supports authentication, direct messaging, media sharing, social features, and 1-to-1 audio/video calling.

## Documentation Index

- [Project Details](./docs/project-details.md)
- [Architecture](./docs/architecture.md)
- [API Information](./docs/api-info.md)
- [Concepts Used](./docs/concepts-used.md)
- [Tech Information](./docs/tech-info.md)
- [Limits](./docs/limits.md)
- [Status Report](./docs/status-report.md)
- [Complete Report](./docs/complete-report.md)

## Current Stack

### Frontend

- Next.js App Router
- Tailwind CSS
- NextAuth
- Socket.IO client
- Zustand

### Backend

- Node.js
- Express
- Socket.IO
- MongoDB
- Redis-ready design
- Cloudinary

## Local Development

### Client

```powershell
cd client
npm install
npm run dev
```

### Server

```powershell
cd server
npm install
npm run dev
```

## Environment Files

- backend template: [`server/.env.example`](./server/.env.example)
- frontend template: [`client/.env.example`](./client/.env.example)

## Current Scope

Implemented:

- Google sign-in
- direct chat
- realtime messaging
- presence and typing
- media and voice notes
- social relationship system
- audio/video calling
- call history

Not yet implemented:

- Expo mobile app
- TURN server support
- group communication
- production push notification stack
