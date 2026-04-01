# Canvas Chat

A real-time messaging platform with a modern web client, Express backend, and mobile workspace.

## Quick Start

```powershell
cd server
npm install
npm run dev

cd ../web
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Core Features

- Real-time 1-to-1 and group messaging
- Typing indicators, presence, read and delivered states
- Image, video, file, and voice note sharing
- Reactions, replies, and delete scopes
- Friend requests, blocking, and user discovery
- Group chat administration and invite flows
- Account profile, disable, and delete controls

## Project Structure

```
Chat App/
  server/   Express + Socket.IO backend
  web/      React + Vite client
  mobile/   React Native / Expo workspace
  docs/     Product and engineering notes
```

## Scripts

### Server

- `npm run dev` - start the backend in development
- `npm run check` - syntax check the server entry
- `npm test` - run backend tests

### Web

- `npm run dev` - start the Vite dev server
- `npm run build` - build the production bundle
- `npm run preview` - preview the production build locally

## Environment

Copy `server/.env.example` and `web/.env.example`, then fill in your MongoDB, JWT, Cloudinary, and Google auth values.

## Documentation

Additional project notes live in the `docs/` directory.
