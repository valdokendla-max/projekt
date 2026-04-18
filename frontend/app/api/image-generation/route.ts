import { buildImageGenerationRequest, generateImageWithProvider } from '@/lib/engraving/image-generation'
import { parseSavedSettingsSummary } from '@/lib/engraving/preset-engine'
import { optimizeEngravingPrompt } from '@/lib/engraving/prompt-optimizer'

export const runtime = 'nodejs'

interface RequestBody {
  prompt?: string
  savedSettingsSummary?: string
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as RequestBody
  const prompt = String(body.prompt || '').trim()

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
