// Adult/18+ image generation — ComfyUI txt2img on local GPU.
// Üks konsolideeritud vaba-tekst variant: kasutaja kirjeldab stseeni ise.
// POST /api/adult-image      -> {subject, ageConfirmed} -> {ok, status:"pending", promptId}
// GET  /api/adult-image?id=  -> poll for ready/pending/error
import {
  buildFreeformAdultPrompt,
  checkFreeformSafety,
  resolveAdultGenerationConfig,
  type AdultQualityTier,
} from '@/lib/adult-prompts'
import { ComfyClient, ComfyError, bytesToDataUrl, type ComfyImageRef, type ComfyHistoryEntry } from '@/lib/comfyui-client'
import { buildTxt2ImgWithFaceFixWorkflow } from '@/lib/comfyui-workflows'

export const runtime = 'edge'

const COMFYUI_BASE_URL = (process.env.COMFYUI_BASE_URL || '').trim()

const VALID_QUALITY_TIERS: AdultQualityTier[] = ['fast', 'balanced', 'high']

interface SubmitBody {
  subject?: string
  ageConfirmed?: boolean
  quality?: AdultQualityTier
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as SubmitBody
  const subject = String(body.subject || '').trim()

  if (!body.ageConfirmed) {
    return Response.json({ ok: false, error: 'Vanus 18+ peab olema kinnitatud.' }, { status: 403 })
  }
  if (subject.length < 3) {
    return Response.json({ ok: false, error: 'Kirjelda stseeni vähemalt 3 tähemärgiga.' }, { status: 400 })
  }
  if (subject.length > 400) {
    return Response.json({ ok: false, error: 'Kirjeldus kuni 400 tähemärki.' }, { status: 400 })
  }
  const safetyError = checkFreeformSafety(subject)
  if (safetyError) {
    return Response.json({ ok: false, error: safetyError }, { status: 400 })
  }
  if (!COMFYUI_BASE_URL) {
    return Response.json({ ok: false, error: 'ComfyUI server pole hetkel saadaval.' }, { status: 503 })
  }

  const quality: AdultQualityTier = VALID_QUALITY_TIERS.includes(body.quality as AdultQualityTier) ? (body.quality as AdultQualityTier) : 'balanced'
  const { prompt, negativePrompt, matchedVariant, personCount } = buildFreeformAdultPrompt(subject)
  const cfg = resolveAdultGenerationConfig(matchedVariant, quality, personCount)

  try {
    const client = new ComfyClient({ baseUrl: COMFYUI_BASE_URL })
    const loras = cfg.loras.map((l) => ({ name: l.name, strengthModel: l.strengthModel, strengthClip: l.strengthClip }))
    const workflow = buildTxt2ImgWithFaceFixWorkflow({
      prompt,
      negativePrompt,
      width: cfg.width,
      height: cfg.height,
      steps: cfg.steps,
      cfg: cfg.cfg,
      checkpoint: cfg.checkpoint,
      loras,
      clipSkip: cfg.clipSkip,
      samplerName: cfg.samplerName,
      scheduler: cfg.scheduler,
      filenamePrefix: 'adult_custom',
    })
    const promptId = await client.submit(workflow, req.signal)
    return Response.json({
      ok: true,
      status: 'pending',
      promptId,
      provider: `comfyui-${cfg.checkpoint.replace(/\.safetensors$/, '')}`,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Pildi loomine ebaõnnestus.'
    return Response.json({ ok: false, error: message }, { status: 502 })
  }
}

export async function GET(req: Request) {
  if (!COMFYUI_BASE_URL) {
    return Response.json({ ok: false, error: 'ComfyUI server pole hetkel saadaval.' }, { status: 503 })
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
    if (!entry) return Response.json({ ok: true, status: 'pending', promptId })

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
      return Response.json({ ok: true, status: 'ready', imageDataUrl: bytesToDataUrl(bytes, mediaType), promptId })
    }

    return Response.json({ ok: true, status: 'pending', promptId })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Polling ebaõnnestus.'
    const status = error instanceof ComfyError ? 504 : 502
    return Response.json({ ok: false, error: message }, { status })
  }
}
