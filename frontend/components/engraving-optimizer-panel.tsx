'use client'

import { useEffect, useMemo, useState } from 'react'
import type { FileUIPart } from 'ai'
import Image from 'next/image'
import { Download, ImagePlus, Loader2, ScanSearch, Sparkles, WandSparkles } from 'lucide-react'
import type {
  ExportAssetPayload,
  ExportManifest,
  ImageAsset,
  ImageGenerationRequestPlan,
  LightBurnProjectManifest,
  OptimizerPipelineResult,
  WorkerProcessingResult,
} from '@/lib/engraving/types'
import { cn } from '@/lib/utils'

interface EngravingOptimizerPanelProps {
  prompt: string
  pendingImage: FileUIPart | null
  onPromoteImage: (asset: Pick<ImageAsset, 'dataUrl' | 'fileName' | 'mediaType'>) => void
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

function buildExportAssets(args: {
  uploadedAsset: ImageAsset | null
  generatedAsset: ImageAsset | undefined
  workerResult: WorkerProcessingResult | null
}): ExportAssetPayload[] {
  const assets: ExportAssetPayload[] = []
  const { uploadedAsset, generatedAsset, workerResult } = args

  if (workerResult) {
    assets.push(
      {
        path: 'exports/output.png',
        dataUrl: workerResult.optimizedAsset.dataUrl,
        mediaType: workerResult.optimizedAsset.mediaType,
        description: 'Primary processed engraving raster',
      },
      {
        path: 'exports/preview.png',
        dataUrl: workerResult.previewAsset.dataUrl,
        mediaType: workerResult.previewAsset.mediaType,
        description: 'Laser simulation preview',
      },
      {
        path: 'exports/normalized.png',
        dataUrl: workerResult.normalizedAsset.dataUrl,
        mediaType: workerResult.normalizedAsset.mediaType,
        description: 'Normalized grayscale working image',
      },
    )
  }

  if (generatedAsset) {
    assets.push({
      path: 'exports/generated-source.png',
      dataUrl: generatedAsset.dataUrl,
      mediaType: generatedAsset.mediaType,
      description: 'AI-generated source image',
    })
  }

  if (uploadedAsset) {
    assets.push({
      path: 'exports/uploaded-source.png',
      dataUrl: uploadedAsset.dataUrl,
      mediaType: uploadedAsset.mediaType,
      description: 'Uploaded source image',
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

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const data = (await response.json().catch(() => null)) as (T & { error?: string }) | null

  if (!response.ok) {
    throw new Error(data?.error || 'Päring ebaõnnestus.')
  }

  if (!data) {
    throw new Error('Server ei tagastanud vastust.')
  }

  return data
}

function AssetPreview({
  title,
  asset,
  onUse,
}: {
  title: string
  asset: ImageAsset
  onUse?: () => void
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
            Kasuta vestluses
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
  prompt,
  pendingImage,
  onPromoteImage,
  className,
}: EngravingOptimizerPanelProps) {
  const [loadingAction, setLoadingAction] = useState<'generate' | 'optimize' | 'export' | null>(null)
  const [error, setError] = useState('')
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
      })

      setGeneration(data)
      setOptimization(null)
      setExportPlan(null)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Pildi genereerimine ebaõnnestus.')
    } finally {
      setLoadingAction(null)
    }
  }

  const handleOptimize = async () => {
    if (loadingAction) {
      return
    }

    setLoadingAction('optimize')
    setError('')

    try {
      const data = await postJson<OptimizationResponse>('/api/engraving-optimize', {
        userPrompt: trimmedPrompt || undefined,
        sourceImageDataUrl: activeSourceAsset?.dataUrl,
        source: {
          sourceKind: uploadedAsset ? 'uploaded-image' : 'generated-text',
          width: activeSourceAsset?.width || 1200,
          height: activeSourceAsset?.height || 1200,
          hasAlpha: activeSourceAsset ? activeSourceAsset.mediaType !== 'image/jpeg' : false,
          mimeType: activeSourceAsset?.mediaType || 'image/png',
        },
      })

      setOptimization(data)
      setExportPlan(null)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Optimeerimine ebaõnnestus.')
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
      })

