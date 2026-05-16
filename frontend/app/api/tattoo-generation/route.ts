import sharp from 'sharp'
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
  const subject = subjectText.trim() ? ` Subject: ${subjectText.trim()}.` : ''
  const base =
    `Black and grey realistic tattoo design with detailed stylized patterns featuring sharp, layered scale-like textures and intricate linework.${subject} ` +
    'Highly detailed illustrative tattoo art with smooth shading, strong contrast between deep black and soft grey, fine line work and small decorative dots and sparkle details in the background. ' +
    'White background, professional tattoo flash design. No texture, colors or dark areas outside the illustration are allowed. ' +
    'Mandala, frame, border, surrounding decorations and floral wreath are not allowed. ' +
    'Not on skin. Not on body. Ink on white paper only.'

  if (hasReference) {
    return base + ' Base the design on the uploaded reference image.'
  }

  return base
}

// Shrinks the generated image to 65% and places it centered on a white 1024x1024 canvas,
// guaranteeing padding on all sides regardless of what the model generated.
async function addPadding(inputBuffer: Buffer): Promise<Buffer> {
  const canvasSize = 1024
  const targetSize = Math.round(canvasSize * 0.65)

  const resized = await sharp(inputBuffer)
    .resize(targetSize, targetSize, { fit: 'inside', background: { r: 255, g: 255, b: 255, alpha: 1 } })
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

    // Post-process: shrink to 65% and add white padding to guarantee full subject visibility
    const rawBuffer = await dataUrlToBuffer(imageDataUrl)
    const paddedBuffer = await addPadding(rawBuffer)
    const finalDataUrl = `data:image/png;base64,${paddedBuffer.toString('base64')}`

    return Response.json({ ok: true, imageDataUrl: finalDataUrl })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Tatoo loomine ebaõnnestus.'
    return Response.json({ ok: false, error: message }, { status: 502 })
  }
}
