# Triberspace - Codebase Documentation

## 🏗️ Architecture Overview

Triberspace is an immersive experience platform built as a **TypeScript monorepo** with authentication, database, and full-stack capabilities.

### Technology Stack
- **Frontend**: Next.js 15.4.4 with App Router, React 19.1.0
- **Backend**: Fastify API server
- **Authentication**: Better Auth with Better Auth UI
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: Tailwind CSS v4, shadcn/ui components
- **Icons**: Phosphor Icons
- **Monorepo**: Turborepo with NPM workspaces

---

## 📁 Project Structure

```
triberspace/
├── .env                           # Root environment variables (gitignored)
├── .env.example                   # Environment template
├── package.json                   # Root monorepo configuration
├── turbo.json                     # Build orchestration
├── docs/                          # Documentation
├── frontend/app/                  # Next.js frontend application
│   ├── app/                       # App Router directory
│   │   ├── auth/[pathname]/       # Authentication UI routes
│   │   ├── explore/               # Auth testing page
│   │   ├── layout.tsx             # Root layout with auth provider
│   │   └── page.tsx               # Home page
│   ├── components/ui/             # UI components
│   └── lib/                       # Utilities and configuration
├── backend/api/                   # Fastify API server
│   ├── src/server.ts              # Main server with auth routes
│   ├── package.json               # API dependencies
│   └── tsconfig.json              # TypeScript configuration
├── packages/                      # Shared packages
│   ├── auth/                      # Better Auth configuration
│   ├── database/                  # Database layer with Drizzle ORM
│   └── utils/                     # Shared utilities
└── CLAUDE.md                      # AI assistant documentation
```

---

## 🔧 Layer Architecture

### Layer 1: Database (`packages/database`)
**Purpose**: PostgreSQL database management with Drizzle ORM

**Database Tables**: Better Auth compatible schema with user, session, account, and verification tables.

### Layer 2: Authentication (`packages/auth`)
**Purpose**: Better Auth configuration and session management

Configured with email/password authentication, session management, and CORS origins.

### Layer 3: Backend API (`backend/api`)
**Purpose**: Fastify server serving authentication API

Handles all `/api/auth/*` routes and forwards them to Better Auth for processing.

### Layer 4: Frontend (`frontend/app`)
**Purpose**: Next.js application with authentication UI

Uses Better Auth UI components with custom styling and auth state management.

---

## 🔄 Authentication Flow

### Complete Authentication Process:
1. User visits auth pages (`/auth/sign-in`, `/auth/sign-up`)
2. Better Auth UI forms submit to backend API (`/api/auth/*`)
3. Backend forwards requests to Better Auth handler
4. Better Auth processes authentication and manages database
5. Session state updates across the frontend application

### Key Auth Endpoints:
- `POST /api/auth/sign-up/email` - User registration
- `POST /api/auth/sign-in/email` - User login
- `GET /api/auth/use-session` - Session check
- `POST /api/auth/sign-out` - User logout

---

## 🎨 Design System

### Fonts
- **Sans-serif**: Work Sans (weights 300-900)
- **Monospace**: Geist Mono

### Spacing Scale
**All spacing uses 4px multiples**:
- Use flexbox `gap` over `margin-bottom` for spacing
- Allowed values: 4px, 8px, 12px, 16px, 20px, 24px, 32px, etc.

### Icons & Components
- **Icons**: Phosphor Icons with weight variants
- **UI Components**: shadcn/ui with Tailwind CSS v4
- **Theme**: Dark mode by default

---

## 🚀 Development Workflow

### Getting Started
```bash
# Install dependencies
npm install

# Set up environment (copy .env.example to .env)
cp .env.example .env

# Generate and apply database migrations
npm run db:generate -w packages/database
npm run db:migrate -w packages/database

# Start development
npm run dev  # Starts both frontend and backend
```

### Key Commands
```bash
# Build all packages
npm run build

# Database management
npm run db:studio -w packages/database

# Individual services
npm run dev -w frontend/app     # Frontend only
npm run dev -w backend/api      # Backend only
```

---

## 🔧 Code Quality Standards

### File Organization
- Custom components outside `ui/` folder for app-specific logic
- shadcn/ui components in `components/ui/` folder
- Use `"use client"` for interactive components
- Shared utilities in `lib/` directories

### Styling Guidelines
- Prefer custom implementations over library defaults when needed
- Use flexbox gap for spacing instead of margins
- Follow 4px spacing scale consistently
- Mobile-first responsive design approach

---

## 🎯 Key Integration Points

### Package Dependencies
```
frontend/app → packages/auth → packages/database → PostgreSQL
backend/api → packages/auth → packages/database → PostgreSQL
```

### Build Order (Turbo)
1. `packages/database`
2. `packages/auth`  
3. `backend/api`
4. `frontend/app`

---

## 📚 Documentation Links

### Core Libraries
- [Better Auth](https://www.better-auth.com/docs) - Authentication framework
- [Better Auth UI](https://better-auth-ui.com/) - Pre-built auth components
- [Drizzle ORM](https://orm.drizzle.team/) - TypeScript ORM for PostgreSQL
- [Fastify](https://www.fastify.io/) - Fast Node.js web framework

### Frontend
- [Next.js](https://nextjs.org/docs) - React framework with App Router
- [shadcn/ui](https://ui.shadcn.com/) - Re-usable components
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Phosphor Icons](https://phosphoricons.com/) - Icon library

### Development Tools
- [Turbo](https://turbo.build/) - Monorepo build orchestration
- [Drizzle Studio](https://orm.drizzle.team/drizzle-studio/overview) - Database GUI

---

*This documentation provides the essential information needed to understand and work with the Triberspace codebase. For detailed implementation examples, refer to the existing code and the linked documentation above.*