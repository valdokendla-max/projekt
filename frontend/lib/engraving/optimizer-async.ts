import { Client, Receiver } from '@upstash/qstash'
import { getOptimizerJob, saveOptimizerJob } from '@/lib/engraving/optimizer-job-store'
import type { OptimizerAsyncJob } from '@/lib/engraving/types'
import { processImageWithWorkerService } from '@/lib/engraving/worker-service'

function nowIso() {
  return new Date().toISOString()
}

export function resolveOptimizerCallbackBaseUrl(request: Request) {
  const explicitBaseUrl =
    process.env.QSTASH_CALLBACK_BASE_URL ||
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')

  if (explicitBaseUrl) {
    return explicitBaseUrl.replace(/\/$/, '')
  }

  const url = new URL(request.url)
  if (['localhost', '127.0.0.1'].includes(url.hostname)) {
    return ''
  }

  return url.origin.replace(/\/$/, '')
}

export function canUseQStash(request: Request) {
  return Boolean(process.env.QSTASH_TOKEN) && Boolean(resolveOptimizerCallbackBaseUrl(request))
}

export async function publishOptimizerJob(request: Request, jobId: string) {
  const baseUrl = resolveOptimizerCallbackBaseUrl(request)

  if (!process.env.QSTASH_TOKEN || !baseUrl) {
    throw new Error('QStash ei ole selle keskkonna jaoks täielikult seadistatud.')
  }

  const client = new Client({ token: process.env.QSTASH_TOKEN })
  const internalCallbackToken = String(process.env.RESULTS_API_TOKEN || process.env.INTERNAL_API_TOKEN || '').trim()
  const result = await client.publishJSON({
    url: `${baseUrl}/api/results`,
    body: { jobId },
    headers: internalCallbackToken
      ? {
          Authorization: `Bearer ${internalCallbackToken}`,
        }
      : undefined,
  })

  return result.messageId
}

export async function verifyQStashRequest(request: Request, rawBody: string) {
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY

  if (!currentSigningKey && !nextSigningKey) {
    return null
  }

  const signature = request.headers.get('upstash-signature')
  if (!signature) {
    return Response.json({ error: 'Missing Upstash-Signature header.' }, { status: 403 })
  }

  const receiver = new Receiver({
    currentSigningKey,
    nextSigningKey,
  })

  try {
    await receiver.verify({
      signature,
      body: rawBody,
      url: request.url,
    })
    return null
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid QStash signature.'
    return Response.json({ error: message }, { status: 403 })
  }
}

export async function processOptimizerJob(jobId: string) {
  const existingJob = await getOptimizerJob(jobId)
  if (!existingJob) {
    throw new Error('Optimizer job was not found.')
  }

  if (existingJob.status === 'completed') {
    return existingJob
  }

  const processingJob: OptimizerAsyncJob = {
    ...existingJob,
    status: 'processing',
    updatedAt: nowIso(),
    notes: [...existingJob.notes, 'Background processing started.'],
  }

  await saveOptimizerJob(processingJob)

  try {
    const workerResult = await processImageWithWorkerService({
      jobId: processingJob.jobId,
      requestedMode: processingJob.requestedMode,
      sourceDataUrl: processingJob.sourceImageDataUrl,
      outputPrefix: `optimizer-results/${processingJob.jobId}`,
    })

    const completedJob: OptimizerAsyncJob = {
      ...processingJob,
      status: 'completed',
      updatedAt: nowIso(),
      workerResult,
      workerError: '',
      notes: [...processingJob.notes, ...workerResult.notes],
    }

    await saveOptimizerJob(completedJob)
    return completedJob
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Background processing failed.'
    const failedJob: OptimizerAsyncJob = {
      ...processingJob,
      status: 'failed',
      updatedAt: nowIso(),
      workerError: message,
      notes: [...processingJob.notes, `Worker failure: ${message}`],
    }

    await saveOptimizerJob(failedJob)
    return failedJob
  }
}
