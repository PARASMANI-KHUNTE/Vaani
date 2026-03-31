# Canvas Chat Web (Vite)

This folder contains the production web client for Canvas Chat.

## Stack

- React 19
- Vite 8
- TypeScript
- Tailwind CSS
- React Router
- Framer Motion
- Google OAuth (`@react-oauth/google`)
- Zustand

## Scripts

```powershell
npm run dev
npm run build
npm run preview
npm run lint
```

## Environment

Use `.env.example` as the template.

Required values:

- `VITE_API_URL`
- `VITE_GOOGLE_CLIENT_ID`

## Main Entry Points

- `src/main.tsx`
- `src/App.tsx`
- `src/components/chat-shell.tsx`
