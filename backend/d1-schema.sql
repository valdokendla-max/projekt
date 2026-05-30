-- D1 (SQLite) schema for vkengraveai-db
-- Migrated from Railway PostgreSQL (backup: railway_postgres_backup_2026-05-23.sql)
-- Conventions:
--   text                        -> TEXT
--   timestamp with time zone    -> TEXT (ISO-8601, e.g. '2026-05-23 12:34:56+00')
--   jsonb                       -> TEXT (JSON stored as text, read with json_extract / SQLite JSON1)
--   DEFAULT now()               -> DEFAULT CURRENT_TIMESTAMP

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS app_auth_users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  role          TEXT NOT NULL CHECK (role IN ('admin', 'user')),
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_auth_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_auth_sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES app_auth_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_auth_password_reset_tokens (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES app_auth_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_auth_password_reset_requests (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES app_auth_users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  name       TEXT NOT NULL,
  note       TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_chat_conversations (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES app_auth_users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL DEFAULT '',
  messages   TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS app_chat_conversations_user_id_idx
  ON app_chat_conversations(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS app_user_laser_settings (
  user_id    TEXT PRIMARY KEY REFERENCES app_auth_users(id) ON DELETE CASCADE,
  settings   TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conversations (
  id         TEXT NOT NULL,
  user_id    TEXT NOT NULL,
  name       TEXT NOT NULL DEFAULT 'Vestlus',
  messages   TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id, user_id)
);

-- Knowledge base (new for Workers backend; was file-based on Railway)
CREATE TABLE IF NOT EXISTS knowledge_entries (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  category   TEXT NOT NULL CHECK (category IN ('juhis', 'naidis', 'fakt', 'stiil')),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS knowledge_entries_created_at_idx
  ON knowledge_entries(created_at DESC);
