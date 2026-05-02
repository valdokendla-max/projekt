'use client'

import { useEffect, useMemo, useState } from 'react'
import type { FileUIPart } from 'ai'
import Image from 'next/image'
import { Download, ImagePlus, Loader2, ScanSearch, Sparkles, WandSparkles } from 'lucide-react'
import type {
  EngravingMode,
  ExportAssetPayload,
  ExportManifest,
  ImageAsset,
  ImageGenerationRequestPlan,
  LightBurnProjectManifest,
  OptimizerAsyncJob,
  OptimizerPipelineResult,
  WorkerProcessingResult,
} from '@/lib/engraving/types'
import { cn } from '@/lib/utils'

type UiLanguage = 'et' | 'en'

interface EngravingOptimizerPanelProps {
  language?: UiLanguage
  prompt: string
  pendingImage: FileUIPart | null
  onPromoteImage: (asset: Pick<ImageAsset, 'dataUrl' | 'fileName' | 'mediaType'>) => void
  savedSettingsSummary?: string
  sessionToken?: string | null
  className?: string
}

interface ImageGenerationResponse {
  ok: boolean
  error?: string
  requestPlan: ImageGenerationRequestPlan
  generatedAsset?: ImageAsset
  revisedPrompt?: string | null
}

interface OptimizationResponse {
  ok: boolean
  queued: boolean
  jobId: string
  job: OptimizerAsyncJob
  result: OptimizerPipelineResult
  workerResult: WorkerProcessingResult | null
  workerError: string
  assetReferences: string[]
}

interface ExportResponse {
  ok: boolean
  lightBurnProject: LightBurnProjectManifest
  exportManifest: ExportManifest
  archiveBase64: string
}

