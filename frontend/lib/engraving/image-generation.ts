import type {
  EngravingPreset,
  ImageAsset,
  ImageGenerationRequestPlan,
  OptimizedPrompt,
} from '@/lib/engraving/types'
import sharp from 'sharp'
import { bufferToDataUrl, fileExtensionForMediaType, parseDataUrl } from '@/lib/engraving/data-url'
import { normalizeChatImageDataUrl } from '@/lib/engraving/chat-image-normalizer'

const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '')
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1-mini'
const OPENAI_IMAGE_EDIT_MODEL = process.env.OPENAI_IMAGE_EDIT_MODEL || 'gpt-image-1.5'

const CARVED_STYLE_DESCRIPTIONS = {
  'bas-relief': 'Transform it into a bas-relief / 3D carve style image that looks sculpted into wood or stone.',
  medallion: 'Transform it into a centered medallion or cameo-style carved relief with ornamental depth and strong sculpted layers.',
  'stone-carving': 'Transform it into a chiseled stone carving relief with mineral depth, crisp carved shadows, and monument-like structure.',
  'wood-carving': 'Transform it into a carved wood relief with sculpted depth, woodcut-like form hierarchy, and readable engraved texture.',
} as const

export function buildCarvedStyleTransformPrompt(args: {
  style?: keyof typeof CARVED_STYLE_DESCRIPTIONS
  originalPrompt?: string
  preset?: EngravingPreset | null
}) {
  const presetHints = args.preset
    ? [
        `Target machine: ${args.preset.machineLabel}.`,
        `Material: ${args.preset.materialLabel}.`,
        `Operation mode: ${args.preset.operationMode}.`,
      ]
    : []

  const originalPrompt = String(args.originalPrompt || '').trim()
  const style = args.style && args.style in CARVED_STYLE_DESCRIPTIONS ? args.style : 'bas-relief'

  return [
    originalPrompt ? `Preserve the original subject and composition from this source image. ${originalPrompt}` : 'Preserve the original subject and overall composition from this source image.',
    CARVED_STYLE_DESCRIPTIONS[style],
    'Use grayscale depth logic: lighter areas feel raised, darker areas feel recessed.',
    'Create strong directional light and shadow so the relief depth is readable for laser engraving.',
    'Keep the background clean and simple, reduce clutter, and preserve only the important forms and textures.',
    'Make it engraving-friendly: continuous tones, strong depth separation, layered relief, and clean silhouette readability.',
    'Do not add text, frames, extra objects, or decorative background elements.',
    ...presetHints,
  ].join(' ')
}

function resolveGenerationQuality(value: string | undefined) {
  switch ((value || '').toLowerCase()) {
    case 'high':
      return 'high' as const
    case 'low':
      return 'low' as const
    default:
      return 'medium' as const
  }
}

const OPENAI_IMAGE_QUALITY = resolveGenerationQuality(process.env.OPENAI_IMAGE_QUALITY)

function normalizeImageGenerationProviderError(message: string) {
  const normalized = message.toLowerCase()

  if (normalized.includes('billing hard limit has been reached')) {
    return 'OpenAI API arvelduslimiit on täis. Ava OpenAI Platformis Billing ja lisa krediiti või tõsta usage limitit.'
  }

  if (normalized.includes('insufficient_quota')) {
    return 'OpenAI API krediit või quota on otsas. Ava OpenAI Platformis Billing ja Usage ning lisa krediiti.'
  }

  if (normalized.includes('incorrect api key')) {
    return 'OPENAI_API_KEY ei kehti. Loo uus võti OpenAI Platformis ja uuenda serveri keskkonnamuutujat või frontend/.env.local faili.'
  }

  return message
}

function validateImageGenerationApiKey(apiKey: string) {
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY puudub. Lisa see frontend/.env.local faili või serveri keskkonnamuutujatesse.')
  }

  if (apiKey.startsWith('gsk_')) {
    throw new Error('Sisestatud võti näib olevat Groq key. Pildigeneraator vajab OpenAI API key-d, mitte Groq võtit.')
  }
}

