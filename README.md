# Canvas Chat

Canvas Chat is a realtime communication platform built with a React + Vite web app, an Express API, Socket.IO, MongoDB, Cloudinary, and WebRTC.

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

### Web

- React 19 + Vite 8
- TypeScript
- Tailwind CSS
- React Router
- Google OAuth (GIS)
- Zustand
- Socket.IO client
- Framer Motion

### Backend

- Node.js + Express
- Socket.IO
- MongoDB + Mongoose
- Cloudinary media storage
- JWT auth

## Local Development

### Web (Vite)

```powershell
cd web
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
- web template: [`web/.env.example`](./web/.env.example)

## Current Scope

Implemented:

- Google sign-in
- direct chat
- realtime messaging
- presence and typing
- media, file, and voice notes
- reactions and replies
- social relationship system
- audio/video calling
- call history
- account disable and delete

Not yet implemented:

- TURN server support for difficult NAT cases
- group communication
- production push notification pipeline
- finalized Expo mobile app