const OPTIMIZER_COPY = {
  et: {
    requestFailed: 'Päring ebaõnnestus.',
    noResponse: 'Server ei tagastanud vastust.',
    generateFailed: 'Pildi genereerimine ebaõnnestus.',
    optimizeFailed: 'Optimeerimine ebaõnnestus.',
    exportFailed: 'Ekspordi planeerimine ebaõnnestus.',
    optimizeTimeout: 'Optimeerimise töö ei lõpetanud oodatud aja jooksul.',
    title: 'Optimizer pipeline',
    description: 'Genereeri promptist engraving-safe pilt, lase workeril see puhastada ja valmista export ette.',
    badge: 'AI + Worker',
    promptLabel: 'Generation prompt',
    promptHelp: 'Kirjelda siia, millist engraving-ready pilti soovid luua. Kui chati väljal on tekst juba olemas, tõstetakse see siia automaatselt ette.',
    promptPlaceholder: 'Kirjelda lühidalt soovitud graveerimispilti, stiili ja tausta käitumist.',
    promptFootnote: '`Genereeri pilt` kasutab seda välja. `Optimeeri` kasutab seda prompti koos olemasoleva või üles laaditud pildiga.',
    source: 'Allikas',
    sourceUploaded: 'Laetud pilt',
    sourceGenerated: 'AI pilt',
    sourceMissing: 'Puudub',
    job: 'Töö',
    simulation: 'Simulatsioon',
    generate: 'Genereeri pilt',
    optimize: 'Optimeeri',
    export: 'Planeeri export',
    emptyState: 'Sisesta kõigepealt prompt siia optimizer-paneeli või lisa pilt vestluse kaudu. Seejärel saad kasutada `Genereeri pilt` või `Optimeeri`.',
    useInChat: 'Kasuta vestluses',
    assetAiGenerated: 'AI generated',
    assetWorkerPreview: 'Worker preview',
    provider: 'Pakkuja',
    model: 'Mudel',
    quality: 'Kvaliteet',
    images: 'Pildid',
    revisedPrompt: 'Provider täpsustas prompti enne renderdamist.',
    mode: 'Režiim',
    dpi: 'DPI',
    score: 'Skoor',
    workerError: 'Python worker ei lõpetanud töötlust:',
    nextActions: 'Järgmised sammud',
    exportPackage: 'Export package',
    zipStarted: 'ZIP loodi ja allalaadimine käivitati automaatselt.',
    lightBurnManifest: 'LightBurn manifest',
    statusQueued: 'JÄRJEKORRAS',
    statusProcessing: 'TÖÖTLEB',
    statusCompleted: 'VALMIS',
    statusFailed: 'EBAÕNNESTUS',
    verdictPass: 'OK',
    verdictWarn: 'HOIATUS',
    verdictFail: 'FAIL',
    modeThreshold: 'Threshold',
    modeDither: 'Dither',
    modeVector: 'Vektor',
    exportDescriptions: {
      primary: 'Peamine töödeldud graveerimisraster',
      preview: 'Lasersimulatsiooni eelvaade',
      normalized: 'Normaliseeritud halltoonides tööpilt',
      generated: 'AI-ga loodud lähtepilt',
      uploaded: 'Üles laaditud lähtepilt',
    },
  },
  en: {
    requestFailed: 'Request failed.',
    noResponse: 'Server did not return a response.',
    generateFailed: 'Image generation failed.',
    optimizeFailed: 'Optimization failed.',
    exportFailed: 'Export planning failed.',
    optimizeTimeout: 'The optimization job did not finish in the expected time.',
    title: 'Optimizer pipeline',
    description: 'Generate an engraving-safe image from a prompt, let the worker clean it up, and prepare the export.',
    badge: 'AI + Worker',
    promptLabel: 'Generation prompt',
    promptHelp: 'Describe the engraving-ready image you want to create here. If the chat input already has text, it is prefilled here automatically.',
    promptPlaceholder: 'Briefly describe the desired engraving image, style, and background behavior.',
    promptFootnote: '`Generate image` uses this field. `Optimize` uses this prompt together with the existing or uploaded image.',
    source: 'Source',
    sourceUploaded: 'Uploaded image',
    sourceGenerated: 'AI image',
    sourceMissing: 'Missing',
    job: 'Job',
    simulation: 'Simulation',
    generate: 'Generate image',
    optimize: 'Optimize',
    export: 'Plan export',
    emptyState: 'First enter a prompt in the optimizer panel or add an image through chat. After that you can use `Generate image` or `Optimize`.',
    useInChat: 'Use in chat',
    assetAiGenerated: 'AI generated',
    assetWorkerPreview: 'Worker preview',
    provider: 'Provider',
    model: 'Model',
    quality: 'Quality',
    images: 'Images',
    revisedPrompt: 'The provider refined the prompt before rendering.',
    mode: 'Mode',
    dpi: 'DPI',
    score: 'Score',
    workerError: 'The Python worker did not finish processing:',
    nextActions: 'Next actions',
    exportPackage: 'Export package',
    zipStarted: 'The ZIP was created and the download started automatically.',
    lightBurnManifest: 'LightBurn manifest',
    statusQueued: 'QUEUED',
    statusProcessing: 'PROCESSING',
    statusCompleted: 'COMPLETED',
    statusFailed: 'FAILED',
    verdictPass: 'PASS',
    verdictWarn: 'WARN',
    verdictFail: 'FAIL',
    modeThreshold: 'Threshold',
    modeDither: 'Dither',
    modeVector: 'Vector',
    exportDescriptions: {
      primary: 'Primary processed engraving raster',
      preview: 'Laser simulation preview',
      normalized: 'Normalized grayscale working image',
      generated: 'AI-generated source image',
      uploaded: 'Uploaded source image',
    },
  },
} satisfies Record<UiLanguage, {
  requestFailed: string
  noResponse: string
  generateFailed: string
  optimizeFailed: string
  exportFailed: string
  optimizeTimeout: string
  title: string
  description: string
  badge: string
  promptLabel: string
  promptHelp: string
  promptPlaceholder: string
  promptFootnote: string
  source: string
  sourceUploaded: string
  sourceGenerated: string
  sourceMissing: string
  job: string
  simulation: string
  generate: string
  optimize: string
  export: string
  emptyState: string
  useInChat: string
  assetAiGenerated: string
  assetWorkerPreview: string
  provider: string
  model: string
  quality: string
  images: string
  revisedPrompt: string
  mode: string
  dpi: string
  score: string
  workerError: string
  nextActions: string
  exportPackage: string
  zipStarted: string
  lightBurnManifest: string
  statusQueued: string
  statusProcessing: string
  statusCompleted: string
  statusFailed: string
  verdictPass: string
  verdictWarn: string
  verdictFail: string
  modeThreshold: string
  modeDither: string
  modeVector: string
  exportDescriptions: {
    primary: string
    preview: string
    normalized: string
    generated: string
    uploaded: string
  }
}>

