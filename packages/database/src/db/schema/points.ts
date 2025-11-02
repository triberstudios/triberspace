import {
  pgTable,
  text,
  timestamp,
  boolean,
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

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

// UUID v7 provides time-ordered randomness
function generateUUIDv7() {
  // This is a placeholder - in production, use a proper UUID v7 library
  // For now, using crypto.randomUUID() as fallback
  return crypto.randomUUID();
}

// NanoID for short, URL-safe IDs
function generateNanoId() {
  // This is a placeholder - in production, use nanoid library
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// =============================================================================
// POINTS SYSTEM TABLES
// =============================================================================

export const pointsPackages = pgTable("points_packages", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
  publicId: varchar("public_id", { length: 12 }).unique().notNull().$defaultFn(() => generateNanoId()),
  worldId: integer("worldId").notNull().references(() => worlds.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  pointsAmount: integer("pointsAmount").notNull(),
  priceUSD: decimal("priceUSD", { precision: 10, scale: 2 }).notNull(),
  bonusPoints: integer("bonusPoints").default(0),
  isActive: boolean("isActive").default(true),
  displayOrder: integer("displayOrder").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("packages_world_idx").on(table.worldId),
  index("packages_is_active_idx").on(table.isActive),
]);

export const pointsPurchases = pgTable("points_purchases", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
  transactionId: uuid("transaction_id").notNull().$defaultFn(() => generateUUIDv7()),
  userId: text("userId").notNull().references(() => user.id),
  worldId: integer("worldId").notNull().references(() => worlds.id),
  packageId: integer("packageId").notNull().references(() => pointsPackages.id),
  pointsReceived: integer("pointsReceived").notNull(),
  amountUSD: decimal("amountUSD", { precision: 10, scale: 2 }).notNull(),
  paymentProvider: text("paymentProvider").notNull(),
  paymentId: text("paymentId").notNull(),
  status: text("status").notNull().default("pending"),
  purchasedAt: timestamp("purchasedAt", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("purchases_user_idx").on(table.userId),
  index("purchases_world_idx").on(table.worldId),
  index("purchases_status_idx").on(table.status),
  unique("purchases_transaction_idx").on(table.transactionId),
]);

export const pointTransactions = pgTable("point_transactions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
  transactionId: uuid("transaction_id").notNull().$defaultFn(() => generateUUIDv7()),
  userId: text("userId").notNull().references(() => user.id),
  worldId: integer("worldId").notNull().references(() => worlds.id),
  amount: integer("amount").notNull(),
  balance: integer("balance").notNull(),
  type: text("type").notNull(),
  source: text("source").notNull(),
  referenceType: text("referenceType"),
  referenceId: integer("referenceId"),
  description: text("description"),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("transactions_user_world_idx").on(table.userId, table.worldId),
  index("transactions_type_idx").on(table.type),
  index("transactions_created_at_idx").on(table.createdAt),
  unique("transactions_transaction_idx").on(table.transactionId),
]);