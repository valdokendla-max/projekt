import type {
  EngravingPreset,
  ImageAnalysisReport,
  LaserSimulationReport,
  LineDensityPlan,
  ModeDecision,
} from '@/lib/engraving/types'

export function simulateLaserResult(args: {
  analysis: ImageAnalysisReport
  decision: ModeDecision
  lineDensity: LineDensityPlan
  preset?: EngravingPreset | null
}): LaserSimulationReport {
  const { analysis, decision, lineDensity, preset } = args
  let score = 100
  const risks = [...analysis.risks]
  const notes = [...analysis.notes]

  if (analysis.backgroundComplexity === 'high') {
    score -= 18
  }

  if (analysis.detailDensity === 'high') {
    score -= 18
  }

  if (decision.mode === 'dither') {
    score -= 8
    notes.push('Dithering introduces more line density and should be validated on scrap material.')
  }

  if (lineDensity.maxLinesPerCm > 140) {
    score -= 15
    risks.push('Line density is high enough to risk muddy fill areas.')
  }

  if (preset?.settings.passes && preset.settings.passes > 2) {
    score -= 10
    risks.push('Multiple passes can amplify soot or overburn on fine details.')
  }

  const boundedScore = Math.max(0, Math.min(100, score))
  const verdict = boundedScore >= 76 ? 'pass' : boundedScore >= 52 ? 'warn' : 'fail'

  return {
    score: boundedScore,
    verdict,
    risks,
    notes,
  }
}
