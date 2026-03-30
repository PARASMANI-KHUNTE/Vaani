# Tech Information

## Frontend Stack

- Next.js `15.5.14`
- React `18.3.1`
- NextAuth `4.24.13`
- Tailwind CSS `3.4.17`
- Zustand `5.0.12`
- Socket.IO client `4.8.3`
- TypeScript `6.x`

## Backend Stack

- Node.js
- Express `5.2.1`
- Socket.IO `4.8.3`
- MongoDB via Mongoose `9.3.3`
- Redis client `5.11.0`
- JSON Web Token `9.0.3`
- Google Auth Library `10.6.2`
- Cloudinary `2.9.0`
- Multer `2.1.1`
- Express Validator `7.3.1`
- Express Rate Limit `8.3.1`

## Supporting Services

- Google OAuth for identity
- Cloudinary for media storage and delivery
- MongoDB for persistence
- Redis present for scalability-readiness

## Runtime Environment Variables

### Backend

- `PORT`
- `NODE_ENV`
- `CLIENT_URL`
- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `GOOGLE_CLIENT_ID`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_FOLDER`
- `MESSAGE_RETENTION_DAYS`
- `CHAT_RETENTION_DAYS`
- `RETENTION_CLEANUP_INTERVAL_HOURS`

### Frontend

- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `NEXT_PUBLIC_API_URL`
- `SERVER_API_URL`

## Key Browser APIs Used

- `MediaRecorder`
- `navigator.mediaDevices.getUserMedia`
- `RTCPeerConnection`
- `navigator.share`
- `Clipboard API`

## Current Verification Commands

### Server

```powershell
cd server
npm run dev
npm run check
```

### Client

```powershell
cd client
npm run dev
npm run build
npm run typecheck
```

## Current Deployment/Release Readiness

- Web build compiles successfully
- Environment examples are present
- Cloudinary integration is production-oriented
- EAS/Expo mobile release pipeline is not started yet
