import type {
  ExportArtifact,
  EngravingPreset,
  ExportManifest,
  LightBurnProjectManifest,
  VectorizationPlan,
} from '@/lib/engraving/types'

export function buildZipExportPlan(args: {
  preset?: EngravingPreset | null
  lightBurnProject: LightBurnProjectManifest
  vectorizationPlan: VectorizationPlan
  assetArtifacts?: ExportArtifact[]
  includePreview?: boolean
}): ExportManifest {
  const { preset, lightBurnProject, vectorizationPlan, assetArtifacts = [], includePreview = true } = args
  const archiveName = `${preset?.machineLabel || 'engraving'}-${preset?.materialLabel || 'package'}-export.zip`
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')

  const artifacts: ExportArtifact[] = [
    {
      path: `exports/${lightBurnProject.fileName}`,
      mediaType: 'application/xml',
      description: 'LightBurn project file',
    },
    {
      path: 'exports/settings.json',
      mediaType: 'application/json',
      description: 'Resolved preset and processing settings',
    },
    {
      path: 'exports/export-manifest.json',
      mediaType: 'application/json',
      description: 'Archive manifest for the generated export bundle',
    },
  ]

  if (assetArtifacts.length > 0) {
    artifacts.unshift(...assetArtifacts)
  } else {
    artifacts.unshift({
      path: 'exports/output.png',
      mediaType: 'image/png',
      description: 'Primary processed engraving raster',
    })
  }

  const hasVectorArtifacts = artifacts.some((artifact) => artifact.path.endsWith('.svg') || artifact.path.endsWith('.dxf'))

  if (vectorizationPlan.enabled && !hasVectorArtifacts) {
    artifacts.push(
      {
        path: 'exports/vectorization-report.txt',
        mediaType: 'text/plain',
        description: 'Vector export report with fallback guidance',
      },
    )
  }

  if (includePreview && !artifacts.some((artifact) => artifact.path.endsWith('/preview.png') || artifact.path.endsWith('preview.png'))) {
    artifacts.push({
      path: 'exports/preview.png',
      mediaType: 'image/png',
      description: 'Laser simulation preview',
    })
  }

  return {
    archiveName,
    artifacts,
    notes: [
      'ZIP archive is generated at request time for direct download.',
      'Review LightBurn layer assignments before running production jobs.',
    ],
  }
}
