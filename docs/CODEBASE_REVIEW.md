# LinkUp Chat App - Complete Codebase Review

> **Excluding Mobile** | Generated: 2025-04-29

---

## 📐 Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USERS / CLIENTS                         │
├─────────────────────────────────────────────────────────────────┤
│                    Web App (React + Vite)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │  Pages   │  │Components│  │  Hooks   │  │  Store   │     │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘     │
│       │              │              │              │            │
│  ┌────┴──────────────┴──────────────┴──────────────┴────┐     │
│  │              Lib (API Client, Socket, Auth)          │     │
│  └───────────────────────┬──────────────────────────────┘     │
└──────────────────────────┼─────────────────────────────────────┘
                           │ HTTPS / WSS
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     LOAD BALANCER / CDN                         │
└─────────────────────────────┬─────────────────────────────────┘
                              │
┌─────────────────────────────▼─────────────────────────────────┐
│              Backend Server (Node.js + Express)                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Express App (app.js)                  │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │  │
│  │  │Auth      │ │User      │ │Chat      │ │Message   │  │  │
│  │  │Module    │ │Module    │ │Module    │ │Module    │  │  │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘  │  │
│  │       └──────────────┴──────────────┴──────────────┘    │  │
│  │                     Middlewares                          │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │  │
│  │  │Auth      │ │Rate Limit│ │Validation│ │Error     │  │  │
│  │  │Middleware│ │          │ │          │ │Handler   │  │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Socket Server (Socket.IO)                   │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │  │
│  │  │Handlers  │ │Service   │ │Notify    │ │Dedup     │  │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │  │
│  └─────────────────────┬──────────────────────────────────┘  │
└────────────────────────┼──────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   MongoDB    │ │    Redis     │ │  Cloudinary  │
│  (Primary    │ │ (Cache/     │ │  (Media      │
│   DB)        │ │  Sessions)   │ │   Storage)   │
└──────────────┘ └──────────────┘ └──────────────┘
```

---

## 🏗️ System Design

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 19 + TypeScript | UI rendering |
| **Build Tool** | Vite 8 | Fast bundling & HMR |
| **Styling** | Tailwind CSS 3 | Utility-first styling |
| **State** | Zustand 5 | Lightweight state management |
| **Routing** | React Router 7 | Client-side routing |
| **Backend** | Node.js + Express 5 | REST API server |
| **Real-time** | Socket.IO 4 | WebSocket communication |
| **Database** | MongoDB + Mongoose 9 | Document database |
| **Cache** | Redis 5 / Upstash | Sessions, presence, dedup |
| **Media** | Cloudinary | Image/video storage |
| **Auth** | Google OAuth + JWT | Authentication |
| **Testing** | Vitest / Jest | Unit & integration tests |

### System Components Diagram

```
                    ┌───────────────────────────┐
                    │      Google OAuth 2.0     │
                    │   (Identity Provider)     │
                    └────────────┬──────────────┘
                                 │
                    ┌────────────▼──────────────┐
                    │    Frontend (React Web)    │
                    │  ┌──────────────────────┐ │
                    │  │  Auth Context         │ │
                    │  │  (google-oauth)       │ │
                    │  └──────────┬───────────┘ │
                    └─────────────┼──────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
          ▼                       ▼                       ▼
   ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
   │  REST API    │      │ Socket.IO    │      │  Media Upload│
   │  /api/v1     │      │  WebSocket   │      │  (Cloudinary)│
   └──────┬───────┘      └──────┬───────┘      └──────┬───────┘
          │                      │                      │
          └──────────┬───────────┴──────────┬──────────┘
                     │                      │
          ┌──────────▼──────────────┐ ┌─────▼──────────────┐
          │    Express Server       │ │  Socket Server     │
          │  ┌──────────────────┐  │ │  ┌──────────────┐  │
          │  │ Auth Module      │  │ │  │ Handlers     │  │
          │  │ User Module      │  │ │  │ Service      │  │
          │  │ Chat Module      │  │ │  │ Notifications│  │
          │  │ Message Module   │  │ │  └──────────────┘  │
          │  └──────────────────┘  │ └────────────────────┘
          └──────────┬─────────────┘
                     │
          ┌──────────┼──────────┐
          ▼          ▼          ▼
   ┌──────────┐ ┌──────────┐ ┌──────────┐
   │ MongoDB  │ │  Redis   │ │Cloudinary│
   │          │ │          │ │          │
   │ Users    │ │ Presence │ │  Images  │
   │ Chats    │ │ Dedup    │ │  Video   │
   │ Messages │ │ Sessions │ │  Files   │
   └──────────┘ └──────────┘ └──────────┘
