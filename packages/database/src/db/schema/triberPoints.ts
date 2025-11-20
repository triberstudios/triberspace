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
// UNIVERSAL TRIBER POINTS SYSTEM
// =============================================================================

// User's universal point balance (not per-world)
export const userPointBalances = pgTable("user_point_balances", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),

  // Separate purchased vs earned balances
  purchasedBalance: integer("purchased_balance").notNull().default(0),
  earnedBalance: integer("earned_balance").notNull().default(0),

  // Earned point spending limits (monthly reset)
  earnedSpentThisMonth: integer("earned_spent_this_month").notNull().default(0),
  earnedSpendingLimit: integer("earned_spending_limit").notNull().default(5000), // 5,000 points/month
  lastMonthlyReset: timestamp("last_monthly_reset", { withTimezone: true }).notNull().defaultNow(),

  // Lifetime stats
  totalPurchased: integer("total_purchased").notNull().default(0),
  totalEarned: integer("total_earned").notNull().default(0),
  totalSpent: integer("total_spent").notNull().default(0),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  unique("user_point_balance_user_idx").on(table.userId),
  index("user_point_balances_user_idx").on(table.userId),
]);

// Platform-wide point packages (no worldId!)
export const pointPackages = pgTable("point_packages", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
  publicId: varchar("public_id", { length: 12 }).unique().notNull().$defaultFn(() => generateNanoId()),

  // Package details
  name: text("name").notNull(),
  basePoints: integer("base_points").notNull(),
  bonusPoints: integer("bonus_points").notNull().default(0),
  bonusPercent: integer("bonus_percent").notNull().default(0),
  priceUSD: decimal("price_usd", { precision: 10, scale: 2 }).notNull(),

  // Display
  displayOrder: integer("display_order").notNull(),
  isActive: boolean("is_active").notNull().default(true),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("point_packages_active_idx").on(table.isActive),
  index("point_packages_display_order_idx").on(table.displayOrder),
]);

// Point purchases (no worldId!)
export const pointPurchases = pgTable("point_purchases", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
  transactionId: uuid("transaction_id").notNull().unique().$defaultFn(() => generateUUIDv7()),
  userId: text("user_id").notNull().references(() => user.id),
  packageId: integer("package_id").notNull().references(() => pointPackages.id),

  // Points received
  basePoints: integer("base_points").notNull(),
  bonusPoints: integer("bonus_points").notNull(),
  totalPoints: integer("total_points").notNull(),

  // Payment info
  amountUSD: decimal("amount_usd", { precision: 10, scale: 2 }).notNull(),
  paymentProvider: text("payment_provider"), // "stripe", null for now (stub)
  paymentId: text("payment_id"), // Stripe payment intent ID
  status: text("status").notNull().default("pending"), // "pending", "completed", "failed"

  purchasedAt: timestamp("purchased_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("point_purchases_user_idx").on(table.userId),
  index("point_purchases_status_idx").on(table.status),
  index("point_purchases_transaction_idx").on(table.transactionId),
]);

// Universal transaction log with creator attribution
export const pointTransactionsNew = pgTable("point_transactions_new", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
  transactionId: uuid("transaction_id").notNull().unique().$defaultFn(() => generateUUIDv7()),
  userId: text("user_id").notNull().references(() => user.id),

  // Attribution (which creator's world was this in?)
  creatorId: integer("creator_id").references(() => creators.id),
  spaceId: integer("space_id"), // No FK to avoid circular dependency

  // Transaction details
  amount: integer("amount").notNull(), // Positive = earn, Negative = spend
  balanceAfter: integer("balance_after").notNull(),

  type: text("type").notNull(), // "purchase", "earn", "spend", "subscription"
  pointType: text("point_type").notNull(), // "purchased" or "earned"
  source: text("source").notNull(), // "package_purchase", "engagement", "world_sub", "product"

  // Reference to what caused this transaction
  referenceType: text("reference_type"), // "point_purchase", "subscription", "product_purchase"
  referenceId: integer("reference_id"),
  description: text("description"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("point_transactions_new_user_idx").on(table.userId),
  index("point_transactions_new_creator_idx").on(table.creatorId),
  index("point_transactions_new_type_idx").on(table.type),
  index("point_transactions_new_created_at_idx").on(table.createdAt),
]);

