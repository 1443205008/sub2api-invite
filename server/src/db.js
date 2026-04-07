import fs from 'fs'
import path from 'path'
import Database from 'better-sqlite3'

const dataDir = path.resolve(process.cwd(), 'data')
const dbPath = path.join(dataDir, 'invite.db')

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

export const db = new Database(dbPath)

db.pragma('journal_mode = WAL')

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL,
  nickname TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  rebate_rate REAL NOT NULL DEFAULT 18,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invite_records (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  joined_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending', 'effective')),
  contribution REAL NOT NULL DEFAULT 0,
  FOREIGN KEY(owner_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS reward_records (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  amount REAL NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending', 'settled')),
  created_at TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  FOREIGN KEY(owner_user_id) REFERENCES users(id)
);
`)

export function getDbPath() {
  return dbPath
}