```

---

## 🔄 Flow Charts

### 1. User Authentication Flow

```
┌─────────────┐
│ User visits │
│   Web App   │
└──────┬──────┘
       │
       ▼
┌─────────────┐     No Token     ┌─────────────┐
│ Check       │─────────────────>│ Show        │
│ Auth State  │                  │ Landing Page│
└──────┬──────┘                  └─────────────┘
       │ Yes Token
       ▼
┌─────────────┐
│ Verify JWT  │
│ with /auth/me│
└──────┬──────┘
       │
   ┌───┴───┐
   │       │
 Valid   Invalid
   │       │
   ▼       ▼
┌─────┐ ┌─────────────┐
│Set  │ │ Google      │
│User │ │ OAuth Login │
│Ctx  │ └──────┬──────┘
└─────┘        │
               ▼
        ┌─────────────┐
        │ Google Popup │
        │ Auth         │
        └──────┬──────┘
               │
               ▼
        ┌─────────────┐
        │ Send idToken │
        │ to /auth/login│
        └──────┬──────┘
               │
               ▼
        ┌─────────────┐
        │ Backend      │
        │ Verify Token │
        │ Find/Create  │
        │ User         │
        └──────┬──────┘
               │
               ▼
        ┌─────────────┐
        │ Return JWT   │
        │ Access +     │
        │ Refresh Token│
        └──────┬──────┘
               │
               ▼
        ┌─────────────┐
        │ Store Token  │
        │ in Secure    │
        │ Storage      │
        └──────┬──────┘
               │
               ▼
        ┌─────────────┐
        │ Connect     │
        │ Socket.IO   │
        │ with JWT    │
        └─────────────┘
```

### 2. Send Message Flow

```
┌─────────────┐
│ User types  │
│ message     │
└──────┬──────┘
       │
       ▼
┌─────────────┐     Optimistic    ┌─────────────┐
│ Send via    │─────────────────>│ Add message  │
│ Socket.IO   │                  │ to Zustand   │
│ (EMIT)      │                  │ store        │
└──────┬──────┘                  └─────────────┘
       │
       ▼
┌─────────────┐
│ Server      │
│ socket.handlers│
│ SEND_MESSAGE│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Check       │
│ clientTempId│
│ (Dedup)     │
└──────┬──────┘
       │
   ┌───┴───┐
   │       │
 Duplicate │ New
   │       │
   ▼       ▼
┌─────┐ ┌─────────────┐
│Skip │ │ Create      │
│     │ │ Message in  │
│     │ │ MongoDB     │
└─────┘ └──────┬──────┘
               │
               ▼
        ┌─────────────┐
        │ Update      │
        │ receipts    │
        │ (delivered) │
        └──────┬──────┘
               │
               ▼
        ┌─────────────┐
        │ Emit         │
        │ NEW_MESSAGE  │
        │ to chat room │
        └──────┬──────┘
               │
       ┌───────┴────────┐
       ▼                ▼
┌─────────────┐  ┌─────────────┐
│ Sender      │  │ Recipients │
│ (confirm)   │  │ (message)   │
└─────────────┘  └─────────────┘
       │                │
       ▼                ▼
┌─────────────┐  ┌─────────────┐
│ Update msg   │  │ Update     │
│ status in    │  │ local      │
│ store        │  │ messages   │
└─────────────┘  └─────────────┘
```

### 3. Friend Request Flow

```
┌─────────────┐
│ User A      │
│ searches    │
│ User B      │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ POST        │
│ /users/:id/ │
│ friend-request│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Backend     │
│ Validate    │
│ - Not self  │
│ - Not friend│
│ - Not blocked│
└──────┬──────┘
       │
   ┌───┴───┐
   │       │
 Valid   Invalid
   │       │
   ▼       ▼
┌─────┐ ┌─────────────┐
│Add  │ │ Return 400/  │
│to   │ │ 409 Error   │
│req  │ └─────────────┘
│array│
└─────┘
   │
   ▼
