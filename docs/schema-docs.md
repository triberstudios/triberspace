# 📦 Triberspace Complete Schema Design (Drizzle ORM + Better Auth)

This document outlines the **complete database schema** for **Triberspace** across all implemented phases. It integrates **Better Auth** for user authentication and defines all custom tables needed for creators, worlds, spaces, events, tribes, avatars, products, points, inventory, and analytics.

---

## 👤 Users & Authentication (via Better Auth)

### `user` (Extended with Triberspace fields)
Primary user table:
```ts
id: text (PK, UUID)
name: text
firstName: text (not null)
lastName: text (not null) 
userName: text (unique, not null)
email: text (unique, not null)
emailVerified: boolean (default false)
image: text (profile image URL)
avatar_url: text (3D avatar preview)
socialLinks: jsonb                 // Triberspace specific
role: text = 'user'                // 'user' | 'creator' | 'admin'
createdAt: timestamp
updatedAt: timestamp
```

### `session`
Tracks user sessions:
```ts
id: text (PK)
expiresAt: timestamp
token: text (unique)
ipAddress: text
userAgent: text
userId: text (FK → user.id, cascade)
createdAt: timestamp
updatedAt: timestamp
```

### `account`
OAuth or credentials account linkage:
```ts
id: text (PK)
accountId: text
providerId: text
userId: text (FK → user.id, cascade)
accessToken: text
refreshToken: text
idToken: text
accessTokenExpiresAt: timestamp
refreshTokenExpiresAt: timestamp
scope: text
password: text
createdAt: timestamp
updatedAt: timestamp
```

### `verification`
Stores temporary verification codes:
```ts
id: text (PK)
identifier: text
value: text
expiresAt: timestamp
createdAt: timestamp
updatedAt: timestamp
```

---

## 👑 Creators & Tribes

### `creators`
Creator profiles and settings:
```ts
id: integer (PK, auto-increment from 1000)
publicId: varchar(12) (unique, nanoid)
userId: text (FK → user.id, cascade, unique)
bio: text
pointsName: text (default 'Points')
createdAt: timestamp
updatedAt: timestamp
```

### `tribes`
Each creator has one tribe community:
```ts
id: integer (PK, auto-increment from 1000)
publicId: varchar(12) (unique, nanoid)
creatorId: integer (FK → creators.id, cascade)
name: text (not null)
description: text
perks: jsonb                       // Array of perk descriptions
joinCost: integer (default 0)
createdAt: timestamp
UNIQUE(creatorId) -- one tribe per creator
```

### `user_tribe_memberships`
User membership in tribes:
```ts
id: integer (PK, auto-increment from 1000)
userId: text (FK → user.id, cascade)
tribeId: integer (FK → tribes.id, cascade)
role: text (default 'member')     // 'member', 'moderator', 'admin'
joinedAt: timestamp
UNIQUE(userId, tribeId)
INDEX(userId, tribeId)
```

---

## 🌍 Worlds, Spaces & Events

### `worlds`
Creator's virtual worlds:
```ts
id: integer (PK, auto-increment from 1000)
publicId: varchar(12) (unique, nanoid)
creatorId: integer (FK → creators.id, cascade)
name: text (not null)
description: text
createdAt: timestamp
UNIQUE(creatorId) -- one world per creator
INDEX(name)
```

### `spaces`
Locations within worlds:
```ts
id: integer (PK, auto-increment from 1000)
publicId: varchar(12) (unique, nanoid)
worldId: integer (FK → worlds.id, cascade)
name: text (not null)
spaceType: text (not null)        // 'store', 'gallery', 'game', 'event', etc.
isActive: boolean (default true)
createdAt: timestamp
INDEX(worldId)
INDEX(spaceType)
INDEX(isActive)
```

### `events`
Scheduled events in spaces:
```ts
id: integer (PK, auto-increment from 1000)
publicId: varchar(12) (unique, nanoid)
spaceId: integer (FK → spaces.id, cascade)
name: text (not null)
startTime: timestamp (with timezone, not null)
endTime: timestamp (with timezone, not null)
description: text
isLive: boolean (default false)
createdAt: timestamp
INDEX(spaceId)
INDEX(startTime)
INDEX(isLive)
```

