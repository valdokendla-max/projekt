import type { ServiceStatus, SystemStatusResponse } from '@/lib/system-status'

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

const BACKEND_URL = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'http://localhost:4000'
).replace(/\/$/, '')
const GROQ_MODELS_URL = 'https://api.groq.com/openai/v1/models'
const COMFYUI_BASE_URL = (process.env.COMFYUI_BASE_URL || '').trim()

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
    const response = await fetch(`${BACKEND_URL}/api/knowledge`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    })
    if (!response.ok) throw new Error(`Backend vastas staatusega ${response.status}.`)
    const items = (await response.json()) as unknown[]
    return buildServiceStatus(
      {
        label: 'Teadmistebaas',
        ok: true,
        detail: `Teadmistebaas töötab (${Array.isArray(items) ? items.length : '?'} kirjet).`,
        itemCount: Array.isArray(items) ? items.length : undefined,
      },
      checkedAt,
    )
  } catch {
    return buildServiceStatus(
      {
        label: 'Teadmistebaas',
        ok: false,
        detail: 'Teadmistebaasiga ei saanud ühendust.',
      },
      checkedAt,
    )
  }
}

async function checkGroq(checkedAt: string): Promise<ServiceStatus> {
  if (!process.env.GROQ_API_KEY) {
    return buildServiceStatus(
      {
        label: 'Groq AI',
        ok: false,
        configured: false,
        detail: 'GROQ_API_KEY puudub. Chat-funktsioon ei ole kasutusvalmis.',
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
        detail: 'Groq API võti on seadistatud ja ühendus toimib.',
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

async function checkComfyUI(checkedAt: string): Promise<ServiceStatus> {
  if (!COMFYUI_BASE_URL) {
    return buildServiceStatus(
      { label: 'ComfyUI (pildigenereerimine)', ok: false, configured: false, detail: 'COMFYUI_BASE_URL pole seadistatud.' },
      checkedAt,
    )
  }
  try {
    const r = await fetch(`${COMFYUI_BASE_URL}/system_stats`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    })
    if (!r.ok) {
      return buildServiceStatus(
        { label: 'ComfyUI (pildigenereerimine)', ok: false, configured: true, detail: `ComfyUI vastas staatusega ${r.status}.` },
        checkedAt,
      )
    }
    const data = (await r.json().catch(() => ({}))) as { system?: { cuda_version?: string }; devices?: { name?: string }[] }
    const gpu = data.devices?.[0]?.name ?? 'teadmata GPU'
    return buildServiceStatus(
      { label: 'ComfyUI (pildigenereerimine)', ok: true, configured: true, detail: `ComfyUI töötab — ${gpu}` },
      checkedAt,
    )
  } catch {
    return buildServiceStatus(
      { label: 'ComfyUI (pildigenereerimine)', ok: false, configured: true, detail: 'ComfyUI-ga ei saanud ühendust.' },
      checkedAt,
    )
  }
}

export async function GET() {
  const checkedAt = new Date().toISOString()

  const [backend, knowledgeBase, ai, comfyui] = await Promise.all([
    checkBackend(checkedAt),
    checkKnowledgeBase(checkedAt),
    checkGroq(checkedAt),
    checkComfyUI(checkedAt),
  ])

  const response: SystemStatusResponse = {
    checkedAt,
    frontend: buildServiceStatus(
      { label: 'Frontend', ok: true, detail: 'Next.js rakendus vastab ja route töötab.' },
      checkedAt,
    ),
    backend,
    knowledgeBase,
    ai,
    comfyui,
  }

  return Response.json(response)
}