┌─────────────┐
│ Emit Socket │
│ FRIEND_     │
│ REQUEST_    │
│ RECEIVED    │
│ to User B   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ User B      │
│ receives    │
│ notification│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ User B      │
│ accepts/    │
│ rejects     │
└──────┬──────┘
       │
   ┌───┴──────────┐
   │              │
 Accept         Reject
   │              │
   ▼              ▼
┌──────────┐  ┌─────────────┐
│POST      │  │POST         │
│/:id/     │  │/:id/        │
│accept    │  │reject       │
└────┬─────┘  └────┬────────┘
     │              │
     ▼              ▼
┌──────────┐  ┌─────────────┐
│Add to    │  │Remove from  │
│friends   │  │req arrays   │
│arrays    │  │             │
└────┬─────┘  └─────────────┘
     │
     ▼
┌─────────────┐
│ Create chat │
│ between A&B │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Emit        │
│ FRIEND_     │
│ REQUEST_    │
│ ACCEPTED    │
└─────────────┘
```

### 4. Group Chat Creation Flow

```
┌─────────────┐
│ User        │
│ Creates     │
│ Group       │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ POST /chats │
│ {           │
│  isGroup:true│
│  participants│
│  groupName  │
│ }           │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Backend     │
│ Validate    │
│ - Min 2     │
│   participants│
│ - Max 100   │
│ - Creator   │
│   is admin  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Create Chat │
│ - isGroup=true│
│ - admins=[creator]│
│ - createdBy=creator│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Create      │
│ System      │
│ Message     │
│ "group_     │
│ created"    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Emit        │
│ CHAT_UPDATED│
│ to all      │
│ participants│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ All members │
│ see new     │
│ group chat  │
└─────────────┘
```

---

## 🗺️ Mind Map

```
                           LinkUp Chat App
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
    FRONTEND                  BACKEND                   DATABASE
        │                        │                        │
   ┌────┴────┐            ┌──────┴──────┐          ┌─────┴─────┐
   │         │            │             │          │           │
Components  State      API          Socket     MongoDB    Redis
   │         │            │             │          │           │
┌──┴──┐   ┌──┴──┐   ┌────┴────┐   ┌────┴────┐  Users    Presence
│Pages│   │Store│   │Modules  │   │Handlers │  Chats      Dedup
└────┘   └─────┘  └────┬────┘   └─────────┘  Messages   Sessions
                        │                                 
                   ┌────┴────┐                          
                   │         │                          
                 Auth      Chat                      
                   │         │                          
                ┌──┴──┐   ┌──┴──┐                     
                │User │   │Msg  │                     
                └─────┘   └─────┘                     
                                                   
Frontend Components:                                  
├── ChatShell                                     
├── Sidebar                                       
│   ├── ChatList                                  
│   └── UserProfile                              
├── ChatWindow                                    
│   ├── MessageBubble                             
│   ├── MessageInput                              
│   └── TypingIndicator                           
├── Modals                                        
│   ├── CreateGroupModal                          
│   ├── GroupInfoModal                            
│   └── UserProfileModal                         
└── Pages                                         
    ├── LandingPage                               
    ├── ExplorePage                               
    ├── ChatPage                                  
    └── ProfilePage                               
                                                   
Backend Modules:                                   
├── Auth                                          
│   ├── googleAuth                                
│   ├── jwtToken                                  
│   └── refreshToken                              
├── User                                          
│   ├── profile                                   
│   ├── friends                                   
│   └── block                                     
├── Chat                                          
│   ├── direct                                    
│   ├── group                                     
│   └── invite                                    
└── Message                                       
    ├── text                                      
    ├── media                                     
    ├── reactions                                 
    └── status                                    
```

---

## 💾 Database Design

### Entity Relationship Diagram (ERD)

```
┌──────────────────────────────────┐
│             USER                 │
├──────────────────────────────────┤
│ _id: ObjectId (PK)               │
│ username: String (UQ, idx)       │
│ email: String (UQ, idx)          │
│ name: String                     │
│ avatar: String?                  │
│ tagline: String (UQ)             │
│ bio: String?                     │
│ friends: [ObjectId] → User       │
│ sentFriendRequests: [ObjectId]   │
│ receivedFriendRequests: [ObjectId]│
│ blockedUsers: [ObjectId]         │
│ pushTokens: [PushToken]          │
│ lastSeen: Date                   │
│ accountStatus: Enum              │
│ disabledAt: Date?                │
│ deletedAt: Date?                 │
│ createdAt: Date                  │
└──────────────┬───────────────────┘
               │
    ┌──────────┼──────────┐
    │          │          │
    ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐
