const { promises: fs } = require('node:fs')
const path = require('node:path')
const { Pool } = require('pg')

// ---------------------------------------------------------------------------
// PostgreSQL pool — used when DATABASE_URL is set (production on Railway)
// ---------------------------------------------------------------------------
let pool = null

function getPool() {
  if (pool) return pool
  if (!process.env.DATABASE_URL) return null
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'false'
      ? false
      : { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' },
  })
  return pool
}

async function ensureTable() {
  const db = getPool()
  if (!db) return
  await db.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT 'Vestlus',
      messages JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (id, user_id)
    )
  `)
}

let tableReady = false
async function withTable() {
  if (!tableReady) {
    await ensureTable()
    tableReady = true
  }
  return getPool()
}

// ---------------------------------------------------------------------------
// Fallback: local JSON file (development / no DATABASE_URL)
// ---------------------------------------------------------------------------
const DATA_DIR = path.resolve(__dirname, 'data')
const CONV_FILE = path.resolve(DATA_DIR, 'conversations.json')

function serializeMessages(messages) {
  return (messages || []).map((msg) => ({
    ...msg,
    parts: (msg.parts || []).map((part) => {
      if (part.type === 'file' && typeof part.url === 'string' && part.url.startsWith('data:')) {
        return { type: part.type, mediaType: part.mediaType || '', filename: part.filename || '', url: '' }
      }
      return part
    }),
  }))
}

let store = null
let writeQueue = Promise.resolve()

async function loadStore() {
  if (store) return store
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
    const raw = await fs.readFile(CONV_FILE, 'utf8')
    store = JSON.parse(raw)
  } catch {
    store = { conversations: [] }
  }
  return store
}

async function persistStore() {
  writeQueue = writeQueue.then(async () => {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true })
      await fs.writeFile(CONV_FILE, JSON.stringify(store, null, 2), 'utf8')
    } catch (e) {
      console.error('conversations-store write error', e)
    }
  })
  return writeQueue
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
async function getUserConversations(userId) {
  const db = await withTable()

  if (db) {
    const { rows } = await db.query(
      'SELECT id, name, messages, created_at, updated_at FROM conversations WHERE user_id = $1 ORDER BY created_at ASC',
      [userId]
    )
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      userId,
      messages: r.messages || [],
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }))
  }

  const s = await loadStore()
  return (s.conversations || [])
    .filter((c) => c.userId === userId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
}

async function upsertConversation(userId, conv) {
  const safeMessages = serializeMessages(conv.messages)
  const db = await withTable()

  if (db) {
    await db.query(
      `INSERT INTO conversations (id, user_id, name, messages, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (id, user_id) DO UPDATE
         SET name = EXCLUDED.name,
             messages = EXCLUDED.messages,
             updated_at = NOW()`,
      [conv.id, userId, conv.name || 'Vestlus', JSON.stringify(safeMessages), conv.createdAt || new Date().toISOString()]
    )
    return
  }

  const s = await loadStore()
  if (!Array.isArray(s.conversations)) s.conversations = []
  const entry = {
    id: conv.id,
    name: conv.name || 'Vestlus',
    userId,
    messages: safeMessages,
    createdAt: conv.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  const idx = s.conversations.findIndex((c) => c.id === conv.id && c.userId === userId)
  if (idx >= 0) {
    s.conversations[idx] = entry
  } else {
    s.conversations.push(entry)
  }
  await persistStore()
}

async function deleteConversation(userId, convId) {
  const db = await withTable()

  if (db) {
    await db.query('DELETE FROM conversations WHERE id = $1 AND user_id = $2', [convId, userId])
    return
  }

  const s = await loadStore()
  if (!Array.isArray(s.conversations)) return
  s.conversations = s.conversations.filter((c) => !(c.id === convId && c.userId === userId))
  await persistStore()
}

module.exports = { getUserConversations, upsertConversation, deleteConversation }
