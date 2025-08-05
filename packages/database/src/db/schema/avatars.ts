import {
  pgTable,
  text,
  timestamp,
  boolean,
  jsonb,
  integer,
  index,
  unique,
  uniqueIndex,
  varchar
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { user } from "./auth";

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

// NanoID for short, URL-safe IDs
function generateNanoId() {
  // This is a placeholder - in production, use nanoid library
  // For now, generating a simple random string
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// =============================================================================
// AVATAR SYSTEM TABLES
// =============================================================================

export const avatarBaseModels = pgTable("avatar_base_models", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
  publicId: varchar("public_id", { length: 12 }).unique().notNull().$defaultFn(() => generateNanoId()),
  name: text("name").notNull(),
  meshUrl: text("meshUrl").notNull(),
  skeletonUrl: text("skeletonUrl").notNull(),
  thumbnailUrl: text("thumbnailUrl"),
  rigType: text("rigType").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("avatar_base_name_idx").on(table.name),
]);

export const avatarSlots = pgTable("avatar_slots", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
  baseModelId: integer("baseModelId").notNull().references(() => avatarBaseModels.id, { onDelete: "cascade" }),
  slotName: text("slotName").notNull(),
  slotType: text("slotType").notNull(),
  maxItems: integer("maxItems").default(1),
  displayOrder: integer("displayOrder").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("avatar_slots_base_slot_idx").on(table.baseModelId, table.slotName),
  index("avatar_slots_base_idx").on(table.baseModelId),
]);

export const userAvatars = pgTable("user_avatars", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
  publicId: varchar("public_id", { length: 12 }).unique().notNull().$defaultFn(() => generateNanoId()),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  baseModelId: integer("baseModelId").notNull().references(() => avatarBaseModels.id),
  name: text("name").default("My Avatar"),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("user_avatars_user_idx").on(table.userId),
  index("user_avatars_base_idx").on(table.baseModelId),
  uniqueIndex("active_user_avatar_idx").on(table.userId, table.isActive).where(sql`${table.isActive} = true`),
]);

export const avatarItems = pgTable("avatar_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
  publicId: varchar("public_id", { length: 12 }).unique().notNull().$defaultFn(() => generateNanoId()),
  productId: integer("productId"), // Will reference products.id from store.ts
  baseModelId: integer("baseModelId").notNull().references(() => avatarBaseModels.id),
  slotName: text("slotName").notNull(),
  meshUrl: text("meshUrl"),
  textureUrl: text("textureUrl"),
  thumbnailUrl: text("thumbnailUrl").notNull(),
  metadata: jsonb("metadata"),
  incompatibleWith: integer("incompatibleWith").array(),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("avatar_items_base_idx").on(table.baseModelId),
  index("avatar_items_product_idx").on(table.productId),
  index("avatar_items_slot_idx").on(table.slotName),
]);

export const avatarEquippedItems = pgTable("avatar_equipped_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
  userAvatarId: integer("userAvatarId").notNull().references(() => userAvatars.id, { onDelete: "cascade" }),
  slotName: text("slotName").notNull(),
  itemId: integer("itemId").notNull().references(() => avatarItems.id),
  colorVariant: jsonb("colorVariant"),
  equippedAt: timestamp("equippedAt", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("equipped_avatar_slot_idx").on(table.userAvatarId, table.slotName),
  index("equipped_avatar_idx").on(table.userAvatarId),
  index("equipped_item_idx").on(table.itemId),
]);

export const userAvatarInventory = pgTable("user_avatar_inventory", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  itemId: integer("itemId").notNull().references(() => avatarItems.id),
  acquiredAt: timestamp("acquiredAt", { withTimezone: true }).notNull().defaultNow(),
  source: text("source").notNull(),
}, (table) => [
  unique("avatar_inventory_user_item_idx").on(table.userId, table.itemId),
  index("avatar_inventory_user_idx").on(table.userId),
]);