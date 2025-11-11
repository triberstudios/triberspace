# ⚡ Quick Start Deployment Guide

**Estimated Time:** 2-3 hours
**Cost:** ~$5/month (Railway) + Free (Neon, Cloudflare, PartyKit)

This is a condensed version of the full deployment guide. For detailed instructions, see `DEPLOYMENT.md`.

## 📚 Documentation

- **DEPLOYMENT.md** - Full deployment guide with troubleshooting
- **DEPLOYMENT_CHECKLIST.md** - Interactive checklist to track progress
- **backend/game-server/DEPLOYMENT.md** - PartyKit specific guide
- **.env.production.example** - Environment variables template

## 🎯 What You're Deploying

```
Frontend App  → Cloudflare Pages → triber.space
Backend API   → Railway          → api.triber.space
Database      → Neon PostgreSQL  → (cloud database)
Engine        → Cloudflare Pages → engine.triber.space
Multiplayer   → PartyKit         → *.partykit.dev
```

## 🚀 Deployment Order

### 1. Database (15 minutes)

```bash
# Create Neon account → Create project → Get connection string
export DATABASE_URL="postgresql://..."
cd packages/database
npm run db:migrate
```

### 2. Backend API (30 minutes)

1. Create Railway project from GitHub (`deployBranch`)
2. Set environment variables (see `.env.production.example`)
3. Deploy
4. Configure custom domain: `api.triber.space`

**Key env vars:**
```bash
DATABASE_URL=<from-neon>
BETTER_AUTH_SECRET=<generate-with-openssl-rand-base64-32>
BETTER_AUTH_URL=https://api.triber.space
FRONTEND_URL=https://triber.space
# ... + R2 credentials
```

### 3. Multiplayer Server (15 minutes)

```bash
npm install -g partykit
partykit login
cd backend/game-server

# Update partykit.json with production secrets
partykit deploy
```

Save the deployment URL (e.g., `triberspace.partykit.dev`)

### 4. Frontend App (45 minutes)

1. Create Cloudflare Pages project
2. Connect to GitHub (`deployBranch`)
3. Build command: `cd ../.. && npm install && turbo build --filter=@triberspace/web`
4. Set env vars:
   ```bash
   NEXT_PUBLIC_API_URL=https://api.triber.space
   NEXT_PUBLIC_PARTYKIT_HOST=triberspace.partykit.dev
   NODE_ENV=production
   ```
5. Deploy
6. Configure custom domain: `triber.space`

### 5. Engine Update (10 minutes)

1. Go to existing Cloudflare Pages engine project
2. Change production branch to `deployBranch`
3. Trigger redeploy

### 6. Post-Deployment (15 minutes)

- Update Sketchfab OAuth redirect URI
- Update Google OAuth URIs (if using)
- Test all services
- Invite alpha testers

## ✅ Quick Test

```bash
# Backend health
curl https://api.triber.space/

# Frontend
open https://triber.space

# Engine
open https://engine.triber.space

# Multiplayer
wscat -c wss://triberspace.partykit.dev/parties/main/test
```

## 🆘 Common Issues

**Database connection fails:**
- Use pooled connection from Neon (not direct)

**CORS errors:**
- Already fixed in code (backend/api/src/server.ts updated)

**Auth not working:**
- Verify BETTER_AUTH_SECRET is same across Railway and PartyKit
- Check cookies are being set (DevTools → Application → Cookies)

**Multiplayer not connecting:**
- NEXT_PUBLIC_PARTYKIT_HOST should be hostname only (no https://)

## 📋 Files Created for You

- `backend/api/railway.json` - Railway configuration
- `backend/api/Dockerfile` - Docker config (optional)
- `backend/game-server/partykit.json` - Updated with production vars
- `.env.production.example` - Environment variables template
- `backend/api/src/server.ts` - Updated CORS for production

## 🎉 When You're Done

Your services will be live at:
- **App:** https://triber.space
- **Engine:** https://engine.triber.space
- **API:** https://api.triber.space
- **Docs:** https://api.triber.space/docs

Share `https://triber.space` with your alpha testers!

## 📞 Need Help?

1. Check `DEPLOYMENT.md` Troubleshooting section
2. Review service logs (Railway, Cloudflare, PartyKit)
3. Verify all environment variables are set correctly
4. Test each service independently

---

**Ready to deploy? Start with the checklist: `DEPLOYMENT_CHECKLIST.md`**
