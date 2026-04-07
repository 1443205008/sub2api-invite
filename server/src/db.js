import fs from 'fs'
import path from 'path'
import Database from 'better-sqlite3'

const dataDir = path.resolve(process.cwd(), 'data')
fs.mkdirSync(dataDir, { recursive: true })

const dbPath = path.join(dataDir, 'invite.sqlite')
const db = new Database(dbPath)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS invite_users (
    user_id TEXT PRIMARY KEY,
    invite_code TEXT NOT NULL UNIQUE,
    invite_link TEXT NOT NULL,
    invited_by_user_id TEXT,
    invited_by_code TEXT,
    nickname TEXT NOT NULL DEFAULT '',
    total_invites INTEGER NOT NULL DEFAULT 0,
    active_invites INTEGER NOT NULL DEFAULT 0,
    total_recharge_amount REAL NOT NULL DEFAULT 0,
    total_reward_amount REAL NOT NULL DEFAULT 0,
    balance_reward_amount REAL NOT NULL DEFAULT 0,
    conversion_rate REAL NOT NULL DEFAULT 0,
    announcements_json TEXT NOT NULL DEFAULT '[]',
    source_mode TEXT NOT NULL DEFAULT 'mock',
    last_synced_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS reward_stages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level INTEGER NOT NULL,
    stage_key TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    rate REAL NOT NULL DEFAULT 0,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS invite_bindings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inviter_user_id TEXT NOT NULL,
    inviter_code TEXT NOT NULL,
    invitee_user_id TEXT NOT NULL UNIQUE,
    invitee_name TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS recharge_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no TEXT NOT NULL UNIQUE,
    invitee_user_id TEXT NOT NULL,
    recharge_amount REAL NOT NULL DEFAULT 0,
    paid_at TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'manual_callback',
    status TEXT NOT NULL DEFAULT 'paid',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS invite_cashback_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no TEXT NOT NULL UNIQUE,
    inviter_user_id TEXT NOT NULL,
    invitee_user_id TEXT NOT NULL,
    invitee_name TEXT NOT NULL,
    stage_key TEXT NOT NULL,
    stage_label TEXT NOT NULL,
    recharge_amount REAL NOT NULL DEFAULT 0,
    reward_rate REAL NOT NULL DEFAULT 0,
    reward_amount REAL NOT NULL DEFAULT 0,
    credit_status TEXT NOT NULL DEFAULT 'pending',
    credit_target TEXT NOT NULL DEFAULT 'system_balance',
    idempotency_key TEXT NOT NULL,
    external_result_json TEXT,
    credited_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sync_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    last_sync_at TEXT,
    last_sync_mode TEXT,
    last_sync_note TEXT
  );
`)

function ensureColumn(table, column, sql) {
  const exists = db.prepare(`SELECT 1 FROM pragma_table_info('${table}') WHERE name = ?`).get(column)
  if (!exists) db.exec(sql)
}

ensureColumn('invite_users', 'invite_link', "ALTER TABLE invite_users ADD COLUMN invite_link TEXT NOT NULL DEFAULT ''")
ensureColumn('invite_users', 'invited_by_user_id', "ALTER TABLE invite_users ADD COLUMN invited_by_user_id TEXT")
ensureColumn('invite_users', 'invited_by_code', "ALTER TABLE invite_users ADD COLUMN invited_by_code TEXT")
ensureColumn('invite_users', 'nickname', "ALTER TABLE invite_users ADD COLUMN nickname TEXT NOT NULL DEFAULT ''")
ensureColumn('invite_users', 'total_recharge_amount', "ALTER TABLE invite_users ADD COLUMN total_recharge_amount REAL NOT NULL DEFAULT 0")
ensureColumn('invite_users', 'total_reward_amount', "ALTER TABLE invite_users ADD COLUMN total_reward_amount REAL NOT NULL DEFAULT 0")
ensureColumn('invite_users', 'balance_reward_amount', "ALTER TABLE invite_users ADD COLUMN balance_reward_amount REAL NOT NULL DEFAULT 0")
ensureColumn('invite_users', 'source_mode', "ALTER TABLE invite_users ADD COLUMN source_mode TEXT NOT NULL DEFAULT 'mock'")
ensureColumn('invite_users', 'last_synced_at', "ALTER TABLE invite_users ADD COLUMN last_synced_at TEXT")
ensureColumn('invite_users', 'created_at', "ALTER TABLE invite_users ADD COLUMN created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP")
ensureColumn('invite_users', 'updated_at', "ALTER TABLE invite_users ADD COLUMN updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP")

export function getDbPath() {
  return dbPath
}

export { db }
