# Architecture

Canvas Chat uses a React + Vite frontend and an Express + Socket.IO backend.

## Frontend

- React 19 with TypeScript
- Zustand for chat state
- Framer Motion for UI transitions
- Route-level pages under web/src/pages
- Shared UI and chat surfaces under web/src/components

## Backend

- Express for REST APIs
- Socket.IO for realtime messaging and presence
- MongoDB with Mongoose models
- Cloudinary-backed media uploads
- Modular feature layout under server/src/modules

## Realtime Model

- user:{userId} rooms for personal notifications and presence updates
- chat:{chatId} rooms for chat-specific realtime events

## Current Focus

- Messaging reliability
- Media workflow stability
- Social graph and moderation controls
- Mobile parity over time
