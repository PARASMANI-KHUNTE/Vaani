# Canvas Chat Web Client

The production web client for Canvas Chat — a real-time communication platform.

---

## Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.4 | UI framework |
| Vite | 8.0.1 | Build tool and dev server |
| TypeScript | 5.9.3 | Type safety |
| Tailwind CSS | 3.4.17 | Utility-first styling |
| React Router | 7.13.2 | Client-side routing |
| Zustand | 5.0.12 | State management |
| Socket.IO Client | 4.8.3 | Real-time communication |
| Framer Motion | 12.38.0 | Animations |
| Lucide React | 1.7.0 | Icon library |
| Google OAuth | 0.13.4 | Authentication |

---

## Scripts

```powershell
npm run dev       # Start development server
npm run build     # Type-check and build for production
npm run preview   # Preview production build locally
npm run lint      # Run ESLint
```

---

## Environment

Copy `.env.example` to `.env` and configure:

```env
VITE_API_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your-google-client-id-here
```

### Required Variables

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API server URL |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Client ID (from Google Cloud Console) |

---

## Architecture

### Entry Points

- `src/main.tsx` — App bootstrap with providers (GoogleOAuthProvider, ThemeProvider, AuthProvider, BrowserRouter)
- `src/App.tsx` — Route definitions with auth gating

### Key Directories

```
src/
├── components/   # UI components (ChatWindow, Sidebar, Call, etc.)
├── hooks/        # Feature hooks (use-chat-data, use-call, use-social-data)
├── lib/          # Core utilities (api, auth, socket, webrtc, types)
├── pages/        # Route-level page components
├── store/        # Zustand state stores
└── types/        # TypeScript type definitions
```

### State Management

- **Zustand** for chat state (messages, conversations, typing, presence)
- **React Context** for auth and theme state
- **Socket.IO** for real-time updates

---

## Features

- Real-time 1-to-1 and group messaging
- Typing indicators and presence detection
- Media, file, and voice note sharing
- Message reactions, replies, and deletion
- Audio/video calling via WebRTC
- Social features (friends, blocks, search, explore)
- Group management (create, admin, invite links)
- User profiles and account management
- Dark/light theme support
- Responsive design (desktop + mobile)

---

## Development

1. Ensure the backend server is running (`cd ../server && npm run dev`)
2. Install dependencies: `npm install`
3. Configure environment variables (see above)
4. Start development server: `npm run dev`
5. Open `http://localhost:5173` in your browser
