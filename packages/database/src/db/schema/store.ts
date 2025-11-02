import {
  pgTable,
  text,
  timestamp,
  boolean,
  jsonb,
  integer,
  decimal,
  index,
  unique,
  uuid,
  varchar
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { creators } from "./creators";
import { worlds } from "./worlds";
// Note: pointTransactions reference is handled in relations.ts to avoid circular imports

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

// UUID v7 provides time-ordered randomness
function generateUUIDv7() {
  return crypto.randomUUID();
}

// NanoID for short, URL-safe IDs
function generateNanoId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// =============================================================================
// STORE SYSTEM TABLES
// =============================================================================

export const products = pgTable("products", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
  publicId: varchar("public_id", { length: 12 }).unique().notNull().$defaultFn(() => generateNanoId()),
  creatorId: integer("creatorId").notNull().references(() => creators.id, { onDelete: "cascade" }),
  worldId: integer("world_id").notNull().references(() => worlds.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  productType: text("productType").notNull(),
  digitalAssetUrl: text("digitalAssetUrl"),
  thumbnail_url: text("thumbnail_url"),
  gallery_urls: text("gallery_urls").array(),
  itemId: integer("itemId"),
  pricePoints: integer("pricePoints").notNull(),
  isActive: boolean("isActive").default(true),
  maxQuantity: integer("maxQuantity"),
  currentStock: integer("currentStock"),
  releaseDate: timestamp("releaseDate", { withTimezone: true }),
  metadata: jsonb("metadata"),
  displayOrder: integer("displayOrder"),
  totalSales: integer("total_sales").default(0),
  totalRevenuePoints: integer("total_revenue_points").default(0),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("products_creator_idx").on(table.creatorId),
  index("products_world_idx").on(table.worldId),
  index("products_type_idx").on(table.productType),
  index("products_active_idx").on(table.isActive),
  index("products_release_idx").on(table.releaseDate),
]);

export const orders = pgTable("orders", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
  orderNumber: uuid("order_number").notNull().$defaultFn(() => generateUUIDv7()),
  userId: text("userId").notNull().references(() => user.id),
  creatorId: integer("creatorId").notNull().references(() => creators.id),
  worldId: integer("worldId").notNull().references(() => worlds.id),
  totalPoints: integer("totalPoints").notNull(),
  status: text("status").notNull().default("pending"),
  paymentTransactionId: integer("paymentTransactionId"), // FK defined in relations.ts
  notes: text("notes"),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("orders_user_idx").on(table.userId),
  index("orders_creator_idx").on(table.creatorId),
  index("orders_world_idx").on(table.worldId),
  index("orders_status_idx").on(table.status),
  unique("order_number_idx").on(table.orderNumber),
]);

export const orderItems = pgTable("order_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
  orderId: integer("orderId").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("productId").notNull().references(() => products.id),
  quantity: integer("quantity").notNull().default(1),
  pointsPerItem: integer("pointsPerItem").notNull(),
  totalPoints: integer("totalPoints").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("order_items_order_idx").on(table.orderId),
  index("order_items_product_idx").on(table.productId),
]);

export const userInventory = pgTable("user_inventory", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  productId: integer("productId").notNull().references(() => products.id),
  orderId: integer("orderId").references(() => orders.id),
  quantity: integer("quantity").notNull().default(1),
  acquiredAt: timestamp("acquiredAt", { withTimezone: true }).notNull().defaultNow(),
  metadata: jsonb("metadata"),
}, (table) => [
  index("inventory_user_idx").on(table.userId),
  index("inventory_product_idx").on(table.productId),
  unique("inventory_user_product_idx").on(table.userId, table.productId),
]);