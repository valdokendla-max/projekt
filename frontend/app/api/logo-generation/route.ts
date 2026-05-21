import { parseJsonBodyWithLimit } from '@/lib/api-security'

export const runtime = 'nodejs'
export const maxDuration = 60

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
    'highly detailed, 1:1 aspect ratio'
  )
}

export async function POST(req: Request) {
  const parsed = await parseJsonBodyWithLimit<RequestBody>(req, {
    maxBytes: 8 * 1024 * 1024,
    routeLabel: '/api/logo-generation',
  })
  if ('response' in parsed) return parsed.response

  const { brandText = '' } = parsed.data
  const prompt = buildTattooPrompt(brandText)

  try {
    const seed = Math.floor(Math.random() * 999999)
    const url =
      `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
      `?width=1024&height=1024&model=flux&nologo=true&seed=${seed}`

    const res = await fetch(url, { signal: req.signal })

    if (!res.ok) {
      throw new Error(`Pollinations viga ${res.status}`)
    }

    const buf = Buffer.from(await res.arrayBuffer())
    const ct = res.headers.get('content-type') || 'image/jpeg'
    const imageDataUrl = `data:${ct};base64,${buf.toString('base64')}`

    return Response.json({ ok: true, imageDataUrl })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Tattoo loomine ebaõnnestus.'
    return Response.json({ ok: false, error: message }, { status: 502 })
  }
}
