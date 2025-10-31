import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  index,
  unique,
  varchar,
  jsonb
} from "drizzle-orm/pg-core";
import { creators } from "./creators";
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
// WORLD SYSTEM TABLES
// =============================================================================

export const worlds = pgTable("worlds", {
  // Core identity
  id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
  publicId: varchar("public_id", { length: 12 }).unique().notNull().$defaultFn(() => generateNanoId()),
  slug: varchar("slug", { length: 100 }).unique().notNull(),

  // World info
  name: text("name").notNull(),
  description: text("description"),
  thumbnail_url: text("thumbnail_url"),
  banner_url: text("banner_url"),

  // Governance
  governanceType: text("governance_type").notNull().default("public"),
  founderId: text("founder_id").references(() => user.id),

  // Economic configuration
  pointsName: text("points_name").default("Points"),
  pointExchangeRate: integer("point_exchange_rate").default(100),
  platformFeePercent: integer("platform_fee_percent").default(33),
  membershipTiers: jsonb("membership_tiers"),

  // Engagement caps (free tier)
  pointsPerVisit: integer("points_per_visit").default(10),
  weeklyPointCap: integer("weekly_point_cap").default(500),
  monthlyPointCap: integer("monthly_point_cap").default(2000),

  // Voting/governance settings (for future)
  votingEligibility: text("voting_eligibility").default("members"),
  repThresholdForVoting: integer("rep_threshold_for_voting").default(100),
  stewardTermMonths: integer("steward_term_months").default(3),
  maxStewards: integer("max_stewards").default(5),

  // Cached stats (updated via triggers/jobs)
  spaceCount: integer("space_count").default(0),
  memberCount: integer("member_count").default(0),
  totalRevenue: integer("total_revenue").default(0),
  currentPayoutCycle: integer("current_payout_cycle").default(1),

  // Metadata
  settings: jsonb("settings"),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("worlds_slug_idx").on(table.slug),
  index("worlds_name_idx").on(table.name),
  index("worlds_governance_idx").on(table.governanceType),
  index("worlds_founder_idx").on(table.founderId),
]);

export const spaces = pgTable("spaces", {
  // Core identity
  id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
  publicId: varchar("public_id", { length: 12 }).unique().notNull().$defaultFn(() => generateNanoId()),

  // Ownership (spaces owned by creators, not worlds)
  creatorId: integer("creatorId").notNull().references(() => creators.id, { onDelete: "cascade" }),

  // Space info
  name: text("name").notNull(),
  description: text("description"),
  spaceType: text("spaceType").notNull(),
  thumbnail_url: text("thumbnail_url"),

  // Scene data (publishing)
  sceneDataUrl: text("scene_data_url"),
  sceneVersion: integer("scene_version").default(1),

  // Monetization
  isPremium: boolean("is_premium").default(false),
  accessCost: integer("access_cost").default(0),

  // Publishing status
  publishStatus: text("publish_status").notNull().default("draft"),
  publishedAt: timestamp("published_at", { withTimezone: true }),

  // Persistence & Availability (hybrid event model)
  persistence: text("persistence").notNull().default("permanent"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  availability: text("availability").notNull().default("always"),
  schedule: jsonb("schedule"),
  capacity: integer("capacity"),
  currentOccupancy: integer("current_occupancy").default(0),

  // Analytics (for SP calculation)
  totalVisits: integer("total_visits").default(0),
  totalDwellSeconds: integer("total_dwell_seconds").default(0),
  totalEngagementEarned: integer("total_engagement_earned").default(0),
  totalAwardsReceived: integer("total_awards_received").default(0),

  // Metadata
  tags: text("tags").array(),
  maxOccupancy: integer("max_occupancy").default(50),
  settings: jsonb("settings"),

  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("spaces_creator_idx").on(table.creatorId),
  index("space_type_idx").on(table.spaceType),
  index("spaces_status_idx").on(table.publishStatus),
  index("spaces_published_idx").on(table.publishedAt),
  index("spaces_is_active_idx").on(table.isActive),
  index("spaces_persistence_idx").on(table.persistence),
  index("spaces_availability_idx").on(table.availability),
  index("spaces_expires_at_idx").on(table.expiresAt),
]);

export const events = pgTable("events", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
  publicId: varchar("public_id", { length: 12 }).unique().notNull().$defaultFn(() => generateNanoId()),
  spaceId: integer("spaceId").notNull().references(() => spaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  startTime: timestamp("startTime", { withTimezone: true }).notNull(),
  endTime: timestamp("endTime", { withTimezone: true }).notNull(),
  description: text("description"),
  thumbnail_url: text("thumbnail_url"),
  capacity: integer("capacity"),
  requiresRSVP: boolean("requires_rsvp").default(false),
  metadata: jsonb("metadata"),
  isLive: boolean("isLive").default(false),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("space_idx").on(table.spaceId),
  index("start_time_idx").on(table.startTime),
  index("is_live_idx").on(table.isLive),
]);

// =============================================================================
// JUNCTION & ECONOMY TABLES
// =============================================================================

// Many-to-many relationship: spaces can belong to multiple worlds
export const spaceWorlds = pgTable("space_worlds", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
  spaceId: integer("space_id").notNull().references(() => spaces.id, { onDelete: "cascade" }),
  worldId: integer("world_id").notNull().references(() => worlds.id, { onDelete: "cascade" }),

  // Moderation
  addedBy: text("added_by").references(() => user.id),
  approvalStatus: text("approval_status").default("approved"),

  // Analytics (world-specific)
  visitsInWorld: integer("visits_in_world").default(0),

  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("space_world_idx").on(table.spaceId, table.worldId),
  index("space_worlds_space_idx").on(table.spaceId),
  index("space_worlds_world_idx").on(table.worldId),
  index("space_worlds_status_idx").on(table.approvalStatus),
]);

