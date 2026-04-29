import { requireAuthenticatedRouteUser } from '@/lib/api-security'
import { getServerBackendUrl } from '@/lib/backend-url'
import { KNOWLEDGE_STORAGE_LABEL, fetchKnowledgeContextSummary } from '@/lib/knowledge-store'
import type { ServiceStatus, SystemStatusResponse } from '@/lib/system-status'

export const runtime = 'nodejs'

const BACKEND_URL = getServerBackendUrl()
const GROQ_MODELS_URL = 'https://api.groq.com/openai/v1/models'
const DEFAULT_SYSTEM_STATUS_CACHE_TTL_MS = 60_000

type SystemStatusCacheEntry = {
  expiresAt: number
  response: SystemStatusResponse
}

let cachedSystemStatus: SystemStatusCacheEntry | null = null
let inFlightSystemStatusPromise: Promise<SystemStatusResponse> | null = null

function resolveSystemStatusCacheTtlMs() {
  const value = Number(process.env.SYSTEM_STATUS_CACHE_TTL_MS || '')

  if (!Number.isFinite(value) || value <= 0) {
    return DEFAULT_SYSTEM_STATUS_CACHE_TTL_MS
  }

  return Math.floor(value)
}

function buildSystemStatusHeaders(cacheState: 'hit' | 'miss', checkedAt: string) {
  return {
    'Cache-Control': 'private, no-store',
    'X-System-Status-Cache': cacheState,
    'X-System-Status-Checked-At': checkedAt,
  }
}

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
    const { itemCount } = await fetchKnowledgeContextSummary()

    return buildServiceStatus(
      {
        label: 'Teadmistebaas',
        ok: true,
        detail: `Püsisalvestus töötab (${itemCount} kirjet).`,
        itemCount,
        storage: KNOWLEDGE_STORAGE_LABEL,
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

export async function GET(req: Request) {
  const auth = await requireAuthenticatedRouteUser(req)
  if (!auth.ok) {
    return auth.response
  }

  if (auth.value.user.role !== 'admin') {
    return Response.json({ error: 'System-status debug route on ainult admin-kasutajatele.' }, { status: 403 })
  }

  const ttlMs = resolveSystemStatusCacheTtlMs()

  if (cachedSystemStatus && cachedSystemStatus.expiresAt > Date.now()) {
    return Response.json(cachedSystemStatus.response, {
      headers: buildSystemStatusHeaders('hit', cachedSystemStatus.response.checkedAt),
    })
  }

  if (!inFlightSystemStatusPromise) {
    inFlightSystemStatusPromise = (async () => {
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

      cachedSystemStatus = {
        expiresAt: Date.now() + ttlMs,
        response,
      }

      return response
    })().finally(() => {
      inFlightSystemStatusPromise = null
    })
  }

  const response = await inFlightSystemStatusPromise

  return Response.json(response, {
    headers: buildSystemStatusHeaders('miss', response.checkedAt),
  })
}
