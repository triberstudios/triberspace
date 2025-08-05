import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  index,
  unique,
  varchar
} from "drizzle-orm/pg-core";
import { creators } from "./creators";

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
// WORLD SYSTEM TABLES
// =============================================================================

export const worlds = pgTable("worlds", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
  publicId: varchar("public_id", { length: 12 }).unique().notNull().$defaultFn(() => generateNanoId()),
  creatorId: integer("creatorId").notNull().references(() => creators.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("creator_idx").on(table.creatorId),
  index("worlds_name_idx").on(table.name),
]);

export const spaces = pgTable("spaces", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
  publicId: varchar("public_id", { length: 12 }).unique().notNull().$defaultFn(() => generateNanoId()),
  worldId: integer("worldId").notNull().references(() => worlds.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  spaceType: text("spaceType").notNull(),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("world_idx").on(table.worldId),
  index("space_type_idx").on(table.spaceType),
  index("spaces_is_active_idx").on(table.isActive),
]);

export const events = pgTable("events", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
  publicId: varchar("public_id", { length: 12 }).unique().notNull().$defaultFn(() => generateNanoId()),
  spaceId: integer("spaceId").notNull().references(() => spaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  startTime: timestamp("startTime", { withTimezone: true }).notNull(),
  endTime: timestamp("endTime", { withTimezone: true }).notNull(),
  description: text("description"),
  isLive: boolean("isLive").default(false),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("space_idx").on(table.spaceId),
  index("start_time_idx").on(table.startTime),
  index("is_live_idx").on(table.isLive),
]);