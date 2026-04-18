import type {
  EngravingMode,
  EngravingPreset,
  ImageAnalysisReport,
  ImageMetadataInput,
  LineDensityPlan,
  ModeDecision,
} from '@/lib/engraving/types'

export function decideEngravingMode(
  analysis: ImageAnalysisReport,
  preset?: EngravingPreset | null,
): ModeDecision {
  const reasons: string[] = []
  let mode: EngravingMode = 'threshold'
  let ditherAlgorithm: ModeDecision['ditherAlgorithm']
  let thresholdBias: ModeDecision['thresholdBias'] = 'balanced'
  let vectorAllowed = false

  if (analysis.classification === 'photo') {
    mode = 'dither'
    ditherAlgorithm = 'stucki'
    reasons.push('Photo-like content benefits from a tonal dithering strategy.')
  } else if (analysis.classification === 'logo' || analysis.classification === 'text-mark' || analysis.classification === 'line-art') {
    mode = 'vector'
    vectorAllowed = true
    thresholdBias = 'hard'
    reasons.push('Clean graphic content is a strong candidate for vector engraving.')
  } else {
    mode = 'threshold'
    thresholdBias = analysis.backgroundComplexity === 'high' ? 'hard' : 'balanced'
    reasons.push('Mixed content should be simplified before engraving.')
  }

  if (preset?.operationMode === 'cut') {
    mode = vectorAllowed ? 'vector' : 'threshold'
    reasons.push('Cut mode prioritizes cleaner edges and deterministic contours.')
  }

  return {
    mode,
    ditherAlgorithm,
    thresholdBias,
    vectorAllowed,
    reasons,
  }
}

export function calculateLineDensity(
  source: ImageMetadataInput,
  decision: ModeDecision,
  preset?: EngravingPreset | null,
): LineDensityPlan {
  const reasons: string[] = []
  const sourceLongEdge = Math.max(source.width, source.height)
  const baseDpi = decision.mode === 'dither' ? 318 : decision.mode === 'vector' ? 508 : 254
  const presetLineInterval = preset?.settings.lineIntervalMm || 0.1
  const targetDpi = sourceLongEdge >= 2000 ? baseDpi : Math.max(190, baseDpi - 32)
  const effectiveLineIntervalMm = Math.max(0.05, presetLineInterval)
  const maxLinesPerCm = Number((10 / effectiveLineIntervalMm).toFixed(2))

  reasons.push(`Base density selected for ${decision.mode} mode.`)
  reasons.push(`Preset line interval resolved to ${effectiveLineIntervalMm} mm.`)

  return {
    targetDpi,
    effectiveLineIntervalMm,
    maxLinesPerCm,
    reasons,
  }
}