│ Chat   │ │Message │ │Group   │
│ Member │ │Sender  │ │Invite  │
└────────┘ └────────┘ └────────┘

┌──────────────────────────────────┐
│             CHAT                 │
├──────────────────────────────────┤
│ _id: ObjectId (PK)               │
│ participants: [ObjectId] → User  │
│ isGroup: Boolean                 │
│ groupName: String?               │
│ groupAvatar: String?             │
│ createdBy: ObjectId → User       │
│ admins: [ObjectId] → User        │
│ userStates: [UserState]          │
│   ├── userId → User              │
│   ├── clearedAt: Date?           │
│   ├── manualUnread: Boolean      │
│   └── hidden: Boolean            │
│ wallpaper: String?               │
│ theme: String                    │
│ createdAt: Date                  │
│ updatedAt: Date                  │
└──────────────┬───────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│           MESSAGE               │
├──────────────────────────────────┤
│ _id: ObjectId (PK)               │
│ chatId: ObjectId → Chat (idx)    │
│ senderId: ObjectId → User (idx)  │
│ replyTo: ObjectId → Message?     │
│ content: String                  │
│ type: Enum (text/image/...)      │
│ media: MediaObject?              │
│   ├── url, publicId              │
│   ├── resourceType               │
│   ├── mimeType, originalName     │
│   ├── format, bytes              │
│   ├── width, height              │
│   ├── duration, waveform         │
│ receipts: [Receipt]             │
│   ├── userId → User              │
│   ├── deliveredAt: Date?         │
│   └── seenAt: Date?              │
│ reactions: [Reaction]            │
│   ├── emoji: String              │
│   ├── userId → User              │
│   └── createdAt: Date            │
│ deletedForEveryone: Boolean      │
│ deletedFor: [ObjectId] → User    │
│ deletedAt: Date?                 │
│ deletedBy: ObjectId → User       │
│ isSystem: Boolean                │
│ edited: Boolean                  │
│ forwarded: Boolean               │
│ systemEvent: SystemEvent?        │
│   ├── eventType: Enum            │
│   └── metadata: Mixed            │
│ createdAt: Date (idx)            │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│         GROUP INVITE             │
├──────────────────────────────────┤
│ _id: ObjectId (PK)               │
│ chatId: ObjectId → Chat (idx)    │
│ createdBy: ObjectId → User       │
│ tokenHash: String (UQ, idx)      │
│ expiresAt: Date (TTL idx)        │
│ revokedAt: Date?                 │
│ maxUses: Number                  │
│ useCount: Number                 │
│ lastUsedAt: Date?                │
│ createdAt: Date                  │
│ updatedAt: Date                  │
└──────────────────────────────────┘
```

### Database Indexes

| Collection | Index | Type | Purpose |
|------------|-------|------|---------|
| **users** | `email` | Unique | Fast login lookup |
| **users** | `username` | Unique | Unique username enforcement |
| **users** | `tagline` | Unique | Unique tagline enforcement |
| **users** | `text(tagline, name, email, username)` | Text | Search users |
| **users** | `friends` | Normal | Friend list queries |
| **users** | `sentFriendRequests` | Normal | Outgoing requests |
| **users** | `receivedFriendRequests` | Normal | Incoming requests |
| **users** | `blockedUsers` | Normal | Block list queries |
| **users** | `accountStatus` | Normal | Filter active users |
| **users** | `lastSeen` | Normal | Presence queries |
| **chats** | `participants` | Normal | Find user chats |
| **chats** | `isGroup + createdAt` | Compound | Group chat listing |
| **chats** | `userStates.userId` | Normal | User state queries |
| **chats** | `userStates.userId + userStates.hidden` | Compound | Hidden chat filter |
| **chats** | `updatedAt` | Normal | Sort by recent |
| **messages** | `chatId + createdAt` | Compound | Paginated chat messages |
| **messages** | `chatId + senderId` | Compound | User messages in chat |
| **messages** | `chatId + deletedForEveryone + deletedFor` | Compound | Message visibility |
| **messages** | `reactions.userId` | Normal | User reactions |
| **messages** | `senderId + createdAt` | Compound | Sender message history |
| **messages** | `receipts.userId` | Normal | Message receipts |
| **messages** | `replyTo` | Normal | Reply chains |
| **groupInvites** | `chatId` | Normal | Chat invites |
| **groupInvites** | `tokenHash` | Unique | Invite lookup |
| **groupInvites** | `expiresAt` | TTL | Auto-expire invites |

---

## 📊 Data Flow Diagram (Level 1)

```
┌─────────┐     ┌──────────────┐     ┌──────────────┐
│ Browser  │────>│ React App   │────>│ API Client   │
│ (User)   │<────│ (Zustand)   │<────│ (Fetch+Retry)│
└─────────┘     └──────┬───────┘     └──────┬───────┘
                       │                     │
                       │ Socket.IO           │ REST API
                       │                     │
                ┌──────▼───────┐     ┌──────▼───────┐
                │ Socket Server│     │ Express API  │
                │ (handlers)   │     │ (routes)     │
                └──────┬───────┘     └──────┬───────┘
                       │                     │
                       │                     │ Service Layer
                       │                     │
                ┌──────▼───────┐     ┌──────▼───────┐
                │ Redis        │     │ MongoDB      │
                │ (presence,   │     │ (users,      │
                │  dedup,      │     │  chats,      │
                │  sessions)   │     │  messages)   │
                └──────────────┘     └──────────────┘