---

## 🎭 Avatar System

### `avatar_base_models`
Foundation models for avatars:
```ts
id: integer (PK, auto-increment from 1000)
publicId: varchar(12) (unique, nanoid)
name: text (not null)             // 'Human Male', 'Human Female', 'Robot', etc.
meshUrl: text (not null)
skeletonUrl: text (not null)
thumbnailUrl: text
rigType: text (not null)          // 'humanoid', 'quadruped', etc.
createdAt: timestamp
INDEX(name)
```

### `avatar_slots`
Customization slots per base model:
```ts
id: integer (PK, auto-increment from 1000)
baseModelId: integer (FK → avatar_base_models.id, cascade)
slotName: text (not null)         // 'head', 'hair', 'torso', 'legs', etc.
slotType: text (not null)         // 'mesh_replacement', 'attachment', 'texture_overlay'
maxItems: integer (default 1)     // Some slots allow multiple items
displayOrder: integer (not null)  // For UI organization
createdAt: timestamp
UNIQUE(baseModelId, slotName)
INDEX(baseModelId)
```

### `user_avatars`
User's avatar configurations:
```ts
id: integer (PK, auto-increment from 1000)
publicId: varchar(12) (unique, nanoid)
userId: text (FK → user.id, cascade)
baseModelId: integer (FK → avatar_base_models.id)
name: text (default 'My Avatar')
isActive: boolean (default true)
createdAt: timestamp
updatedAt: timestamp
INDEX(userId)
INDEX(baseModelId)
UNIQUE INDEX(userId, isActive) WHERE isActive = true  // Only one active avatar
```

### `avatar_items`
Wearable items for avatars:
```ts
id: integer (PK, auto-increment from 1000)
publicId: varchar(12) (unique, nanoid)
productId: integer (FK → products.id)  // Optional link to store product
baseModelId: integer (FK → avatar_base_models.id)
slotName: text (not null)
meshUrl: text
textureUrl: text
thumbnailUrl: text (not null)
metadata: jsonb                   // Colors, materials, rarity, etc.
incompatibleWith: integer[]       // Array of item IDs that conflict
createdAt: timestamp
INDEX(baseModelId)
INDEX(productId)
INDEX(slotName)
```

### `avatar_equipped_items`
Currently equipped items per avatar:
```ts
id: integer (PK, auto-increment from 1000)
userAvatarId: integer (FK → user_avatars.id, cascade)
slotName: text (not null)
itemId: integer (FK → avatar_items.id)
colorVariant: jsonb               // User-selected colors/materials
equippedAt: timestamp (default now)
UNIQUE(userAvatarId, slotName)    // One item per slot per avatar
INDEX(userAvatarId)
INDEX(itemId)
```

### `user_avatar_inventory`
User's owned avatar items:
```ts
id: integer (PK, auto-increment from 1000)
userId: text (FK → user.id, cascade)
itemId: integer (FK → avatar_items.id)
acquiredAt: timestamp (default now)
source: text (not null)          // 'purchase', 'reward', 'starter', 'gift'
UNIQUE(userId, itemId)           // Can't own duplicate items
INDEX(userId)
```

---

## 💰 Points & Economy System

### `creator_points_config`
Creator-specific points configuration:
```ts
id: integer (PK, auto-increment from 1000)
creatorId: integer (FK → creators.id, cascade)
pointsName: text (default 'Points')    // "V-Bucks", "Coins", etc.
pointsSymbol: text (default '🪙')      // Optional emoji/symbol
createdAt: timestamp
UNIQUE(creatorId)                      // One config per creator
```

