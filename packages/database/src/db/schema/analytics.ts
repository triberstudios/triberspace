import {
  pgTable,
  text,
  timestamp,
  integer,
  index,
  unique
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { events, spaces, worlds } from "./worlds";

// =============================================================================
// ANALYTICS SYSTEM TABLES
// =============================================================================

export const calendarEvents = pgTable("calendar_events", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
  eventId: integer("eventId").notNull().references(() => events.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  startTime: timestamp("startTime", { withTimezone: true }).notNull(),
  endTime: timestamp("endTime", { withTimezone: true }).notNull(),
  timezone: text("timezone").notNull(),
  recurrence: text("recurrence"),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("calendar_event_idx").on(table.eventId),
  index("calendar_start_idx").on(table.startTime),
]);

export const attendance = pgTable("attendance", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
  spaceId: integer("spaceId").notNull().references(() => spaces.id, { onDelete: "cascade" }),
  eventId: integer("eventId").references(() => events.id, { onDelete: "cascade" }),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  worldId: integer("worldId").notNull().references(() => worlds.id, { onDelete: "cascade" }),

  joinedAt: timestamp("joinedAt", { withTimezone: true }).notNull().defaultNow(),
  leftAt: timestamp("leftAt", { withTimezone: true }),
  dwellSeconds: integer("dwell_seconds").default(0),
  pointsEarned: integer("points_earned").default(0),
  actionsPerformed: integer("actions_performed").default(0),

  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("attendance_space_idx").on(table.spaceId),
  index("attendance_event_idx").on(table.eventId),
  index("attendance_user_idx").on(table.userId),
  index("attendance_world_idx").on(table.worldId),
  index("attendance_joined_idx").on(table.joinedAt),
]);

// Legacy export for backward compatibility
export const eventAttendance = attendance;