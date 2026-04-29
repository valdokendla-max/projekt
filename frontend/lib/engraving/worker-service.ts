import type { RemoteWorkerProcessingResult, StoredAssetReference } from '@/lib/engraving/types'

interface WorkerServiceAssetResponse {
  location: string
  file_name: string
  content_type: string
  storage_backend: 'local' | 'vercel-blob'
  pathname?: string
  download_url?: string
  etag?: string
  size?: number
}

interface WorkerServiceResponse {
  normalized_asset: WorkerServiceAssetResponse
  optimized_asset: WorkerServiceAssetResponse
  preview_asset: WorkerServiceAssetResponse
  width: number
  height: number
  notes: string[]
}

function getWorkerServiceUrl() {
  return (process.env.IMAGE_OPTIMIZER_WORKER_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')
}

function normalizeAsset(asset: WorkerServiceAssetResponse): StoredAssetReference {
  return {
    location: asset.location,
    fileName: asset.file_name,
    contentType: asset.content_type,
    storageBackend: asset.storage_backend,
    pathname: asset.pathname,
    downloadUrl: asset.download_url,
    etag: asset.etag,
    size: asset.size,
  }
}

export async function processImageWithWorkerService(args: {
  jobId: string
  requestedMode: 'threshold' | 'dither' | 'vector'
  sourceDataUrl: string
  outputPrefix: string
}) : Promise<RemoteWorkerProcessingResult> {
  const response = await fetch(`${getWorkerServiceUrl()}/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jobId: args.jobId,
      requestedMode: args.requestedMode,
      sourceDataUrl: args.sourceDataUrl,
      outputPrefix: args.outputPrefix,
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Worker service returned ${response.status}.`)
  }

  const payload = (await response.json()) as WorkerServiceResponse

  return {
    normalizedAsset: normalizeAsset(payload.normalized_asset),
    optimizedAsset: normalizeAsset(payload.optimized_asset),
    previewAsset: normalizeAsset(payload.preview_asset),
    width: payload.width,
    height: payload.height,
    notes: payload.notes,
  }
}

export async function getWorkerServiceHealth() {
  const response = await fetch(`${getWorkerServiceUrl()}/health`, {
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Worker service health check failed with ${response.status}.`)
  }

  return (await response.json()) as { ok: boolean }
}