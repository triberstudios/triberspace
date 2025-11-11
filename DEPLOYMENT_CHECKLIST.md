# 🚀 Triberspace Deployment Checklist

Use this checklist to track your deployment progress. Check off items as you complete them.

## 📋 Pre-Deployment

- [ ] Read DEPLOYMENT.md fully
- [ ] Verify `deployBranch` is up to date
- [ ] All tests passing locally
- [ ] No console errors in development
- [ ] `.env.production.example` reviewed
- [ ] Production secrets generated

## 🔐 Secrets & Credentials

- [ ] Generate new BETTER_AUTH_SECRET (32+ chars)
  ```bash
  openssl rand -base64 32
  ```
- [ ] Get Cloudflare R2 credentials (S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY)
- [ ] Get Google OAuth credentials (optional)
- [ ] Get OpenAI API key (optional)
- [ ] Document all secrets securely (1Password, etc.)

## 🗄️ Database (Neon)

- [ ] Create Neon account
- [ ] Create new project: `triberspace-production`
- [ ] Get pooled connection string
- [ ] Save DATABASE_URL
- [ ] Run migrations locally:
  ```bash
  export DATABASE_URL="<neon-connection-string>"
  cd packages/database
  npm run db:migrate
  ```
- [ ] Verify 8 migrations applied
- [ ] Test connection with `npm run db:studio`
- [ ] (Optional) Create staging branch in Neon

## 🚂 Backend API (Railway)

- [ ] Create Railway account
- [ ] Create new project from GitHub
- [ ] Connect to `triberspace` repo
- [ ] Select `deployBranch`
- [ ] Configure service:
  - Root directory: `backend/api`
  - Or use auto-detected `railway.json`
- [ ] Set all environment variables (use .env.production.example as reference):
  - [ ] DATABASE_URL
  - [ ] BETTER_AUTH_SECRET
  - [ ] BETTER_AUTH_URL=https://api.triber.space
  - [ ] FRONTEND_URL=https://triber.space
  - [ ] GOOGLE_CLIENT_ID (optional)
  - [ ] GOOGLE_CLIENT_SECRET (optional)
  - [ ] S3_ENDPOINT
  - [ ] S3_REGION=auto
  - [ ] S3_BUCKET
  - [ ] S3_ACCESS_KEY_ID
  - [ ] S3_SECRET_ACCESS_KEY
  - [ ] CDN_BASE_URL
  - [ ] NODE_ENV=production
  - [ ] PORT=3001
- [ ] Deploy and wait for build
- [ ] Check logs for errors
- [ ] Test health endpoint: `curl https://<railway-url>/`
- [ ] Configure custom domain: `api.triber.space`
- [ ] Add CNAME record in DNS
- [ ] Wait for DNS propagation
- [ ] Test: `curl https://api.triber.space/`
- [ ] Test Swagger docs: `https://api.triber.space/docs`

## 🎮 Multiplayer Server (PartyKit)

- [ ] Create PartyKit account
- [ ] Install PartyKit CLI: `npm install -g partykit`
- [ ] Login: `partykit login`
- [ ] Update `backend/game-server/partykit.json`:
  - [ ] Set API_URL=https://api.triber.space
  - [ ] Set BETTER_AUTH_SECRET (same as Railway)
- [ ] Deploy from `backend/game-server`:
  ```bash
  cd backend/game-server
  partykit deploy
  ```
- [ ] Save deployment URL (e.g., triberspace.partykit.dev)
- [ ] Test WebSocket:
  ```bash
  wscat -c wss://triberspace.partykit.dev/parties/main/test
  ```

## 🌐 Frontend App (Cloudflare Pages)

- [ ] Go to Cloudflare dashboard
- [ ] Create new Pages project
- [ ] Connect to GitHub → `triberspace` repo
- [ ] Configure build:
  - Production branch: `deployBranch`
  - Build command: `cd ../.. && npm install && turbo build --filter=@triberspace/web`
  - Build output: `frontend/app/.next`
  - Root directory: `/`
  - Node version: `20.x`
- [ ] Set environment variables:
  - [ ] NEXT_PUBLIC_API_URL=https://api.triber.space
  - [ ] NEXT_PUBLIC_PARTYKIT_HOST=triberspace.partykit.dev
  - [ ] NEXT_PUBLIC_FRONTEND_URL=https://triber.space
  - [ ] NODE_ENV=production
