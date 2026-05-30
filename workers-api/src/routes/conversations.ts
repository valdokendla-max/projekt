import { Hono } from 'hono'
import type { Bindings, Variables } from '../bindings'
import { requireAuth } from '../auth/middleware'

const conversations = new Hono<{ Bindings: Bindings; Variables: Variables }>()

interface ConversationRow {
  id: string
  name: string
  messages: string
  created_at: string
  updated_at: string
}

interface MessagePart {
  type?: string
  url?: string
  mediaType?: string
  filename?: string
  text?: string
  [key: string]: unknown
}

interface Message {
  id?: string
  role?: string
  parts?: MessagePart[]
  content?: string
  createdAt?: string
  [key: string]: unknown
}

// Strip base64 data URLs from file parts (too large to persist safely)
function serializeMessages(messages: unknown): Message[] {
  if (!Array.isArray(messages)) return []
  return messages.map((msg: Message) => {
    if (!msg) return msg
    const parts = Array.isArray(msg.parts) ? msg.parts : undefined
    if (!parts) return msg
    return {
      ...msg,
      parts: parts.map((part: MessagePart) => {
        if (part?.type === 'file' && typeof part.url === 'string' && part.url.startsWith('data:')) {
          return {
            type: part.type,
            mediaType: part.mediaType || '',
            filename: part.filename || '',
            url: '',
          }
        }
        return part
      }),
    }
  })
}

function parseMessages(raw: string): Message[] {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Message[]) : []
  } catch {
    return []
  }
}

// GET /api/conversations
conversations.get('/', requireAuth, async (c) => {
  const userId = c.get('session')!.user.id
  const rows = await c.env.DB.prepare(
    'SELECT id, name, messages, created_at, updated_at FROM conversations WHERE user_id = ? ORDER BY created_at ASC',
  )
    .bind(userId)
    .all<ConversationRow>()

  const list = (rows.results || []).map((r) => ({
    id: r.id,
    name: r.name,
    userId,
    messages: parseMessages(r.messages),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }))
  return c.json({ ok: true, conversations: list })
})

// PUT /api/conversations/:id
conversations.put('/:id', requireAuth, async (c) => {
  const convId = String(c.req.param('id') || '').trim()
  const body = await c.req.json().catch(() => ({})) as { name?: unknown; messages?: unknown; createdAt?: unknown }
  const name = String(body.name || '').trim()
  const messages = body.messages

  if (!convId || !name || !Array.isArray(messages)) {
    return c.json({ error: 'Vigased vestluse andmed.' }, 400)
  }

  const userId = c.get('session')!.user.id
  const safeMessages = serializeMessages(messages)
  const createdAt = typeof body.createdAt === 'string' ? body.createdAt : new Date().toISOString()
  const nowIso = new Date().toISOString()

  await c.env.DB.prepare(
    `INSERT INTO conversations (id, user_id, name, messages, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (id, user_id) DO UPDATE
       SET name = excluded.name,
           messages = excluded.messages,
           updated_at = excluded.updated_at`,
  )
    .bind(convId, userId, name, JSON.stringify(safeMessages), createdAt, nowIso)
    .run()

  return c.json({ ok: true })
})

// DELETE /api/conversations/:id
conversations.delete('/:id', requireAuth, async (c) => {
  const convId = String(c.req.param('id') || '').trim()
  if (!convId) return c.json({ error: 'Vestluse ID on kohustuslik.' }, 400)

  const userId = c.get('session')!.user.id
  await c.env.DB.prepare('DELETE FROM conversations WHERE id = ? AND user_id = ?').bind(convId, userId).run()
  return c.json({ ok: true })
})

export default conversations
