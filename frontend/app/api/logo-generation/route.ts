import { parseJsonBodyWithLimit } from '@/lib/api-security'

export const runtime = 'edge'

interface RequestBody {
  brandText: string
  sourceImageDataUrl?: string
}

function buildTattooPrompt(subjectText: string) {
  const subject = subjectText.trim() ? `${subjectText.trim()}, ` : ''
  return (
    `${subject}Black and grey realistic tattoo design with highly detailed illustrative linework and layered feather textures, ` +
    'dynamic bird-of-prey composition, smooth gradient shading, deep black tones and soft grey transitions, ' +
    'ultra-clean contour lines, high-contrast monochromatic style, realistic anatomy combined with stylized ornamental details, ' +
    'intricate scale-like feather patterns, crystalline geometric elements, subtle dotwork particles, ' +
    'soft glowing light accents, professional tattoo flash style, centered composition, ' +
    'fully isolated illustration on a pure white background, extremely clean and polished final result, ' +
    'no text, no frame, no flowers, no additional background outside the illustration.'
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

    const bytes = new Uint8Array(await res.arrayBuffer())
    let binary = ''
    const chunk = 0x8000
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
    }
    const ct = res.headers.get('content-type') || 'image/jpeg'
    const imageDataUrl = `data:${ct};base64,${btoa(binary)}`

    return Response.json({ ok: true, imageDataUrl })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Tattoo loomine ebaõnnestus.'
    return Response.json({ ok: false, error: message }, { status: 502 })
  }
}
