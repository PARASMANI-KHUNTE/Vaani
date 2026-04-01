# Concepts Used

## Realtime Messaging

Socket.IO rooms deliver targeted updates for messages, typing, presence, and notifications.

## State Management

React context handles auth/session concerns. Zustand manages chat, message, and realtime UI state.

## Media Uploads

The app uses signed Cloudinary uploads with a backend fallback path for reliability.

## Security

JWT authentication protects REST and Socket.IO access. Validation and service-level permission checks protect mutations.
