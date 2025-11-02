# Triberspace Game Server

Real-time multiplayer server for Triberspace powered by PartyKit.

## Architecture

- **PartyKit**: WebSocket-based multiplayer framework running on Cloudflare Workers
- **Room-based**: Each space gets its own party instance (identified by `spaceId`)
- **Better Auth Integration**: Verifies session tokens before connection
- **Hibernation Mode**: Automatically unloads idle servers to reduce costs

## Development

```bash
# Install dependencies
npm install

# Run development server (localhost:1999)
npm run dev

# Build TypeScript
npm run build
```

## Deployment

```bash
# Deploy to Cloudflare
npm run deploy
```

## Environment Variables

Create `.env.local` in this directory:

```
API_URL=http://localhost:3001
```

## Server Features

### Authentication
- Verifies Better Auth session tokens via `onBeforeConnect`
- Supports guest mode (no token)
- Stores user metadata in connection

### Player State
- Position, rotation, animation tracking
- Unique color per user
- Real-time synchronization across clients

### Messages
- `playerUpdate`: Position/rotation updates
- `chatMessage`: Chat messages
- `playerJoin`/`playerLeave`: Connection events

### HTTP Endpoint
`GET /{spaceId}` - Returns room info (player count, player list)

## Cost Optimization

- **Hibernation mode enabled**: Server unloads when idle
- **Outgoing messages**: FREE on Cloudflare
- **Incoming messages**: 1 request per 20 messages (20:1 ratio)
- **Estimated cost**: ~$50-100/month for typical usage

## Room ID Format

Rooms are identified by `spaceId` from your database:
- Example: `space-123` → `wss://partykit-host/party/space-123`