// Creator earnings tracking
export const creatorEarnings = pgTable("creator_earnings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
  creatorId: integer("creator_id").notNull().references(() => creators.id, { onDelete: "cascade" }),

  // Current earnings balance (in USD cents)
  pendingEarnings: integer("pending_earnings").notNull().default(0),
  lifetimeEarnings: integer("lifetime_earnings").notNull().default(0),
  totalCashedOut: integer("total_cashed_out").notNull().default(0),

  // Breakdown by source (in USD cents)
  earningsFromSubscriptions: integer("earnings_from_subscriptions").notNull().default(0),
  earningsFromProducts: integer("earnings_from_products").notNull().default(0),
  earningsFromPointPacks: integer("earnings_from_point_packs").notNull().default(0),

  // Cashout settings
  minimumCashout: integer("minimum_cashout").notNull().default(5000), // $50 minimum

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  unique("creator_earnings_creator_idx").on(table.creatorId),
  index("creator_earnings_pending_idx").on(table.pendingEarnings),
]);

// Revenue split tracking (40/50/10)
export const revenueSplits = pgTable("revenue_splits", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
  transactionId: uuid("transaction_id").notNull().references(() => pointTransactionsNew.transactionId),

  // What was spent
  pointsSpent: integer("points_spent").notNull(),
  usdValue: integer("usd_value").notNull(), // In cents

  // The split (all in USD cents)
  platformShare: integer("platform_share").notNull(), // 40%
  creatorShare: integer("creator_share").notNull(), // 50%
  managerShare: integer("manager_share").notNull(), // 10%

  // Who gets what
  creatorId: integer("creator_id").notNull().references(() => creators.id),
  managerId: text("manager_id").references(() => user.id), // Space publisher

  splitType: text("split_type").notNull(), // "subscription", "product", "point_pack"

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("revenue_splits_creator_idx").on(table.creatorId),
  index("revenue_splits_manager_idx").on(table.managerId),
  index("revenue_splits_transaction_idx").on(table.transactionId),
  index("revenue_splits_type_idx").on(table.splitType),
]);

// Point-based world subscriptions (5,000 points/month)
export const worldSubscriptions = pgTable("world_subscriptions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  creatorId: integer("creator_id").notNull().references(() => creators.id, { onDelete: "cascade" }),

  // Point-based subscription
  pricePoints: integer("price_points").notNull().default(5000), // Fixed 5,000 points
  status: text("status").notNull().default("active"), // "active", "cancelled", "expired"

  // Auto-renewal
  autoRenew: boolean("auto_renew").notNull().default(true),
  nextBillingDate: timestamp("next_billing_date", { withTimezone: true }).notNull(),

  // History
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }).notNull(),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }).notNull(),
  subscribedAt: timestamp("subscribed_at", { withTimezone: true }).notNull().defaultNow(),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  unique("world_subscription_user_creator_idx").on(table.userId, table.creatorId),
  index("world_subscriptions_user_idx").on(table.userId),
  index("world_subscriptions_creator_idx").on(table.creatorId),
  index("world_subscriptions_status_idx").on(table.status),
  index("world_subscriptions_next_billing_idx").on(table.nextBillingDate),
]);

// Platform-level Triber Plus subscriptions ($15/mo for 16,500 points)
export const triberPlusSubscriptions = pgTable("triber_plus_subscriptions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),

  // Stripe integration (stubbed for now)
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  stripeCustomerId: text("stripe_customer_id"),

  // Subscription details
  priceUSD: decimal("price_usd", { precision: 10, scale: 2 }).notNull().default("15.00"),
  monthlyPoints: integer("monthly_points").notNull().default(16500), // 10% bonus

  status: text("status").notNull().default("pending"), // "pending", "active", "cancelled"
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),

  subscribedAt: timestamp("subscribed_at", { withTimezone: true }).notNull().defaultNow(),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  unique("triber_plus_user_idx").on(table.userId),
  index("triber_plus_stripe_sub_idx").on(table.stripeSubscriptionId),
  index("triber_plus_status_idx").on(table.status),
]);

// Creator cashout requests
export const cashoutRequests = pgTable("cashout_requests", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
  requestId: uuid("request_id").notNull().unique().$defaultFn(() => generateUUIDv7()),
  creatorId: integer("creator_id").notNull().references(() => creators.id, { onDelete: "cascade" }),

  // Amount
  amountCents: integer("amount_cents").notNull(), // USD cents

  status: text("status").notNull().default("pending"), // "pending", "processing", "completed", "failed"

  // Payout provider (stubbed for now)
  payoutProvider: text("payout_provider"), // "stripe_connect", "paypal"
  payoutId: text("payout_id"), // External payout ID
  payoutFee: integer("payout_fee").default(0), // Provider fees in cents

  // Timestamps
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),

  notes: text("notes"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("cashout_requests_creator_idx").on(table.creatorId),
  index("cashout_requests_status_idx").on(table.status),
  index("cashout_requests_requested_at_idx").on(table.requestedAt),
]);
