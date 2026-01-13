# Hero vs Boss - Multiplayer Game

## Project Structure

```
herovsboss/
├── client/          # Next.js frontend
│   └── src/
│       ├── components/
│       │   ├── Game.tsx            # Original single-player
│       │   └── GameMultiplayer.tsx # New multiplayer version
│       └── network/                # Network layer
│           ├── NetworkManager.ts
│           ├── types.ts
│           └── config.ts
├── server/          # Node.js backend
│   └── src/
│       ├── index.ts               # Express + Socket.IO entry
│       ├── game/
│       │   └── GameManager.ts     # Authoritative game loop
│       ├── entities/              # Server-side entities
│       ├── world/
│       │   └── ServerWorld.ts
│       └── shared/                # Shared types/config
└── package.json     # Workspace configuration
```

## Setup Instructions

### 1. Install Dependencies

```bash
# In root directory
npm install

# Install Socket.IO client (in client folder)
cd client
npm install socket.io-client

# Install server dependencies (in server folder)
cd ../server
npm install
```

### 2. Run Development Servers

```bash
# From root directory - runs both client and server
npm run dev

# Or run separately:
npm run dev:client  # Client on http://localhost:3000
npm run dev:server  # Server on http://localhost:3001
```

### 3. Use Multiplayer Mode

Replace the import in your page to use the multiplayer version:

```tsx
// Before:
import Game from '@/components/Game';

// After:
import Game from '@/components/GameMultiplayer';
```

## Architecture

### Server (Authoritative)
- Runs at 60 TPS (ticks per second)
- Handles all game logic, physics, and collision detection
- Manages player connections via Socket.IO
- Broadcasts game state to all clients

### Client (Rendering Only)
- Receives game state from server
- Renders entities at their server-determined positions
- Sends player inputs (movement, aim, shooting)
- Handles local rendering and effects

## Key Features

✅ Authoritative server prevents cheating
✅ Real-time multiplayer with Socket.IO
✅ Smooth 60 TPS server tick rate
✅ Client-side prediction ready (optional)
✅ Automatic player connection/disconnection handling
✅ Shared type system for type safety

## Next Steps

- [ ] Add client-side prediction for smoother movement
- [ ] Implement lag compensation
- [ ] Add player names and scoreboard
- [ ] Add chat system
- [ ] Deploy to production

## Telegram Mini App Deployment (ngrok)

When deploying as a Telegram Mini App through ngrok, you need **two tunnels**:

### 1. Start ngrok tunnels

Open two terminal windows:

```bash
# Terminal 1: Client tunnel (Next.js)
ngrok http 3000

# Terminal 2: Server tunnel (WebSocket)
ngrok http 3001
```

### 2. Configure WebSocket URL

Create `client/.env.local` with the **server** tunnel URL:

```env
NEXT_PUBLIC_WS_URL=https://YOUR-SERVER-TUNNEL.ngrok-free.app
```

### 3. Restart the client

```bash
npm run dev:client
```

### 4. Use in Telegram

Use the **client** tunnel URL (`https://YOUR-CLIENT-TUNNEL.ngrok-free.app`) as your Telegram Mini App URL.

### Why Two Tunnels?

- The **client tunnel** serves the web app (port 3000)
- The **server tunnel** handles WebSocket connections (port 3001)
- Remote clients can't access `localhost:3001` - they need a public URL
