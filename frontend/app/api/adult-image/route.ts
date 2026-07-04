// Adult/18+ image generation — ComfyUI txt2img on local GPU.
// POST /api/adult-image      -> {variant, subject} -> {ok, status:"pending", promptId}
// GET  /api/adult-image?id=  -> poll for ready/pending/error
import {
  ADULT_VARIANTS,
  buildAdultPrompt,
  type AdultVariant,
} from '@/lib/adult-prompts'
import { ComfyClient, ComfyError, bytesToDataUrl, type ComfyImageRef, type ComfyHistoryEntry } from '@/lib/comfyui-client'
import { buildTxt2ImgWorkflow, buildTxt2ImgWithFaceFixWorkflow } from '@/lib/comfyui-workflows'

export const runtime = 'edge'

const COMFYUI_BASE_URL = (process.env.COMFYUI_BASE_URL || '').trim()

interface SubmitBody {
  variant?: AdultVariant
  subject?: string
  ageConfirmed?: boolean
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as SubmitBody
  const variant = body.variant
  const subject = String(body.subject || '').trim()

  if (!body.ageConfirmed) {
    return Response.json({ ok: false, error: 'Vanus 18+ peab olema kinnitatud.' }, { status: 403 })
  }
  if (!variant || !(variant in ADULT_VARIANTS)) {
    return Response.json({ ok: false, error: 'Vigane variant.' }, { status: 400 })
  }
  if (subject.length < 3) {
    return Response.json({ ok: false, error: 'Kirjelda subjekti vähemalt 3 tähemärgiga.' }, { status: 400 })
  }
  if (subject.length > 300) {
    return Response.json({ ok: false, error: 'Subjekti kirjeldus kuni 300 tähemärki.' }, { status: 400 })
  }
  if (!COMFYUI_BASE_URL) {
    return Response.json({ ok: false, error: 'ComfyUI server pole hetkel saadaval.' }, { status: 503 })
  }

  const cfg = ADULT_VARIANTS[variant]
  const { prompt, negativePrompt } = buildAdultPrompt(variant, subject)

  try {
    const client = new ComfyClient({ baseUrl: COMFYUI_BASE_URL })
    // Nägu lähedalt näitavad kategooriad saavad FaceDetailer'i (näo teravus).
    // Explicit ja tattoo kasutavad lihtsat txt2img-i — kiirem/stabiilsem, nägu pole seal fookuses.
    const useFaceDetailer =
      cfg.category === 'portrait' ||
      cfg.category === 'glamour' ||
      cfg.category === 'atmosphere' ||
      cfg.category === 'beach' ||
      cfg.category === 'group'
    const workflow = useFaceDetailer
      ? buildTxt2ImgWithFaceFixWorkflow({
          prompt,
          negativePrompt,
          width: cfg.width,
          height: cfg.height,
          steps: cfg.steps,
          cfg: cfg.cfg,
          checkpoint: cfg.checkpoint,
          filenamePrefix: `adult_${variant}`,
        })
      : buildTxt2ImgWorkflow({
          prompt,
          negativePrompt,
          width: cfg.width,
          height: cfg.height,
          steps: cfg.steps,
          cfg: cfg.cfg,
          checkpoint: cfg.checkpoint,
          filenamePrefix: `adult_${variant}`,
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