function buildExportAssets(args: {
  uploadedAsset: ImageAsset | null
  generatedAsset: ImageAsset | undefined
  workerResult: WorkerProcessingResult | null
  copy: (typeof OPTIMIZER_COPY)[UiLanguage]
}): ExportAssetPayload[] {
  const assets: ExportAssetPayload[] = []
  const { uploadedAsset, generatedAsset, workerResult, copy } = args

  if (workerResult) {
    assets.push(
      {
        path: 'exports/output.png',
        dataUrl: workerResult.optimizedAsset.dataUrl,
        mediaType: workerResult.optimizedAsset.mediaType,
        description: copy.exportDescriptions.primary,
      },
      {
        path: 'exports/preview.png',
        dataUrl: workerResult.previewAsset.dataUrl,
        mediaType: workerResult.previewAsset.mediaType,
        description: copy.exportDescriptions.preview,
      },
      {
        path: 'exports/normalized.png',
        dataUrl: workerResult.normalizedAsset.dataUrl,
        mediaType: workerResult.normalizedAsset.mediaType,
        description: copy.exportDescriptions.normalized,
      },
    )
  }

  if (generatedAsset) {
    assets.push({
      path: 'exports/generated-source.png',
      dataUrl: generatedAsset.dataUrl,
      mediaType: generatedAsset.mediaType,
      description: copy.exportDescriptions.generated,
    })
  }

  if (uploadedAsset) {
    assets.push({
      path: 'exports/uploaded-source.png',
      dataUrl: uploadedAsset.dataUrl,
      mediaType: uploadedAsset.mediaType,
      description: copy.exportDescriptions.uploaded,
    })
  }

  return assets
}

function downloadBase64Archive(base64: string, fileName: string) {
  const binary = window.atob(base64)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  const blob = new Blob([bytes], { type: 'application/zip' })
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = objectUrl
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(objectUrl)
}

function getUploadedAsset(pendingImage: FileUIPart | null): ImageAsset | null {
  if (!pendingImage || pendingImage.type !== 'file' || typeof pendingImage.url !== 'string') {
    return null
  }

  return {
    dataUrl: pendingImage.url,
    mediaType: pendingImage.mediaType || 'image/png',
    fileName: pendingImage.filename || 'uploaded-image.png',
    source: 'uploaded',
  }
}

function buildAuthHeaders(sessionToken?: string | null): Record<string, string> {
  if (!sessionToken) {
    return {}
  }

  return {
    Authorization: `Bearer ${sessionToken}`,
  }
}

async function postJson<T>(
  url: string,
  body: unknown,
  fallbackError: string,
  emptyError: string,
  sessionToken?: string | null,
): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      ...buildAuthHeaders(sessionToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  const data = (await response.json().catch(() => null)) as (T & { error?: string }) | null

  if (!response.ok) {
    throw new Error(data?.error || fallbackError)
  }

  if (!data) {
    throw new Error(emptyError)
  }

  return data
}

async function getJson<T>(
  url: string,
  fallbackError: string,
  emptyError: string,
  sessionToken?: string | null,
): Promise<T> {
  const response = await fetch(url, {
    headers: buildAuthHeaders(sessionToken),
    cache: 'no-store',
  })
  const data = (await response.json().catch(() => null)) as (T & { error?: string }) | null

  if (!response.ok) {
    throw new Error(data?.error || fallbackError)
  }

  if (!data) {
    throw new Error(emptyError)
  }

  return data
}

function wait(delayMs: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, delayMs)
  })
}

function AssetPreview({
  title,
  asset,
  onUse,
  useLabel,
}: {
  title: string
  asset: ImageAsset
  onUse?: () => void
  useLabel: string
}) {
  return (
    <div className="rounded-[22px] border border-primary/12 bg-black/24 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-100/44">{title}</div>
          <div className="mt-1 text-xs text-slate-300">{asset.fileName}</div>
        </div>
        {onUse && (
          <button
            type="button"
            onClick={onUse}
            className="inline-flex items-center gap-2 rounded-full border border-primary/14 bg-black/30 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-50 transition-colors hover:border-primary/28"
          >
            <ImagePlus className="h-3.5 w-3.5" />
            {useLabel}
          </button>
        )}
      </div>

      <div className="mt-3 overflow-hidden rounded-[20px] border border-white/6 bg-black/30">
        <Image
          src={asset.dataUrl}
          alt={asset.fileName}
          width={480}
          height={480}
          unoptimized
          className="h-auto w-full object-cover"
        />
      </div>
    </div>
  )
}

