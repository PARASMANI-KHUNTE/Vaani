# Codebase Restructuring Plan

## Current Issues
1. **No shared code** between web/mobile - duplicate socket clients, API clients, types
2. **Inconsistent module structure** on server - some modules have tests, validators, controllers; others don't
3. **Flat organization** - middlewares, utils, components all mixed at same level
4. **Cross-cutting concerns scattered** - auth, socket, media, notifications spread across utils/modules
5. **No clear domain boundaries** - hard to navigate and maintain

## Target Structure (Monorepo with Shared Packages)

```
chat-app/
├── packages/
│   ├── shared/                 # Shared types, utilities, constants
│   │   ├── src/
│   │   │   ├── types/          # TypeScript types for API, Socket, Domain
│   │   │   ├── constants/      # Event names, error codes, config keys
│   │   │   ├── validators/     # Shared validation schemas (Zod)
│   │   │   ├── utils/          # Shared utilities (date, string, crypto)
│   │   │   └── api/            # Shared API client base class
│   │   └── package.json
│   │
│   ├── server/                 # Express + Socket.IO backend
│   │   ├── src/
│   │   │   ├── config/         # Environment, database, redis, cloudinary
│   │   │   ├── core/           # Core framework code
│   │   │   │   ├── express/    # Express app setup, middleware pipeline
│   │   │   │   ├── socket/     # Socket.IO server setup
│   │   │   │   └── mongoose/   # Mongoose connection, plugins
│   │   │   ├── modules/        # Domain modules (feature-based)
│   │   │   │   ├── auth/       # Authentication module
│   │   │   │   │   ├── controllers/
│   │   │   │   │   ├── services/
│   │   │   │   │   ├── models/
│   │   │   │   │   ├── routes/
│   │   │   │   │   ├── validators/
│   │   │   │   │   ├── middleware/
│   │   │   │   │   └── index.ts
│   │   │   │   ├── chat/       # Chat/conversation module
│   │   │   │   ├── message/    # Message module
│   │   │   │   ├── user/       # User/profile/friends module
│   │   │   │   ├── notification/ # Push/in-app notifications
│   │   │   │   ├── media/      # Media upload/processing
│   │   │   │   └── system/     # Health, monitoring, retention
│   │   │   ├── shared/         # Server-only shared code
│   │   │   │   ├── middleware/ # Auth, rate-limit, idempotency, upload, validation
│   │   │   │   ├── utils/      # Logger, errors, async handler, content safety
│   │   │   │   └── jobs/       # Cron jobs (retention cleanup)
│   │   │   └── app.ts          # Application entry point
│   │   └── package.json
│   │
│   ├── web/                    # React + Vite frontend
│   │   ├── src/
│   │   │   ├── app/            # App-level setup (providers, routing)
│   │   │   ├── features/       # Feature-based modules
│   │   │   │   ├── auth/       # Login, session, OAuth
│   │   │   │   ├── chat/       # Chat list, window, messages
│   │   │   │   ├── contacts/   # Friends, requests, blocks, explore
│   │   │   │   ├── groups/     # Group management, invites
│   │   │   │   ├── media/      # Media preview, upload, gallery
│   │   │   │   ├── notifications/ # In-app notifications, toasts
│   │   │   │   ├── profile/    # User profile, settings
│   │   │   │   └── realtime/   # Socket connection, presence
│   │   │   ├── shared/         # Web-only shared code
│   │   │   │   ├── components/ # UI primitives (Button, Input, Modal, etc.)
│   │   │   │   ├── hooks/      # Generic hooks (useDebounce, useLocalStorage)
│   │   │   │   ├── utils/      # Formatters, validators, helpers
│   │   │   │   ├── store/      # Zustand stores
│   │   │   │   └── lib/        # API client, socket client, auth context
│   │   │   └── main.tsx
│   │   └── package.json
│   │
│   └── mobile/                 # Expo React Native frontend
│       ├── src/
│       │   ├── app/            # Expo Router screens
│       │   │   ├── (auth)/     # Auth flow screens
│       │   │   ├── (app)/      # Main app tabs
│       │   │   └── _layout.tsx
│       │   ├── features/       # Feature-based modules (mirror web)
│       │   │   ├── auth/
│       │   │   ├── chat/
│       │   │   ├── contacts/
│       │   │   ├── groups/
│       │   │   ├── media/
│       │   │   ├── notifications/
│       │   │   ├── profile/
│       │   │   └── realtime/
│       │   ├── shared/         # Mobile-only shared code
│       │   │   ├── components/ # RN primitives
│       │   │   ├── hooks/      # Generic hooks
│       │   │   ├── utils/      # Platform-specific helpers
│       │   │   ├── store/      # Zustand stores
│       │   │   └── lib/        # API client, socket client, secure storage
│       │   └── index.ts
│       └── package.json
│
├── turbo.json                  # Turborepo config
├── package.json                # Root package.json with workspaces
├── tsconfig.base.json          # Base TypeScript config
└── README.md
```

## Migration Steps

### Phase 1: Foundation
1. Create monorepo structure with pnpm workspaces + Turborepo
2. Create `packages/shared` with types, constants, validators
3. Set up base TypeScript config

### Phase 2: Server Restructure
1. Reorganize server into domain modules with consistent structure
2. Move middlewares to `shared/middleware`
3. Move utils to `shared/utils` and `shared/jobs`
4. Extract core framework code to `core/`

### Phase 3: Web Restructure
1. Create feature-based structure under `src/features/`
2. Move components to `shared/components` (UI primitives) vs feature components
3. Consolidate hooks, store, lib under `shared/`
4. Update imports

### Phase 4: Mobile Restructure
1. Mirror web's feature structure
2. Keep Expo Router in `app/` but use features for business logic
3. Consolidate shared code under `shared/`

### Phase 5: Integration
1. Update all imports to use `@chat-app/shared`, `@chat-app/server`, etc.
2. Configure Turborepo for build/test/lint pipelines
3. Verify all apps work

## Benefits
- **Single source of truth** for types, API contracts, socket events
- **Clear domain boundaries** - easy to find and modify features
- **Shared validation** - Zod schemas used on both client and server
- **Scalable** - new features follow established patterns
- **Testable** - each module can be tested in isolation
- **Maintainable** - consistent structure across all packages
