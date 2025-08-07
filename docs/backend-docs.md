# 🚀 Triberspace Backend API Documentation

Welcome to the Triberspace backend API! This guide will help new developers quickly understand and work with our comprehensive Fastify-based API system.

---

## 📋 Quick Overview

Our backend API is a **Fastify server** that provides **81 endpoints** across **11 major systems**:

- **🔐 Authentication** - User sessions, profiles, and permissions (6 endpoints)
- **👤 User Management** - User profiles and account management (4 endpoints)  
- **🌍 Worlds System** - World discovery and creator CRUD (6 endpoints)
- **🏢 Spaces System** - Space management and discovery (5 endpoints)
- **📅 Events System** - Event management with attendance tracking (7 endpoints)
- **🤝 Tribes System** - Community membership and management (8 endpoints)
- **👑 Creator Management** - Creator profiles and applications (6 endpoints)
- **🎭 Avatar System** - Character customization and equipment (11 endpoints)
- **🎒 Inventory System** - Universal digital asset management (6 endpoints)
- **🛒 Store System** - E-commerce with advanced product management (12 endpoints)
- **💰 Points System** - Virtual points economy with creator tools (9 endpoints)

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
│   ├── auth.ts                 # User authentication and profiles (6 endpoints)
│   ├── users.ts                # User profile management (4 endpoints)
│   ├── worlds.ts               # World discovery and creator CRUD (6 endpoints)
│   ├── spaces.ts               # Space management and discovery (5 endpoints)
│   ├── events.ts               # Event management with attendance (7 endpoints)
│   ├── tribes.ts               # Tribe membership and management (8 endpoints)
│   ├── creators.ts             # Creator profiles and applications (6 endpoints)
│   ├── avatars.ts              # Avatar customization and equipment (11 endpoints)
│   ├── inventory.ts            # Universal inventory management (6 endpoints)
│   ├── store.ts                # Store and purchasing system (12 endpoints)
│   ├── points.ts               # Points economy with creator tools (9 endpoints)
│   └── index.ts                # Main v1 router
└── schemas/                    # Data validation schemas
    └── common.ts               # Shared validation rules
