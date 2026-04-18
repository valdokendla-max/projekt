import type {
  EngravingPreset,
  ImageAsset,
  ImageGenerationRequestPlan,
  OptimizedPrompt,
} from '@/lib/engraving/types'

const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '')
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1-mini'

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
