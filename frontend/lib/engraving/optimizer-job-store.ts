import { promises as fs } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { get, put } from '@vercel/blob'
import { queryPostgres, withPostgresTransaction } from '@/lib/postgres'
import { fileExtensionForMediaType, parseDataUrl } from '@/lib/engraving/data-url'
import type { OptimizerAsyncJob, StoredAssetReference } from '@/lib/engraving/types'

type OptimizerJobRow = {
  job_id: string
  owner_user_id: string | null
  status: OptimizerAsyncJob['status']
  created_at: Date | string
  updated_at: Date | string
  requested_mode: OptimizerAsyncJob['requestedMode']
  processing_strategy: OptimizerAsyncJob['processingStrategy']
  pipeline_result: OptimizerAsyncJob['pipelineResult']
  source_image_data_url: string
  source: OptimizerAsyncJob['source']
  user_prompt: string | null
  saved_settings_summary: string | null
  source_asset: OptimizerAsyncJob['sourceAsset'] | null
  worker_result: OptimizerAsyncJob['workerResult'] | null
  worker_error: string | null
  qstash_message_id: string | null
  notes: string[] | null
}

const localDataRoot = process.env.IMAGE_OPTIMIZER_LOCAL_DATA_DIR
  ? resolve(process.env.IMAGE_OPTIMIZER_LOCAL_DATA_DIR)
  : process.env.VERCEL
    ? join(tmpdir(), 'vkengraveai-optimizer')
    : resolve(process.cwd(), 'data')
const localJobsRoot = join(localDataRoot, 'optimizer-jobs')
const localAssetsRoot = join(localDataRoot, 'optimizer-assets')

let optimizerJobsSchemaPromise: Promise<void> | null = null
let optimizerJobsSchemaInitialized = false

function shouldUseBlobStore() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN)
}

function jobPathname(jobId: string) {
  return `optimizer-jobs/${jobId}.json`
}

function serializeJson(value: unknown) {
  return JSON.stringify(value ?? null)
}

function normalizeStoredAssetReference(
  asset: {
    url: string
    pathname: string
    contentType?: string
    downloadUrl?: string
    etag?: string
  },
  storageBackend: 'local' | 'vercel-blob',
  fileName?: string,
  size?: number,
): StoredAssetReference {
  return {
    location: asset.url,
    fileName: fileName || asset.pathname.split('/').at(-1) || 'asset.bin',
    contentType: asset.contentType || 'application/octet-stream',
    storageBackend,
    pathname: asset.pathname,
    downloadUrl: asset.downloadUrl,
    etag: asset.etag,
    size,
  }
}

function mapOptimizerJobRow(row: OptimizerJobRow): OptimizerAsyncJob {
  return {
    jobId: row.job_id,
    ownerUserId: row.owner_user_id || undefined,
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    requestedMode: row.requested_mode,
    processingStrategy: row.processing_strategy,
    pipelineResult: row.pipeline_result,
    sourceImageDataUrl: row.source_image_data_url,
    source: row.source,
    userPrompt: row.user_prompt || undefined,
    savedSettingsSummary: row.saved_settings_summary || undefined,
    sourceAsset: row.source_asset || undefined,
    workerResult: row.worker_result || undefined,
    workerError: row.worker_error || '',
    qstashMessageId: row.qstash_message_id || undefined,
    notes: Array.isArray(row.notes) ? row.notes : [],
  }
}

async function ensureLocalDirectory(path: string) {
  await fs.mkdir(path, { recursive: true })
}

async function loadLegacyOptimizerJobs() {
  try {
    const entries = await fs.readdir(localJobsRoot, { withFileTypes: true })
    const jobs: OptimizerAsyncJob[] = []

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) {
        continue
      }

      const raw = await fs.readFile(join(localJobsRoot, entry.name), 'utf8')
      jobs.push(JSON.parse(raw) as OptimizerAsyncJob)
    }

    return jobs
  } catch {
    return []
  }
}

async function insertOptimizerJob(job: OptimizerAsyncJob) {
  await queryPostgres(
    `
      INSERT INTO app_optimizer_jobs (
        job_id,
        owner_user_id,
        status,
        created_at,
        updated_at,
        requested_mode,
        processing_strategy,
        pipeline_result,
        source_image_data_url,
        source,
        user_prompt,
        saved_settings_summary,
        source_asset,
        worker_result,
        worker_error,
        qstash_message_id,
        notes
      )
      VALUES (
        $1,
        $2,
        $3,
        $4::timestamptz,
        $5::timestamptz,
        $6,
        $7,
        $8::jsonb,
        $9,
        $10::jsonb,
        $11,
        $12,
        $13::jsonb,
        $14::jsonb,
        $15,
        $16,
        $17::jsonb
      )
      ON CONFLICT (job_id) DO UPDATE
        SET owner_user_id = EXCLUDED.owner_user_id,
            status = EXCLUDED.status,
            updated_at = EXCLUDED.updated_at,
            requested_mode = EXCLUDED.requested_mode,
            processing_strategy = EXCLUDED.processing_strategy,
            pipeline_result = EXCLUDED.pipeline_result,
            source_image_data_url = EXCLUDED.source_image_data_url,
            source = EXCLUDED.source,
            user_prompt = EXCLUDED.user_prompt,
            saved_settings_summary = EXCLUDED.saved_settings_summary,
            source_asset = EXCLUDED.source_asset,
            worker_result = EXCLUDED.worker_result,
            worker_error = EXCLUDED.worker_error,
            qstash_message_id = EXCLUDED.qstash_message_id,
            notes = EXCLUDED.notes
    `,
    [
      job.jobId,
      job.ownerUserId || null,
      job.status,
      job.createdAt,
      job.updatedAt,
      job.requestedMode,
      job.processingStrategy,
      serializeJson(job.pipelineResult),
      job.sourceImageDataUrl,
      serializeJson(job.source),
      job.userPrompt || null,
      job.savedSettingsSummary || null,
      serializeJson(job.sourceAsset ?? null),
      serializeJson(job.workerResult ?? null),
      job.workerError || '',
      job.qstashMessageId || null,
      serializeJson(job.notes),
    ],
  )
}

