import sharp from 'sharp'
import { parseJsonBodyWithLimit } from '@/lib/api-security'

export const runtime = 'nodejs'
export const maxDuration = 60

const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '')
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1'

interface RequestBody {
  subjectText: string
  sourceImageDataUrl?: string
  mode?: 'eskiis' | 'kehal'
}

function buildTattooPrompt(subjectText: string, hasReference: boolean) {
  const subject = subjectText.trim() ? subjectText.trim() : 'a detailed subject'
  const base =
    `Black and grey realistic tattoo design of ${subject}, created in a highly detailed neo-traditional illustrative tattoo style. ` +
    'Stylized layered textures and intricate ornamental detailing adapted naturally to the subject. ' +
    'Sharp overlapping detail patterns, smooth whip shading, soft gradient transitions, dense dotwork stippling, and crisp fine-line contour work. ' +
    'Strong contrast between deep black shadows and soft grey highlights. ' +
    'Piercing realistic eyes with subtle bright reflections. ' +
    'Highly detailed illustrative tattoo art with elegant flow, realistic anatomy, cinematic shading, and refined ornamental realism. ' +
    'Professional tattoo flash artwork, centered subject, isolated on a completely clean white background. ' +
    'No composition elements, no scenery, no decorative background, no branches, no vines, no leaves, no smoke, no rocks, no frame, no border, no mandala, no floral wreath, no geometric background, no skin, no body placement, no extra objects outside the subject. ' +
    'Negative prompt: low quality, blurry, bad anatomy, distorted proportions, extra limbs, duplicate elements, cartoon, anime, watercolor, colorful background, messy composition, low detail, flat shading, oversaturated, text, watermark, frame, border, mandala, floral wreath, glowing neon, realistic environment, photo background, unfinished lines, rough sketch'

  if (hasReference) {
    return base + ' Base the design on the uploaded reference image.'
  }

  return base
}

function buildTattooOnBodyPrompt(hasReference: boolean) {
  const base =
    'Professional tattoo photography, black and grey realistic tattoo visible on the upper arm or forearm of a person, ' +
    'close-up shot focusing on the tattoo, natural skin texture, soft studio lighting, shallow depth of field, ' +
    'DSLR photography style, sharp focus on tattoo details, warm ambient tones, cinematic composition. ' +
    'The tattoo features neo-traditional black-and-grey realism style, intricate linework, smooth shading, ' +
    'strong contrast between deep black and soft grey, fine detailed artwork. ' +
    'Professional tattoo studio setting, high resolution, 8K detail, realistic skin with visible pores, ' +
    'centered composition, the tattoo fully visible and unobstructed.'

  if (hasReference) {
    return base + ' Base the design on the uploaded reference image.'
  }

  return base
}

async function fetchImageAsDataUrl(url: string, signal: AbortSignal) {
  const res = await fetch(url, { signal })
  const buf = Buffer.from(await res.arrayBuffer())
  const ct = res.headers.get('content-type') || 'image/png'
  return `data:${ct};base64,${buf.toString('base64')}`
}

async function dataUrlToBuffer(dataUrl: string): Promise<Buffer> {
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl
  return Buffer.from(base64, 'base64')
}

// Trim white borders from AI output, then add a small 5% margin so design has breathing room
async function trimAndFrame(inputBuffer: Buffer): Promise<Buffer> {
  const flattened = await sharp(inputBuffer)
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .toBuffer()

  const trimmed = await sharp(flattened)
    .trim({ background: '#ffffff', threshold: 40 })
    .toBuffer()

  const meta = await sharp(trimmed).metadata()
  const w = meta.width ?? 512
  const h = meta.height ?? 512
  const margin = Math.round(Math.max(w, h) * 0.05)
  const canvasW = w + margin * 2
  const canvasH = h + margin * 2

  return sharp({
    create: { width: canvasW, height: canvasH, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
  })
    .composite([{ input: trimmed, left: margin, top: margin }])
    .png()
    .toBuffer()
}

export async function POST(req: Request) {
  const parsed = await parseJsonBodyWithLimit<RequestBody>(req, {
    maxBytes: 8 * 1024 * 1024,
    routeLabel: '/api/tattoo-generation',
  })
  if ('response' in parsed) return parsed.response

  const { subjectText = '', sourceImageDataUrl, mode = 'eskiis' } = parsed.data
  const apiKey = (process.env.OPENAI_API_KEY || '').trim()

  if (!apiKey) {
    return Response.json({ ok: false, error: 'OPENAI_API_KEY puudub.' }, { status: 503 })
  }

  const prompt = mode === 'kehal'
    ? buildTattooOnBodyPrompt(Boolean(sourceImageDataUrl))
    : buildTattooPrompt(subjectText, Boolean(sourceImageDataUrl))

  try {
    let imageDataUrl: string

    // gpt-image-1 edits only for eskiis mode with a reference image
    if (sourceImageDataUrl && mode !== 'kehal') {
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
        throw new Error(payload?.error?.message || `OpenAI edits viga ${res.status}`)
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
      // dall-e-3 generations for kehal mode (any) and eskiis without reference
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
          quality: process.env.OPENAI_IMAGE_QUALITY || 'medium',
          output_format: 'png',
        }),
        signal: req.signal,
      })

      const payload = (await res.json().catch(() => null)) as {
        data?: Array<{ b64_json?: string; url?: string }>
        error?: { message?: string }
      } | null

      if (!res.ok) {
        throw new Error(payload?.error?.message || `OpenAI generations viga ${res.status}`)
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

    let finalDataUrl = imageDataUrl
    if (mode !== 'kehal') {
      const rawBuffer = await dataUrlToBuffer(imageDataUrl)
      const framedBuffer = await trimAndFrame(rawBuffer)
      finalDataUrl = `data:image/png;base64,${framedBuffer.toString('base64')}`
    }

    return Response.json({ ok: true, imageDataUrl: finalDataUrl })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Tatoo loomine ebaõnnestus.'
    return Response.json({ ok: false, error: message }, { status: 502 })
  }
}
