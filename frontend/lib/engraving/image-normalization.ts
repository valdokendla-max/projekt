import type { EngravingPreset, ImageMetadataInput, ImageNormalizationPlan } from '@/lib/engraving/types'

function resolveTargetLongEdge(source: ImageMetadataInput, preset: EngravingPreset | null | undefined) {
  const baseTarget = source.sourceKind === 'generated-text' ? 1536 : 2048

  if (!preset) {
    return baseTarget
  }

  if (preset.operationMode === 'cut') {
    return 2048
  }

  return preset.laserType === 'fiber' ? 1536 : baseTarget
}

export function planImageNormalization(
  source: ImageMetadataInput,
  preset?: EngravingPreset | null,
): ImageNormalizationPlan {
  const steps = [
    'auto-orient image to a canonical upright state',
    'convert to a stable PNG working format',
    'normalize color profile to sRGB-compatible output',
  ]

  if (source.hasAlpha) {
    steps.push('flatten alpha against a white engraving background')
  }

  steps.push('prepare grayscale workspace for deterministic processing')

  return {
    targetMimeType: 'image/png',
    convertToGrayscale: true,
    flattenAlphaTo: source.hasAlpha ? 'white' : 'transparent',
    preserveAspectRatio: true,
    targetLongEdgePx: resolveTargetLongEdge(source, preset),
    steps,
  }
}
