import { getServerBackendUrl } from '@/lib/backend-url'

export const KNOWLEDGE_CATEGORIES = ['juhis', 'naidis', 'fakt', 'stiil'] as const

export type KnowledgeCategory = (typeof KNOWLEDGE_CATEGORIES)[number]

export interface KnowledgeItem {
  id: string
  title: string
  content: string
  category: KnowledgeCategory
  createdAt: string
}

export const KNOWLEDGE_STORAGE_LABEL = 'backend-api'

const BACKEND_URL = getServerBackendUrl()

interface KnowledgeContextPayload {
  context?: string
  itemCount?: number
}

function isKnowledgeCategory(value: unknown): value is KnowledgeCategory {
  return typeof value === 'string' && KNOWLEDGE_CATEGORIES.includes(value as KnowledgeCategory)
}

function isKnowledgeItem(value: unknown): value is KnowledgeItem {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.content === 'string' &&
    typeof candidate.createdAt === 'string' &&
    isKnowledgeCategory(candidate.category)
  )
}

export async function fetchKnowledgeContextSummary() {
  const response = await fetch(`${BACKEND_URL}/api/knowledge/context`, {
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error('Teadmistebaasi laadimine ebaõnnestus.')
  }

  const payload = (await response.json()) as KnowledgeContextPayload
  return {
    context: typeof payload.context === 'string' ? payload.context : '',
    itemCount: Number.isFinite(payload.itemCount) ? Number(payload.itemCount) : 0,
  }
}

class KnowledgeStore {
  async getContext(): Promise<string> {
    const summary = await fetchKnowledgeContextSummary()
    return summary.context
  }
}

export const knowledgeStore = new KnowledgeStore()