```

---

## 🔐 Security Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. CORS (Cross-Origin Resource Sharing)                │
│     └── Whitelist: CLIENT_URLS, MOBILE_ORIGINS          │
│                                                         │
│  2. Helmet.js (Security Headers)                        │
│     ├── Content-Security-Policy                         │
│     ├── X-Frame-Options: DENY                          │
│     ├── X-Content-Type-Options: nosniff                │
│     └── Strict-Transport-Security                      │
│                                                         │
│  3. Rate Limiting (express-rate-limit)                  │
│     ├── General: 100 requests / 15 min                  │
│     ├── Message: 30 messages / 5 min                   │
│     ├── Upload: 20 uploads / hour                       │
│     └── Group Mutation: 10 / 5 min                      │
│                                                         │
│  4. Authentication (JWT + Google OAuth)                 │
│     ├── Access Token: 7 days                           │
│     ├── Refresh Token: 30 days (Redis)                 │
│     └── Socket Auth: JWT verification                  │
│                                                         │
│  5. Input Validation (express-validator)                │
│     ├── Sanitization: trim, escape, normalizeEmail     │
│     └── Validation: isLength, isIn, matches            │
│                                                         │
│  6. Content Safety (bad-words filter)                   │
│     └── Filter profanity in messages                    │
│                                                         │
│  7. Idempotency (for mutations)                         │
│     └── Idempotency-Key header support                  │
│                                                         │
│  8. Account Status Checks                              │
│     ├── Block inactive/disabled accounts               │
│     └── Blocked user restrictions                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      PRODUCTION                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐     ┌──────────────┐                │
│  │   Nginx /    │     │   CloudFlare  │                │
│  │   LB         │     │   CDN         │                │
│  └──────┬───────┘     └──────┬───────┘                │
│         │                    │                         │
│         └─────────┬──────────┘                         │
│                   ▼                                    │
│         ┌──────────────────┐                          │
│         │  Server Instance  │                          │
│         │  (Node.js)        │                          │
│         │  ┌──────────────┐ │                          │
│         │  │  Cluster     │ │                          │
│         │  │  (PM2)       │ │                          │
│         │  └──────────────┘ │                          │
│         └────────┬─────────┘                          │
│                  │                                     │
│      ┌───────────┼───────────┐                         │
│      ▼           ▼           ▼                         │
│  ┌────────┐ ┌────────┐ ┌────────┐                    │
│  │MongoDB │ │ Redis  │ │Cloudinary│                   │
│  │(Atlas) │ │(Upstash)│ │(Media)  │                   │
│  └────────┘ └────────┘ └────────┘                    │
│                                                         │
│  Health Endpoints:                                      │
│  ├── GET /health (basic)                                │
│  ├── GET /readyz (readiness)                            │
│  └── GET /monitoring (dashboard)                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📈 Performance Optimizations

| Area | Optimization | Implementation |
|------|-------------|-----------------|
| **Database** | Indexes | 20+ indexes on frequently queried fields |
| **Database** | TTL Index | Auto-expire group invites |
| **Cache** | Redis | Presence tracking, dedup, session storage |
| **Real-time** | Redis Adapter | Multi-instance Socket.IO scaling |
| **API** | Pagination | Messages paginated with cursor |
| **API** | Retry Logic | Exponential backoff on client |
| **API** | Rate Limiting | Prevent abuse |
| **Frontend** | Code Splitting | Vite lazy loading |
| **Frontend** | Optimistic Updates | Immediate UI feedback |
| **Frontend** | Zustand Persist | Offline-capable state |
| **Media** | Cloudinary | CDN-delivered images/videos |
| **Cleanup** | Retention Policy | Auto-delete old messages (90d) |

---

## 🧪 Testing Strategy

```
┌─────────────────────────────────────────────────────────┐
│                     TESTING                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Frontend (Vitest + Testing Library)                    │
│  ├── Unit Tests: Hooks, Utils, Components              │
│  ├── Integration: API Client, Store                    │
│  └── Coverage: --coverage enabled                      │
│                                                         │
│  Backend (Jest + ts-jest)                               │
│  ├── Unit Tests: Services, Utils                       │
│  ├── Integration: API Routes, Middleware               │
│  └── Coverage: --coverage enabled                      │
│                                                         │
│  Test Files Location:                                   │
│  ├── server/__tests__/                                  │
│  └── web/src/**/*.test.tsx                              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📝 Key Files Summary