- [ ] Deploy (first build takes 5-10 min)
- [ ] Monitor build logs
- [ ] Configure custom domain: `triber.space`
- [ ] Wait for SSL certificate
- [ ] Test: Visit https://triber.space

## 🎨 Engine (Cloudflare Pages)

- [ ] Go to Cloudflare → Your existing engine project
- [ ] Settings → Builds & deployments
- [ ] Change production branch: `main` → `deployBranch`
- [ ] Go to Deployments tab
- [ ] Click "Create deployment"
- [ ] Select `deployBranch`
- [ ] Deploy
- [ ] Test: Visit https://engine.triber.space
- [ ] Verify engine loads and works
- [ ] Test Sketchfab integration
- [ ] Test publish modal

## 🔧 Post-Deployment Configuration

### Update OAuth Redirect URIs

- [ ] Sketchfab:
  - Go to Sketchfab Developer Portal
  - Update redirect URI: `https://api.triber.space/auth/sketchfab/callback`

- [ ] Google OAuth (if using):
  - Go to Google Cloud Console
  - Update authorized redirect URIs: `https://api.triber.space/api/auth/callback/google`
  - Update authorized JavaScript origins: `https://triber.space`, `https://engine.triber.space`

### Verify CORS Configuration

- [ ] Backend CORS updated (already done in code)
- [ ] Better Auth trusted origins include production domains (already done in code)

## 🧪 Testing & Verification

### Authentication

- [ ] Visit https://triber.space
- [ ] Click "Sign Up"
- [ ] Create test account
- [ ] Verify redirect works
- [ ] Log out
- [ ] Log back in
- [ ] Test Google OAuth (if enabled)

### Cross-Service Communication

- [ ] Test frontend → backend:
  ```javascript
  // In browser console on triber.space
  fetch('https://api.triber.space/').then(r => r.json()).then(console.log)
  ```
- [ ] Test engine → backend (try publishing a scene)

### Multiplayer

- [ ] Visit a space: `https://triber.space/s/{space-slug}`
- [ ] Open in incognito/another browser
- [ ] Verify players see each other
- [ ] Test movement synchronization
- [ ] Check browser console for errors

### File Uploads

- [ ] In engine, upload an image
- [ ] Verify upload succeeds
- [ ] Check file appears in R2
- [ ] Verify CDN URL works

### Runtime Features

- [ ] Test character movement (WASD)
- [ ] Test camera controls
- [ ] Test media objects
- [ ] Test collectibles/points
- [ ] Test on mobile (joystick)

## 📊 Monitoring Setup

- [ ] Enable Railway deployment notifications
- [ ] Enable Neon storage alerts
- [ ] Set up error tracking (Sentry) - optional
- [ ] Set up analytics (PostHog) - optional
- [ ] Create monitoring dashboard - optional

## 🐛 Troubleshooting Completed

If you encounter issues, refer to DEPLOYMENT.md Troubleshooting section.

- [ ] All services responding
- [ ] No CORS errors
- [ ] Authentication working
- [ ] Multiplayer connecting
- [ ] Files uploading

## 🎉 Launch

- [ ] All tests passing
- [ ] All services healthy
- [ ] Performance acceptable
- [ ] Mobile responsive
- [ ] Error monitoring active
- [ ] Backup plan documented

### Share with Alpha Testers

- [ ] Create alpha tester invite list
- [ ] Send invite emails with:
  - URL: https://triber.space
  - Instructions
  - Feedback form/Discord link
- [ ] Monitor error logs closely
- [ ] Collect feedback

## 📈 Post-Launch

- [ ] Monitor Railway metrics (CPU, memory)
- [ ] Monitor Neon database usage
- [ ] Track error rates
- [ ] Collect user feedback
- [ ] Plan next iteration

---

## 🆘 Emergency Contacts & Resources

**Documentation:**
- Main deployment guide: `DEPLOYMENT.md`
- PartyKit guide: `backend/game-server/DEPLOYMENT.md`
- Env template: `.env.production.example`

**Service Dashboards:**
- Railway: https://railway.app
- Neon: https://console.neon.tech
- Cloudflare: https://dash.cloudflare.com
- PartyKit: https://partykit.io

**Support:**
- Railway Discord
- Neon Discord
- Cloudflare Community
- PartyKit Discord

---

**Deployment Date:** _____________
**Deployed By:** _____________
**Deployment Time:** _____________ hours
**Issues Encountered:** _____________
**Resolution:** _____________
