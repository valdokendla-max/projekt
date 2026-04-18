import type {
  BackgroundComplexity,
  DetailDensity,
  EngravingPreset,
  ImageAnalysisReport,
  ImageClass,
  ImageMetadataInput,
} from '@/lib/engraving/types'

function inferClassification(source: ImageMetadataInput): ImageClass {
  if (source.tonalRange === 'binary') {
    return source.detailDensity === 'high' ? 'line-art' : 'logo'
  }

  if (source.backgroundComplexity === 'high' && source.tonalRange === 'full') {
    return 'photo'
  }

  if (source.detailDensity === 'low' && source.backgroundComplexity === 'low') {
    return 'text-mark'
  }

  return 'mixed'
}

function scoreContrast(source: ImageMetadataInput) {
  switch (source.tonalRange) {
    case 'binary':
      return 95
    case 'limited':
      return 72
    default:
      return 48
  }
}

function scoreNoise(backgroundComplexity: BackgroundComplexity) {
  switch (backgroundComplexity) {
    case 'low':
      return 86
    case 'medium':
      return 64
    default:
      return 36
  }
}

function scoreEdges(detailDensity: DetailDensity) {
  switch (detailDensity) {
    case 'low':
      return 88
    case 'medium':
      return 68
    default:
      return 46
  }
}

export function analyzeImageForEngraving(
  source: ImageMetadataInput,
  preset?: EngravingPreset | null,
): ImageAnalysisReport {
  const backgroundComplexity = source.backgroundComplexity || 'medium'
  const detailDensity = source.detailDensity || 'medium'
  const classification = inferClassification(source)
  const contrastScore = scoreContrast(source)
  const noiseScore = scoreNoise(backgroundComplexity)
  const edgeClarityScore = scoreEdges(detailDensity)
  const risks: string[] = []
  const notes: string[] = []

  if (classification === 'photo') {
    risks.push('Photographic source likely needs dithering and aggressive contrast cleanup.')
  }

  if (backgroundComplexity === 'high') {
    risks.push('Busy background may burn into the final engraving if not simplified.')
  }

  if (detailDensity === 'high') {
    risks.push('Fine detail density may exceed engraving resolution at production speed.')
  }

  if (preset?.settings.passes && preset.settings.passes > 1 && detailDensity === 'high') {
    notes.push('High-pass engraving preset suggests simplifying the image before production.')
  }

  return {
    classification,
    contrastScore,
    noiseScore,
    edgeClarityScore,
    backgroundComplexity,
    detailDensity,
    risks,
    notes,
  }
}
