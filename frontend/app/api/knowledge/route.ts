import {
  KNOWLEDGE_CATEGORIES,
  knowledgeStore,
  type KnowledgeCategory,
} from '@/lib/knowledge-store'
import { getServerBackendUrl } from '@/lib/backend-url'

export const runtime = 'nodejs'

const BACKEND_URL = getServerBackendUrl()

interface AuthenticatedUser {
  id: string
  name: string
  email: string
  role: 'admin' | 'user'
  createdAt: string
}

function isKnowledgeCategory(value: unknown): value is KnowledgeCategory {
  return typeof value === 'string' && KNOWLEDGE_CATEGORIES.includes(value as KnowledgeCategory)
}

function getBearerToken(request: Request) {
  const header = request.headers.get('authorization') || ''
  if (!header.startsWith('Bearer ')) return ''
  return header.slice(7).trim()
}

async function requireAdminUser(request: Request) {
  const token = getBearerToken(request)

  if (!token) {
    return Response.json({ error: 'Teadmistebaasi muutmiseks logi sisse admin-kontoga.' }, { status: 401 })
  }

  let response: Response
  try {
    response = await fetch(`${BACKEND_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
  } catch {
    return Response.json({ error: 'Autentimisteenusega ei saanud ühendust.' }, { status: 503 })
  }

  if (!response.ok) {
    return Response.json({ error: 'Teadmistebaasi muutmiseks logi sisse admin-kontoga.' }, { status: 401 })
  }

  const payload = (await response.json()) as { user?: AuthenticatedUser }

  if (payload.user?.role !== 'admin') {
    return Response.json({ error: 'Teadmistebaasi saavad muuta ainult admin-kasutajad.' }, { status: 403 })
  }

  return null
}

// GET is open — knowledge items are non-sensitive AI configuration
export async function GET() {
  const items = await knowledgeStore.getAll()
  return Response.json(items)
}

export async function POST(req: Request) {
  const authError = await requireAdminUser(req)
  if (authError) return authError

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
  const authError = await requireAdminUser(req)
  if (authError) return authError

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
