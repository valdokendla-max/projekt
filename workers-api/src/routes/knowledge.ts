import { Hono } from 'hono'
import { randomUUID } from 'node:crypto'
import type { Bindings, Variables } from '../bindings'
import { requireAdmin } from '../auth/middleware'

const KNOWLEDGE_CATEGORIES = ['juhis', 'naidis', 'fakt', 'stiil'] as const
type KnowledgeCategory = (typeof KNOWLEDGE_CATEGORIES)[number]

interface KnowledgeRow {
  id: string
  title: string
  content: string
  category: string
  created_at: string
}

interface PublicEntry {
  id: string
  title: string
  content: string
  category: KnowledgeCategory
  createdAt: string
}

const knowledge = new Hono<{ Bindings: Bindings; Variables: Variables }>()

function isCategory(value: unknown): value is KnowledgeCategory {
  return typeof value === 'string' && (KNOWLEDGE_CATEGORIES as readonly string[]).includes(value)
}

function sanitize(row: KnowledgeRow): PublicEntry {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    category: row.category as KnowledgeCategory,
    createdAt: row.created_at,
  }
}

async function getAll(env: Bindings): Promise<PublicEntry[]> {
  const rows = await env.DB.prepare(
    'SELECT id, title, content, category, created_at FROM knowledge_entries ORDER BY created_at DESC',
  ).all<KnowledgeRow>()
  return (rows.results || []).map((r) => sanitize(r as KnowledgeRow))
}

// GET /api/knowledge
knowledge.get('/', async (c) => {
  return c.json(await getAll(c.env))
})

// GET /api/knowledge/context
knowledge.get('/context', async (c) => {
  const items = await getAll(c.env)
  if (items.length === 0) return c.json({ context: '' })

  const sections: string[] = []
  const juhised = items.filter((i) => i.category === 'juhis')
  const naidised = items.filter((i) => i.category === 'naidis')
  const faktid = items.filter((i) => i.category === 'fakt')
  const stiilid = items.filter((i) => i.category === 'stiil')

  if (juhised.length > 0) {
    sections.push(`## Juhised:\n${juhised.map((i) => `- ${i.title}: ${i.content}`).join('\n')}`)
  }
  if (naidised.length > 0) {
    sections.push(`## Näidised:\n${naidised.map((i) => `### ${i.title}\n${i.content}`).join('\n\n')}`)
  }
  if (faktid.length > 0) {
    sections.push(`## Faktid:\n${faktid.map((i) => `- ${i.title}: ${i.content}`).join('\n')}`)
  }
  if (stiilid.length > 0) {
    sections.push(`## Stiilijuhised:\n${stiilid.map((i) => `- ${i.title}: ${i.content}`).join('\n')}`)
  }

  return c.json({ context: `\n\n--- TEADMISTEBAAS ---\n${sections.join('\n\n')}` })
})

// POST /api/knowledge (admin)
knowledge.post('/', requireAdmin, async (c) => {
  const body = await c.req.json().catch(() => ({})) as { title?: unknown; content?: unknown; category?: unknown }
  const title = String(body.title || '').trim()
  const content = String(body.content || '').trim()
  const category = body.category

  if (!title || !content || !category) {
    return c.json({ error: 'Pealkiri, sisu ja kategooria on kohustuslikud.' }, 400)
  }
  if (!isCategory(category)) {
    return c.json({ error: 'Kategooria peab olema üks väärtustest: juhis, naidis, fakt või stiil.' }, 400)
  }

  const entry: KnowledgeRow = {
    id: randomUUID(),
    title,
    content,
    category,
    created_at: new Date().toISOString(),
  }

  await c.env.DB.prepare(
    'INSERT INTO knowledge_entries (id, title, content, category, created_at) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(entry.id, entry.title, entry.content, entry.category, entry.created_at)
    .run()

  return c.json(sanitize(entry), 201)
})

// DELETE /api/knowledge?id=...
knowledge.delete('/', requireAdmin, async (c) => {
  const id = String(c.req.query('id') || '').trim()
  if (!id) return c.json({ error: 'ID on kohustuslik.' }, 400)

  const existing = await c.env.DB.prepare('SELECT id FROM knowledge_entries WHERE id = ? LIMIT 1').bind(id).first()
  if (!existing) return c.json({ error: 'Sellist kirjet ei leitud.' }, 404)

  await c.env.DB.prepare('DELETE FROM knowledge_entries WHERE id = ?').bind(id).run()
  return c.json({ success: true })
})

export default knowledge
