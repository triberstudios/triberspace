# 📦 Triberspace Schema Design (Drizzle ORM + Better Auth)

This document outlines the full database schema for **Triberspace**. It integrates **Better Auth** for user authentication and session management, and defines all custom tables needed for creators, events, products, points, avatars, and more.

All `userId` references use `text` as UUIDs, consistent with Better Auth's user model. This schema is optimized for clarity and compatibility with LLMs, developers, and schema tools.

---

## 👤 Users & Authentication (via Better Auth)

### `user`
Primary user table (extended with Triberspace fields):
```ts
id: text (PK, UUID)
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

## 🎭 Avatar System

### `avatar_base_models`
Foundation models for avatars:
```ts
id: text (PK, UUID)
name: text                    // 'Human Male', 'Human Female', 'Robot', etc.
meshUrl: text
skeletonUrl: text
thumbnailUrl: text
rigType: text                 // 'humanoid', 'quadruped', etc.
createdAt: timestamp
```

### `avatar_slots`
Customization slots per base model:
```ts
id: text (PK)
baseModelId: text (FK → avatar_base_models.id)
slotName: text               // 'head', 'hair', 'torso', 'legs', etc.
slotType: text               // 'mesh_replacement', 'attachment', 'texture_overlay'
maxItems: integer = 1        // Some slots allow multiple items
displayOrder: integer        // For UI organization
UNIQUE(baseModelId, slotName)
```

### `user_avatars`
User's avatar configurations:
```ts
id: text (PK)
userId: text (FK → user.id, cascade)
baseModelId: text (FK → avatar_base_models.id)
name: text = 'My Avatar'
isActive: boolean = true
createdAt: timestamp
updatedAt: timestamp
UNIQUE(userId, isActive) WHERE isActive = true  // Only one active avatar
```

### `avatar_items`
Wearable items for avatars:
```ts
id: text (PK)
productId: integer (FK → products.id)
baseModelId: text (FK → avatar_base_models.id)
slotName: text
meshUrl: text
textureUrl: text (optional)
thumbnailUrl: text
metadata: jsonb              // Colors, materials, etc.
incompatibleWith: text[]     // Array of item IDs that conflict
FOREIGN KEY (baseModelId, slotName) → avatar_slots
```

### `avatar_equipped_items`
Currently equipped items:
```ts
id: text (PK)
userAvatarId: text (FK → user_avatars.id, cascade)
slotName: text
itemId: text (FK → avatar_items.id)
colorVariant: jsonb          // User-selected colors/materials
equippedAt: timestamp
UNIQUE(userAvatarId, slotName)
```

### `user_avatar_inventory`
User's owned avatar items:
```ts
id: text (PK)
userId: text (FK → user.id, cascade)
itemId: text (FK → avatar_items.id)
acquiredAt: timestamp
source: text                 // 'purchase', 'reward', 'starter'
UNIQUE(userId, itemId)
```

---

## 🧑‍🎤 Creators & Tribes

### `creators`
```ts
id: text (PK, UUID)
userId: text (FK → user.id, cascade, unique)
bio: text
pointsName: text (default 'Points')
tribeId: text (FK → tribes.id)
worldId: text (FK → worlds.id)
createdAt: timestamp
updatedAt: timestamp
```

### `tribes`
Each creator has one tribe:
```ts
id: text (PK)
creatorId: text (FK → creators.id, cascade)
name: text
description: text
perks: jsonb
joinCost: integer
createdAt: timestamp
```

### `user_tribe_memberships`
```ts
id: text (PK)
userId: text (FK → user.id, cascade)
tribeId: text (FK → tribes.id, cascade)
role: text = 'member'
joinedAt: timestamp
INDEX(userId, tribeId)
```

---

## 🌍 Worlds, Spaces & Events

### `worlds`
```ts
id: text (PK)
creatorId: text (FK → creators.id, cascade)
name: text
description: text
createdAt: timestamp
```

### `spaces`
```ts
id: text (PK)
worldId: text (FK → worlds.id, cascade)
name: text
spaceType: text              // 'store', 'gallery', 'game', etc.
isActive: boolean = true
createdAt: timestamp
```

### `events`
```ts
id: text (PK)
spaceId: text (FK → spaces.id, cascade)
name: text
startTime: timestamp
endTime: timestamp
description: text
isLive: boolean = false
createdAt: timestamp
```

---

## 💰 Points System

### `creator_points_config`
Creator-specific points configuration:
```ts
id: text (PK)
creatorId: text (FK → creators.id, unique)
pointsName: text = 'Points'     // "V-Bucks", "Coins", etc.
pointsSymbol: text = '🪙'       // Optional emoji/symbol
createdAt: timestamp
```

### `points_packages`
Purchase packages for points:
```ts
id: text (PK)
creatorId: text (FK → creators.id)
name: text                      // "Starter Pack", "Mega Bundle"
pointsAmount: integer
priceUSD: decimal
bonusPoints: integer = 0        // Extra points incentive
isActive: boolean = true
displayOrder: integer
createdAt: timestamp
```

### `points_purchases`
Real money → points transactions:
```ts
id: text (PK)
userId: text (FK → user.id)
creatorId: text (FK → creators.id)
packageId: text (FK → points_packages.id)
pointsReceived: integer         // Including bonuses
amountUSD: decimal
paymentProvider: text           // 'stripe', 'paypal'
paymentId: text                 // External payment reference
status: text                    // 'pending', 'completed', 'failed', 'refunded'
purchasedAt: timestamp
```

### `point_balances`
One row per (user, creator) combo:
```ts
id: text (PK)
userId: text (FK → user.id, cascade)
creatorId: text (FK → creators.id)
balance: integer = 0
lastUpdated: timestamp
UNIQUE(userId, creatorId)
INDEX(userId, creatorId)
```

### `point_transactions`
All point movements:
```ts
id: text (PK)
userId: text (FK → user.id)
creatorId: text (FK → creators.id)
amount: integer                 // Positive for gains, negative for spends
balance: integer                // Balance after transaction
type: text                      // 'earned', 'spent', 'purchased', 'refunded', 'gifted'
source: text                    // 'experience', 'shop', 'purchase', 'admin'
referenceType: text             // 'order', 'event', 'purchase', etc.
referenceId: text               // ID of related entity
description: text
createdAt: timestamp
INDEX(userId, creatorId)
```

---

## 🛍️ Store, Products & Inventory

### `creator_stores`
Store configuration per creator:
```ts
id: text (PK)
creatorId: text (FK → creators.id, unique)
storeName: text
storeDescription: text
isActive: boolean = true
featuredProductIds: text[]      // Array of product IDs
categories: jsonb               // Custom categories
createdAt: timestamp
```

### `products`
Enhanced product catalog:
```ts
id: text (PK)
creatorId: text (FK → creators.id)
storeId: text (FK → creator_stores.id)
name: text
description: text
category: text                  // 'avatar_items', 'digital_content', 'physical_merch'
subcategory: text               // Creator-defined
priceInPoints: integer
priceInUSD: decimal             // Optional direct purchase
stock: integer                  // NULL for unlimited digital items
maxPerUser: integer             // Purchase limit per user
requiredTribeLevel: integer     // Exclusive to tribe members
imageUrls: text[]               // Multiple images
isActive: boolean = true
createdAt: timestamp
updatedAt: timestamp
INDEX(creatorId)
```

### `orders`
Enhanced order tracking:
```ts
id: text (PK)
userId: text (FK → user.id)
creatorId: text (FK → creators.id)
orderNumber: text (unique)      // Human-readable
items: jsonb                    // Array of {productId, quantity, priceInPoints}
subtotalPoints: integer
discountPoints: integer = 0
totalPoints: integer
status: text                    // 'pending', 'completed', 'shipped', 'cancelled'
shippingInfo: jsonb             // For physical items
createdAt: timestamp
completedAt: timestamp
INDEX(userId)
```

### `user_product_inventory`
```ts
id: text (PK)
userId: text (FK → user.id, cascade)
productId: text (FK → products.id)
source: text                    // 'purchase', 'reward', etc.
acquiredAt: timestamp
UNIQUE(userId, productId)
INDEX(userId)
```

---

## 📅 Calendar

### `calendar_events`
```ts
id: text (PK)
creatorId: text (FK → creators.id)
title: text
description: text
startTime: timestamp
endTime: timestamp
linkedEventId: text (FK → events.id)
isPublic: boolean = true
createdAt: timestamp
```

---

## 📊 Analytics

### `event_attendance`
```ts
id: text (PK)
userId: text (FK → user.id)
eventId: text (FK → events.id)
joinedAt: timestamp
duration: integer               // seconds
pointsEarned: integer
```

---

## 🔄 Schema Relationships

### Key Relationships:
1. **User → Creator**: One-to-one (a user can be a creator)
2. **Creator → Tribe**: One-to-one (each creator has one tribe)
3. **Creator → World**: One-to-one (each creator has one world)
4. **World → Spaces**: One-to-many
5. **User → Avatar**: One-to-many configurations, one active
6. **Avatar → Items**: Many-to-many through equipped items
7. **Creator → Products**: One-to-many
8. **User → Points**: Many-to-many (points per creator)

### Cascade Rules:
- User deletion cascades to: sessions, avatars, memberships, inventory
- Creator deletion cascades to: tribe, world, spaces, products
- Product deletion does NOT cascade to inventory (historical records)