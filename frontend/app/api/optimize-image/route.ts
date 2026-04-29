import { randomUUID } from 'node:crypto'
import {
  buildUserRateLimitKey,
  enforceRouteRateLimit,
  parseJsonBodyWithLimit,
  requireAuthenticatedRouteUser,
} from '@/lib/api-security'
import { runEngravingOptimizerPipeline } from '@/lib/engraving/optimizer-pipeline'
import { persistOptimizerSourceAsset, saveOptimizerJob, getOptimizerJob } from '@/lib/engraving/optimizer-job-store'
import { canUseQStash, processOptimizerJob, publishOptimizerJob } from '@/lib/engraving/optimizer-async'
import { buildOptimizeImageApiResponse } from '@/lib/engraving/optimizer-response'
import type { ImageMetadataInput, OptimizerAsyncJob } from '@/lib/engraving/types'

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

function nowIso() {
  return new Date().toISOString()
}

export async function POST(req: Request) {
  const auth = await requireAuthenticatedRouteUser(req)
  if (!auth.ok) {
    return auth.response
  }

  const rateLimitResponse = await enforceRouteRateLimit({
    routeId: 'optimize-image-post',
    actorKey: buildUserRateLimitKey(req, auth.value.user),
    maxRequests: 12,
    windowSeconds: 600,
  })
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  const parsed = await parseJsonBodyWithLimit<RequestBody>(req, {
    maxBytes: 8 * 1024 * 1024,
    routeLabel: '/api/optimize-image',
  })
  if ('response' in parsed) {
    return parsed.response
  }

  const body = parsed.data
  const sourceImageDataUrl = String(body.sourceImageDataUrl || '').trim()

  if (!sourceImageDataUrl) {
    return Response.json({ error: 'Source image is required.' }, { status: 400 })
  }

  const source = buildSource(body.source)
  const pipelineResult = runEngravingOptimizerPipeline({
    userPrompt: body.userPrompt,
    savedSettingsSummary: body.savedSettingsSummary,
    source,
  })

  const jobId = randomUUID()
  const createdAt = nowIso()
  const sourceAsset = await persistOptimizerSourceAsset(jobId, sourceImageDataUrl).catch(() => null)

  const job: OptimizerAsyncJob = {
    jobId,
    ownerUserId: auth.value.user.id,
    status: 'queued',
    createdAt,
    updatedAt: createdAt,
    requestedMode: pipelineResult.modeDecision.mode,
    processingStrategy: 'direct',
    pipelineResult,
    sourceImageDataUrl,
    source,
    userPrompt: body.userPrompt,
    savedSettingsSummary: body.savedSettingsSummary,
    sourceAsset,
    notes: ['Optimizer job created.'],
  }

  await saveOptimizerJob(job)

  if (canUseQStash(req)) {
    try {
      const messageId = await publishOptimizerJob(req, jobId)
      const queuedJob: OptimizerAsyncJob = {
        ...job,
        processingStrategy: 'qstash',
        qstashMessageId: messageId,
        updatedAt: nowIso(),
        notes: [...job.notes, 'Job published to QStash.'],
      }

      await saveOptimizerJob(queuedJob)

      return Response.json(await buildOptimizeImageApiResponse(queuedJob))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'QStash publish failed.'
      const fallbackJob: OptimizerAsyncJob = {
        ...job,
        updatedAt: nowIso(),
        notes: [...job.notes, `QStash fallback: ${message}`],
      }
      await saveOptimizerJob(fallbackJob)
    }
  }

  const processedJob = await processOptimizerJob(jobId)
  const statusCode = processedJob.status === 'completed' ? 200 : 502

  return Response.json(await buildOptimizeImageApiResponse(processedJob), { status: statusCode })
}

export async function GET(req: Request) {
  const auth = await requireAuthenticatedRouteUser(req)
  if (!auth.ok) {
    return auth.response
  }

  const rateLimitResponse = await enforceRouteRateLimit({
    routeId: 'optimize-image-get',
    actorKey: buildUserRateLimitKey(req, auth.value.user),
    maxRequests: 120,
    windowSeconds: 300,
  })
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  const { searchParams } = new URL(req.url)
  const jobId = String(searchParams.get('jobId') || '').trim()

  if (!jobId) {
    return Response.json({ error: 'jobId is required.' }, { status: 400 })
  }

  const job = await getOptimizerJob(jobId)
  if (!job) {
    return Response.json({ error: 'Optimizer job not found.' }, { status: 404 })
  }

  if (job.ownerUserId && job.ownerUserId !== auth.value.user.id && auth.value.user.role !== 'admin') {
    return Response.json({ error: 'Sul puudub ligipääs sellele optimizer jobile.' }, { status: 403 })
  }

  return Response.json(await buildOptimizeImageApiResponse(job))
}
