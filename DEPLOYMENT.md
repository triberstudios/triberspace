# 🚀 Triberspace Alpha Deployment Guide

This guide will walk you through deploying Triberspace from the `deployBranch` to production.

## 📊 Deployment Architecture

```
┌─────────────────────┐
│   triber.space      │  Cloudflare Pages (Next.js App)
└──────────┬──────────┘
           │
           ├─────────► api.triber.space (Railway - Fastify API)
           │                    │
           │                    └────► Neon PostgreSQL
           │
           ├─────────► engine.triber.space (Cloudflare Pages - Vite)
           │
           └─────────► triberspace.partykit.dev (PartyKit - Multiplayer)
```

## 🎯 Services Overview

| Service | Platform | Domain | Cost |
|---------|----------|--------|------|
| Frontend App | Cloudflare Pages | triber.space | Free |
| Backend API | Railway | api.triber.space | ~$5/month |
| Database | Neon | N/A | Free (0.5GB) |
| Engine | Cloudflare Pages | engine.triber.space | Free |
| Multiplayer | PartyKit | *.partykit.dev | Free tier |

**Total Estimated Cost:** ~$5/month

---

## 📋 Pre-Deployment Checklist

- [ ] GitHub repo with `deployBranch` ready
- [ ] Cloudflare account
- [ ] Railway account
- [ ] Neon account
- [ ] PartyKit account
- [ ] Domain DNS access (triber.space)
- [ ] Cloudflare R2 bucket set up
- [ ] Google OAuth credentials (if using Google auth)
- [ ] Sketchfab OAuth app configured

---

## 🗄️ Phase 1: Database Setup (Neon)

### 1.1 Create Neon Database

