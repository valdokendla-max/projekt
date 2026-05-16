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
    `Professional tattoo stencil design. ${subject}` +
    'Neo-traditional black-grey realism tattoo style. ' +
    'Complex whip shading technique, dense dotwork for smooth gradient transitions. ' +
    'Bold black cross-hatching for deep shadows, clean crisp contour lines with defined borders. ' +
    'High contrast greyscale with deep blacks and bright highlights. ' +
    'No decorative borders, no ornamental framing, no surrounding patterns. ' +
    'COMPLETELY CLEAN WHITE BACKGROUND. Isolated design on clean white paper. ' +
    'Studio lighting, centered vertical composition, sharp focus, ultra-detailed. 1:1 aspect ratio.'

  if (hasReference) {
    return base + ' Transform the reference image into a tattoo stencil design capturing its key shapes and composition. No added patterns or decorations.'
  }

  return (
    base +
    ' Clean standalone subject only, no mandala patterns, no surrounding ornaments, no geometric frames. ' +
    'NOT ON SKIN. NOT ON BODY. No color, no blur, no watercolor.'
  )
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
