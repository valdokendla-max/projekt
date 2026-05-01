import { requireAuthenticatedRouteUser } from '@/lib/api-security'
import { runEngravingOptimizerPipeline } from '@/lib/engraving/optimizer-pipeline'
import { runImageOptimizerWorker } from '@/lib/engraving/python-worker'
import type { ImageMetadataInput } from '@/lib/engraving/types'

export const runtime = 'nodejs'

interface RequestBody {
  userPrompt?: string
  savedSettingsSummary?: string
  source?: Partial<ImageMetadataInput>
  sourceImageDataUrl?: string
}

function buildSource(source: Partial<ImageMetadataInput> | undefined): ImageMetadataInput {
  return {
    sourceKind: source?.sourceKind || 'uploaded-image',
    width: source?.width || 1200,
    height: source?.height || 1200,
    hasAlpha: source?.hasAlpha || false,
    mimeType: source?.mimeType || 'image/png',
    colorProfile: source?.colorProfile || 'unknown',
    detailDensity: source?.detailDensity || 'medium',
    backgroundComplexity: source?.backgroundComplexity || 'medium',
    tonalRange: source?.tonalRange || 'full',
  }
}

export async function POST(req: Request) {
  const auth = await requireAuthenticatedRouteUser(req)
  if (!auth.ok) return auth.response

  const body = (await req.json().catch(() => ({}))) as RequestBody
  const result = runEngravingOptimizerPipeline({
    userPrompt: body.userPrompt,
    savedSettingsSummary: body.savedSettingsSummary,
    source: buildSource(body.source),
  })

  let workerResult = null
  let workerError = ''

  if (typeof body.sourceImageDataUrl === 'string' && body.sourceImageDataUrl.trim()) {
    try {
      workerResult = await runImageOptimizerWorker({
        sourceDataUrl: body.sourceImageDataUrl,
        requestedMode: result.modeDecision.mode,
      })
    } catch (error) {
      workerError = error instanceof Error ? error.message : 'Python workeri töötlus ebaõnnestus.'
    }
  }

  return Response.json({
    ok: true,
    stage: 'engraving-optimized',
    result,
    workerResult,
    workerError,
    assetReferences: result.exportManifest.artifacts.map((artifact) => artifact.path),
  })
}