      const data = await postJson<ExportResponse>('/api/engraving-export', {
        assetReferences: optimization.assetReferences,
        assets,
        includeVector: optimization.result.vectorizationPlan.enabled,
        mode: optimization.result.modeDecision.mode,
      })

      downloadBase64Archive(data.archiveBase64, data.exportManifest.archiveName)
      setExportPlan(data)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Ekspordi planeerimine ebaõnnestus.')
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <section className={cn('hud-panel p-4 md:p-5', className)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="hud-label">
            <WandSparkles className="h-3.5 w-3.5" />
            Optimizer pipeline
          </span>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            Genereeri promptist engraving-safe pilt, lase workeril see puhastada ja valmista export ette.
          </p>
        </div>
        <div className="rounded-full border border-primary/14 bg-black/30 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100/60">
          AI + Worker
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <div className="rounded-[18px] border border-primary/12 bg-black/24 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:col-span-2">
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-100/44">Generation prompt</div>
          <div className="mt-1 text-xs leading-relaxed text-slate-300">
            Kirjelda siia, millist engraving-ready pilti soovid luua. Kui chati väljal on tekst juba olemas, tõstetakse see siia automaatselt ette.
          </div>
          <textarea
            value={workflowPrompt}
            onChange={(event) => setWorkflowPrompt(event.target.value)}
            rows={4}
            placeholder="Kirjelda lühidalt soovitud graveerimispilti, stiili ja tausta käitumist."
            className="mt-3 w-full resize-y rounded-[18px] border border-primary/12 bg-black/26 px-3 py-3 text-sm text-cyan-50 outline-none transition-colors placeholder:text-cyan-100/28 focus:border-primary/28"
          />
          <p className="mt-2 text-[11px] leading-relaxed text-cyan-100/42">
            `Genereeri pilt` kasutab seda välja. `Optimeeri` kasutab seda prompti koos olemasoleva või üles laaditud pildiga.
          </p>
        </div>

        <div className="rounded-[18px] border border-primary/12 bg-black/24 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-100/44">Source</div>
          <div className="mt-1 text-sm font-semibold text-cyan-50">
            {uploadedAsset ? 'Laetud pilt' : generation?.generatedAsset ? 'AI pilt' : 'Puudub'}
          </div>
        </div>
        <div className="rounded-[18px] border border-primary/12 bg-black/24 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-100/44">Simulation</div>
          <div className="mt-1 text-sm font-semibold text-cyan-50">
            {optimization ? optimization.result.simulationReport.verdict.toUpperCase() : '--'}
          </div>
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
          Genereeri pilt
        </button>
        <button
          type="button"
          onClick={() => void handleOptimize()}
          disabled={Boolean(loadingAction) || (!activeSourceAsset && !trimmedPrompt)}
          className="inline-flex items-center justify-center gap-2 rounded-[20px] border border-primary/16 bg-black/26 px-4 py-3 text-sm font-semibold text-cyan-50 transition-colors hover:border-primary/28 hover:bg-black/34 disabled:opacity-45"
        >
          {loadingAction === 'optimize' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
          Optimeeri
        </button>
        <button
          type="button"
          onClick={() => void handleExport()}
          disabled={Boolean(loadingAction) || !optimization}
          className="inline-flex items-center justify-center gap-2 rounded-[20px] border border-primary/16 bg-black/26 px-4 py-3 text-sm font-semibold text-cyan-50 transition-colors hover:border-primary/28 hover:bg-black/34 disabled:opacity-45"
        >
          {loadingAction === 'export' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Planeeri export
        </button>
      </div>

      {error && (
        <p className="mt-3 rounded-[20px] border border-destructive/30 bg-destructive/10 px-3 py-3 text-xs text-destructive">
          {error}
        </p>
      )}

      {!activeSourceAsset && !trimmedPrompt && (
        <p className="mt-3 rounded-[20px] border border-primary/10 bg-black/24 px-3 py-3 text-xs leading-relaxed text-slate-300">
          Sisesta kõigepealt prompt siia optimizer-paneeli või lisa pilt vestluse kaudu. Seejärel saad kasutada `Genereeri pilt` või `Optimeeri`.
        </p>
      )}

      {generation?.generatedAsset && (
        <div className="mt-4 space-y-3">
          <AssetPreview
            title="AI generated"
            asset={generation.generatedAsset}
            onUse={() => onPromoteImage(generation.generatedAsset!)}
          />
          <div className="rounded-[20px] border border-primary/10 bg-black/24 px-3 py-3 text-xs leading-relaxed text-slate-300">
            <p>
              Provider: <span className="font-semibold text-cyan-50">{generation.requestPlan.provider}</span> · Model:{' '}
              <span className="font-semibold text-cyan-50">{generation.requestPlan.model}</span> · Quality:{' '}
              <span className="font-semibold text-cyan-50">{generation.requestPlan.quality}</span> · Images:{' '}
              <span className="font-semibold text-cyan-50">1</span>
            </p>
            {generation.revisedPrompt && <p className="mt-2">Provider täpsustas prompti enne renderdamist.</p>}
          </div>
        </div>
      )}

      {optimization && (
        <div className="mt-4 space-y-3 rounded-3xl border border-primary/12 bg-black/24 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-[18px] border border-primary/10 bg-black/24 px-3 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100/42">Mode</div>
              <div className="mt-1 text-sm font-semibold text-cyan-50">{optimization.result.modeDecision.mode}</div>
            </div>
            <div className="rounded-[18px] border border-primary/10 bg-black/24 px-3 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100/42">DPI</div>
              <div className="mt-1 text-sm font-semibold text-cyan-50">{optimization.result.lineDensityPlan.targetDpi}</div>
            </div>
            <div className="rounded-[18px] border border-primary/10 bg-black/24 px-3 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100/42">Score</div>
              <div className="mt-1 text-sm font-semibold text-cyan-50">{optimization.result.simulationReport.score}/100</div>
            </div>
          </div>

          {optimization.workerResult?.previewAsset && (
            <AssetPreview
              title="Worker preview"
              asset={optimization.workerResult.previewAsset}
              onUse={() => onPromoteImage(optimization.workerResult!.optimizedAsset)}
            />
          )}

          {optimization.workerError && (
            <p className="rounded-[20px] border border-amber-400/24 bg-amber-400/8 px-3 py-3 text-xs text-amber-100">
              Python worker ei lõpetanud töötlust: {optimization.workerError}
            </p>
          )}

          <div className="rounded-[20px] border border-primary/10 bg-black/24 px-3 py-3 text-xs text-slate-300">
            <p className="font-semibold uppercase tracking-[0.22em] text-cyan-100/52">Next actions</p>
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
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-100/44">Export package</div>
          <p className="mt-2 text-sm font-semibold text-cyan-50">{exportPlan.exportManifest.archiveName}</p>
          <p className="mt-2 text-xs text-cyan-100/48">ZIP loodi ja allalaadimine käivitati automaatselt.</p>
          <div className="mt-3 space-y-2 text-xs text-slate-300">
            {exportPlan.exportManifest.artifacts.map((artifact) => (
              <div key={artifact.path} className="rounded-2xl border border-primary/10 bg-black/24 px-3 py-2">
                <div className="font-semibold text-cyan-50">{artifact.path}</div>
                <div className="mt-1">{artifact.description}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-cyan-100/48">LightBurn manifest: {exportPlan.lightBurnProject.fileName}</p>
        </div>
      )}
    </section>
  )
}