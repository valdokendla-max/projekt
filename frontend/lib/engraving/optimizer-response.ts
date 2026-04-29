import { promises as fs } from 'node:fs'
import { get } from '@vercel/blob'
import { bufferToDataUrl } from '@/lib/engraving/data-url'
import type {
  ImageAsset,
  OptimizerAsyncJob,
  RemoteWorkerProcessingResult,
  StoredAssetReference,
  WorkerProcessingResult,
} from '@/lib/engraving/types'

export interface OptimizeImageApiResponse {
  ok: boolean
  queued: boolean
  jobId: string
  job: OptimizerAsyncJob
  result: OptimizerAsyncJob['pipelineResult']
  workerResult: WorkerProcessingResult | null
  workerError: string
  assetReferences: string[]
}

async function readStoredAssetBuffer(asset: StoredAssetReference) {
  if (asset.storageBackend === 'local' && !asset.location.startsWith('http://') && !asset.location.startsWith('https://')) {
    return fs.readFile(asset.location)
  }

  try {
    const response = await fetch(asset.location, { cache: 'no-store' })

    if (response.ok) {
      return Buffer.from(await response.arrayBuffer())
    }
  } catch {
    // Fall through to the storage-specific fallback below.
  }

  if (asset.storageBackend === 'vercel-blob' && asset.pathname) {
    const access =
      ((process.env.IMAGE_OPTIMIZER_BLOB_ACCESS || process.env.OPTIMIZER_ASSET_BLOB_ACCESS || 'public') as 'private' | 'public')
    const blob = await get(asset.pathname, { access })

    if (blob?.statusCode === 200 && blob.stream) {
      return Buffer.from(await new Response(blob.stream).arrayBuffer())
    }
  }

  throw new Error(`Could not read optimizer asset ${asset.fileName}.`)
}

async function hydrateStoredAsset(asset: StoredAssetReference): Promise<ImageAsset> {
  const buffer = await readStoredAssetBuffer(asset)

  return {
    dataUrl: bufferToDataUrl(buffer, asset.contentType),
    mediaType: asset.contentType,
    fileName: asset.fileName,
    source: 'optimized',
  }
}

async function hydrateWorkerResult(workerResult: RemoteWorkerProcessingResult): Promise<WorkerProcessingResult> {
  const [normalizedAsset, optimizedAsset, previewAsset] = await Promise.all([
    hydrateStoredAsset(workerResult.normalizedAsset),
    hydrateStoredAsset(workerResult.optimizedAsset),
    hydrateStoredAsset(workerResult.previewAsset),
  ])

  return {
    normalizedAsset,
    optimizedAsset,
    previewAsset,
    width: workerResult.width,
    height: workerResult.height,
    notes: workerResult.notes,
  }
}

export async function buildOptimizeImageApiResponse(job: OptimizerAsyncJob): Promise<OptimizeImageApiResponse> {
  let workerResult: WorkerProcessingResult | null = null
  let workerError = job.workerError || ''

  if (job.workerResult) {
    try {
      workerResult = await hydrateWorkerResult(job.workerResult)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Worker asset hydration failed.'
      workerError = workerError ? `${workerError} ${message}` : message
    }
  }

  return {
    ok: job.status !== 'failed',
    queued: job.status === 'queued' || job.status === 'processing',
    jobId: job.jobId,
    job,
    result: job.pipelineResult,
    workerResult,
    workerError,
    assetReferences: job.pipelineResult.exportManifest.artifacts.map((artifact) => artifact.path),
  }
}