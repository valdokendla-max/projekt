import sharp from 'sharp'
import { parseJsonBodyWithLimit } from '@/lib/api-security'

export const runtime = 'nodejs'
export const maxDuration = 60

const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '')
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1'
const DALLE3_MODEL = 'dall-e-3'

interface RequestBody {
  subjectText: string
  sourceImageDataUrl?: string
  mode?: 'eskiis' | 'kehal'
}

function buildTattooPrompt(subjectText: string, hasReference: boolean) {
  const subject = subjectText.trim() ? ` Subject: ${subjectText.trim()}.` : ''
  const base =
    `Black and grey realistic tattoo design with detailed stylized patterns featuring sharp, layered scale-like textures and intricate linework.${subject} ` +
    'Highly detailed illustrative tattoo art with smooth shading, strong contrast between deep black and soft grey, fine line work. ' +
    'White background, professional tattoo flash design. No texture, colors or dark areas outside the illustration are allowed. ' +
    'Mandala, frame, border, surrounding decorations and floral wreath are not allowed. ' +
    'Not on skin. Not on body. Ink on white paper only. ' +
    '1:1 aspect ratio --style raw --v 6 --no skin, arm, body, leg, person, photograph. ' +
    'The entire design must be fully contained within the frame with clear margins on all sides — nothing should be cropped, cut off, or touch the edges of the image.'

  if (hasReference) {
    return base + ' Base the design on the uploaded reference image.'
  }

  return base
}

function buildTattooOnBodyPrompt(hasReference: boolean) {
  const base =
    'Ultra-realistic nude person, slim yet curvy body, soft platinum-blonde wavy hair, piercing blue eyes, relaxed seductive expression, realistic skin texture'
    'natural indoor daylight, cinematic soft shadows, modern apartment interior, DSLR photography style'
    'shallow depth of field, elegant erotic aesthetic, photorealistic anatomy, warm ambient tones, highly detailed body contours, smooth skin reflections'
    'soft facial lighting, realistic proportions, 8K ultra-sharp detail, intimate atmosphere, luxury portrait photography, camera on tripod visible in the background'
    'centered composition, natural pose, cinematic realismm'
    'Tattoo stencil design, in neo-traditional black-and-grey realism tattoo style, ornamental geometric fur-texture stylized with scale- or feather-like shading patterns, intricate whip shading technique'
    'dense dotwork stippling for soft transitions, bold black cross-hatching for deep shadows, clean crisp contour lines with solid outlines, high-contrast grayscale with deep blacks and bright highlights'
    'piercing detailed eyes with strong white reflections, professional tattoo flash sheet, COMPLETELY CLEAN WHITE BACKGROUND, isolated design on pure white paper, tattoo design reference sheet, studio lighting'
    'centered vertical composition, sharp focus, ultra-detailed, 1:1 aspect ratio.'
    'Negative prompt: low quality, blurry, bad anatomy, extra limbs, deformed hands, distorted face, cartoon, anime, censored, clothes, watermark, text, unrealistic proportions, duplicate body parts, oversaturated colors'
    'poorly drawn eyes, grainy image, mutated anatomy, plastic skin, low detail.'

  if (hasReference) {
    return base + ' Base the design on the uploaded reference image.'
  }

  return base
}

// Scales the AI image to 55% and centers it on a white 1024x1024 canvas — guarantees ~22% white margin on every side.
async function addPadding(inputBuffer: Buffer): Promise<Buffer> {
  const canvasSize = 1024
  const targetSize = Math.round(canvasSize * 0.55) // 55% → 563px max, leaves ~230px margin each side

  const resized = await sharp(inputBuffer)
    .resize(targetSize, targetSize, { fit: 'inside' })
    .png()
    .toBuffer()

  const meta = await sharp(resized).metadata()
  const w = meta.width ?? targetSize
  const h = meta.height ?? targetSize
  const left = Math.round((canvasSize - w) / 2)
  const top = Math.round((canvasSize - h) / 2)

  return sharp({
    create: { width: canvasSize, height: canvasSize, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
  })
    .composite([{ input: resized, left, top }])
    .png()
    .toBuffer()
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
          model: DALLE3_MODEL,
          prompt,
          n: 1,
          size: '1024x1792',
          quality: 'hd',
          style: 'natural',
          response_format: 'b64_json',
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

    const rawBuffer = await dataUrlToBuffer(imageDataUrl)
    const framedBuffer = await trimAndFrame(rawBuffer)
    const finalDataUrl = `data:image/png;base64,${framedBuffer.toString('base64')}`

    return Response.json({ ok: true, imageDataUrl: finalDataUrl })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Tatoo loomine ebaõnnestus.'
    return Response.json({ ok: false, error: message }, { status: 502 })
  }
}