async function ensureOptimizerJobsSchema() {
  if (optimizerJobsSchemaInitialized) {
    return
  }

  if (!optimizerJobsSchemaPromise) {
    optimizerJobsSchemaPromise = withPostgresTransaction(async (client) => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS app_optimizer_jobs (
          job_id text PRIMARY KEY,
          owner_user_id text,
          status text NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
          created_at timestamptz NOT NULL,
          updated_at timestamptz NOT NULL,
          requested_mode text NOT NULL CHECK (requested_mode IN ('threshold', 'dither', 'vector')),
          processing_strategy text NOT NULL CHECK (processing_strategy IN ('qstash', 'direct')),
          pipeline_result jsonb NOT NULL,
          source_image_data_url text NOT NULL,
          source jsonb NOT NULL,
          user_prompt text,
          saved_settings_summary text,
          source_asset jsonb,
          worker_result jsonb,
          worker_error text,
          qstash_message_id text,
          notes jsonb NOT NULL DEFAULT '[]'::jsonb
        )
      `)

      await client.query(`
        ALTER TABLE app_optimizer_jobs
        ADD COLUMN IF NOT EXISTS owner_user_id text
      `)

      const existingCountResult = await client.query<{ count: string }>(
        'SELECT COUNT(*)::text AS count FROM app_optimizer_jobs',
      )
      const existingCount = Number(existingCountResult.rows[0]?.count || '0')

      if (existingCount > 0) {
        return
      }

      const legacyJobs = await loadLegacyOptimizerJobs()
      for (const job of legacyJobs) {
        await client.query(
          `
            INSERT INTO app_optimizer_jobs (
              job_id,
              owner_user_id,
              status,
              created_at,
              updated_at,
              requested_mode,
              processing_strategy,
              pipeline_result,
              source_image_data_url,
              source,
              user_prompt,
              saved_settings_summary,
              source_asset,
              worker_result,
              worker_error,
              qstash_message_id,
              notes
            )
            VALUES (
              $1,
              $2,
              $3,
              $4::timestamptz,
              $5::timestamptz,
              $6,
              $7,
              $8::jsonb,
              $9,
              $10::jsonb,
              $11,
              $12,
              $13::jsonb,
              $14::jsonb,
              $15,
              $16,
              $17::jsonb
            )
            ON CONFLICT (job_id) DO NOTHING
          `,
          [
            job.jobId,
            job.ownerUserId || null,
            job.status,
            job.createdAt,
            job.updatedAt,
            job.requestedMode,
            job.processingStrategy,
            serializeJson(job.pipelineResult),
            job.sourceImageDataUrl,
            serializeJson(job.source),
            job.userPrompt || null,
            job.savedSettingsSummary || null,
            serializeJson(job.sourceAsset ?? null),
            serializeJson(job.workerResult ?? null),
            job.workerError || '',
            job.qstashMessageId || null,
            serializeJson(job.notes),
          ],
        )
      }
    })
      .then(() => {
        optimizerJobsSchemaInitialized = true
      })
      .finally(() => {
        optimizerJobsSchemaPromise = null
      })
  }

  await optimizerJobsSchemaPromise
}

export async function saveOptimizerJob(job: OptimizerAsyncJob) {
  await ensureOptimizerJobsSchema()
  await insertOptimizerJob(job)
}

export async function getOptimizerJob(jobId: string): Promise<OptimizerAsyncJob | null> {
  await ensureOptimizerJobsSchema()
  const result = await queryPostgres<OptimizerJobRow>(
    `
      SELECT
        job_id,
        owner_user_id,
        status,
        created_at,
        updated_at,
        requested_mode,
        processing_strategy,
        pipeline_result,
        source_image_data_url,
        source,
        user_prompt,
        saved_settings_summary,
        source_asset,
        worker_result,
        worker_error,
        qstash_message_id,
        notes
      FROM app_optimizer_jobs
      WHERE job_id = $1
      LIMIT 1
    `,
    [jobId],
  )

  if (result.rowCount === 0) {
    return null
  }

  return mapOptimizerJobRow(result.rows[0])
}

export async function persistOptimizerSourceAsset(jobId: string, sourceDataUrl: string) {
  const { mediaType, buffer } = parseDataUrl(sourceDataUrl)
  const extension = fileExtensionForMediaType(mediaType)
  const fileName = `source.${extension}`
  const pathname = `optimizer-assets/${jobId}/${fileName}`

  if (shouldUseBlobStore()) {
    const blob = await put(pathname, buffer, {
      access: (process.env.OPTIMIZER_ASSET_BLOB_ACCESS as 'private' | 'public' | undefined) || 'public',
      addRandomSuffix: true,
      contentType: mediaType,
    })

    return normalizeStoredAssetReference(blob, 'vercel-blob', fileName, buffer.length)
  }

  const targetDirectory = join(localAssetsRoot, jobId)
  const targetPath = join(targetDirectory, fileName)
  await ensureLocalDirectory(targetDirectory)
  await fs.writeFile(targetPath, buffer)

  return {
    location: targetPath,
    fileName,
    contentType: mediaType,
    storageBackend: 'local' as const,
    pathname,
    size: buffer.length,
  }
}
