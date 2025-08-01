# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## About Triberspace

Triberspace is an immersive experience platform where fans can unlock exclusive content, collectibles, and merch by exploring, connecting, and earning points within immersive entertainment experiences by their favorite brands and artists.

## Common Development Commands

### Monorepo Commands (run from root)
- `npm run dev` - Start all workspaces in development mode
- `npm run build` - Build all workspaces

### Frontend Commands (from frontend/app/)
- `npm run dev` - Start Next.js development server with Turbopack
- `npm run build` - Build the Next.js application
- `npm run lint` - Run Next.js linting
- `npm start` - Start the production server

### Backend Commands (from backend/api/)
- `npm run dev` - Start Fastify API server with Better Auth
- `npm run build` - Build TypeScript to dist/
- `npm run start` - Start production server

### Database Commands (from packages/database/)
- `npm run db:generate` - Generate migrations from schema changes
- `npm run db:migrate` - Apply migrations to database
- `npm run db:studio` - Open Drizzle Studio (database GUI)

## Code Quality & Standards

### Clean Code Principles
- Write self-documenting, readable code with clear variable and function names
- Keep functions small and focused on a single responsibility
- Use TypeScript properly with explicit types and interfaces
- Prefer composition over complex inheritance
- Remove unused code, imports, and console.logs before committing
- Use semantic HTML/TSX elements whenever possible instead of generic `<div>` elements

### Spacing & Layout Standards
- **4px Spacing Scale**: All spacing must use multiples of 4px (4, 8, 12, 16, 20, 24, 32, etc.)
  - Use Tailwind classes: `gap-1` (4px), `gap-2` (8px), `gap-3` (12px), `gap-4` (16px), `gap-5` (20px), `gap-8` (32px)
  - Avoid odd pixel values: No classes that result in 3px, 5px, 7px, 9px, 11px, 13px, 15px, etc.
- **Flexbox Container Spacing**: Prefer flexbox `gap` over `margin-bottom` or `space-y-*`
  - ✅ Good: `<div className="flex flex-col gap-4">`
  - ❌ Avoid: `<div className="space-y-3">` or individual `mb-*` classes
- **Consistent Patterns**: Use the same spacing approach throughout components

### Component Architecture
- Place reusable UI components in `components/ui/`
- Use proper TypeScript interfaces for props
- Implement proper error boundaries and loading states
- Follow Next.js App Router conventions

## High-Level Architecture

This is a Turborepo monorepo with the following structure:

### Frontend (`frontend/app/`)
- **Next.js 15.4.4** with App Router
- **React 19.1.0** with TypeScript
- **Tailwind CSS v4** for styling
- **Custom UI Components**: Built from scratch with shadcn/ui utilities
- **Three.js** and **@react-three/fiber** for 3D graphics
- **Better Auth UI** for authentication forms with shadcn/ui styling
- Components structure:
  - `components/ui/` - Reusable UI components (buttons, sidebar, etc.)
  - `components/` - App-specific composed components
- Path aliases configured: `@/components`, `@/lib`, `@/ui`

### Backend Services
- **`backend/api/`**: Fastify API server with Better Auth integration
- **`backend/game-server/`**: Colyseus game server with Express (setup pending)

### Shared Packages (`packages/`)
- **`auth/`**: Better Auth configuration with email/password authentication
- **`database/`**: Drizzle ORM with PostgreSQL and Better Auth schema
- **`utils/`**: Shared helpers and types (to be implemented)

### Build System
- **Turborepo** for monorepo task orchestration
- NPM workspaces for dependency management
- Build outputs: `.next/**` for Next.js, `dist/**` for other packages

## Key Technical Decisions

1. **Monorepo Structure**: Uses Turborepo with NPM workspaces for efficient builds and shared dependencies
2. **Frontend Stack**: Next.js with App Router, React Server Components enabled
3. **3D Graphics**: Three.js integrated for 3D capabilities
4. **Component System**: Custom components built with shadcn/ui utilities and design patterns
5. **Spacing Philosophy**: 4px-based spacing scale with flexbox gap containers for consistency
6. **Navigation**: Custom sidebar implementation with smooth width transitions and state management
7. **Game Server**: Colyseus for real-time multiplayer functionality
8. **API Server**: Fastify for high-performance REST API

## Development Notes

### Current Status
- Frontend fully configured with custom sidebar navigation and Better Auth UI integration
- Backend API server operational with Better Auth authentication endpoints
- Database layer implemented with PostgreSQL and Better Auth schema
- Authentication system working end-to-end with session management
- ESLint configured but no test framework yet

### Code Standards Enforcement
- All new code must follow the 4px spacing scale requirement
- Use flexbox gap instead of margin-bottom for container spacing
- Maintain clean, readable TypeScript with proper interfaces
- Custom components should be placed in appropriate directories
- Remove unused imports and console.logs before committing

### Architecture Guidelines
- The sidebar uses custom implementation with smooth transitions and state management
- Components are organized in `ui/` for reusable pieces and root `components/` for app-specific compositions
- Tailwind CSS v4 with CSS variables for theming and dark mode support