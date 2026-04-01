# Canvas Chat Mobile

The Canvas Chat mobile application built with React Native and Expo.

---

## Overview

This is the mobile client for Canvas Chat — a real-time communication platform. The app provides native mobile access to all Canvas Chat features including messaging, media sharing, and audio/video calling.

**Status:** In active development

---

## Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Expo | 55.0.9 | React Native platform |
| React Native | 0.83.4 | Mobile UI framework |
| Expo Router | 55.0.8 | File-based routing |
| React Navigation | 7.x | Navigation primitives |
| Zustand | 5.0.12 | State management |
| Socket.IO Client | 4.8.3 | Real-time communication |
| expo-notifications | 55.0.14 | Push notifications |
| expo-secure-store | 55.0.9 | Encrypted credential storage |
| expo-auth-session | 55.0.10 | OAuth authentication |
| expo-updates | 55.0.16 | OTA updates |
| react-native-reanimated | 4.2.1 | Animations |
| react-native-gesture-handler | 2.30.0 | Touch gestures |

---

## Get Started

### Prerequisites

- Node.js 18+ and npm 10+
- Expo CLI (`npm install -g expo-cli`)
- For Android: Android Studio with emulator or physical device
- For iOS: Xcode with simulator (macOS only) or physical device
- Backend server running (see root README)

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment:
   ```bash
   copy .env.example .env
   ```
   
   Edit `.env` with your values:
   ```env
   EXPO_PUBLIC_API_URL=http://localhost:5000
   EXPO_PUBLIC_WEB_URL=http://localhost:3000
   EXPO_PUBLIC_APP_SCHEME=canvaschat
   EXPO_PUBLIC_EAS_PROJECT_ID=your-eas-project-id
   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-google-client-id
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open the app:
   - Press `a` for Android emulator
   - Press `i` for iOS simulator
   - Scan QR code with Expo Go app on your device

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start Expo development server |
| `npm run android` | Run on Android device/emulator |
| `npm run ios` | Run on iOS simulator |
| `npm run web` | Run in web browser |
| `npm run lint` | Run Expo lint |
| `npm run typecheck` | TypeScript type checking |
| `npm run ota:preview` | Deploy OTA update to preview branch |
| `npm run ota:production` | Deploy OTA update to production branch |

---

## Architecture

### Directory Structure

```
src/
├── app/              # Expo Router file-based routing
│   ├── _layout.tsx   # Root layout with providers
│   ├── index.tsx     # Entry redirect
│   ├── auth.tsx      # Authentication screen
│   ├── (app)/        # Authenticated app screens
│   └── chat/         # Chat screens
├── components/       # Shared UI components
├── hooks/            # Mobile-specific hooks
│   ├── use-mobile-chats.ts
│   ├── use-mobile-realtime.ts
│   ├── use-mobile-social.ts
│   └── use-push-notifications.ts
├── store/            # Zustand stores
│   ├── chat-store.ts
│   ├── notification-store.ts
│   └── session-store.ts
├── constants/        # App constants
└── lib/              # Shared utilities
```

### Key Features (In Development)

- [ ] Google OAuth authentication (via expo-auth-session)
- [ ] Real-time messaging via Socket.IO
- [ ] Chat list and conversation view
- [ ] Media upload and display
- [ ] Push notifications (via expo-notifications)
- [ ] Deep link handling (canvaschat:// scheme)
- [ ] Secure credential storage (via expo-secure-store)
- [ ] OTA updates (via expo-updates)

---

## Building for Production

### Development Build

```bash
npx expo run:android   # Android
npx expo run:ios       # iOS
```

### EAS Build

```bash
# Install EAS CLI
npm install -g eas-cli

# Build for Android
eas build --platform android

# Build for iOS
eas build --platform ios
```

### OTA Updates

```bash
# Preview branch
npm run ota:preview "Update description"

# Production branch
npm run ota:production "Update description"
```

---

## Deep Linking

The app uses the `canvaschat://` scheme for deep links:

- `canvaschat://groups/join/:token` — Join a group via invite link
- `canvaschat://chat/:chatId` — Open a specific chat

---

## Learn More

- [Canvas Chat Root README](../README.md) — Project overview and backend setup
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [EAS Documentation](https://docs.expo.dev/eas/)
