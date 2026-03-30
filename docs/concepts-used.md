# Concepts Used

## Core Product Concepts

### Modular monolith

The backend is intentionally organized as a modular monolith so features stay isolated without the complexity cost of microservices.

### Realtime event-driven updates

Chat, presence, notifications, and call signaling are all modeled as events that propagate through Socket.IO.

### Optimistic UI

Messages and uploads update the interface immediately before the final server acknowledgment returns.

### Peer-to-peer media

Calls use WebRTC for actual audio/video streams so the backend remains a signaling layer instead of a media relay.

### Social relationship gating

Friend requests, friendship, and blocking affect what interactions are allowed across chat and calling.

## Technical Concepts

### JWT-based authorization

Backend-issued JWTs protect both HTTP and socket access after Google login.

### OAuth identity federation

Google is used as the identity provider through NextAuth and backend token exchange.

### Presence model

Presence is tracked by connected user sockets and broadcast to the client as user online/offline state.

### Room-based socket fanout

User-scoped and chat-scoped rooms simplify targeted realtime updates.

### Message lifecycle tracking

Messages move through `sent`, `delivered`, and `seen` states and can be cleared or removed depending on scope.

### Media offloading

Cloudinary is used to avoid pushing binary persistence and CDN concerns into the main application server.

### Retention and cleanup

The backend includes configurable cleanup for old chats/messages and associated media lifecycle handling.

### Call lifecycle management

Call state includes ringing, accepted, rejected, timed out, disconnected, and completed scenarios with cleanup at each edge.

## UX Concepts

### Responsive first interaction design

The UI is designed to adapt from desktop split-view chat into phone-friendly panel and sheet behaviors.

### Notification layering

The app uses both a notification center and toast-style alerts for different levels of urgency.

### Recovery-oriented UX

Uploads, calls, and realtime flows include retry, graceful errors, and cleanup instead of leaving stale UI behind.
