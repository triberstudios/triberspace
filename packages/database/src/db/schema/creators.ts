import {
  pgTable,
  text,
  timestamp,
  jsonb,
  integer,
  index,
  unique,
  varchar
} from "drizzle-orm/pg-core";
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
// CREATOR SYSTEM TABLES 
// =============================================================================

export const creators = pgTable("creators", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
  publicId: varchar("public_id", { length: 12 }).unique().notNull().$defaultFn(() => generateNanoId()),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  bio: text("bio"),
  pointsName: text("pointsName").default("Points"),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  unique("creators_user_idx").on(table.userId),
  index("creators_public_idx").on(table.publicId),
]);

export const tribes = pgTable("tribes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
  publicId: varchar("public_id", { length: 12 }).unique().notNull().$defaultFn(() => generateNanoId()),
  creatorId: integer("creatorId").notNull().references(() => creators.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  logo_url: text("logo_url"),
  banner_url: text("banner_url"),
  perks: jsonb("perks"),
  joinCost: integer("joinCost").default(0),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("tribes_creator_idx").on(table.creatorId),
  index("tribes_name_idx").on(table.name),
]);

export const userTribeMemberships = pgTable("user_tribe_memberships", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  tribeId: integer("tribeId").notNull().references(() => tribes.id, { onDelete: "cascade" }),
  role: text("role").default("member"),
  joinedAt: timestamp("joinedAt", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("user_tribe_memberships_idx").on(table.userId, table.tribeId),
  index("memberships_user_idx").on(table.userId),
  index("memberships_tribe_idx").on(table.tribeId),
]);