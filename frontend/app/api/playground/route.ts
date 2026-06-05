// Loo ise — vaba prompt playground. Kasutab kasutaja salvestatud prompti
// (localStorage'ist) + valib kas txt2img (kui ainult prompt) või img2img
// (kui ka referents-pilt antud). ComfyUI-only, no paid fallback.
import { ComfyClient, ComfyError, bytesToDataUrl, type ComfyImageRef, type ComfyHistoryEntry } from '@/lib/comfyui-client'
import { buildTxt2ImgWithFaceFixWorkflow, buildImg2ImgWorkflow } from '@/lib/comfyui-workflows'
import type { PlaygroundCheckpoint } from '@/lib/playground-storage'

export const runtime = 'edge'

const COMFYUI_BASE_URL = (process.env.COMFYUI_BASE_URL || '').trim()

const VALID_CHECKPOINTS: PlaygroundCheckpoint[] = [
  'juggernautXI.safetensors',
  'ponyDiffusionV6XL.safetensors',
  'sd_xl_base_1.0.safetensors',
]

interface SubmitBody {
  prompt?: string
  negativePrompt?: string
  checkpoint?: PlaygroundCheckpoint
  sourceImageDataUrl?: string
  denoise?: number
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1]! : dataUrl
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as SubmitBody
  const prompt = String(body.prompt || '').trim()
  const negativePrompt = String(body.negativePrompt || '').trim()
  const checkpoint = body.checkpoint && VALID_CHECKPOINTS.includes(body.checkpoint)
    ? body.checkpoint
    : 'juggernautXI.safetensors'

  if (prompt.length < 3) {
    return Response.json({ ok: false, error: 'Prompt peab olema vähemalt 3 tähemärki. Salvesta esmalt teadmistes.' }, { status: 400 })
  }
  if (!COMFYUI_BASE_URL) {
    return Response.json({ ok: false, error: 'ComfyUI server pole hetkel saadaval.' }, { status: 503 })
  }

  try {
    const client = new ComfyClient({ baseUrl: COMFYUI_BASE_URL })
    let workflow: Record<string, unknown>

    if (body.sourceImageDataUrl) {
      const bytes = dataUrlToBytes(body.sourceImageDataUrl)
      const uploaded = await client.uploadImage(bytes, `playground_${Date.now()}.png`, req.signal)
      workflow = buildImg2ImgWorkflow({
        prompt,
        negativePrompt,
        sourceImageName: uploaded.name,
        denoise: typeof body.denoise === 'number' ? body.denoise : 0.65,
        checkpoint,
        filenamePrefix: 'playground',
      })
    } else {
      // Txt2img kasutab automaatselt Face Detailer'it (kui näo tuvastab, parandab silmad+naha).
      // Kui pildil ei ole nägu, Face Detailer lihtsalt jätab vahele — turvaline lisada igale txt2img'le.
      workflow = buildTxt2ImgWithFaceFixWorkflow({
        prompt,
        negativePrompt,
        width: 832,
        height: 1216,
        checkpoint,
        filenamePrefix: 'playground',
      })
    }

    const promptId = await client.submit(workflow, req.signal)
    return Response.json({
      ok: true,
      status: 'pending',
      promptId,
      provider: `comfyui-${checkpoint.replace(/\.safetensors$/, '')}`,
      mode: body.sourceImageDataUrl ? 'img2img' : 'txt2img',
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
    if (!histRes.ok) return Response.json({ ok: false, error: `ComfyUI history viga ${histRes.status}` }, { status: 502 })
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
      if (!imgRes.ok) return Response.json({ ok: false, error: `View viga ${imgRes.status}` }, { status: 502 })
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
