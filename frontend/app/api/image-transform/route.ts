// Image transform endpoint — ComfyUI img2img only (local SDXL on user's GPU).
// No paid AI fallback. Variants without comfyEnabled return a "not yet supported"
// message until Phase 2 (Regional Conditioning / ControlNet / IPAdapter) lands.
import { IMAGE_TRANSFORM_PROMPTS, type ImageTransformVariant } from '@/lib/image-prompts'
import { VARIANT_CONFIG, resolveVariantConfig, type QualityTier } from '@/lib/image-transform-config'
import { ComfyClient, ComfyError, bytesToDataUrl, type ComfyImageRef, type ComfyHistoryEntry } from '@/lib/comfyui-client'
import { buildImg2ImgWorkflow, buildLineArtWorkflow, buildControlNetImg2ImgWorkflow } from '@/lib/comfyui-workflows'

export const runtime = 'edge'

const COMFYUI_BASE_URL = (process.env.COMFYUI_BASE_URL || '').trim()

interface SubmitBody {
  variant?: ImageTransformVariant
  sourceImageDataUrl?: string
  quality?: QualityTier
}

const VALID_QUALITY_TIERS: QualityTier[] = ['fast', 'balanced', 'high']

// PNG IHDR (bytes 16-23, big-endian): width then height. Cheap sanity check that
// ComfyUI actually returned a real image and not a truncated/blank one.
function readPngDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 24) return null
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
  if (!isPng) return null
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return { width: view.getUint32(16), height: view.getUint32(20) }
}

const VALID_VARIANTS: ImageTransformVariant[] = [
  'tattoo-realistic',
  'tattoo-portrait',
  'enhance',
  'line-art',
  'text-logo',
  'relief-3d',
]

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1]! : dataUrl
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

// ---------------------------------------------------------------------------
// POST — submit
// ---------------------------------------------------------------------------
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as SubmitBody
  const variant = body.variant
  const sourceImageDataUrl = body.sourceImageDataUrl

  if (!variant || !VALID_VARIANTS.includes(variant)) {
    return Response.json({ ok: false, error: 'Vigane variant.' }, { status: 400 })
  }
  if (!sourceImageDataUrl) {
    return Response.json({ ok: false, error: 'Pildi muundamiseks lisa esmalt pilt.' }, { status: 400 })
  }
  if (!COMFYUI_BASE_URL) {
    return Response.json({ ok: false, error: 'ComfyUI server pole hetkel saadaval.' }, { status: 503 })
  }

  const baseConfig = VARIANT_CONFIG[variant]
  if (!baseConfig.comfyEnabled) {
    return Response.json({
      ok: false,
      error: 'See variant on hetkel arenduses — vajab ControlNet / IPAdapter custom node\'e. Tuleb peagi.',
    }, { status: 501 })
  }
  const quality: QualityTier = VALID_QUALITY_TIERS.includes(body.quality as QualityTier) ? (body.quality as QualityTier) : 'balanced'
  const cfg = resolveVariantConfig(baseConfig, quality)

  const { prompt, negativePrompt } = IMAGE_TRANSFORM_PROMPTS[variant]

  try {
    const bytes = dataUrlToBytes(sourceImageDataUrl)
    const client = new ComfyClient({ baseUrl: COMFYUI_BASE_URL })
    const uploaded = await client.uploadImage(bytes, `src_${variant}_${Date.now()}.png`, req.signal)

    const workflow = variant === 'line-art'
      ? buildLineArtWorkflow({ sourceImageName: uploaded.name, filenamePrefix: 'tx_line-art' })
      : cfg.controlNet
      ? buildControlNetImg2ImgWorkflow({
          prompt,
          negativePrompt,
          sourceImageName: uploaded.name,
          controlNetName: cfg.controlNet.modelName,
          preprocessor: cfg.controlNet.preprocessor,
          controlNetStrength: cfg.controlNet.strength,
          cannyLowThreshold: cfg.controlNet.cannyLowThreshold,
          cannyHighThreshold: cfg.controlNet.cannyHighThreshold,
          denoise: cfg.denoise,
          steps: cfg.steps,
          cfg: cfg.cfg,
          checkpoint: cfg.checkpoint,
          filenamePrefix: `tx_${variant}`,
        })
      : buildImg2ImgWorkflow({
          prompt,
          negativePrompt,
          sourceImageName: uploaded.name,
          denoise: cfg.denoise,
          steps: cfg.steps,
          cfg: cfg.cfg,
          checkpoint: cfg.checkpoint,
          filenamePrefix: `tx_${variant}`,
        })

    const promptId = await client.submit(workflow, req.signal)
    return Response.json({
      ok: true,
      status: 'pending',
      promptId,
      provider: variant === 'line-art' ? 'comfyui-canny' : `comfyui-${cfg.checkpoint.replace(/\.safetensors$/, '')}`,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Pildi muundamine ebaõnnestus.'
    return Response.json({ ok: false, error: message }, { status: 502 })
  }
}

// ---------------------------------------------------------------------------
// GET — poll status (ComfyUI variants only)
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
      // QA-kontroll: veendu, et ComfyUI tagastas päris, mõistliku suurusega pildi,
      // mitte katkist/tühja väljundit (nt VAE decode viga, mis annab 0x0 PNG).
      const dims = readPngDimensions(bytes)
      if (!dims || dims.width < 64 || dims.height < 64) {
        return Response.json({ ok: false, status: 'error', error: 'Väljund on vigane või liiga väike — proovi uuesti.', promptId }, { status: 502 })
      }
      return Response.json({
        ok: true,
        status: 'ready',
        imageDataUrl: bytesToDataUrl(bytes, mediaType),
        promptId,
        qualityChecked: true,
      })
    }

    return Response.json({ ok: true, status: 'pending', promptId })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Polling ebaõnnestus.'
    const status = error instanceof ComfyError ? 504 : 502
    return Response.json({ ok: false, error: message }, { status })
  }
}
