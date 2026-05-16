'use client'

import { useMemo, useState } from 'react'
import type { FileUIPart } from 'ai'
import Image from 'next/image'
import { Download, Loader2, WandSparkles } from 'lucide-react'
import type {
  EngravingMode,
  ExportAssetPayload,
  ExportManifest,
  ImageAsset,
  LightBurnProjectManifest,
} from '@/lib/engraving/types'
import { cn } from '@/lib/utils'

interface EngravingOptimizerPanelProps {
  prompt: string
  pendingImage: FileUIPart | null
  onPromoteImage: (asset: Pick<ImageAsset, 'dataUrl' | 'fileName' | 'mediaType'>) => void
  savedSettingsSummary?: string
  className?: string
}

interface ExportResponse {
  ok: boolean
  lightBurnProject: LightBurnProjectManifest
  exportManifest: ExportManifest
  archiveBase64: string
}

const MODES: { value: EngravingMode; label: string }[] = [
  { value: 'threshold', label: 'Threshold' },
  { value: 'dither', label: 'Dither' },
  { value: 'vector', label: 'Vector' },
]

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
    headers: { 'Content-Type': 'application/json' },
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

export function EngravingOptimizerPanel({
  pendingImage,
  onPromoteImage,
  savedSettingsSummary,
  className,
}: EngravingOptimizerPanelProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [exportPlan, setExportPlan] = useState<ExportResponse | null>(null)
  const [mode, setMode] = useState<EngravingMode>('threshold')
  const uploadedAsset = useMemo(() => getUploadedAsset(pendingImage), [pendingImage])

  const handleExport = async () => {
    if (!uploadedAsset || loading) return

    setLoading(true)
    setError('')

    try {
      const assets: ExportAssetPayload[] = [
        {
          path: 'exports/uploaded-source.png',
          dataUrl: uploadedAsset.dataUrl,
          mediaType: uploadedAsset.mediaType,
          description: 'Uploaded source image',
        },
      ]

      const data = await postJson<ExportResponse>('/api/engraving-export', {
        assets,
        mode,
        includeVector: mode === 'vector',
        savedSettingsSummary: savedSettingsSummary || undefined,
      })

      downloadBase64Archive(data.archiveBase64, data.exportManifest.archiveName)
      setExportPlan(data)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Eksport ebaõnnestus.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className={cn('hud-panel p-4 md:p-5', className)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="hud-label">
            <WandSparkles className="h-3.5 w-3.5" />
            Engraving export
          </span>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            Vali režiim ja ekspordi üleslaetud pilt LightBurni ZIP-paketina.
          </p>
        </div>
        <div className="rounded-full border border-primary/14 bg-black/30 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100/60">
          Export
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {MODES.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            className={cn(
              'rounded-[18px] border px-3 py-3 text-sm font-semibold transition-colors',
              mode === value
                ? 'border-primary/32 bg-primary/10 text-cyan-50'
                : 'border-primary/12 bg-black/24 text-cyan-100/60 hover:border-primary/22',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {uploadedAsset && (
        <div className="mt-4 rounded-[22px] border border-primary/12 bg-black/24 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-100/44">Allikpilt</div>
              <div className="mt-1 text-xs text-slate-300">{uploadedAsset.fileName}</div>
            </div>
            <button
              type="button"
              onClick={() => onPromoteImage(uploadedAsset)}
              className="inline-flex items-center gap-2 rounded-full border border-primary/14 bg-black/30 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-50 transition-colors hover:border-primary/28"
            >
              Kasuta vestluses
            </button>
          </div>
          <div className="mt-3 overflow-hidden rounded-[20px] border border-white/6 bg-black/30">
            <Image
              src={uploadedAsset.dataUrl}
              alt={uploadedAsset.fileName}
              width={480}
              height={480}
              unoptimized
              className="h-auto w-full object-cover"
            />
          </div>
        </div>
      )}

      {!uploadedAsset && (
        <p className="mt-4 rounded-[20px] border border-primary/10 bg-black/24 px-3 py-3 text-xs leading-relaxed text-slate-300">
          Lisa pilt vestluse kaudu, seejärel saad selle eksportida.
        </p>
      )}

      <button
        type="button"
        onClick={() => void handleExport()}
        disabled={!uploadedAsset || loading}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[20px] border border-primary/18 bg-linear-to-r from-cyan-300/90 via-primary to-cyan-400/80 px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_24px_rgba(84,244,255,0.25)] transition-opacity hover:opacity-92 disabled:opacity-45"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        Ekspordi LightBurni
      </button>

      {error && (
        <p className="mt-3 rounded-[20px] border border-destructive/30 bg-destructive/10 px-3 py-3 text-xs text-destructive">
          {error}
        </p>
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