function resolveGenerationSize(prompt: string) {
  const normalized = prompt.toLowerCase()

  if (normalized.includes('landscape') || normalized.includes('horizontal')) {
    return '1536x1024' as const
  }

  if (normalized.includes('portrait') || normalized.includes('vertical')) {
    return '1024x1536' as const
  }

  return '1024x1024' as const
}

async function buildLocalReliefFallbackAsset(sourceImageDataUrl: string): Promise<ImageAsset> {
  const normalizedSource = await normalizeChatImageDataUrl(sourceImageDataUrl)
  const parsed = parseDataUrl(normalizedSource.dataUrl)
  const baseBuffer = await sharp(parsed.buffer, {
    failOn: 'none',
    limitInputPixels: 40_000_000,
  })
    .grayscale()
    .normalize()
    .resize({
      width: 1024,
      height: 1024,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .png()
    .toBuffer()

  const embossBuffer = await sharp(baseBuffer)
    .convolve({
      width: 3,
      height: 3,
      kernel: [-2, -1, 0, -1, 1, 1, 0, 1, 2],
    })
    .normalize()
    .png()
    .toBuffer()

  const { data, info } = await sharp(baseBuffer)
    .composite([{ input: embossBuffer, blend: 'overlay' }])
    .linear(1.08, -8)
    .sharpen({ sigma: 1.2 })
    .png()
    .toBuffer({ resolveWithObject: true })

  return {
    dataUrl: bufferToDataUrl(data, 'image/png'),
    mediaType: 'image/png',
    fileName: 'relief-fallback.png',
    width: info.width,
    height: info.height,
    source: 'generated',
  }
}

export function buildImageGenerationRequest(args: {
  optimizedPrompt: OptimizedPrompt
  preset?: EngravingPreset | null
  apiKeyConfigured?: boolean
}): ImageGenerationRequestPlan {
  const { optimizedPrompt, preset, apiKeyConfigured = Boolean(process.env.OPENAI_API_KEY) } = args
  const provider = apiKeyConfigured ? 'openai-compatible' : 'openai-compatible (missing key)'
  const notes = [
    'Generated output should still enter the optimizer pipeline before export.',
    `Image route targets ${OPENAI_BASE_URL}/images/generations.`,
  ]

  if (preset) {
    notes.push(`Preset-aware generation requested for ${preset.machineLabel} on ${preset.materialLabel}.`)
  }

  return {
    provider,
    model: OPENAI_IMAGE_MODEL,
    quality: OPENAI_IMAGE_QUALITY,
    size: resolveGenerationSize(optimizedPrompt.sourcePrompt),
    responseFormat: 'png',
    prompt: optimizedPrompt.positivePrompt,
    negativePrompt: optimizedPrompt.negativePrompt,
    notes,
  }
}

export async function generateImageWithProvider(args: {
  requestPlan: ImageGenerationRequestPlan
  apiKey?: string
  signal?: AbortSignal
}): Promise<{ asset: ImageAsset; revisedPrompt?: string }> {
  const { requestPlan } = args
  const apiKey = args.apiKey?.trim() || process.env.OPENAI_API_KEY || ''

  validateImageGenerationApiKey(apiKey)

  const response = await fetch(`${OPENAI_BASE_URL}/images/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: requestPlan.model,
      prompt: requestPlan.prompt,
      quality: requestPlan.quality,
      size: requestPlan.size,
      n: 1,
      output_format: requestPlan.responseFormat,
    }),
    signal: args.signal,
  })

  const payload = (await response.json().catch(() => null)) as
    | {
        data?: Array<{ b64_json?: string; url?: string; revised_prompt?: string }>
        error?: { message?: string }
      }
    | null

  if (!response.ok) {
    const errorMessage = normalizeImageGenerationProviderError(
      payload?.error?.message || 'Pildi genereerimine ebaõnnestus.',
    )
    throw new Error(errorMessage)
  }

  const firstImage = payload?.data?.[0]
  if (!firstImage) {
    throw new Error('Pildigeneraator ei tagastanud väljundit.')
  }

  if (typeof firstImage.b64_json === 'string') {
    return {
      asset: {
        dataUrl: `data:image/png;base64,${firstImage.b64_json}`,
        mediaType: 'image/png',
        fileName: 'generated-engraving.png',
        source: 'generated',
      },
      revisedPrompt: firstImage.revised_prompt,
    }
  }

  if (typeof firstImage.url === 'string') {
    const assetResponse = await fetch(firstImage.url, {
      cache: 'no-store',
      signal: args.signal,
    })

    if (!assetResponse.ok) {
      throw new Error('Genereeritud pildi allalaadimine ebaõnnestus.')
    }

    const mediaType = assetResponse.headers.get('content-type') || 'image/png'
    const buffer = Buffer.from(await assetResponse.arrayBuffer())

    return {
      asset: {
        dataUrl: `data:${mediaType};base64,${buffer.toString('base64')}`,
        mediaType,
        fileName: 'generated-engraving.png',
        source: 'generated',
      },
      revisedPrompt: firstImage.revised_prompt,
    }
  }

  throw new Error('Pildigeneraator ei tagastanud toetatud väljundvormingut.')
}

export async function editImageWithProvider(args: {
  prompt: string
  sourceImageDataUrl: string
  apiKey?: string
  signal?: AbortSignal
}): Promise<{ asset: ImageAsset; revisedPrompt?: string }> {
  const apiKey = args.apiKey?.trim() || process.env.OPENAI_API_KEY || ''

  validateImageGenerationApiKey(apiKey)

  const normalizedSource = await normalizeChatImageDataUrl(args.sourceImageDataUrl)
  const parsed = parseDataUrl(normalizedSource.dataUrl)
  const extension = fileExtensionForMediaType(parsed.mediaType)
  const file = new File([parsed.buffer], `source-image.${extension}`, { type: parsed.mediaType })
  const executeEditRequest = async () => {
    const formData = new FormData()

    formData.append('model', OPENAI_IMAGE_EDIT_MODEL)
    formData.append('prompt', args.prompt)
    formData.append('size', '1024x1024')
    formData.append('quality', OPENAI_IMAGE_QUALITY)
    formData.append('input_fidelity', 'high')
    formData.append('output_format', 'png')
    formData.append('image[]', file)

    const response = await fetch(`${OPENAI_BASE_URL}/images/edits`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
      signal: args.signal,
    })

    const payload = (await response.json().catch(() => null)) as
      | {
          data?: Array<{ b64_json?: string; url?: string; revised_prompt?: string }>
          error?: { message?: string }
        }
      | null

    return { response, payload }
  }

  let { response, payload } = await executeEditRequest()

  if (!response.ok && response.status >= 500 && response.status < 600) {
    ;({ response, payload } = await executeEditRequest())
  }

  if (!response.ok) {
    const errorMessage = normalizeImageGenerationProviderError(
      payload?.error?.message || 'Pildi teisendamine ebaõnnestus.',
    )

    if (response.status >= 500 && response.status < 600) {
      return {
        asset: await buildLocalReliefFallbackAsset(normalizedSource.dataUrl),
        revisedPrompt: 'local-relief-fallback',
      }
    }

    throw new Error(errorMessage)
  }

  const firstImage = payload?.data?.[0]
  if (!firstImage) {
    throw new Error('Pildiedit ei tagastanud väljundit.')
  }

  if (typeof firstImage.b64_json === 'string') {
    return {
      asset: {
        dataUrl: `data:image/png;base64,${firstImage.b64_json}`,
        mediaType: 'image/png',
        fileName: 'bas-relief-engraving.png',
        source: 'generated',
      },
      revisedPrompt: firstImage.revised_prompt,
    }
  }

  if (typeof firstImage.url === 'string') {
    const assetResponse = await fetch(firstImage.url, {
      cache: 'no-store',
      signal: args.signal,
    })

    if (!assetResponse.ok) {
      throw new Error('Teisendatud pildi allalaadimine ebaõnnestus.')
    }

    const mediaType = assetResponse.headers.get('content-type') || 'image/png'
    const buffer = Buffer.from(await assetResponse.arrayBuffer())

    return {
      asset: {
        dataUrl: `data:${mediaType};base64,${buffer.toString('base64')}`,
        mediaType,
        fileName: 'bas-relief-engraving.png',
        source: 'generated',
      },
      revisedPrompt: firstImage.revised_prompt,
    }
  }

  throw new Error('Pildiedit ei tagastanud toetatud väljundvormingut.')
}
