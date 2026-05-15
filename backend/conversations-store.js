const { promises: fs } = require('node:fs')
const path = require('node:path')

const DATA_DIR = path.resolve(__dirname, 'data')
const CONV_FILE = path.resolve(DATA_DIR, 'conversations.json')

// Strip base64 data URLs before saving to keep the file small.
// Images are regenerated on demand; only text log needs to persist.
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

async function getUserConversations(userId) {
  const s = await loadStore()
  return (s.conversations || [])
    .filter((c) => c.userId === userId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
}

async function upsertConversation(userId, conv) {
  const s = await loadStore()
  if (!Array.isArray(s.conversations)) s.conversations = []
  const entry = {
    id: conv.id,
    name: conv.name || 'Vestlus',
    userId,
    messages: serializeMessages(conv.messages),
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
  const s = await loadStore()
  if (!Array.isArray(s.conversations)) return
  s.conversations = s.conversations.filter((c) => !(c.id === convId && c.userId === userId))
  await persistStore()
}

module.exports = { getUserConversations, upsertConversation, deleteConversation }
