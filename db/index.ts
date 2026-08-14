import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

type AppBindings = {
  DB?: D1Database;
  INVITE_CODE?: string;
};

function getBindings(): AppBindings {
  return env as unknown as AppBindings;
}

export function getDb() {
  const db = getBindings().DB;
  if (!db) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return drizzle(db, { schema });
}

export function getD1(): D1Database {
  const db = getBindings().DB;
  if (!db) {
    throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  }
  return db;
}

export function getInviteCode(): string {
  return getBindings().INVITE_CODE ?? process.env.INVITE_CODE ?? "FRIENDS2026";
}

let initialization: Promise<void> | null = null;

export function ensureDatabase(): Promise<void> {
  if (initialization) return initialization;
  const db = getD1();
  initialization = db
    .batch([
      db.prepare(`CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY NOT NULL,
        email TEXT NOT NULL UNIQUE,
        nickname TEXT NOT NULL CHECK(length(nickname) BETWEEN 2 AND 20),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS invite_codes (
        id TEXT PRIMARY KEY NOT NULL,
        code_hash TEXT NOT NULL UNIQUE,
        is_active INTEGER NOT NULL DEFAULT 1,
        max_uses INTEGER,
        use_count INTEGER NOT NULL DEFAULT 0,
        expires_at TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY NOT NULL,
        creator_id TEXT NOT NULL REFERENCES profiles(id),
        title TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL DEFAULT 'ETC',
        start_at TEXT NOT NULL,
        deadline_at TEXT,
        min_participants INTEGER NOT NULL CHECK(min_participants >= 1),
        max_participants INTEGER NOT NULL CHECK(max_participants >= min_participants),
        join_url TEXT,
        status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','CANCELLED','COMPLETED')),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CHECK(deadline_at IS NULL OR deadline_at <= start_at)
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS task_participants (
        task_id TEXT NOT NULL REFERENCES tasks(id),
        user_id TEXT NOT NULL REFERENCES profiles(id),
        status TEXT NOT NULL CHECK(status IN ('JOINED','MAYBE','DECLINED')),
        leave_reason TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(task_id, user_id)
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS task_watchers (
        task_id TEXT NOT NULL REFERENCES tasks(id),
        user_id TEXT NOT NULL REFERENCES profiles(id),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(task_id, user_id)
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS notification_events (
        id TEXT PRIMARY KEY NOT NULL,
        task_id TEXT NOT NULL REFERENCES tasks(id),
        event_type TEXT NOT NULL,
        scheduled_for TEXT,
        sent_at TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(task_id, event_type)
      )`),
      db.prepare("CREATE INDEX IF NOT EXISTS idx_tasks_status_start_at ON tasks(status, start_at)"),
      db.prepare("CREATE INDEX IF NOT EXISTS idx_tasks_creator_id ON tasks(creator_id)"),
      db.prepare("CREATE INDEX IF NOT EXISTS idx_task_participants_task_status ON task_participants(task_id, status)"),
      db.prepare("CREATE INDEX IF NOT EXISTS idx_task_participants_user_id ON task_participants(user_id)"),
      db.prepare("PRAGMA optimize"),
    ])
    .then(() => undefined)
    .catch((error) => {
      initialization = null;
      throw error;
    });
  return initialization;
}
