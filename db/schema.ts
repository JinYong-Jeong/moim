import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const profiles = sqliteTable(
  "profiles",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    nickname: text("nickname").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_profiles_email").on(table.email),
    check(
      "profiles_nickname_length",
      sql`length(${table.nickname}) BETWEEN 2 AND 20`,
    ),
  ],
);

export const inviteCodes = sqliteTable(
  "invite_codes",
  {
    id: text("id").primaryKey(),
    codeHash: text("code_hash").notNull(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    maxUses: integer("max_uses"),
    useCount: integer("use_count").notNull().default(0),
    expiresAt: text("expires_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex("idx_invite_codes_hash").on(table.codeHash)],
);

export const tasks = sqliteTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    creatorId: text("creator_id")
      .notNull()
      .references(() => profiles.id),
    title: text("title").notNull(),
    description: text("description"),
    category: text("category").notNull().default("ETC"),
    startAt: text("start_at").notNull(),
    deadlineAt: text("deadline_at"),
    minParticipants: integer("min_participants").notNull(),
    maxParticipants: integer("max_participants").notNull(),
    joinUrl: text("join_url"),
    status: text("status").notNull().default("OPEN"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_tasks_status_start_at").on(table.status, table.startAt),
    index("idx_tasks_creator_id").on(table.creatorId),
    check("tasks_min_participants", sql`${table.minParticipants} >= 1`),
    check(
      "tasks_max_participants",
      sql`${table.maxParticipants} >= ${table.minParticipants}`,
    ),
    check(
      "tasks_deadline_before_start",
      sql`${table.deadlineAt} IS NULL OR ${table.deadlineAt} <= ${table.startAt}`,
    ),
    check(
      "tasks_status_value",
      sql`${table.status} IN ('OPEN', 'CANCELLED', 'COMPLETED')`,
    ),
  ],
);

export const taskParticipants = sqliteTable(
  "task_participants",
  {
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id),
    status: text("status").notNull(),
    leaveReason: text("leave_reason"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    primaryKey({ columns: [table.taskId, table.userId] }),
    index("idx_task_participants_task_status").on(table.taskId, table.status),
    index("idx_task_participants_user_id").on(table.userId),
    check(
      "task_participants_status_value",
      sql`${table.status} IN ('JOINED', 'MAYBE', 'DECLINED')`,
    ),
  ],
);

export const taskWatchers = sqliteTable(
  "task_watchers",
  {
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [primaryKey({ columns: [table.taskId, table.userId] })],
);

export const notificationEvents = sqliteTable(
  "notification_events",
  {
    id: text("id").primaryKey(),
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id),
    eventType: text("event_type").notNull(),
    scheduledFor: text("scheduled_for"),
    sentAt: text("sent_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_notification_events_task_event").on(
      table.taskId,
      table.eventType,
    ),
  ],
);
