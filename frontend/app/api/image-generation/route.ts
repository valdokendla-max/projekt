import {
  buildCarvedStyleTransformPrompt,
  buildImageGenerationRequest,
  editImageWithProvider,
  generateImageWithProvider,
} from '@/lib/engraving/image-generation'
import {
  buildUserRateLimitKey,
  enforceRouteRateLimit,
  parseJsonBodyWithLimit,
  requireAuthenticatedRouteUser,
} from '@/lib/api-security'
import { parseSavedSettingsSummary } from '@/lib/engraving/preset-engine'
import { optimizeEngravingPrompt } from '@/lib/engraving/prompt-optimizer'

export const runtime = 'nodejs'
export const maxDuration = 60

interface RequestBody {
  prompt?: string
  savedSettingsSummary?: string
  sourceImageDataUrl?: string
  transformStyle?: 'bas-relief' | 'medallion' | 'stone-carving' | 'wood-carving'
}

export async function POST(req: Request) {
  const auth = await requireAuthenticatedRouteUser(req)
  if (!auth.ok) {
    return auth.response
  }

  const rateLimitResponse = await enforceRouteRateLimit({
    routeId: 'image-generation',
    actorKey: buildUserRateLimitKey(req, auth.value.user),
    maxRequests: 10,
    windowSeconds: 600,
  })
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  const parsed = await parseJsonBodyWithLimit<RequestBody>(req, {
    maxBytes: 6 * 1024 * 1024,
    routeLabel: '/api/image-generation',
  })
  if ('response' in parsed) {
    return parsed.response
  }

  const body = parsed.data
  const prompt = String(body.prompt || '').trim()
  const sourceImageDataUrl = String(body.sourceImageDataUrl || '').trim()

  if (sourceImageDataUrl) {
    const preset = parseSavedSettingsSummary(body.savedSettingsSummary)
    const transformPrompt = buildCarvedStyleTransformPrompt({
      style: body.transformStyle,
      originalPrompt: prompt,
      preset,
    })

    try {
      const generated = await editImageWithProvider({
        prompt: transformPrompt,
        sourceImageDataUrl,
        signal: req.signal,
      })

      return Response.json({
        ok: true,
        stage: 'image-edited',
        preset,
        requestPlan: {
          provider: 'openai-compatible',
          model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1-mini',
          quality: (process.env.OPENAI_IMAGE_QUALITY || 'medium').toLowerCase(),
          size: '1024x1024',
          responseFormat: 'png',
          prompt: transformPrompt,
          negativePrompt: '',
          notes: [`Source image edit requested for ${body.transformStyle || 'bas-relief'} conversion.`],
        },
        generatedAsset: generated.asset,
        revisedPrompt: generated.revisedPrompt || null,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Pildi reljeefseks teisendamine ebaõnnestus.'
      const status = message.toLowerCase().includes('api key puudub') ? 503 : 502

      return Response.json(
        {
          ok: false,
          stage: 'image-edit-failed',
          error: message,
        },
        { status },
      )
    }
  }

  if (!prompt) {
    return Response.json({ error: 'Prompt is required.' }, { status: 400 })
  }

  const preset = parseSavedSettingsSummary(body.savedSettingsSummary)
  const optimizedPrompt = optimizeEngravingPrompt({ userPrompt: prompt, preset })
  const requestPlan = buildImageGenerationRequest({
    optimizedPrompt,
    preset,
    apiKeyConfigured: Boolean(process.env.OPENAI_API_KEY),
  })

  try {
    const generated = await generateImageWithProvider({
      requestPlan,
      signal: req.signal,
    })

    return Response.json({
      ok: true,
      stage: 'image-generated',
      preset,
      optimizedPrompt,
      requestPlan,
      generatedAsset: generated.asset,
      revisedPrompt: generated.revisedPrompt || null,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Pildi genereerimine ebaõnnestus.'
    const status = message.toLowerCase().includes('api key puudub') ? 503 : 502

    return Response.json(
      {
        ok: false,
        stage: 'image-generation-failed',
        error: message,
        requestPlan,
      },
      { status },
    )
  }
}
