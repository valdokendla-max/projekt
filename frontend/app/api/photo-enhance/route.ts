import { parseJsonBodyWithLimit } from '@/lib/api-security'

export const runtime = 'nodejs'
export const maxDuration = 60

const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '')
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1'

const ENHANCE_PROMPT =
  'Enhance and restore this image: remove blur, increase sharpness and clarity, ' +
  'recover fine details and textures, improve resolution, reduce noise and grain, ' +
  'natural colors, crisp focus, high definition, 8K quality, ' +
  'preserve original composition and style'

interface RequestBody {
  sourceImageDataUrl: string
}

async function fetchImageAsDataUrl(url: string, signal: AbortSignal) {
  const res = await fetch(url, { signal })
  const buf = Buffer.from(await res.arrayBuffer())
  const ct = res.headers.get('content-type') || 'image/png'
  return `data:${ct};base64,${buf.toString('base64')}`
}

export async function POST(req: Request) {
  const parsed = await parseJsonBodyWithLimit<RequestBody>(req, {
    maxBytes: 8 * 1024 * 1024,
    routeLabel: '/api/photo-enhance',
  })
  if ('response' in parsed) return parsed.response

  const { sourceImageDataUrl } = parsed.data

  if (!sourceImageDataUrl) {
    return Response.json({ ok: false, error: 'Foto puhastuseks lisa esmalt pilt.' }, { status: 400 })
  }

  const apiKey = (process.env.OPENAI_API_KEY || '').trim()
  if (!apiKey) {
    return Response.json({ ok: false, error: 'OPENAI_API_KEY puudub.' }, { status: 503 })
  }

  try {
    const base64 = sourceImageDataUrl.includes(',') ? sourceImageDataUrl.split(',')[1] : sourceImageDataUrl
    const mediaType = sourceImageDataUrl.startsWith('data:') ? sourceImageDataUrl.split(';')[0].slice(5) : 'image/png'
    const buffer = Buffer.from(base64, 'base64')

    const formData = new FormData()
    formData.append('model', OPENAI_IMAGE_MODEL)
    formData.append('image[]', new Blob([buffer], { type: mediaType }), 'source.png')
    formData.append('prompt', ENHANCE_PROMPT)
    formData.append('n', '1')
    formData.append('size', 'auto')

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
      throw new Error(payload?.error?.message || 'Foto puhastamine ebaõnnestus.')
    }

    const first = payload?.data?.[0]
    let imageDataUrl: string
    if (first?.b64_json) {
      imageDataUrl = `data:image/png;base64,${first.b64_json}`
    } else if (first?.url) {
      imageDataUrl = await fetchImageAsDataUrl(first.url, req.signal)
    } else {
      throw new Error('Foto puhastamine ei tagastanud väljundit.')
    }

    return Response.json({ ok: true, imageDataUrl })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Foto puhastamine ebaõnnestus.'
    return Response.json({ ok: false, error: message }, { status: 502 })
  }
}