export function EngravingOptimizerPanel({
  language = 'et',
  prompt,
  pendingImage,
  onPromoteImage,
  savedSettingsSummary,
  sessionToken,
  className,
}: EngravingOptimizerPanelProps) {
  const copy = OPTIMIZER_COPY[language]
  const [loadingAction, setLoadingAction] = useState<'generate' | 'optimize' | 'export' | null>(null)
  const [error, setError] = useState('')
  const [optimizerJobStatus, setOptimizerJobStatus] = useState('')
  const [generation, setGeneration] = useState<ImageGenerationResponse | null>(null)
  const [optimization, setOptimization] = useState<OptimizationResponse | null>(null)
  const [exportPlan, setExportPlan] = useState<ExportResponse | null>(null)
  const [workflowPrompt, setWorkflowPrompt] = useState('')
  const uploadedAsset = useMemo(() => getUploadedAsset(pendingImage), [pendingImage])
  const activeSourceAsset = uploadedAsset || generation?.generatedAsset || null
  const trimmedPrompt = workflowPrompt.trim() || prompt.trim()

  useEffect(() => {
    if (!workflowPrompt.trim() && prompt.trim()) {
      setWorkflowPrompt(prompt)
    }
  }, [prompt, workflowPrompt])

  const handleGenerate = async () => {
    if (!trimmedPrompt || loadingAction) {
      return
    }

    setLoadingAction('generate')
    setError('')

    try {
      const data = await postJson<ImageGenerationResponse>('/api/image-generation', {
        prompt: trimmedPrompt,
        savedSettingsSummary: savedSettingsSummary || undefined,
      }, copy.requestFailed, copy.noResponse, sessionToken)

      setOptimizerJobStatus('')
      setGeneration(data)
      setOptimization(null)
      setExportPlan(null)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : copy.generateFailed)
    } finally {
      setLoadingAction(null)
    }
  }

  const waitForOptimizationJob = async (jobId: string) => {
    let latestResponse: OptimizationResponse | null = null

    for (let attempt = 0; attempt < 40; attempt += 1) {
      const data = await getJson<OptimizationResponse>(
        `/api/optimize-image?jobId=${encodeURIComponent(jobId)}`,
        copy.requestFailed,
        copy.noResponse,
        sessionToken,
      )
      latestResponse = data
      setOptimization(data)
      setOptimizerJobStatus(data.job.status)

      if (data.job.status === 'completed' || data.job.status === 'failed') {
        return data
      }

      await wait(1500)
    }

    if (latestResponse) {
      return latestResponse
    }

    throw new Error(copy.optimizeTimeout)
  }

  const handleOptimize = async () => {
    if (loadingAction || !activeSourceAsset) {
      return
    }

    setLoadingAction('optimize')
    setError('')
    setExportPlan(null)
    setOptimization(null)
    setOptimizerJobStatus('')

    try {
      const data = await postJson<OptimizationResponse>('/api/optimize-image', {
        userPrompt: trimmedPrompt || undefined,
        savedSettingsSummary: savedSettingsSummary || undefined,
        sourceImageDataUrl: activeSourceAsset?.dataUrl,
        source: {
          sourceKind: uploadedAsset ? 'uploaded-image' : 'generated-text',
          width: activeSourceAsset?.width || 1200,
          height: activeSourceAsset?.height || 1200,
          hasAlpha: activeSourceAsset ? activeSourceAsset.mediaType !== 'image/jpeg' : false,
          mimeType: activeSourceAsset?.mediaType || 'image/png',
        },
      }, copy.requestFailed, copy.noResponse, sessionToken)

      setOptimizerJobStatus(data.job.status)
      setOptimization(data)

      if (data.queued) {
        await waitForOptimizationJob(data.jobId)
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : copy.optimizeFailed)
    } finally {
      setLoadingAction(null)
    }
  }

  const handleExport = async () => {
    if (!optimization || loadingAction) {
      return
    }

    setLoadingAction('export')
    setError('')

    try {
      const assets = buildExportAssets({
        uploadedAsset,
        generatedAsset: generation?.generatedAsset,
        workerResult: optimization.workerResult,
        copy,
      })

      const data = await postJson<ExportResponse>('/api/engraving-export', {
        assetReferences: optimization.assetReferences,
        assets,
        includeVector: optimization.result.vectorizationPlan.enabled,
        mode: optimization.result.modeDecision.mode,
        savedSettingsSummary: savedSettingsSummary || undefined,
      }, copy.requestFailed, copy.noResponse, sessionToken)

      downloadBase64Archive(data.archiveBase64, data.exportManifest.archiveName)
      setExportPlan(data)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : copy.exportFailed)
    } finally {
      setLoadingAction(null)
    }
  }

  const localizedJobStatus = useMemo(() => {
    switch (optimizerJobStatus) {
      case 'queued':
        return copy.statusQueued
      case 'processing':
        return copy.statusProcessing
      case 'completed':
        return copy.statusCompleted
      case 'failed':
        return copy.statusFailed
      default:
        return '--'
    }
  }, [copy, optimizerJobStatus])

  const localizedVerdict = useMemo(() => {
    if (!optimization) {
      return '--'
    }

    switch (optimization.result.simulationReport.verdict) {
      case 'pass':
        return copy.verdictPass
      case 'warn':
        return copy.verdictWarn
      case 'fail':
        return copy.verdictFail
      default:
        return '--'
    }
  }, [copy, optimization])

  const localizedMode = (mode: EngravingMode) => {
    switch (mode) {
      case 'threshold':
        return copy.modeThreshold
      case 'dither':
        return copy.modeDither
      case 'vector':
        return copy.modeVector
      default:
        return mode
    }
  }

  return (
    <section className={cn('hud-panel p-4 md:p-5', className)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="hud-label">
            <WandSparkles className="h-3.5 w-3.5" />
            {copy.title}
          </span>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">{copy.description}</p>
        </div>
        <div className="rounded-full border border-primary/14 bg-black/30 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100/60">
          {copy.badge}
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <div className="rounded-[18px] border border-primary/12 bg-black/24 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:col-span-2">
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-100/44">{copy.promptLabel}</div>
          <div className="mt-1 text-xs leading-relaxed text-slate-300">{copy.promptHelp}</div>
          <textarea
            value={workflowPrompt}
            onChange={(event) => setWorkflowPrompt(event.target.value)}
            rows={4}
            placeholder={copy.promptPlaceholder}
            className="mt-3 w-full resize-y rounded-[18px] border border-primary/12 bg-black/26 px-3 py-3 text-sm text-cyan-50 outline-none transition-colors placeholder:text-cyan-100/28 focus:border-primary/28"
          />
          <p className="mt-2 text-[11px] leading-relaxed text-cyan-100/42">{copy.promptFootnote}</p>
        </div>

        <div className="rounded-[18px] border border-primary/12 bg-black/24 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-100/44">{copy.source}</div>
          <div className="mt-1 text-sm font-semibold text-cyan-50">
            {uploadedAsset ? copy.sourceUploaded : generation?.generatedAsset ? copy.sourceGenerated : copy.sourceMissing}
          </div>
        </div>
        <div className="rounded-[18px] border border-primary/12 bg-black/24 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-100/44">{copy.job}</div>
          <div className="mt-1 text-sm font-semibold text-cyan-50">{localizedJobStatus}</div>
        </div>
        <div className="rounded-[18px] border border-primary/12 bg-black/24 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-100/44">{copy.simulation}</div>
          <div className="mt-1 text-sm font-semibold text-cyan-50">{localizedVerdict}</div>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={!trimmedPrompt || Boolean(loadingAction)}
          className="inline-flex items-center justify-center gap-2 rounded-[20px] border border-primary/18 bg-linear-to-r from-cyan-300/90 via-primary to-cyan-400/80 px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_24px_rgba(84,244,255,0.25)] transition-opacity hover:opacity-92 disabled:opacity-45"
        >
          {loadingAction === 'generate' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {copy.generate}
        </button>
        <button
          type="button"
          onClick={() => void handleOptimize()}
          disabled={Boolean(loadingAction) || !activeSourceAsset}
          className="inline-flex items-center justify-center gap-2 rounded-[20px] border border-primary/16 bg-black/26 px-4 py-3 text-sm font-semibold text-cyan-50 transition-colors hover:border-primary/28 hover:bg-black/34 disabled:opacity-45"
        >
          {loadingAction === 'optimize' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
          {copy.optimize}
        </button>
        <button
          type="button"
          onClick={() => void handleExport()}
          disabled={Boolean(loadingAction) || !optimization?.workerResult || optimization.job.status !== 'completed'}
          className="inline-flex items-center justify-center gap-2 rounded-[20px] border border-primary/16 bg-black/26 px-4 py-3 text-sm font-semibold text-cyan-50 transition-colors hover:border-primary/28 hover:bg-black/34 disabled:opacity-45"
        >
          {loadingAction === 'export' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {copy.export}
        </button>
      </div>

      {error && (
        <p className="mt-3 rounded-[20px] border border-destructive/30 bg-destructive/10 px-3 py-3 text-xs text-destructive">
          {error}
        </p>
      )}

      {!activeSourceAsset && !trimmedPrompt && (
        <p className="mt-3 rounded-[20px] border border-primary/10 bg-black/24 px-3 py-3 text-xs leading-relaxed text-slate-300">
          {copy.emptyState}
        </p>
      )}

      {generation?.generatedAsset && (
        <div className="mt-4 space-y-3">
          <AssetPreview
            title={copy.assetAiGenerated}
            asset={generation.generatedAsset}
            onUse={() => onPromoteImage(generation.generatedAsset!)}
            useLabel={copy.useInChat}
          />
          <div className="rounded-[20px] border border-primary/10 bg-black/24 px-3 py-3 text-xs leading-relaxed text-slate-300">
            <p>
              {copy.provider}: <span className="font-semibold text-cyan-50">{generation.requestPlan.provider}</span> · {copy.model}:{' '}
              <span className="font-semibold text-cyan-50">{generation.requestPlan.model}</span> · {copy.quality}:{' '}
              <span className="font-semibold text-cyan-50">{generation.requestPlan.quality}</span> · {copy.images}:{' '}
              <span className="font-semibold text-cyan-50">1</span>
            </p>
            {generation.revisedPrompt && <p className="mt-2">{copy.revisedPrompt}</p>}
          </div>
        </div>
      )}

      {optimization && (
        <div className="mt-4 space-y-3 rounded-3xl border border-primary/12 bg-black/24 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-[18px] border border-primary/10 bg-black/24 px-3 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100/42">{copy.mode}</div>
              <div className="mt-1 text-sm font-semibold text-cyan-50">{localizedMode(optimization.result.modeDecision.mode)}</div>
            </div>
            <div className="rounded-[18px] border border-primary/10 bg-black/24 px-3 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100/42">{copy.dpi}</div>
              <div className="mt-1 text-sm font-semibold text-cyan-50">{optimization.result.lineDensityPlan.targetDpi}</div>
            </div>
            <div className="rounded-[18px] border border-primary/10 bg-black/24 px-3 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100/42">{copy.score}</div>
              <div className="mt-1 text-sm font-semibold text-cyan-50">{optimization.result.simulationReport.score}/100</div>
            </div>
          </div>

          {optimization.workerResult?.previewAsset && (
            <AssetPreview
              title={copy.assetWorkerPreview}
              asset={optimization.workerResult.previewAsset}
              onUse={() => onPromoteImage(optimization.workerResult!.optimizedAsset)}
              useLabel={copy.useInChat}
            />
          )}

          {optimization.workerError && (
            <p className="rounded-[20px] border border-amber-400/24 bg-amber-400/8 px-3 py-3 text-xs text-amber-100">
              {copy.workerError} {optimization.workerError}
            </p>
          )}

          <div className="rounded-[20px] border border-primary/10 bg-black/24 px-3 py-3 text-xs text-slate-300">
            <p className="font-semibold uppercase tracking-[0.22em] text-cyan-100/52">{copy.nextActions}</p>
            <div className="mt-2 space-y-2">
              {optimization.result.nextActions.map((action) => (
                <p key={action}>• {action}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {exportPlan && (
        <div className="mt-4 rounded-3xl border border-primary/12 bg-black/24 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-100/44">{copy.exportPackage}</div>
          <p className="mt-2 text-sm font-semibold text-cyan-50">{exportPlan.exportManifest.archiveName}</p>
          <p className="mt-2 text-xs text-cyan-100/48">{copy.zipStarted}</p>
          <div className="mt-3 space-y-2 text-xs text-slate-300">
            {exportPlan.exportManifest.artifacts.map((artifact) => (
              <div key={artifact.path} className="rounded-2xl border border-primary/10 bg-black/24 px-3 py-2">
                <div className="font-semibold text-cyan-50">{artifact.path}</div>
                <div className="mt-1">{artifact.description}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-cyan-100/48">{copy.lightBurnManifest}: {exportPlan.lightBurnProject.fileName}</p>
        </div>
      )}
    </section>
  )
}
