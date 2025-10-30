import { relations } from "drizzle-orm";
import {
  user,
  session,
  account,
  verification
} from "./auth";
import {
  avatarBaseModels,
  avatarSlots,
  userAvatars,
  avatarItems,
  avatarEquippedItems,
  userAvatarInventory
} from "./avatars";
import {
  creators,
  tribes,
  userTribeMemberships
} from "./creators";
import {
  worlds,
  spaces,
  events,
  spaceWorlds,
  worldStewards,
  worldMemberships,
  userWorldPoints,
  payoutCycles,
  stewardPayouts,
  awards
} from "./worlds";
import {
  creatorPointsConfig,
  pointsPackages,
  pointsPurchases,
  pointBalances,
  pointTransactions
} from "./points";
import {
  products,
  creatorStores,
  orders,
  orderItems,
  userInventory
} from "./store";
import {
  calendarEvents,
  attendance,
  eventAttendance
} from "./analytics";

// =============================================================================
// AUTH RELATIONS
// =============================================================================

export const userRelations = relations(user, ({ many, one }) => ({
  sessions: many(session),
  accounts: many(account),
  creatorProfile: one(creators),
  tribeMemberships: many(userTribeMemberships),
  avatars: many(userAvatars),
  avatarInventory: many(userAvatarInventory),
  pointBalances: many(pointBalances),
  pointTransactions: many(pointTransactions),
  pointsPurchases: many(pointsPurchases),
  orders: many(orders),
  inventory: many(userInventory),
  eventAttendances: many(eventAttendance), // Legacy
  attendances: many(attendance),
  foundedWorlds: many(worlds),
  worldStewardships: many(worldStewards),
  worldMemberships: many(worldMemberships),
  worldPoints: many(userWorldPoints),
  awardsGiven: many(awards),
  awardsReceived: many(awards),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

// =============================================================================
// CREATOR RELATIONS
// =============================================================================

export const creatorRelations = relations(creators, ({ one, many }) => ({
  user: one(user, {
    fields: [creators.userId],
    references: [user.id],
  }),
  tribe: one(tribes),
  spaces: many(spaces),
  store: one(creatorStores),
  pointsConfig: one(creatorPointsConfig),
  pointsPackages: many(pointsPackages),
  products: many(products),
  pointsPurchases: many(pointsPurchases),
  pointTransactions: many(pointTransactions),
  pointBalances: many(pointBalances),
  orders: many(orders),
}));

export const tribeRelations = relations(tribes, ({ one, many }) => ({
  creator: one(creators, {
    fields: [tribes.creatorId],
    references: [creators.id],
  }),
  memberships: many(userTribeMemberships),
}));

export const userTribeMembershipRelations = relations(userTribeMemberships, ({ one }) => ({
  user: one(user, {
    fields: [userTribeMemberships.userId],
    references: [user.id],
  }),
  tribe: one(tribes, {
    fields: [userTribeMemberships.tribeId],
    references: [tribes.id],
  }),
}));

// =============================================================================
// WORLD RELATIONS
// =============================================================================

export const worldRelations = relations(worlds, ({ one, many }) => ({
  founder: one(user, {
    fields: [worlds.founderId],
    references: [user.id],
  }),
  spaceWorlds: many(spaceWorlds),
  stewards: many(worldStewards),
  memberships: many(worldMemberships),
  userPoints: many(userWorldPoints),
  products: many(products),
  payoutCycles: many(payoutCycles),
  awards: many(awards),
}));

export const spaceRelations = relations(spaces, ({ one, many }) => ({
  creator: one(creators, {
    fields: [spaces.creatorId],
    references: [creators.id],
  }),
  spaceWorlds: many(spaceWorlds),
  events: many(events),
  awards: many(awards),
  attendances: many(attendance),
}));

export const eventRelations = relations(events, ({ one, many }) => ({
  space: one(spaces, {
    fields: [events.spaceId],
    references: [spaces.id],
  }),
  calendarEvent: one(calendarEvents),
  eventAttendances: many(eventAttendance), // Legacy
  attendances: many(attendance),
}));

// Junction table relations
export const spaceWorldRelations = relations(spaceWorlds, ({ one }) => ({
  space: one(spaces, {
    fields: [spaceWorlds.spaceId],
    references: [spaces.id],
  }),
  world: one(worlds, {
    fields: [spaceWorlds.worldId],
    references: [worlds.id],
  }),
  addedByUser: one(user, {
    fields: [spaceWorlds.addedBy],
    references: [user.id],
  }),
}));

// World economy relations
export const worldStewardRelations = relations(worldStewards, ({ one, many }) => ({
  world: one(worlds, {
    fields: [worldStewards.worldId],
    references: [worlds.id],
  }),
  user: one(user, {
    fields: [worldStewards.userId],
    references: [user.id],
  }),
  appointedByUser: one(user, {
    fields: [worldStewards.appointedBy],
    references: [user.id],
  }),
  payouts: many(stewardPayouts),
}));

export const worldMembershipRelations = relations(worldMemberships, ({ one }) => ({
  world: one(worlds, {
    fields: [worldMemberships.worldId],
    references: [worlds.id],
  }),
  user: one(user, {
    fields: [worldMemberships.userId],
    references: [user.id],
  }),
}));

export const userWorldPointsRelations = relations(userWorldPoints, ({ one }) => ({
  user: one(user, {
    fields: [userWorldPoints.userId],
    references: [user.id],
  }),
  world: one(worlds, {
    fields: [userWorldPoints.worldId],
    references: [worlds.id],
  }),
}));

// Payout cycle relations
export const payoutCycleRelations = relations(payoutCycles, ({ one, many }) => ({
  world: one(worlds, {
    fields: [payoutCycles.worldId],
    references: [worlds.id],
  }),
  stewardPayouts: many(stewardPayouts),
}));

export const stewardPayoutRelations = relations(stewardPayouts, ({ one }) => ({
  cycle: one(payoutCycles, {
    fields: [stewardPayouts.cycleId],
    references: [payoutCycles.id],
  }),
  steward: one(worldStewards, {
    fields: [stewardPayouts.stewardId],
    references: [worldStewards.id],
  }),
}));

// Award relations
export const awardRelations = relations(awards, ({ one }) => ({
  world: one(worlds, {
    fields: [awards.worldId],
    references: [worlds.id],
  }),
  space: one(spaces, {
    fields: [awards.spaceId],
    references: [spaces.id],
  }),
  fromUser: one(user, {
    fields: [awards.fromUserId],
    references: [user.id],
  }),
  toUser: one(user, {
    fields: [awards.toUserId],
    references: [user.id],
  }),
}));

// =============================================================================
// AVATAR RELATIONS
// =============================================================================

export const avatarBaseModelRelations = relations(avatarBaseModels, ({ many }) => ({
  slots: many(avatarSlots),
  userAvatars: many(userAvatars),
  items: many(avatarItems),
}));

export const avatarSlotRelations = relations(avatarSlots, ({ one }) => ({
  baseModel: one(avatarBaseModels, {
    fields: [avatarSlots.baseModelId],
    references: [avatarBaseModels.id],
  }),
}));

export const userAvatarRelations = relations(userAvatars, ({ one, many }) => ({
  user: one(user, {
    fields: [userAvatars.userId],
    references: [user.id],
  }),
  baseModel: one(avatarBaseModels, {
    fields: [userAvatars.baseModelId],
    references: [avatarBaseModels.id],
  }),
  equippedItems: many(avatarEquippedItems),
}));

export const avatarItemRelations = relations(avatarItems, ({ one, many }) => ({
  baseModel: one(avatarBaseModels, {
    fields: [avatarItems.baseModelId],
    references: [avatarBaseModels.id],
  }),
  product: one(products, {
    fields: [avatarItems.productId],
    references: [products.id],
  }),
  equippedItems: many(avatarEquippedItems),
  inventoryItems: many(userAvatarInventory),
}));

export const avatarEquippedItemRelations = relations(avatarEquippedItems, ({ one }) => ({
  userAvatar: one(userAvatars, {
    fields: [avatarEquippedItems.userAvatarId],
    references: [userAvatars.id],
  }),
  item: one(avatarItems, {
    fields: [avatarEquippedItems.itemId],
    references: [avatarItems.id],
  }),
}));

export const userAvatarInventoryRelations = relations(userAvatarInventory, ({ one }) => ({
  user: one(user, {
    fields: [userAvatarInventory.userId],
    references: [user.id],
  }),
  item: one(avatarItems, {
    fields: [userAvatarInventory.itemId],
    references: [avatarItems.id],
  }),
}));

// =============================================================================
// POINTS RELATIONS
// =============================================================================

export const creatorPointsConfigRelations = relations(creatorPointsConfig, ({ one }) => ({
  creator: one(creators, {
    fields: [creatorPointsConfig.creatorId],
    references: [creators.id],
  }),
}));

export const pointsPackageRelations = relations(pointsPackages, ({ one, many }) => ({
  creator: one(creators, {
    fields: [pointsPackages.creatorId],
    references: [creators.id],
  }),
  purchases: many(pointsPurchases),
}));

export const pointsPurchaseRelations = relations(pointsPurchases, ({ one }) => ({
  user: one(user, {
    fields: [pointsPurchases.userId],
    references: [user.id],
  }),
  creator: one(creators, {
    fields: [pointsPurchases.creatorId],
    references: [creators.id],
  }),
  package: one(pointsPackages, {
    fields: [pointsPurchases.packageId],
    references: [pointsPackages.id],
  }),
}));

export const pointBalanceRelations = relations(pointBalances, ({ one }) => ({
  user: one(user, {
    fields: [pointBalances.userId],
    references: [user.id],
  }),
  creator: one(creators, {
    fields: [pointBalances.creatorId],
    references: [creators.id],
  }),
}));

export const pointTransactionRelations = relations(pointTransactions, ({ one }) => ({
  user: one(user, {
    fields: [pointTransactions.userId],
    references: [user.id],
  }),
  creator: one(creators, {
    fields: [pointTransactions.creatorId],
    references: [creators.id],
  }),
}));

// =============================================================================
// STORE RELATIONS
// =============================================================================

export const productRelations = relations(products, ({ one, many }) => ({
  creator: one(creators, {
    fields: [products.creatorId],
    references: [creators.id],
  }),
  world: one(worlds, {
    fields: [products.worldId],
    references: [worlds.id],
  }),
  avatarItem: one(avatarItems, {
    fields: [products.itemId],
    references: [avatarItems.id],
  }),
  orderItems: many(orderItems),
  inventoryItems: many(userInventory),
}));

export const creatorStoreRelations = relations(creatorStores, ({ one }) => ({
  creator: one(creators, {
    fields: [creatorStores.creatorId],
    references: [creators.id],
  }),
}));

export const orderRelations = relations(orders, ({ one, many }) => ({
  user: one(user, {
    fields: [orders.userId],
    references: [user.id],
  }),
  creator: one(creators, {
    fields: [orders.creatorId],
    references: [creators.id],
  }),
  paymentTransaction: one(pointTransactions, {
    fields: [orders.paymentTransactionId],
    references: [pointTransactions.id],
  }),
  items: many(orderItems),
}));

export const orderItemRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const userInventoryRelations = relations(userInventory, ({ one }) => ({
  user: one(user, {
    fields: [userInventory.userId],
    references: [user.id],
  }),
  product: one(products, {
    fields: [userInventory.productId],
    references: [products.id],
  }),
  order: one(orders, {
    fields: [userInventory.orderId],
    references: [orders.id],
  }),
}));

// =============================================================================
// ANALYTICS RELATIONS
// =============================================================================

export const calendarEventRelations = relations(calendarEvents, ({ one }) => ({
  event: one(events, {
    fields: [calendarEvents.eventId],
    references: [events.id],
  }),
}));

export const eventAttendanceRelations = relations(eventAttendance, ({ one }) => ({
  user: one(user, {
    fields: [eventAttendance.userId],
    references: [user.id],
  }),
  event: one(events, {
    fields: [eventAttendance.eventId],
    references: [events.id],
  }),
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  user: one(user, {
    fields: [attendance.userId],
    references: [user.id],
  }),
  space: one(spaces, {
    fields: [attendance.spaceId],
    references: [spaces.id],
  }),
  event: one(events, {
    fields: [attendance.eventId],
    references: [events.id],
  }),
  world: one(worlds, {
    fields: [attendance.worldId],
    references: [worlds.id],
  }),
}));