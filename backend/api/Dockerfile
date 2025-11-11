# Dockerfile for Triberspace Backend API
# This is optional for Railway but useful for local Docker testing and other deployments

# Use Node.js 20 LTS
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy root package files for workspace resolution
COPY package.json package-lock.json ./
COPY backend/api/package.json ./backend/api/
COPY packages/auth/package.json ./packages/auth/
COPY packages/database/package.json ./packages/database/

# Install dependencies
RUN npm ci

# Build the application
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/api/node_modules ./backend/api/node_modules
COPY --from=deps /app/packages ./packages

# Copy source code
COPY backend/api ./backend/api
COPY packages ./packages
COPY turbo.json ./

# Build TypeScript
WORKDIR /app/backend/api
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

# Don't run as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 fastify

# Copy built application
COPY --from=builder --chown=fastify:nodejs /app/backend/api/dist ./dist
COPY --from=builder --chown=fastify:nodejs /app/backend/api/package.json ./package.json
COPY --from=builder --chown=fastify:nodejs /app/node_modules ./node_modules

# Copy engine callback files (needed for Sketchfab OAuth)
COPY --from=builder /app/frontend/engine/auth ./frontend/engine/auth

USER fastify

# Expose port (Railway will override this)
EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

CMD ["node", "dist/server.js"]