1. Go to [neon.tech](https://neon.tech) and sign up
2. Click "Create Project"
3. Configure:
   - **Project name:** `triberspace-production`
   - **Database name:** `triberspace`
   - **Region:** Choose closest to your users (e.g., US East, EU West)
   - **Postgres version:** 16 (latest)
4. Click "Create Project"

### 1.2 Get Connection String

1. In your Neon project dashboard, click "Connection Details"
2. **Important:** Select "Pooled connection" (recommended for serverless/Railway)
3. Copy the connection string - it looks like:
   ```
   postgresql://user:password@ep-cool-name-123456.us-east-2.aws.neon.tech/triberspace?sslmode=require
   ```
4. Save this as your production `DATABASE_URL`

### 1.3 Run Database Migrations

From your local machine:

```bash
# Update DATABASE_URL temporarily for migration
export DATABASE_URL="postgresql://user:password@ep-cool-name-123456.us-east-2.aws.neon.tech/triberspace?sslmode=require"

# Run migrations
cd packages/database
npm run db:migrate

# Verify migrations
npm run db:studio
```

You should see all 8 migrations applied:
- 0000_breezy_prodigy.sql
- 0001_marvelous_dormammu.sql
- 0002_yielding_lilith.sql
- 0003_white_misty_knight.sql
- 0004_clammy_doctor_faustus.sql
- 0005_heavy_silver_sable.sql
- 0006_equal_microbe.sql
- 0007_milky_calypso.sql

### 1.4 Create Database Branch (Optional but Recommended)

Neon allows you to create database branches for testing:

```bash
# Install Neon CLI
npm install -g neonctl

# Create a staging branch
neonctl branches create --name staging --project-id <your-project-id>
```

---

## 🚂 Phase 2: Backend API Setup (Railway)

### 2.1 Create Railway Project

1. Go to [railway.app](https://railway.app) and sign up
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Authorize Railway to access your GitHub
5. Select your `triberspace` repository
6. Select `deployBranch` as the branch to deploy

### 2.2 Configure Railway Service

1. Railway will detect your monorepo. Click "Configure"
2. Set the following:
   - **Root Directory:** `backend/api`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Watch Paths:** `backend/api/**`, `packages/**`

3. Or use the `railway.json` file we created (Railway will auto-detect it)

### 2.3 Set Environment Variables

In Railway dashboard, go to your service → Variables tab:

```bash
# Database
DATABASE_URL=postgresql://user:password@ep-cool-name.neon.tech/triberspace?sslmode=require

# Authentication
BETTER_AUTH_SECRET=<generate-new-32-char-secret>
BETTER_AUTH_URL=https://api.triber.space
FRONTEND_URL=https://triber.space

# Google OAuth (optional)
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>

# Cloudflare R2
S3_ENDPOINT=https://67ae98914ca76492247d67677e96c4e0.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=triberspace
S3_ACCESS_KEY_ID=<your-r2-access-key>
S3_SECRET_ACCESS_KEY=<your-r2-secret-key>
CDN_BASE_URL=https://cdn.triber.space

# Node Environment
NODE_ENV=production
PORT=3001
```

**Generate BETTER_AUTH_SECRET:**
```bash
openssl rand -base64 32
```

### 2.4 Deploy

1. Click "Deploy" in Railway
2. Wait for build to complete (2-3 minutes)
3. Check logs for any errors
4. Copy your Railway deployment URL (e.g., `https://triberspace-production.up.railway.app`)

### 2.5 Configure Custom Domain

1. In Railway, go to Settings → Domains
2. Click "Add Domain"
3. Enter: `api.triber.space`
4. Railway will provide CNAME records
5. Add CNAME record in your DNS provider:
   ```
   Type: CNAME
   Name: api
   Value: <railway-provided-value>
   TTL: Auto
   ```
6. Wait for DNS propagation (5-30 minutes)

### 2.6 Test API

```bash
# Health check
curl https://api.triber.space/

# Should return: {"status":"ok","timestamp":"..."}

# Swagger docs
open https://api.triber.space/docs
```

---

## 🎮 Phase 3: Multiplayer Server (PartyKit)

### 3.1 Install PartyKit CLI

```bash
npm install -g partykit
```

### 3.2 Login to PartyKit

```bash
partykit login
```

### 3.3 Deploy from Game Server Directory

```bash
cd backend/game-server

# Deploy to PartyKit
partykit deploy
```

PartyKit will output your deployment URL, something like:
```
✓ Deployed to https://triberspace.partykit.dev
```

### 3.4 Set PartyKit Environment Variables

PartyKit doesn't use a dashboard for env vars. Instead, add them to `partykit.json`:

```json
{
  "name": "triberspace",
  "main": "src/server.ts",
  "compatibilityDate": "2024-01-01",
  "vars": {
    "API_URL": "https://api.triber.space",
    "BETTER_AUTH_SECRET": "<same-as-backend>"
  }
}
```

Then redeploy:
```bash
partykit deploy
```

### 3.5 Test Multiplayer Connection

```bash
# Test WebSocket connection
wscat -c wss://triberspace.partykit.dev/parties/main/test-room

# You should see connection established
```

---

## 🌐 Phase 4: Frontend App (Cloudflare Pages)

### 4.1 Create Cloudflare Pages Project

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Click "Workers & Pages" → "Create application" → "Pages"
3. Click "Connect to Git"
4. Select your GitHub repository
5. Click "Begin setup"

### 4.2 Configure Build Settings

**Framework preset:** Next.js

**Build configuration:**
- **Production branch:** `deployBranch`
- **Build command:** `cd ../.. && npm install && turbo build --filter=@triberspace/web`
- **Build output directory:** `frontend/app/.next`
- **Root directory:** `/` (leave as root since we use turbo)

**Important:** Click "Advanced settings" and set:
- **Node version:** `20.x`

### 4.3 Set Environment Variables

In Cloudflare Pages → Settings → Environment Variables:

**Production variables:**
```bash
NEXT_PUBLIC_API_URL=https://api.triber.space
NEXT_PUBLIC_PARTYKIT_HOST=triberspace.partykit.dev
NEXT_PUBLIC_FRONTEND_URL=https://triber.space
NODE_ENV=production
```

### 4.4 Deploy

1. Click "Save and Deploy"
2. First build will take 5-10 minutes
3. Monitor build logs for errors

### 4.5 Configure Custom Domain

1. In Cloudflare Pages, go to Custom domains
2. Click "Set up a custom domain"
3. Enter: `triber.space`
4. Cloudflare will automatically configure DNS (since your domain is on Cloudflare)
5. Wait for SSL certificate provisioning (2-5 minutes)

### 4.6 Remove Vercel Deployment (Optional)

1. Go to Vercel dashboard
2. Select your project
3. Settings → Domains → Remove `triber.space`
4. Update DNS if needed (Cloudflare should handle this)

---

## 🎨 Phase 5: Engine Update (Cloudflare Pages)

Your engine is already on Cloudflare Pages. Just need to update it.

### 5.1 Update Deployment Branch

1. Go to Cloudflare Pages → Your engine project
2. Settings → Builds & deployments
3. Change production branch from `main` to `deployBranch`
4. Click "Save"

### 5.2 Trigger Redeploy

1. Go to Deployments tab
2. Click "Create deployment"
3. Select `deployBranch`
4. Click "Deploy"

### 5.3 Verify Engine

Visit `https://engine.triber.space` and verify:
- [ ] Engine loads correctly
- [ ] Can create/edit scenes
- [ ] Sketchfab integration works
- [ ] Publish modal appears
- [ ] Node/patch editor works

---

## ✅ Phase 6: Post-Deployment Configuration

### 6.1 Update Better Auth Trusted Origins

Since we're deploying production, we need to ensure Better Auth CORS is configured correctly.

The code in `packages/auth/src/index.ts` already has production domains, but verify:
- `https://triber.space` ✓
- `https://engine.triber.space` ✓
- `https://api.triber.space` ✓

### 6.2 Update Backend CORS

The backend CORS in `backend/api/src/server.ts` is currently hardcoded for localhost. This should already be updated via the code changes we made.

Verify production origins are included:
- `https://triber.space`
- `https://engine.triber.space`

### 6.3 Update Sketchfab OAuth Callback

1. Go to [Sketchfab Developer Portal](https://sketchfab.com/settings/developers)
2. Update your OAuth app redirect URI:
   ```
   https://api.triber.space/auth/sketchfab/callback
   ```

### 6.4 Update Google OAuth (if using)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to APIs & Services → Credentials
3. Edit your OAuth 2.0 Client ID
4. Add authorized redirect URIs:
   ```
   https://api.triber.space/api/auth/callback/google
   ```
5. Add authorized JavaScript origins:
   ```
   https://triber.space
   https://engine.triber.space
   ```

---

## 🧪 Phase 7: Testing & Verification

### 7.1 Test Authentication Flow

1. Visit `https://triber.space`
2. Click "Sign Up" or "Sign In"
3. Create a test account with email/password
4. Verify you're redirected and session persists
5. Try logging out and back in
6. Test Google OAuth (if configured)

### 7.2 Test Cross-Service Communication

**Frontend → Backend:**
```bash
# Open browser console on triber.space
fetch('https://api.triber.space/')
  .then(r => r.json())
  .then(console.log)
```

**Engine → Backend:**
1. Go to `https://engine.triber.space`
2. Try to publish a scene
3. Verify it saves to the database

### 7.3 Test Multiplayer

1. Visit a space URL: `https://triber.space/s/{space-slug}`
2. Open the same URL in another browser/incognito window
3. Move around and verify you see the other player
4. Check browser console for WebSocket connection logs

### 7.4 Test File Uploads

1. In engine, try uploading an image or 3D model
2. Verify file appears in R2 bucket
3. Check that CDN URL is accessible

### 7.5 Test Runtime Features

1. Visit `https://triber.space/experience/beloved` (if exists)
2. Test character movement (WASD)
3. Test camera controls
4. Test media objects (images, videos)
5. Test points/collectibles system
6. Test mobile (joystick controls)

---

## 🐛 Troubleshooting

### Database Connection Issues

**Error:** `Connection refused` or `timeout`

**Solution:**
- Verify DATABASE_URL is correct (use pooled connection from Neon)
- Check Neon dashboard for connection limits
- Ensure Railway has internet access to Neon

### CORS Errors

**Error:** `Access-Control-Allow-Origin` errors in browser console

**Solution:**
- Verify backend CORS includes your production domains
- Check Better Auth trusted origins
- Clear browser cache and cookies

### Authentication Not Working

**Error:** Session not persisting or "Unauthorized" errors

**Solution:**
- Verify BETTER_AUTH_SECRET is the same on Railway and PartyKit
- Check BETTER_AUTH_URL is set to `https://api.triber.space`
- Verify cookies are being set (check browser DevTools → Application → Cookies)
- Ensure `useSecureCookies: true` in production

### Multiplayer Not Connecting

**Error:** WebSocket connection fails

**Solution:**
- Verify NEXT_PUBLIC_PARTYKIT_HOST is correct (no `https://` prefix)
- Check PartyKit deployment is successful
- Look for CORS issues in browser console
- Test WebSocket directly with `wscat`

### Build Failures

**Railway build fails:**
- Check build logs in Railway dashboard
- Verify all dependencies are in package.json
- Ensure TypeScript compiles without errors locally first

**Cloudflare Pages build fails:**
- Check that turbo build works locally
- Verify Node version matches (20.x)
- Check build logs for missing dependencies
- Ensure build output directory is correct

### File Upload Issues

**Error:** Upload fails or files not accessible

**Solution:**
- Verify R2 credentials are correct
- Check S3_ENDPOINT URL is correct
- Verify CDN_BASE_URL is publicly accessible
- Check R2 bucket CORS settings in Cloudflare dashboard

---

## 📊 Monitoring & Maintenance

### Railway Monitoring

1. Go to Railway dashboard
2. Click on your service
3. Monitor:
   - CPU/Memory usage
   - Request logs
   - Error rates

### Neon Database Monitoring

1. Go to Neon dashboard
2. Monitor:
   - Storage usage (0.5GB free tier limit)
   - Connection count
   - Query performance

### Set Up Alerts (Optional)

**Railway:**
- Settings → Notifications → Enable alerts for deployments and errors

**Neon:**
- Settings → Notifications → Enable storage limit warnings

---

## 🔐 Security Best Practices

### Environment Variables

- [ ] Never commit `.env` to git
- [ ] Use different BETTER_AUTH_SECRET for production
- [ ] Rotate R2 credentials periodically
- [ ] Use strong database passwords

### Database

- [ ] Enable connection pooling (Neon)
- [ ] Set up automatic backups (Neon has this by default)
- [ ] Use SSL connections (Neon enforces this)

### API Security

- [ ] Rate limiting is already configured in Fastify
- [ ] Keep dependencies updated
- [ ] Monitor for security vulnerabilities

---

## 📈 Scaling Considerations

When you outgrow the alpha setup:

### Database (Neon)

- Free tier: 0.5GB storage
- **Scale to:** Neon Pro ($19/month) for 10GB + autoscaling compute
- **Migration:** Zero downtime, just upgrade plan

### Backend (Railway)

- Current: ~$5/month for low traffic
- **Scale to:** Add more resources or horizontal scaling
- **Alternative:** Move to AWS ECS, Fly.io, or dedicated servers

### Multiplayer (PartyKit)

- Free tier: 1M requests/month
- **Scale to:** PartyKit Pro for higher limits
- **Alternative:** Self-hosted Colyseus on Railway/Fly.io

---

## 🎉 Deployment Complete!

Your Triberspace platform should now be live:

- ✅ **Frontend:** https://triber.space
- ✅ **Engine:** https://engine.triber.space
- ✅ **API:** https://api.triber.space
- ✅ **Multiplayer:** wss://triberspace.partykit.dev
- ✅ **Database:** Neon PostgreSQL
- ✅ **CDN:** https://cdn.triber.space (R2)

### Share with Alpha Testers

Send your testers:
1. URL: https://triber.space
2. Ask them to create accounts
3. Collect feedback via form/Discord/etc.
4. Monitor error logs in Railway

---

## 📚 Additional Resources

- [Railway Documentation](https://docs.railway.app)
- [Neon Documentation](https://neon.tech/docs)
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages)
- [PartyKit Documentation](https://docs.partykit.io)
- [Better Auth Documentation](https://www.better-auth.com)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

---

## 🆘 Need Help?

If you encounter issues:
1. Check the Troubleshooting section above
2. Review service logs (Railway, Cloudflare, PartyKit)
3. Verify environment variables are set correctly
4. Test each service independently

**Happy deploying! 🚀**
