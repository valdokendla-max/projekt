import sharp from 'sharp'
import { parseJsonBodyWithLimit } from '@/lib/api-security'

export const runtime = 'nodejs'
export const maxDuration = 60

const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '')
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1'

interface RequestBody {
  brandText: string
  sourceImageDataUrl?: string
}

function buildTattooPrompt(subjectText: string) {
  const subject = subjectText.trim() ? `of ${subjectText.trim()}, ` : ''
  return (
    `Tattoo stencil design ${subject}in neo-traditional ` +
    'black and grey realism tattoo style, ' +
    'fur texture with stylized scales or feather patterns ' +
    'with shading, intricate whip shading technique, ' +
    'dense dotwork, bold black ' +
    'crosshatching for deep shadows, clear clean contour lines ' +
    'with solid outlines, high contrast grayscale with deep ' +
    'blacks and light highlights, piercing detailed eyes ' +
    'with strong white reflections, framed, delicate airy smoke or motion lines ' +
    'as background, professional tattoo flash sheet, COMPLETELY ' +
    'PURE WHITE BACKGROUND, isolated design on pure white paper, ' +
    'NOT ON SKIN, NOT ON ARM, NOT ON BODY, NOT ON SKIN, ' +
    'tattoo design reference sheet, studio lighting, ' +
    'centered vertical composition, sharp focus, ' +
    'highly detailed, 1:1 aspect ratio ' +
    '--style raw --v 6 --no skin, arm, body, leg, person, photo, ' +
    'color, blurred, soft, watercolor'
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
    routeLabel: '/api/logo-generation',
  })
  if ('response' in parsed) return parsed.response

  const { brandText = '', sourceImageDataUrl } = parsed.data
  const apiKey = (process.env.OPENAI_API_KEY || '').trim()

  if (!apiKey) {
    return Response.json({ ok: false, error: 'OPENAI_API_KEY puudub.' }, { status: 503 })
  }

  const prompt = buildTattooPrompt(brandText)

  try {
    let imageDataUrl: string

    if (sourceImageDataUrl) {
      const base64 = sourceImageDataUrl.includes(',') ? sourceImageDataUrl.split(',')[1] : sourceImageDataUrl
      const rawBuffer = Buffer.from(base64, 'base64')

      // Resize to max 1024x1024 — reduces payload and speeds up OpenAI processing
      const buffer = await sharp(rawBuffer)
        .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
        .png()
        .toBuffer()

      const formData = new FormData()
      formData.append('model', OPENAI_IMAGE_MODEL)
      formData.append('image', new Blob([buffer], { type: 'image/png' }), 'reference.png')
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
        throw new Error(payload?.error?.message || 'Tattoo loomine ebaõnnestus.')
      }

      const first = payload?.data?.[0]
      if (first?.b64_json) {
        imageDataUrl = `data:image/png;base64,${first.b64_json}`
      } else if (first?.url) {
        imageDataUrl = await fetchImageAsDataUrl(first.url, req.signal)
      } else {
        throw new Error('Tattoo genereerimine ei tagastanud väljundit.')
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
        throw new Error(payload?.error?.message || 'Tattoo genereerimine ebaõnnestus.')
      }

      const first = payload?.data?.[0]
      if (first?.b64_json) {
        imageDataUrl = `data:image/png;base64,${first.b64_json}`
      } else if (first?.url) {
        imageDataUrl = await fetchImageAsDataUrl(first.url, req.signal)
      } else {
        throw new Error('Tattoo genereerimine ei tagastanud väljundit.')
      }
    }

    return Response.json({ ok: true, imageDataUrl })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Tattoo loomine ebaõnnestus.'
    return Response.json({ ok: false, error: message }, { status: 502 })
  }
}
