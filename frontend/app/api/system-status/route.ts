import { relative } from 'node:path'
import { KNOWLEDGE_FILE_PATH, knowledgeStore } from '@/lib/knowledge-store'
import type { ServiceStatus, SystemStatusResponse } from '@/lib/system-status'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000').replace(/\/$/, '')
const GROQ_MODELS_URL = 'https://api.groq.com/openai/v1/models'

function buildServiceStatus(input: Omit<ServiceStatus, 'checkedAt'>, checkedAt: string): ServiceStatus {
  return {
    ...input,
    checkedAt,
  }
}

async function checkBackend(checkedAt: string): Promise<ServiceStatus> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    })

    if (!response.ok) {
      return buildServiceStatus(
        {
          label: 'Backend API',
          ok: false,
          detail: `Backend vastas staatusega ${response.status}.`,
        },
        checkedAt,
      )
    }

    return buildServiceStatus(
      {
        label: 'Backend API',
        ok: true,
        detail: `Backend vastab aadressil ${BACKEND_URL}.`,
      },
      checkedAt,
    )
  } catch {
    return buildServiceStatus(
      {
        label: 'Backend API',
        ok: false,
        detail: `Backendiga ei saanud ühendust aadressil ${BACKEND_URL}.`,
      },
      checkedAt,
    )
  }
}

async function checkKnowledgeBase(checkedAt: string): Promise<ServiceStatus> {
  try {
    const items = await knowledgeStore.getAll()

    return buildServiceStatus(
      {
        label: 'Teadmistebaas',
        ok: true,
        detail: `Püsisalvestus töötab (${items.length} kirjet).`,
        itemCount: items.length,
        storage: relative(process.cwd(), KNOWLEDGE_FILE_PATH).replace(/\\/g, '/'),
      },
      checkedAt,
    )
  } catch {
    return buildServiceStatus(
      {
        label: 'Teadmistebaas',
        ok: false,
        detail: 'Teadmistebaasi püsisalvestust ei õnnestunud avada.',
      },
      checkedAt,
    )
  }
}

async function checkGroq(checkedAt: string): Promise<ServiceStatus> {
  const imageGenerationConfigured = Boolean(process.env.OPENAI_API_KEY)

  if (!process.env.GROQ_API_KEY) {
    return buildServiceStatus(
      {
        label: 'Groq AI',
        ok: false,
        configured: false,
        detail: imageGenerationConfigured
          ? 'GROQ_API_KEY puudub. Chat-funktsioon ei ole veel kasutusvalmis, kuid pildigeneraatori võti on olemas.'
          : 'GROQ_API_KEY puudub. Chat-funktsioon ja pildigeneraator ei ole veel kasutusvalmis.',
      },
      checkedAt,
    )
  }

  try {
    const response = await fetch(GROQ_MODELS_URL, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    })

    if (!response.ok) {
      return buildServiceStatus(
        {
          label: 'Groq AI',
          ok: false,
          configured: true,
          detail: `Groq API vastas staatusega ${response.status}.`,
        },
        checkedAt,
      )
    }

    return buildServiceStatus(
      {
        label: 'Groq AI',
        ok: true,
        configured: true,
        detail: imageGenerationConfigured
          ? 'Groq chat töötab ja OpenAI-kompatible pildigeneraatori võti on seadistatud.'
          : 'Groq API võti on seadistatud ja ühendus toimib. Pildigeneraatori võti puudub.',
      },
      checkedAt,
    )
  } catch {
    return buildServiceStatus(
      {
        label: 'Groq AI',
        ok: false,
        configured: true,
        detail: 'Groq API-ga ei saanud ühendust.',
      },
      checkedAt,
    )
  }
}

export async function GET() {
  const checkedAt = new Date().toISOString()

  const [backend, knowledgeBase, ai] = await Promise.all([
    checkBackend(checkedAt),
    checkKnowledgeBase(checkedAt),
    checkGroq(checkedAt),
  ])

  const response: SystemStatusResponse = {
    checkedAt,
    frontend: buildServiceStatus(
      {
        label: 'Frontend',
        ok: true,
        detail: 'Next.js rakendus vastab ja route töötab.',
      },
      checkedAt,
    ),
    backend,
    knowledgeBase,
    ai,
  }

  return Response.json(response)
}