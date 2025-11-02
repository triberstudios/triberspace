import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  index,
  unique
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { spaces, worlds } from "./worlds";

// =============================================================================
// COMMENTS SYSTEM TABLES
// =============================================================================

// Comments on spaces
export const spaceComments = pgTable("space_comments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
  spaceId: integer("space_id").notNull().references(() => spaces.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  worldId: integer("world_id").notNull().references(() => worlds.id, { onDelete: "cascade" }),

  // Content
  content: text("content").notNull(),
  parentCommentId: integer("parent_comment_id"), // Self-reference for replies/threads

  // Moderation
  isHidden: boolean("is_hidden").default(false),
  hiddenBy: text("hidden_by").references(() => user.id),
  hiddenAt: timestamp("hidden_at", { withTimezone: true }),
  hiddenReason: text("hidden_reason"),

  // Engagement
  likesCount: integer("likes_count").default(0),
  repliesCount: integer("replies_count").default(0),

  // Metadata
  isEdited: boolean("is_edited").default(false),
  editedAt: timestamp("edited_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("space_comments_space_idx").on(table.spaceId),
  index("space_comments_user_idx").on(table.userId),
  index("space_comments_world_idx").on(table.worldId),
  index("space_comments_parent_idx").on(table.parentCommentId),
  index("space_comments_created_idx").on(table.createdAt),
  index("space_comments_hidden_idx").on(table.isHidden),
]);

// Comment likes
export const commentLikes = pgTable("comment_likes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
  commentId: integer("comment_id").notNull().references(() => spaceComments.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("comment_likes_user_comment_idx").on(table.commentId, table.userId),
  index("comment_likes_comment_idx").on(table.commentId),
  index("comment_likes_user_idx").on(table.userId),
]);
