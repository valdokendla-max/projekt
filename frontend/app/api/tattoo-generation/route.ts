import { parseJsonBodyWithLimit } from '@/lib/api-security'

export const runtime = 'nodejs'
export const maxDuration = 60

const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '')
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1'

interface RequestBody {
  subjectText: string
  sourceImageDataUrl?: string
}

function buildTattooPrompt(subjectText: string, hasReference: boolean) {
  const subject = subjectText.trim() ? `Subject: ${subjectText.trim()}. ` : ''
  const base =
    'Tattoo flash art on pure white background. ' +
    `Black and grey realism. ${subject}` +
    'The subject is a small centered design occupying at most 50% of the canvas width and height. ' +
    'Large white margins on all four sides — at least 25% white space on every edge. ' +
    'PURE WHITE BACKGROUND everywhere outside the subject. No dark background. No colored background. No texture behind the subject. ' +
    'NO mandala. NO ornamental frame. NO decorative border. NO surrounding patterns. NO floral wreath. NO geometric shapes around the subject. NO oval frame. ' +
    'Fine line detail, whip shading, bold outlines, high contrast greyscale ink only. ' +
    'Entire subject fully visible and not cropped. Ultra-detailed tattoo design.'

  if (hasReference) {
    return base + ' Redraw the uploaded reference image as a black and grey tattoo design. Subject small and centered on white canvas with large margins.'
  }

  return base + ' NOT ON SKIN. NOT ON BODY. No color fill. Ink lines on white only.'
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
    routeLabel: '/api/tattoo-generation',
  })
  if ('response' in parsed) return parsed.response

  const { subjectText = '', sourceImageDataUrl } = parsed.data
  const apiKey = (process.env.OPENAI_API_KEY || '').trim()

  if (!apiKey) {
    return Response.json({ ok: false, error: 'OPENAI_API_KEY puudub.' }, { status: 503 })
  }

  const prompt = buildTattooPrompt(subjectText, Boolean(sourceImageDataUrl))

  try {
    let imageDataUrl: string

    if (sourceImageDataUrl) {
      const base64 = sourceImageDataUrl.includes(',') ? sourceImageDataUrl.split(',')[1] : sourceImageDataUrl
      const mediaType = sourceImageDataUrl.startsWith('data:') ? sourceImageDataUrl.split(';')[0].slice(5) : 'image/png'
      const buffer = Buffer.from(base64, 'base64')

      const formData = new FormData()
      formData.append('model', OPENAI_IMAGE_MODEL)
      formData.append('image[]', new Blob([buffer], { type: mediaType }), 'reference.png')
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
        throw new Error(payload?.error?.message || 'Tatoo eskiisi loomine ebaõnnestus.')
      }

      const first = payload?.data?.[0]
      if (first?.b64_json) {
        imageDataUrl = `data:image/png;base64,${first.b64_json}`
      } else if (first?.url) {
        imageDataUrl = await fetchImageAsDataUrl(first.url, req.signal)
      } else {
        throw new Error('Tatoo genereerimine ei tagastanud väljundit.')
      }
    } else {
      const res = await fetch(`${OPENAI_BASE_URL}/images/generations`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: OPENAI_IMAGE_MODEL,
          prompt,
          n: 1,
          size: '1024x1024',
          output_format: 'png',
        }),
        signal: req.signal,
      })

      const payload = (await res.json().catch(() => null)) as {
        data?: Array<{ b64_json?: string; url?: string }>
        error?: { message?: string }
      } | null

      if (!res.ok) {
        throw new Error(payload?.error?.message || 'Tatoo genereerimine ebaõnnestus.')
      }

      const first = payload?.data?.[0]
      if (first?.b64_json) {
        imageDataUrl = `data:image/png;base64,${first.b64_json}`
      } else if (first?.url) {
        imageDataUrl = await fetchImageAsDataUrl(first.url, req.signal)
      } else {
        throw new Error('Tatoo genereerimine ei tagastanud väljundit.')
      }
    }

    return Response.json({ ok: true, imageDataUrl })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Tatoo loomine ebaõnnestus.'
    return Response.json({ ok: false, error: message }, { status: 502 })
  }
}