### `points_packages`
Purchase packages for points:
```ts
id: integer (PK, auto-increment from 1000)
publicId: varchar(12) (unique, nanoid)
creatorId: integer (FK → creators.id, cascade)
name: text (not null)                  // "Starter Pack", "Mega Bundle"
pointsAmount: integer (not null)
priceUSD: decimal(10,2) (not null)
bonusPoints: integer (default 0)       // Extra points incentive
isActive: boolean (default true)
displayOrder: integer (not null)
createdAt: timestamp
INDEX(creatorId)
INDEX(isActive)
```

### `points_purchases`
Real money → points transactions:
```ts
id: integer (PK, auto-increment from 1000)
transactionId: uuid (unique, not null)  // UUID v7 for ordering
userId: text (FK → user.id)
creatorId: integer (FK → creators.id)
packageId: integer (FK → points_packages.id)
pointsReceived: integer (not null)      // Including bonuses
amountUSD: decimal(10,2) (not null)
paymentProvider: text (not null)        // 'stripe', 'paypal'
paymentId: text (not null)              // External payment reference
status: text (default 'pending')        // 'pending', 'completed', 'failed', 'refunded'
purchasedAt: timestamp (default now)
INDEX(userId)
INDEX(creatorId)
INDEX(status)
UNIQUE(transactionId)
```

### `point_balances`
Current points balance per user per creator:
```ts
id: integer (PK, auto-increment from 1000)
userId: text (FK → user.id, cascade)
creatorId: integer (FK → creators.id)
balance: integer (default 0)
lastUpdated: timestamp (default now)
UNIQUE(userId, creatorId)               // One balance per user per creator
INDEX(userId)
INDEX(creatorId)
```

### `point_transactions`
Complete audit trail of all point movements:
```ts
id: integer (PK, auto-increment from 1000)
transactionId: uuid (unique, not null)  // UUID v7 for ordering
userId: text (FK → user.id)
creatorId: integer (FK → creators.id)
amount: integer (not null)              // Positive for gains, negative for spends
balance: integer (not null)             // Balance after transaction
type: text (not null)                   // 'earn', 'spend', 'purchase', 'refund', 'gift'
source: text (not null)                 // 'store', 'package_purchase', 'experience', 'admin'
referenceType: text                     // 'order', 'event', 'purchase', 'experience', etc.
referenceId: integer                    // ID of related entity
description: text
createdAt: timestamp (default now)
INDEX(userId, creatorId)
INDEX(type)
INDEX(createdAt)
UNIQUE(transactionId)
```

---

## 🛍️ Store, Products & Inventory

### `creator_stores`
Store configuration per creator:
```ts
id: integer (PK, auto-increment from 1000)
publicId: varchar(12) (unique, nanoid)
creatorId: integer (FK → creators.id, cascade)
storeName: text (not null)
description: text
bannerUrl: text
logoUrl: text
isActive: boolean (default true)
settings: jsonb                         // Custom store configurations
createdAt: timestamp
updatedAt: timestamp
UNIQUE(creatorId)                       // One store per creator
INDEX(isActive)
```

### `products`
Enhanced product catalog:
```ts
id: integer (PK, auto-increment from 1000)
publicId: varchar(12) (unique, nanoid)
creatorId: integer (FK → creators.id, cascade)
name: text (not null)
description: text
productType: text (not null)           // 'avatar', 'collectible', 'digital_asset', 'merchandise', 'access_pass', 'custom'
digitalAssetUrl: text
itemId: integer                         // FK to avatar_items.id for avatar products
pricePoints: integer (not null)
isActive: boolean (default true)
maxQuantity: integer                    // NULL for unlimited digital items
currentStock: integer                   // Current available stock
releaseDate: timestamp                  // Future release scheduling
metadata: jsonb                         // Flexible product data
displayOrder: integer
createdAt: timestamp
updatedAt: timestamp
INDEX(creatorId)
INDEX(productType)
INDEX(isActive)
INDEX(releaseDate)
```

