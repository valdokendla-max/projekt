import sharp from 'sharp'
import { parseJsonBodyWithLimit } from '@/lib/api-security'

export const runtime = 'nodejs'
export const maxDuration = 20

interface RequestBody {
  sourceImageDataUrl: string
}

async function cleanPhotoForEngraving(input: Buffer) {
  return sharp(input, { failOn: 'none' })
    .rotate()
    .resize({
      width: 1800,
      height: 1800,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .grayscale()
    .normalise()
    .median(1)
    .linear(1.22, -14)
    .modulate({ brightness: 1.04 })
    .sharpen({
      sigma: 1.15,
      m1: 1,
      m2: 2.6,
      x1: 3,
      y2: 12,
      y3: 24,
    })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer()
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

  try {
    const base64 = sourceImageDataUrl.includes(',') ? sourceImageDataUrl.split(',')[1] : sourceImageDataUrl
    const buffer = Buffer.from(base64, 'base64')
    const cleaned = await cleanPhotoForEngraving(buffer)
    const imageDataUrl = `data:image/png;base64,${cleaned.toString('base64')}`

    return Response.json({ ok: true, imageDataUrl })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Foto puhastamine ebaõnnestus.'
    return Response.json({ ok: false, error: message }, { status: 502 })
  }
}
