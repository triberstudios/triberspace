# 🚀 Triberspace Backend API Documentation

Welcome to the Triberspace backend API! This guide will help new developers quickly understand and work with our Fastify-based API system.

---

## 📋 Quick Overview

Our backend API is a **Fastify server** that provides 32 endpoints across 6 major systems:

- **🌍 World Discovery** - Browse worlds and spaces (public)
- **👤 Creator Management** - Creator profiles and applications 
- **🎨 Avatar System** - Character customization and inventory
- **🛒 Store System** - E-commerce with points-based purchasing
- **💰 Points System** - Virtual currency economy
- **🔐 Authentication** - User sessions and permissions

**Base URL**: `http://localhost:3001/api/v1/`

---

## 🏗️ Architecture Overview

```
Frontend (Next.js)
       ↕ HTTP Requests
Backend API (Fastify + TypeScript)  ← YOU ARE HERE
       ↕ SQL Queries
Database (PostgreSQL + Drizzle ORM)
```

### Key Technologies
- **Fastify**: High-performance web server framework
- **TypeScript**: Type-safe JavaScript with compile-time error checking
- **Drizzle ORM**: Type-safe database queries
- **Better Auth Integration**: Seamless authentication with existing system
- **Zod Validation**: Runtime data validation

---

## 📁 Backend Structure

```
backend/api/src/
├── server.ts                    # Main application entry point
├── middleware/                  # Reusable logic that runs before routes
│   ├── auth.ts                 # Authentication checking
│   ├── validation.ts           # Input data validation
│   └── error.ts                # Error handling and formatting
├── routes/v1/                  # API endpoints organized by feature
│   ├── auth.ts                 # User authentication endpoints
│   ├── worlds.ts               # World discovery endpoints
│   ├── creators.ts             # Creator management endpoints  
│   ├── avatars.ts              # Avatar system endpoints
│   ├── store.ts                # Store and purchasing endpoints
│   ├── points.ts               # Points economy endpoints
│   └── index.ts                # Main v1 router
└── schemas/                    # Data validation schemas
    └── common.ts               # Shared validation rules
```

---

## 🛣️ API Endpoints Overview

### 🌍 **World Discovery** (`/api/v1/worlds`)
**Public access** - Anyone can browse
- `GET /worlds` - List all worlds with pagination and search
- `GET /worlds/:worldId` - Get world details with creator info
- `GET /worlds/:worldId/spaces` - List spaces within a world

### 👤 **Creator Management** (`/api/v1/creators`) 
**Mixed access** - Public viewing, auth required for management
- `GET /creators/:creatorId` - View creator profile (public)
- `GET /creators/:creatorId/world` - Get creator's world (public)
- `GET /creators/:creatorId/tribe` - Get creator's tribe (public)
- `POST /creators` - Apply to become creator (auth required)
- `PATCH /creators/:creatorId` - Update creator profile (own profile only)

### 🎨 **Avatar System** (`/api/v1/avatars`)
**Mixed access** - Public browsing, auth required for personal actions
- `GET /avatars/base-models` - Browse avatar base models (public)
- `GET /avatars/items` - Browse avatar items/clothing (public)
- `GET /avatars/my-avatar` - Get your current avatar (auth required)
- `GET /avatars/inventory` - Your owned avatar items (auth required)
- `POST /avatars/equip` - Equip avatar items (auth required)

### 🛒 **Store System** (`/api/v1/store`)
**Mixed access** - Public shopping, auth required for purchasing
- `GET /store/:creatorId` - View creator's store info (public)
- `GET /store/:creatorId/products` - Browse store products (public)
- `POST /store/purchase` - Purchase products (auth required)
- `GET /store/my-orders` - Your order history (auth required)
- `GET /store/my-inventory` - Your purchased items (auth required)

### 💰 **Points System** (`/api/v1/points`)
**Mixed access** - Public viewing, auth required for transactions
- `GET /points/packages/:creatorId` - View points packages (public)
- `GET /points/balance/:creatorId` - Your points balance (auth required)
- `POST /points/purchase-package` - Buy points with real money (auth required)
- `GET /points/transactions` - Your transaction history (auth required)
- `GET /points/balances` - All your points balances (auth required)

### 🔐 **Authentication** (`/api/v1/auth`)
**Protected access** - All endpoints require authentication
- `GET /auth/me` - Get current user session info
- `GET /auth/profile` - Get extended user profile

---

## 🔐 Authentication System

### How Authentication Works
1. **Session-Based**: Uses your existing Better Auth system
2. **Cookie Authentication**: Sessions stored in secure cookies
3. **Middleware Protection**: Routes protected by middleware functions

### Authentication Levels

#### **Public Routes** 🌐
No authentication required - anyone can access
```javascript
// Example: Browse worlds
fastify.get('/worlds', {
  preHandler: [optionalAuthMiddleware]  // Auth is optional
}, handler);
```

#### **Protected Routes** 🔒  
Authentication required - must be logged in
```javascript
// Example: Get user's avatar
fastify.get('/avatars/my-avatar', {
  preHandler: [authMiddleware]  // Auth is required
}, handler);
```

#### **Owner-Only Routes** 🔐
Authentication + ownership validation
```javascript
// Example: Update creator profile (only your own)
// Business logic checks: creator.userId === request.user.id
```


### Common HTTP Status Codes
- **200** - Success
- **201** - Created (after successful POST)
- **400** - Bad Request (validation failed)
- **401** - Unauthorized (not logged in)
- **403** - Forbidden (logged in but not allowed)
- **404** - Not Found (resource doesn't exist)
- **500** - Server Error (something went wrong)

---

## 🔍 Data Validation

We use **Zod schemas** for validating all input data:

### Common Validation Patterns
```javascript
// Public ID format (12 characters, alphanumeric)
publicIdSchema = z.string().length(12).regex(/^[A-Za-z0-9]+$/);

// Pagination parameters
paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

// Purchase request
purchaseSchema = z.object({
  productId: publicIdSchema,
  quantity: z.number().int().min(1).max(10).default(1)
});
```

### Validation Error Example
```javascript
// Request with invalid data
POST /api/v1/avatars/equip
{
  "itemId": "invalid",  // Too short, should be 12 characters
  "slotName": ""        // Empty string, should have content
}

// Error response
{
  "error": "Validation failed",
  "details": [
    {"path": "itemId", "message": "String must contain exactly 12 character(s)"},
    {"path": "slotName", "message": "String must contain at least 1 character(s)"}
  ]
}
```

---

## 🚦 Development Workflow

### 1. Starting the Server
```bash
# Development mode (auto-restart on changes)
npm run dev

# Build and start production mode
npm run build
npm start
```

### 2. Testing Endpoints
```bash
# Test public endpoint
curl "http://localhost:3001/api/v1/worlds?page=1&limit=5"

# Test API health
curl "http://localhost:3001/api/v1/"

# Test with JSON data
curl -X POST "http://localhost:3001/api/v1/store/purchase" \
  -H "Content-Type: application/json" \
  -d '{"productId": "abc123def456", "quantity": 1}'
```

### 3. Adding New Endpoints
1. **Create route handler** in appropriate file (`routes/v1/*.ts`)
2. **Add validation schema** if accepting input data
3. **Add authentication** if route needs protection
4. **Test the endpoint** with sample requests
5. **Update this documentation** with new endpoint info

---

*This documentation covers the essential backend API concepts. For database schema details, see `schema-docs.md`. For frontend integration, see the main `documentation.md` file.*