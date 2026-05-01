import JSZip from 'jszip'
import { requireAuthenticatedRouteUser } from '@/lib/api-security'
import { bufferToDataUrl, parseDataUrl } from '@/lib/engraving/data-url'
import { buildLightBurnProjectManifest } from '@/lib/engraving/lightburn-project'
import { serializeLightBurnProject } from '@/lib/engraving/lightburn-project'
import { parseSavedSettingsSummary } from '@/lib/engraving/preset-engine'
import type { EngravingMode, ExportAssetPayload, ModeDecision, VectorizationPlan } from '@/lib/engraving/types'
import { renderVectorAssetsFromRaster } from '@/lib/engraving/vector-engraving'
import { buildZipExportPlan } from '@/lib/engraving/zip-export'

export const runtime = 'nodejs'

interface RequestBody {
  savedSettingsSummary?: string
  assetReferences?: string[]
  assets?: ExportAssetPayload[]
  includeVector?: boolean
  mode?: EngravingMode
}

function sanitizeArchivePath(value: string) {
  return value
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\.\.(\/|$)/g, '')
    .trim()
}

function hasVectorAsset(path: string) {
  return /\.(svg|dxf)$/i.test(path)
}

function isPngAsset(asset: ExportAssetPayload) {
  return asset.mediaType === 'image/png' || asset.path.toLowerCase().endsWith('.png')
}

function findVectorSourceAsset(assets: ExportAssetPayload[]) {
  const preferredPatterns = [/output\.png$/i, /normalized\.png$/i, /preview\.png$/i, /\.png$/i]

  for (const pattern of preferredPatterns) {
    const asset = assets.find((candidate) => isPngAsset(candidate) && pattern.test(candidate.path))

    if (asset) {
      return asset
    }
  }

  return null
}

function createTextAsset(path: string, description: string, content: string): ExportAssetPayload {
  return {
    path,
    mediaType: 'text/plain',
    description,
    dataUrl: bufferToDataUrl(Buffer.from(content, 'utf8'), 'text/plain'),
  }
}

