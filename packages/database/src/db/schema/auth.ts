import {
  pgTable,
  text,
  timestamp,
  boolean,
  jsonb,
  index,
  unique
} from "drizzle-orm/pg-core";

// =============================================================================
// AUTHENTICATION TABLES
// =============================================================================

export const user = pgTable("user", {
  id: text("id").primaryKey(), 
  name: text("name").notNull(), // Keep original name field for Better Auth compatibility
  firstName: text("firstName"), // Made nullable for migration
  lastName: text("lastName"), // Made nullable for migration
  userName: text("userName"), // Made nullable for migration
  email: text("email").notNull(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  avatar_url: text("avatar_url"),
  socialLinks: jsonb("socialLinks"),
  role: text("role").default("user"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  unique("user_email_idx").on(table.email),
  unique("user_username_idx").on(table.userName),
]);

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  unique("session_token_idx").on(table.token),
  index("session_user_idx").on(table.userId),
]);

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("account_user_idx").on(table.userId),
  unique("account_provider_idx").on(table.providerId, table.accountId),
]);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("identifier_idx").on(table.identifier),
]);