```

---

## 🛣️ Complete API Endpoints Breakdown (81 Total)

### 🔐 **Authentication System** (`/api/v1/auth`) - 6 endpoints
**Mixed access** - Authentication management and user profiles
- `GET /me` - Get current user session info (auth required)
- `GET /profile` - Get extended user profile (auth required)
- `POST /signup-full` - Complete user registration (public)
- `POST /complete-profile` - Complete user onboarding (auth required)
- `POST /check-username` - Check username availability (public)
- `GET /profile-status` - Check profile completion status (auth required)

### 👤 **User Management** (`/api/v1/users`) - 4 endpoints
**Protected access** - Personal account management
- `GET /me` - Get detailed user profile (auth required)
- `PUT /profile` - Update user profile information (auth required)
- `PUT /avatar` - Update user avatar settings (auth required)  
- `DELETE /account` - Delete user account (auth required)

### 🌍 **Worlds System** (`/api/v1/worlds`) - 6 endpoints
**Mixed access** - Public discovery, creator management
- `GET /` - List all worlds with pagination and search (public)
- `GET /:worldId` - Get world details with creator info (public)
- `GET /:worldId/spaces` - List spaces within a world (public)
- `POST /` - Create new world (creator-only)
- `PUT /:worldId` - Update world details (owner-only)
- `DELETE /:worldId` - Delete world (owner-only)

### 🏢 **Spaces System** (`/api/v1/spaces`) - 5 endpoints
**Mixed access** - Space discovery and management
- `GET /` - List all spaces with filtering (public)
- `GET /:spaceId` - Get space details (public)
- `POST /` - Create new space (creator-only)
- `PUT /:spaceId` - Update space details (owner-only)
- `DELETE /:spaceId` - Delete space (owner-only)

### 📅 **Events System** (`/api/v1/events`) - 7 endpoints
**Mixed access** - Event discovery, management, and attendance
- `GET /` - List all events with filtering (public)
- `GET /:eventId` - Get event details (public)
- `POST /` - Create new event (creator-only)
- `PUT /:eventId` - Update event details (owner-only)
- `DELETE /:eventId` - Delete event (owner-only)
- `POST /:eventId/attend` - Mark attendance at event (auth required)
- `GET /:eventId/attendees` - Get event attendees (public)

### 🤝 **Tribes System** (`/api/v1/tribes`) - 8 endpoints
**Mixed access** - Community membership and management
- `GET /` - List all tribes with filtering (public)
- `GET /:tribeId` - Get tribe details and perks (public)
- `POST /` - Create new tribe (creator-only)
- `PUT /:tribeId` - Update tribe settings (owner-only)
- `DELETE /:tribeId` - Delete tribe (owner-only)
- `POST /:tribeId/join` - Join a tribe (auth required)
- `POST /:tribeId/leave` - Leave a tribe (auth required)
- `GET /:tribeId/members` - Get tribe members (public)

### 👑 **Creator Management** (`/api/v1/creators`) - 6 endpoints  
**Mixed access** - Creator profiles and applications
- `GET /` - List all creators (public)
- `POST /apply` - Apply to become creator (auth required)
- `DELETE /:creatorId` - Remove creator status (owner/admin-only)
- `GET /:creatorId` - View creator profile (public)
- `GET /:creatorId/world` - Get creator's world (public)
- `GET /:creatorId/tribe` - Get creator's tribe (public)

### 🎭 **Avatar System** (`/api/v1/avatars`) - 11 endpoints
**Mixed access** - Avatar customization and management
- `GET /base-models` - Browse avatar base models (public)
- `GET /items` - Browse avatar items/clothing (public)
- `GET /my-avatars` - List user's avatars (auth required)
- `GET /my-avatar` - Get active avatar with equipment (auth required)
- `POST /my-avatars` - Create new avatar (auth required)
- `PUT /my-avatars/:avatarId` - Update avatar settings (auth required)
- `DELETE /my-avatars/:avatarId` - Delete avatar (auth required)
- `GET /my-avatars/:avatarId/equipment` - Get avatar equipment (auth required)
- `POST /my-avatars/:avatarId/equip` - Equip item to avatar (auth required)
- `POST /my-avatars/:avatarId/unequip` - Unequip item from avatar (auth required)
- `GET /inventory` - Get avatar item inventory (auth required)

### 🎒 **Universal Inventory** (`/api/v1/inventory`) - 6 endpoints
**Protected access** - Digital asset management
- `GET /` - Get complete user inventory (auth required)
- `GET /:inventoryId` - Get specific item details (auth required)
- `GET /stats/overview` - Get inventory statistics (auth required)
- `POST /transfer` - Transfer item to another user (auth required)
- `POST /consume` - Consume/use an item (auth required)
- `GET /type/:productType` - Filter inventory by type (auth required)

### 🛒 **Store System** (`/api/v1/store`) - 12 endpoints
**Mixed access** - E-commerce with advanced product management
- `GET /products` - Global product discovery with filtering (public)
- `GET /products/:productId` - Get product details (public)
- `GET /stores` - List creator stores (public)
- `PUT /my-store` - Update store settings (creator-only)
- `POST /products` - Create new product (creator-only)
- `PUT /products/:productId` - Update product (creator-only)
- `DELETE /products/:productId` - Delete product (creator-only)
- `GET /:creatorId` - View creator store (public)
- `GET /:creatorId/products` - Browse store products (public)
- `POST /purchase` - Purchase products (auth required)
- `GET /my-orders` - View order history (auth required)
- `GET /my-inventory` - View purchased inventory (auth required)

### 💰 **Points Economy** (`/api/v1/points`) - 9 endpoints
**Mixed access** - Virtual currency with creator management tools
- `GET /balance/:creatorId` - Get points balance for creator (auth required)
- `GET /packages/:creatorId` - View available points packages (public)
- `POST /purchase-package` - Buy points with real money (auth required)
- `GET /transactions` - Get transaction history (auth required)
- `GET /balances` - Get all points balances (auth required)
- `GET /my-packages` - Manage creator's packages (creator-only)
- `POST /packages` - Create new points package (creator-only)
- `PUT /packages/:packageId` - Update points package (creator-only)
- `DELETE /packages/:packageId` - Delete points package (creator-only)

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