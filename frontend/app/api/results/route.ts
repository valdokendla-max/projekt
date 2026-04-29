import {
  enforceRouteRateLimit,
  parseJsonBodyWithLimit,
  requireInternalRouteAuthorization,
} from '@/lib/api-security'
import { processOptimizerJob, verifyQStashRequest } from '@/lib/engraving/optimizer-async'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const parsed = await parseJsonBodyWithLimit<{ jobId?: string }>(req, {
    maxBytes: 64 * 1024,
    routeLabel: '/api/results',
  })
  if ('response' in parsed) {
    return parsed.response
  }

  const hasQStashSigningKeys = Boolean(process.env.QSTASH_CURRENT_SIGNING_KEY || process.env.QSTASH_NEXT_SIGNING_KEY)
  const hasQStashSignature = Boolean(req.headers.get('upstash-signature'))
  const rawBody = parsed.rawBody

  if (hasQStashSigningKeys && hasQStashSignature) {
    const verificationError = await verifyQStashRequest(req, rawBody)
    if (verificationError) {
      return verificationError
    }
  }

  const internalAuth = await requireInternalRouteAuthorization(req, {
    qstashVerified: hasQStashSigningKeys && hasQStashSignature,
  })
  if (!internalAuth.ok) {
    return internalAuth.response
  }

  const rateLimitResponse = await enforceRouteRateLimit({
    routeId: 'results',
    actorKey: internalAuth.actorKey,
    maxRequests: 60,
    windowSeconds: 300,
  })
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  const payload = parsed.data
  const jobId = String(payload.jobId || '').trim()
  if (!jobId) {
    return Response.json({ error: 'jobId is required.' }, { status: 400 })
  }

  const job = await processOptimizerJob(jobId)
  const statusCode = job.status === 'completed' ? 200 : 500

  return Response.json(
    {
      ok: job.status === 'completed',
      job,
    },
    { status: statusCode },
  )
}