export async function POST(req: Request) {
  const auth = await requireAuthenticatedRouteUser(req)
  if (!auth.ok) return auth.response

  const body = (await req.json().catch(() => ({}))) as RequestBody
  const preset = parseSavedSettingsSummary(body.savedSettingsSummary)
  const requestedAssetReferences = (body.assetReferences || []).map(sanitizeArchivePath).filter(Boolean)
  const providedAssets = (body.assets || [])
    .map((asset) => ({
      ...asset,
      path: sanitizeArchivePath(asset.path),
    }))
    .filter((asset) => asset.path && asset.dataUrl)
  const resolvedMode = body.mode || (body.includeVector ? 'vector' : 'threshold')
  const vectorRequested = body.includeVector === undefined ? resolvedMode === 'vector' : Boolean(body.includeVector)

  const modeDecision: ModeDecision = {
    mode: resolvedMode,
    vectorAllowed: vectorRequested,
    thresholdBias: 'balanced',
    reasons: [
      vectorRequested ? 'Vector-ready export mode was requested for this package.' : 'Raster-first export mode was requested for this package.',
      providedAssets.length > 0
        ? `Received ${providedAssets.length} prepared asset(s) from the optimizer or export UI.`
        : 'No binary assets were posted, so the package falls back to manifest references.',
    ],
  }

  const vectorizationPlan: VectorizationPlan = {
    enabled: vectorRequested,
    targetFormats: vectorRequested ? ['svg', 'dxf'] : [],
    strokeStrategy: 'outline',
    reasons: vectorRequested
      ? [
        'SVG and DXF delivery is enabled for this export job.',
        'When dedicated vector assets are missing, the route traces the optimized PNG deterministically.',
      ]
      : ['Vector delivery was not requested for this export job.'],
  }

  const generatedVectorAssets: ExportAssetPayload[] = []
  const supportAssets: ExportAssetPayload[] = []
  const hasProvidedVectorAssets = providedAssets.some((asset) => hasVectorAsset(asset.path))

  if (vectorizationPlan.enabled && hasProvidedVectorAssets) {
    vectorizationPlan.reasons.push('Using supplied SVG/DXF assets without additional raster tracing.')
  }

  if (vectorizationPlan.enabled && !hasProvidedVectorAssets) {
    const rasterSource = findVectorSourceAsset(providedAssets)

    if (rasterSource) {
      try {
        const generated = renderVectorAssetsFromRaster({
          dataUrl: rasterSource.dataUrl,
          strokeStrategy: vectorizationPlan.strokeStrategy,
        })
        const basePath = rasterSource.path.replace(/\.png$/i, '')

        generatedVectorAssets.push(
          {
            path: `${basePath}.svg`,
            mediaType: 'image/svg+xml',
            description: 'Deterministic SVG trace generated from the optimized raster',
            dataUrl: generated.svgDataUrl,
          },
          {
            path: `${basePath}.dxf`,
            mediaType: 'application/dxf',
            description: 'Deterministic DXF trace generated from the optimized raster',
            dataUrl: generated.dxfDataUrl,
          },
        )

        vectorizationPlan.reasons.push(
          `Vector traces were generated from ${rasterSource.path} using ${generated.rectangleCount} merged raster region(s).`,
        )
      } catch (error) {
        const detail = error instanceof Error ? error.message : 'Vector trace generation failed.'

        supportAssets.push(
          createTextAsset(
            'exports/vectorization-report.txt',
            'Vector export report with fallback guidance',
            [
              'Vector delivery was requested for this export package.',
              `Tracing source: ${rasterSource.path}`,
              `Result: ${detail}`,
              'Fallback: use the included PNG asset in LightBurn or switch this job to threshold mode.',
            ].join('\n'),
          ),
        )

        vectorizationPlan.reasons.push('Raster tracing exceeded the safe export limits, so a fallback report was attached.')
      }
    } else {
      supportAssets.push(
        createTextAsset(
          'exports/vectorization-report.txt',
          'Vector export report with fallback guidance',
          [
            'Vector delivery was requested for this export package.',
            'No PNG asset was included in the request, so deterministic SVG/DXF tracing could not run.',
            'Fallback: include exports/output.png from the optimizer step or disable vector export for this job.',
          ].join('\n'),
        ),
      )

      vectorizationPlan.reasons.push('No PNG asset was available for tracing, so a fallback report was attached.')
    }
  }

  const finalAssets = [...providedAssets, ...generatedVectorAssets, ...supportAssets]
  const productionAssetReferences = [...providedAssets, ...generatedVectorAssets].map((asset) => asset.path)
  const assetReferences = productionAssetReferences.length > 0
    ? productionAssetReferences
    : requestedAssetReferences.length > 0
    ? requestedAssetReferences
    : ['exports/output.png']

  const lightBurnProject = buildLightBurnProjectManifest({
    preset,
    modeDecision,
    assetReferences,
  })

  const exportManifest = buildZipExportPlan({
    preset,
    lightBurnProject,
    vectorizationPlan,
    assetArtifacts: finalAssets.map(({ path, mediaType, description }) => ({
      path,
      mediaType,
      description,
    })),
    includePreview: finalAssets.some((asset) => asset.path.endsWith('preview.png')),
  })

  const lightBurnContent = serializeLightBurnProject(lightBurnProject)
  const zip = new JSZip()

  zip.file(`exports/${lightBurnProject.fileName}`, lightBurnContent)
  zip.file(
    'exports/settings.json',
    JSON.stringify(
      {
        preset,
        modeDecision,
        vectorizationPlan,
      },
      null,
      2,
    ),
  )
  zip.file(
    'exports/export-manifest.json',
    JSON.stringify(
      {
        exportManifest,
        lightBurnProject,
      },
      null,
      2,
    ),
  )

  for (const asset of finalAssets) {
    const parsed = parseDataUrl(asset.dataUrl)
    zip.file(asset.path, parsed.buffer)
  }

  const archiveBase64 = await zip.generateAsync({ type: 'base64', compression: 'DEFLATE', compressionOptions: { level: 6 } })

  return Response.json({
    ok: true,
    stage: 'engraving-export-ready',
    lightBurnProject,
    exportManifest,
    archiveBase64,
  })
}
