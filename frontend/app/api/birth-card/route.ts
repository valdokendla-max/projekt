// OpenAI /v1/images/generations endpoint for the birth card (no source image).
// Client sends Estonian inputs; we translate to English via the prompt builder before sending.
import {
  buildBirthCardPrompt,
  CHINESE_ZODIAC_ANIMALS,
  ZODIAC_SIGNS,
  type BirthCardInputs,
  type ChineseZodiacAnimal,
  type ZodiacSign,
} from '@/lib/image-prompts'

export const runtime = 'edge'

const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '')
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1'
const OPENAI_IMAGE_QUALITY = process.env.OPENAI_IMAGE_QUALITY || 'medium'

interface RequestBody {
  tahtkuju?: string
  sunniaasta_loom?: string
  hingeloom?: string
}

async function fetchImageAsDataUrl(url: string, signal: AbortSignal) {
  const res = await fetch(url, { signal })
  const bytes = new Uint8Array(await res.arrayBuffer())
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  const ct = res.headers.get('content-type') || 'image/png'
  return `data:${ct};base64,${btoa(binary)}`
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as RequestBody
  const tahtkuju = String(body.tahtkuju || '').trim()
  const sunniaasta_loom = String(body.sunniaasta_loom || '').trim()
  const hingeloom = String(body.hingeloom || '').trim()

  if (!(ZODIAC_SIGNS as readonly string[]).includes(tahtkuju)) {
    return Response.json({ ok: false, error: 'Vali kehtiv tähtkuju.' }, { status: 400 })
  }
  if (!(CHINESE_ZODIAC_ANIMALS as readonly string[]).includes(sunniaasta_loom)) {
    return Response.json({ ok: false, error: 'Vali kehtiv sünniaasta loom.' }, { status: 400 })
  }
  if (hingeloom.length < 2) {
    return Response.json({ ok: false, error: 'Hingeloom peab olema vähemalt 2 tähemärki.' }, { status: 400 })
  }
  if (hingeloom.length > 60) {
    return Response.json({ ok: false, error: 'Hingeloom peab olema kuni 60 tähemärki.' }, { status: 400 })
  }

  const apiKey = (process.env.OPENAI_API_KEY || '').trim()
  if (!apiKey) {
    return Response.json({ ok: false, error: 'OPENAI_API_KEY puudub.' }, { status: 503 })
  }

  const inputs: BirthCardInputs = {
    tahtkuju: tahtkuju as ZodiacSign,
    sunniaasta_loom: sunniaasta_loom as ChineseZodiacAnimal,
    hingeloom,
  }
  const prompt = buildBirthCardPrompt(inputs)

  try {
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
        size: '1024x1536',
        quality: OPENAI_IMAGE_QUALITY,
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
    let imageDataUrl: string
    if (first?.b64_json) {
      imageDataUrl = `data:image/png;base64,${first.b64_json}`
    } else if (first?.url) {
      imageDataUrl = await fetchImageAsDataUrl(first.url, req.signal)
    } else {
      throw new Error('Sünnikaardi loomine ei tagastanud väljundit.')
    }

    return Response.json({ ok: true, imageDataUrl })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sünnikaardi loomine ebaõnnestus.'
    return Response.json({ ok: false, error: message }, { status: 502 })
  }
}
