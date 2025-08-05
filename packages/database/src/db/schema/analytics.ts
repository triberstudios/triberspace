import {
  pgTable,
  text,
  timestamp,
  integer,
  index,
  unique
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { events } from "./worlds";

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

export const eventAttendance = pgTable("event_attendance", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  eventId: integer("eventId").notNull().references(() => events.id, { onDelete: "cascade" }),
  attendedAt: timestamp("attendedAt", { withTimezone: true }).notNull().defaultNow(),
  duration: integer("duration"),
  leftAt: timestamp("leftAt", { withTimezone: true }),
}, (table) => [
  unique("attendance_user_event_idx").on(table.userId, table.eventId),
  index("attendance_user_idx").on(table.userId),
  index("attendance_event_idx").on(table.eventId),
  index("attendance_time_idx").on(table.attendedAt),
]);