### Backend Core Files

| File | Purpose |
|------|---------|
| `server/src/server.js` | HTTP + Socket.IO server entry |
| `server/src/app.js` | Express app configuration |
| `server/src/config/env.js` | Environment validation |
| `server/src/config/database.js` | MongoDB connection |
| `server/src/config/redis.client.js` | Redis client setup |
| `server/src/modules/auth/auth.service.js` | Auth business logic |
| `server/src/modules/chat/chat.service.js` | Chat operations |
| `server/src/modules/message/message.service.js` | Message operations |
| `server/src/modules/socket/socket.server.js` | Socket.IO setup |
| `server/src/middlewares/authMiddleware.js` | JWT verification |

### Frontend Core Files

| File | Purpose |
|------|---------|
| `web/src/main.tsx` | App entry with providers |
| `web/src/App.tsx` | Routing configuration |
| `web/src/lib/api.ts` | API client with retry |
| `web/src/lib/auth-context.tsx` | Auth state management |
| `web/src/store/chat-store.ts` | Zustand store |
| `web/src/components/chat-shell.tsx` | Main layout |
| `web/src/hooks/useChatData.ts` | Chat data fetching |
| `web/src/hooks/useSocialData.ts` | Social features |

---

## 🎯 Design Patterns Used

1. **Module Pattern** - Backend organized by feature modules
2. **Service Layer** - Business logic separated from controllers
3. **Middleware Chain** - Express middlewares for cross-cutting concerns
4. **Repository Pattern** - Mongoose models act as repositories
5. **Observer Pattern** - Socket.IO events for real-time updates
6. **State Pattern** - Zustand for predictable state management
7. **Facade Pattern** - API client abstracts fetch complexity
8. **Strategy Pattern** - Different auth strategies (Google, JWT)
9. **Proxy Pattern** - Redis as cache proxy for presence
10. **Factory Pattern** - Message creation with different types

---

## ⚠️ Technical Debt & Recommendations

| Area | Issue | Recommendation |
|------|-------|----------------|
| **Validation** | Mix of express-validator and manual | Standardize on one approach |
| **Error Handling** | Inconsistent error formats | Use `apiResponse` consistently |
| **Testing** | Limited test coverage | Increase to 80%+ coverage |
| **Logging** | Morgan for HTTP only | Add structured logging (Winston) |
| **Types** | Backend uses JS, frontend TS | Consider migrating backend to TS |
| **Environment** | .env files in repo | Use vault/secret management |
| **API Versioning** | No version prefix | Add `/api/v1` prefix |
| **Documentation** | No API docs | Add OpenAPI/Swagger spec |
| **Monitoring** | Basic health checks | Add Prometheus metrics |
| **CI/CD** | No pipeline config | Add GitHub Actions workflow |

---

*End of Review Document*
