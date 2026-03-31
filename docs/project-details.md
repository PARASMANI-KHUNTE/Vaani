# Project Details

## Overview

Canvas Chat is a production-oriented realtime chat platform with a React + Vite web frontend and an Express + Socket.IO backend.

## Repository Structure

```text
Chat App/
  web/     React + Vite client
  server/  Express + Socket.IO backend
  mobile/  React Native/Expo workspace (in progress)
  docs/    project documentation
```

## Product Goals

- Deliver a fast, polished, responsive chat experience
- Maintain clean modular backend services
- Keep media transfer off the core app server where possible
- Support secure auth across REST and sockets
- Keep architecture ready for mobile and future scaling

## User-Facing Capabilities

- Google authentication
- 1-to-1 conversations
- Realtime messaging with typing and presence
- Message replies, reactions, and delete scopes
- Image/video/file/voice note sharing
- Read/delivered message state
- Friend requests, unblock/block, unfriend
- 1-to-1 audio and video calls
- Call history and profile management
- Account disable and account delete

## Delivery Model

- Web app is the primary UI channel (`web/`)
- Server exposes REST + Socket.IO for all clients
- Mobile app integration continues through backend APIs and mobile auth code flow
