# PartyKit Multiplayer Server Deployment Guide

This guide covers deploying the Triberspace multiplayer game server to PartyKit.

## Prerequisites

- PartyKit account ([partykit.io](https://partykit.io))
- PartyKit CLI installed globally
- Production backend API deployed

## Installation

Install PartyKit CLI globally:

```bash
npm install -g partykit
```

## Configuration

### 1. Update partykit.json

The `partykit.json` file has been pre-configured with production values. Before deploying, update the environment variables:

```json
{
  "name": "triberspace",
  "main": "src/server.ts",
  "compatibilityDate": "2024-01-01",
  "vars": {
    "API_URL": "https://api.triber.space",
    "BETTER_AUTH_SECRET": "<your-production-better-auth-secret>"
  }
}
```

**Important:** Replace `<your-production-better-auth-secret>` with the same secret used in your Railway backend deployment.

### 2. Environment Variables

PartyKit environment variables are set in `partykit.json` under the `vars` section:

| Variable | Description | Example |
|----------|-------------|---------|
| `API_URL` | Production backend API URL | `https://api.triber.space` |
| `BETTER_AUTH_SECRET` | Better Auth secret (must match backend) | Same as Railway |

## Deployment

### First Time Deployment

1. Login to PartyKit:
   ```bash
   partykit login
   ```

2. Build the TypeScript (optional, PartyKit does this):
   ```bash
   npm run build
   ```

3. Deploy to PartyKit:
   ```bash
   cd backend/game-server
   partykit deploy
   ```

4. PartyKit will output your deployment URL:
   ```
   ✓ Deployed to https://triberspace.partykit.dev
   ```

5. Save this URL - you'll need it for frontend configuration.

### Updating Deployment

To redeploy after making changes:

```bash
partykit deploy
```

PartyKit automatically builds and deploys your changes.

## Frontend Configuration

After deploying, update your frontend environment variables:

### Cloudflare Pages (Frontend App)

In Cloudflare Pages → Settings → Environment Variables:

```bash
NEXT_PUBLIC_PARTYKIT_HOST=triberspace.partykit.dev
```

**Note:** Do NOT include `https://` or `wss://` - just the hostname.

## Testing

### Test WebSocket Connection

Using wscat:

```bash
npm install -g wscat
wscat -c wss://triberspace.partykit.dev/parties/main/test-room
```

You should see:
```
Connected (press CTRL+C to quit)
```

### Test from Browser Console

On your deployed frontend (triber.space), open browser console:

```javascript
const ws = new WebSocket('wss://triberspace.partykit.dev/parties/main/test-room');
ws.onopen = () => console.log('Connected to PartyKit!');
ws.onmessage = (msg) => console.log('Received:', msg.data);
```

## Monitoring

### View Logs

PartyKit doesn't provide a dashboard for logs yet. To debug:

1. Add console.log statements in your server code
2. Deploy
3. Monitor browser console for client-side WebSocket messages
4. Check Railway backend logs for API interactions

### Common Issues

**WebSocket connection fails:**
- Verify deployment succeeded: `partykit list`
- Check NEXT_PUBLIC_PARTYKIT_HOST has no `https://` prefix
- Ensure CORS is configured in backend API
- Test WebSocket directly with wscat

**Authentication errors:**
- Verify BETTER_AUTH_SECRET matches Railway backend
- Check API_URL is correct and accessible
- Look for CORS errors in browser console

**Players not syncing:**
- Check browser console for WebSocket errors
- Verify both clients are connecting to same room
- Check PartyKit server.ts for message handling logic

## Architecture

```
┌─────────────────┐
│  triber.space   │
│  (Frontend)     │
└────────┬────────┘
         │
         │ WebSocket (wss://)
         ▼
┌─────────────────────────────────┐
│  triberspace.partykit.dev       │
│  (Multiplayer Server)           │
│  - Player positions             │
│  - Real-time state sync         │
│  - Room management              │
└────────┬────────────────────────┘
         │
         │ HTTPS
         ▼
┌─────────────────────────────────┐
│  api.triber.space               │
│  (Backend API)                  │
│  - Authentication               │
│  - User data                    │
└─────────────────────────────────┘
```

## Cost

PartyKit Pricing:
- **Free Tier:** 1M requests/month, 100GB bandwidth
- **Pro:** $10/month for 10M requests/month
- **Enterprise:** Custom pricing

For alpha testing, the free tier should be sufficient.

## Advanced Configuration

### Custom Domain (Pro plan only)

If you upgrade to PartyKit Pro, you can use a custom domain:

1. Add domain in PartyKit dashboard
2. Update DNS CNAME record
3. Update NEXT_PUBLIC_PARTYKIT_HOST in frontend

### Rate Limiting

PartyKit automatically rate limits connections. For custom rate limiting, implement in your server code.

### Scaling

PartyKit automatically scales. Each "room" runs in its own Durable Object instance.

## Security

- ✅ All connections use WSS (WebSocket Secure)
- ✅ Authentication verified via Better Auth
- ✅ HTTPS for API calls
- ⚠️ Validate all client messages in server code
- ⚠️ Don't trust client position data without validation

## Support

- [PartyKit Documentation](https://docs.partykit.io)
- [PartyKit Discord](https://discord.gg/partykit)
- [PartyKit GitHub](https://github.com/partykit/partykit)

## Deployment Checklist

- [ ] PartyKit CLI installed
- [ ] Logged in to PartyKit
- [ ] Updated BETTER_AUTH_SECRET in partykit.json
- [ ] Verified API_URL is correct
- [ ] Deployed with `partykit deploy`
- [ ] Saved deployment URL
- [ ] Updated NEXT_PUBLIC_PARTYKIT_HOST in frontend
- [ ] Tested WebSocket connection
- [ ] Verified player sync works in production
