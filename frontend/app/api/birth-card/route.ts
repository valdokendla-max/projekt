// Two-step birth card via ComfyUI.
// DISABLED IN UI (icon removed from homepage) — kept for direct API testing
// until Phase 2 (Regional Conditioning) can separate 3 distinct animal subjects.
//
//   POST /api/birth-card  -> submits workflow, returns promptId
//   GET  /api/birth-card?id=<promptId> -> polls for ready/pending/error
import {
  buildBirthCardPrompt,
  CHINESE_ZODIAC_ANIMALS,
  ZODIAC_SIGNS,
  type BirthCardInputs,
  type ChineseZodiacAnimal,
  type ZodiacSign,
} from '@/lib/image-prompts'
import { ComfyClient, ComfyError, bytesToDataUrl, type ComfyImageRef, type ComfyHistoryEntry } from '@/lib/comfyui-client'
import { buildTxt2ImgWorkflow } from '@/lib/comfyui-workflows'

export const runtime = 'edge'

const COMFYUI_BASE_URL = (process.env.COMFYUI_BASE_URL || '').trim()

interface SubmitBody {
  tahtkuju?: string
  sunniaasta_loom?: string
  hingeloom?: string
}

const NEGATIVE_PROMPT =
  'photo, photorealistic, 3D rendering, modern art, cartoon, anime, watercolor, colorful, neon, glowing effects, ' +
  'extra animals, extra people, modern clothing, technology, vehicles, buildings, watermark, signature, ' +
  'hands holding the card, real plants, real flowers, decorations outside the card frame, low quality, blurry'

// ---------------------------------------------------------------------------
// POST — submit
// ---------------------------------------------------------------------------
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as SubmitBody
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

  const inputs: BirthCardInputs = {
    tahtkuju: tahtkuju as ZodiacSign,
    sunniaasta_loom: sunniaasta_loom as ChineseZodiacAnimal,
    hingeloom,
  }
  const prompt = buildBirthCardPrompt(inputs)

  if (!COMFYUI_BASE_URL) {
    return Response.json({ ok: false, error: 'ComfyUI server pole hetkel saadaval.' }, { status: 503 })
  }
  // Birth card is temporarily disabled in UI until Phase 2 (Regional Conditioning)
  // can separate 3 distinct animal subjects. Route still works for direct testing.
  try {
    const client = new ComfyClient({ baseUrl: COMFYUI_BASE_URL })
    const workflow = buildTxt2ImgWorkflow({
      prompt,
      negativePrompt: NEGATIVE_PROMPT,
      width: 832,
      height: 1216,
      filenamePrefix: 'birthcard',
    })
    const promptId = await client.submit(workflow, req.signal)
    return Response.json({ ok: true, status: 'pending', promptId, provider: 'comfyui-sdxl' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sünnikaardi loomine ebaõnnestus.'
    return Response.json({ ok: false, error: message }, { status: 502 })
  }
}

// ---------------------------------------------------------------------------
// GET — poll status
// ---------------------------------------------------------------------------
export async function GET(req: Request) {
  if (!COMFYUI_BASE_URL) {
    return Response.json({ ok: false, error: 'Polling on ainult ComfyUI puhul.' }, { status: 400 })
  }
  const url = new URL(req.url)
  const promptId = (url.searchParams.get('id') || '').trim()
  if (!promptId) {
    return Response.json({ ok: false, error: 'id puudub.' }, { status: 400 })
  }

  try {
    const histRes = await fetch(`${COMFYUI_BASE_URL}/history/${encodeURIComponent(promptId)}`, {
      signal: AbortSignal.timeout(10_000),
    })
    if (!histRes.ok) {
      return Response.json({ ok: false, error: `ComfyUI history viga ${histRes.status}` }, { status: 502 })
    }
    const data = (await histRes.json().catch(() => ({}))) as Record<string, ComfyHistoryEntry>
    const entry = data[promptId]

    if (!entry) {
      return Response.json({ ok: true, status: 'pending', promptId })
    }

    if (entry.status?.status_str === 'error') {
      return Response.json({ ok: false, status: 'error', error: 'ComfyUI execution error', promptId }, { status: 502 })
    }

    if (entry.status?.completed) {
      const images: ComfyImageRef[] = []
      for (const out of Object.values(entry.outputs || {})) {
        for (const img of out.images || []) images.push(img)
      }
      if (images.length === 0) {
        return Response.json({ ok: false, status: 'error', error: 'No images produced.', promptId }, { status: 502 })
      }
      const ref = images[0]!
      const imgUrl = new URL(`${COMFYUI_BASE_URL}/view`)
      imgUrl.searchParams.set('filename', ref.filename)
      imgUrl.searchParams.set('subfolder', ref.subfolder)
      imgUrl.searchParams.set('type', ref.type)
      const imgRes = await fetch(imgUrl.toString(), { signal: AbortSignal.timeout(20_000) })
      if (!imgRes.ok) {
        return Response.json({ ok: false, error: `View viga ${imgRes.status}` }, { status: 502 })
      }
      const bytes = new Uint8Array(await imgRes.arrayBuffer())
      const mediaType = imgRes.headers.get('content-type') || 'image/png'
      return Response.json({
        ok: true,
        status: 'ready',
        imageDataUrl: bytesToDataUrl(bytes, mediaType),
        promptId,
      })
    }

    return Response.json({ ok: true, status: 'pending', promptId })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Polling ebaõnnestus.'
    const status = error instanceof ComfyError ? 504 : 502
    return Response.json({ ok: false, error: message }, { status })
  }
}
