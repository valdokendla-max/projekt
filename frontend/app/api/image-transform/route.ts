// Unified OpenAI /v1/images/edits endpoint for the 6 reference-image-based actions.
// Frontend already resizes to 1024x1024 (Canvas) before calling.
import { IMAGE_TRANSFORM_PROMPTS, type ImageTransformVariant } from '@/lib/image-prompts'

export const runtime = 'edge'

const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '')
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1'

interface RequestBody {
  variant?: ImageTransformVariant
  sourceImageDataUrl?: string
}

const VALID_VARIANTS: ImageTransformVariant[] = [
  'tattoo-realistic',
  'tattoo-portrait',
  'enhance',
  'line-art',
  'text-logo',
  'relief-3d',
]

async function fetchImageAsDataUrl(url: string, signal: AbortSignal) {
  const res = await fetch(url, { signal })
  const bytes = new Uint8Array(await res.arrayBuffer())
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  const ct = res.headers.get('content-type') || 'image/png'
  return `data:${ct};base64,${btoa(binary)}`
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as RequestBody
  const variant = body.variant
  const sourceImageDataUrl = body.sourceImageDataUrl

  if (!variant || !VALID_VARIANTS.includes(variant)) {
    return Response.json({ ok: false, error: 'Vigane variant.' }, { status: 400 })
  }
  if (!sourceImageDataUrl) {
    return Response.json({ ok: false, error: 'Pildi muundamiseks lisa esmalt pilt.' }, { status: 400 })
  }

  const apiKey = (process.env.OPENAI_API_KEY || '').trim()
  if (!apiKey) {
    return Response.json({ ok: false, error: 'OPENAI_API_KEY puudub.' }, { status: 503 })
  }

  const prompt = IMAGE_TRANSFORM_PROMPTS[variant]

  try {
    const base64 = sourceImageDataUrl.includes(',')
      ? sourceImageDataUrl.split(',')[1]
      : sourceImageDataUrl
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

    const formData = new FormData()
    formData.append('model', OPENAI_IMAGE_MODEL)
    formData.append('image', new Blob([bytes], { type: 'image/png' }), 'reference.png')
    formData.append('prompt', prompt)
    formData.append('n', '1')
    formData.append('size', '1024x1024')

    const res = await fetch(`${OPENAI_BASE_URL}/images/edits`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
      signal: req.signal,
    })

    const payload = (await res.json().catch(() => null)) as {
      data?: Array<{ b64_json?: string; url?: string }>
      error?: { message?: string }
    } | null

    if (!res.ok) {
      throw new Error(payload?.error?.message || `OpenAI edits viga ${res.status}`)
    }

    const first = payload?.data?.[0]
    let imageDataUrl: string
    if (first?.b64_json) {
      imageDataUrl = `data:image/png;base64,${first.b64_json}`
    } else if (first?.url) {
      imageDataUrl = await fetchImageAsDataUrl(first.url, req.signal)
    } else {
      throw new Error('Pildi muundamine ei tagastanud väljundit.')
    }

    return Response.json({ ok: true, imageDataUrl })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Pildi muundamine ebaõnnestus.'
    return Response.json({ ok: false, error: message }, { status: 502 })
  }
}
