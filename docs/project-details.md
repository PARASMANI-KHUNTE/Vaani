# Project Details

## Overview

This project is a production-oriented real-time chat platform built as a web application with a clear path toward mobile expansion. It currently includes:

- Google OAuth authentication
- 1-to-1 chat
- Real-time messaging over Socket.IO
- Voice notes, image, video, and file sharing
- Social graph features such as friend requests and blocking
- Audio and video calling using WebRTC signaling through Socket.IO
- Call and message history persistence

## Repository Structure

```text
Chat App/
  client/   Next.js web client
  server/   Express + Socket.IO backend
  docs/     project documentation
```

## Product Goals

- Deliver a warm, modern, mobile-responsive messaging experience
- Keep backend logic modular and scalable
- Use real-time communication without pushing media through the server
- Support secure authentication and authorization throughout REST and sockets
- Prepare the codebase for future Android and Expo expansion

## Current User-Facing Capability Summary

- Authenticated users can sign in with Google
- Users can discover profiles, send friend requests, accept/reject requests, unfriend, and block
- Users can exchange text, images, videos, files, and voice notes
- Users can reply to messages and delete messages for self or everyone
- Users can mark chats read/unread, clear messages, and remove chats from their list
- Users can make 1-to-1 audio and video calls
- Users can view recent call history from the profile section

## Environment Footprint

### Backend

- Node.js
- Express
- MongoDB
- Socket.IO
- Redis-ready architecture
- Cloudinary integration for media

### Frontend

- Next.js App Router
- React
- Tailwind CSS
- NextAuth
- Zustand
- Socket.IO client

## Intended Near-Term Expansion

- Expo React Native mobile app with OTA support
- TURN server support for stronger call connectivity
- Push notifications and deeper mobile platform integration