### `orders`
Enhanced order tracking:
```ts
id: integer (PK, auto-increment from 1000)
orderNumber: uuid (unique, not null)    // UUID v7 human-readable
userId: text (FK → user.id)
creatorId: integer (FK → creators.id)
totalPoints: integer (not null)
status: text (default 'pending')        // 'pending', 'completed', 'shipped', 'cancelled'
paymentTransactionId: integer           // FK to point_transactions.id
notes: text
createdAt: timestamp (default now)
updatedAt: timestamp
INDEX(userId)
INDEX(creatorId)
INDEX(status)
UNIQUE(orderNumber)
```

### `order_items`
Individual items within orders:
```ts
id: integer (PK, auto-increment from 1000)
orderId: integer (FK → orders.id, cascade)
productId: integer (FK → products.id)
quantity: integer (default 1, not null)
pointsPerItem: integer (not null)
totalPoints: integer (not null)         // quantity * pointsPerItem
metadata: jsonb                         // Purchase-time product snapshot
createdAt: timestamp (default now)
INDEX(orderId)
INDEX(productId)
```

### `user_inventory` (Universal Digital Assets)
Complete user inventory across all product types:
```ts
id: integer (PK, auto-increment from 1000)
userId: text (FK → user.id, cascade)
productId: integer (FK → products.id)
orderId: integer (FK → orders.id)       // Purchase reference
quantity: integer (default 1, not null)
acquiredAt: timestamp (default now)
metadata: jsonb                         // Purchase details, usage tracking
UNIQUE(userId, productId)               // One entry per user per product
INDEX(userId)
INDEX(productId)
```

---

## 📊 Analytics & Tracking

### `event_attendance`
Event participation tracking:
```ts
id: integer (PK, auto-increment from 1000)
userId: text (FK → user.id)
eventId: integer (FK → events.id)
joinedAt: timestamp (default now)
leftAt: timestamp
duration: integer                       // seconds, calculated on leave
pointsEarned: integer (default 0)
metadata: jsonb                         // Additional tracking data
INDEX(userId)
INDEX(eventId)
INDEX(joinedAt)
```

---

## 🔄 Complete Schema Relationships

### Key Relationships:
1. **User → Creator**: One-to-one (a user can become a creator)
2. **Creator → Tribe**: One-to-one (each creator has one tribe)
3. **Creator → World**: One-to-one (each creator has one world)
4. **Creator → Store**: One-to-one (each creator has one store)
5. **World → Spaces**: One-to-many (worlds contain multiple spaces)
6. **Space → Events**: One-to-many (spaces can host multiple events)
7. **User → Avatars**: One-to-many (users can have multiple avatar configs)
8. **Avatar → Equipment**: Many-to-many through equipped items
9. **Creator → Products**: One-to-many (creators can have many products)
10. **User → Points**: Many-to-many (points per creator via balances)
11. **User → Inventory**: Many-to-many (universal digital asset ownership)
12. **User → Tribe Memberships**: Many-to-many (users can join multiple tribes)

### Cascade Rules:
- User deletion cascades to: sessions, avatars, memberships, inventory, balances
- Creator deletion cascades to: tribe, world, spaces, products, packages, store
- World deletion cascades to: spaces and their events
- Product deletion does NOT cascade to inventory (historical records preserved)
- Order deletion cascades to order items

### Public ID System:
- All main entities use 12-character nanoid public IDs for external API exposure
- Internal integer IDs used for foreign key relationships and performance
- Public IDs are used in all API endpoints for security and flexibility

---

## 📈 Database Statistics

**Total Tables**: 20 tables across 8 schema files
- **Authentication**: 4 tables (Better Auth integration)  
- **Creators & Tribes**: 3 tables
- **Worlds & Events**: 3 tables
- **Avatar System**: 5 tables
- **Points Economy**: 4 tables
- **Store & Inventory**: 4 tables
- **Analytics**: 1 table

**Total API Endpoints Supported**: 81 endpoints across 11 route files
**Primary Keys**: Mix of UUID (auth) and auto-incrementing integers (performance)
**Indexing Strategy**: Comprehensive indexing on foreign keys, status fields, and query patterns
**Data Types**: Text, integers, decimals, JSONB, timestamps with timezone support