// World stewards: track roles, permissions, and Steward Points (SP)
export const worldStewards = pgTable("world_stewards", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
  worldId: integer("world_id").notNull().references(() => worlds.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),

  // Role
  role: text("role").notNull(),

  // Permissions (JSONB for flexibility)
  permissions: jsonb("permissions"),

  // Steward Points (SP) - current cycle
  currentSP: integer("current_sp").default(0),
  lifetimeSP: integer("lifetime_sp").default(0),

  // Election/appointment info (for future governance)
  appointedBy: text("appointed_by").references(() => user.id),
  termStartDate: timestamp("term_start_date", { withTimezone: true }),
  termEndDate: timestamp("term_end_date", { withTimezone: true }),
  isActive: boolean("is_active").default(true),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  unique("world_steward_idx").on(table.worldId, table.userId, table.role),
  index("world_stewards_world_idx").on(table.worldId),
  index("world_stewards_user_idx").on(table.userId),
  index("world_stewards_role_idx").on(table.role),
  index("world_stewards_active_idx").on(table.isActive),
]);

// World memberships: track user subscriptions to worlds
export const worldMemberships = pgTable("world_memberships", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
  worldId: integer("world_id").notNull().references(() => worlds.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),

  // Subscription
  tier: text("tier").notNull(),
  status: text("status").notNull().default("active"),
  pricePerMonth: integer("price_per_month").notNull(),

  // Stripe integration
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripeCustomerId: text("stripe_customer_id"),

  // Dates
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),

  // Metadata
  metadata: jsonb("metadata"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  unique("world_membership_idx").on(table.worldId, table.userId),
  index("world_memberships_world_idx").on(table.worldId),
  index("world_memberships_user_idx").on(table.userId),
  index("world_memberships_status_idx").on(table.status),
  index("world_memberships_stripe_idx").on(table.stripeSubscriptionId),
]);

// User point balances per world (V-Bucks model)
export const userWorldPoints = pgTable("user_world_points", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  worldId: integer("world_id").notNull().references(() => worlds.id, { onDelete: "cascade" }),

  // Balance
  balance: integer("balance").default(0),

  // Lifetime stats (for analytics)
  totalEarned: integer("total_earned").default(0),
  totalPurchased: integer("total_purchased").default(0),
  totalSpent: integer("total_spent").default(0),

  // Engagement caps tracking (resets weekly/monthly)
  weeklyEarned: integer("weekly_earned").default(0),
  monthlyEarned: integer("monthly_earned").default(0),
  lastWeeklyReset: timestamp("last_weekly_reset", { withTimezone: true }).defaultNow(),
  lastMonthlyReset: timestamp("last_monthly_reset", { withTimezone: true }).defaultNow(),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  unique("user_world_points_idx").on(table.userId, table.worldId),
  index("user_world_points_user_idx").on(table.userId),
  index("user_world_points_world_idx").on(table.worldId),
]);

// =============================================================================
// STUB TABLES (minimal implementation for future features)
// =============================================================================

// Monthly payout tracking
export const payoutCycles = pgTable("payout_cycles", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
  worldId: integer("world_id").notNull().references(() => worlds.id, { onDelete: "cascade" }),
  cycleNumber: integer("cycle_number").notNull(),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),
  totalRevenue: integer("total_revenue").default(0),
  totalSP: integer("total_sp").default(0),
  status: text("status").default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("payout_cycle_idx").on(table.worldId, table.cycleNumber),
  index("payout_cycles_world_idx").on(table.worldId),
  index("payout_cycles_status_idx").on(table.status),
]);

// Individual steward payouts
export const stewardPayouts = pgTable("steward_payouts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
  cycleId: integer("cycle_id").notNull().references(() => payoutCycles.id, { onDelete: "cascade" }),
  stewardId: integer("steward_id").notNull().references(() => worldStewards.id, { onDelete: "cascade" }),
  spEarned: integer("sp_earned").notNull(),
  payoutAmount: integer("payout_amount").notNull(),
  stripePayoutId: text("stripe_payout_id"),
  status: text("status").default("pending"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("steward_payout_idx").on(table.cycleId, table.stewardId),
  index("steward_payouts_cycle_idx").on(table.cycleId),
  index("steward_payouts_steward_idx").on(table.stewardId),
  index("steward_payouts_status_idx").on(table.status),
]);

// Awards given by users to creators
export const awards = pgTable("awards", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
  worldId: integer("world_id").notNull().references(() => worlds.id, { onDelete: "cascade" }),
  spaceId: integer("space_id").references(() => spaces.id, { onDelete: "set null" }),
  fromUserId: text("from_user_id").notNull().references(() => user.id),
  toUserId: text("to_user_id").notNull().references(() => user.id),
  awardType: text("award_type").notNull(),
  pointCost: integer("point_cost").notNull(),
  spValue: integer("sp_value").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("awards_world_idx").on(table.worldId),
  index("awards_space_idx").on(table.spaceId),
  index("awards_recipient_idx").on(table.toUserId),
]);