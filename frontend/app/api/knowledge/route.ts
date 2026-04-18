import {
  KNOWLEDGE_CATEGORIES,
  knowledgeStore,
  type KnowledgeCategory,
} from '@/lib/knowledge-store'

export const runtime = 'nodejs'

function isKnowledgeCategory(value: unknown): value is KnowledgeCategory {
  return typeof value === 'string' && KNOWLEDGE_CATEGORIES.includes(value as KnowledgeCategory)
}

export async function GET() {
  const items = await knowledgeStore.getAll()
  return Response.json(items)
}

export async function POST(req: Request) {
  const body = (await req.json()) as Record<string, unknown>
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const content = typeof body.content === 'string' ? body.content.trim() : ''
  const category = body.category

  if (!title || !content || !category) {
    return Response.json({ error: 'Pealkiri, sisu ja kategooria on kohustuslikud.' }, { status: 400 })
  }

  if (!isKnowledgeCategory(category)) {
    return Response.json(
      { error: 'Kategooria peab olema üks väärtustest: juhis, naidis, fakt või stiil.' },
      { status: 400 },
    )
  }

  const item = await knowledgeStore.add({ title, content, category })
  return Response.json(item, { status: 201 })
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return Response.json({ error: 'ID on kohustuslik' }, { status: 400 })
  }

  const removed = await knowledgeStore.remove(id)
  if (!removed) {
    return Response.json({ error: 'Sellist kirjet ei leitud.' }, { status: 404 })
  }

  return Response.json({ success: true })
}
