import type { EngravingPreset, OptimizedPrompt, PromptOptimizationInput } from '@/lib/engraving/types'

const DEFAULT_OUTPUT_GOALS = [
  'very high contrast',
  'black and white output',
  'crisp silhouette edges',
  'minimal background clutter',
  'engraving-safe detail density',
]

const DEFAULT_NEGATIVE_TERMS = [
  'soft gradients',
  'low contrast haze',
  'complex background clutter',
  'photoreal glare',
  'muddy shadows',
  'tiny unreadable details',
  'weak edge separation',
]

function buildPresetHints(preset: EngravingPreset | null | undefined) {
  if (!preset) {
    return []
  }

  return [
    `target machine: ${preset.machineLabel}`,
    `laser type: ${preset.laserType}`,
    `material: ${preset.materialLabel}`,
    `operation mode: ${preset.operationMode}`,
    `line interval: ${preset.settings.lineIntervalMm} mm`,
  ]
}

function buildConstraintBlock(preset: EngravingPreset | null | undefined) {
  const presetHints = buildPresetHints(preset)

  return [
    'Design for laser engraving, not for general image aesthetics.',
    'Prefer bold forms, clean segmentation, and large readable shapes.',
    'Keep the result monochrome and ready for threshold or dithering.',
    ...presetHints,
  ]
}

export function optimizeEngravingPrompt({ userPrompt, preset }: PromptOptimizationInput): OptimizedPrompt {
  const normalizedPrompt = userPrompt.trim()
  const presetHints = buildPresetHints(preset)
  const positivePrompt = [
    normalizedPrompt,
    'Convert the idea into laser-engraving-ready artwork.',
    'Use strong black-white separation, simplified forms, and clear contour hierarchy.',
    'Remove visual clutter and preserve only essential details.',
    ...presetHints,
  ].join(' ')

  return {
    sourcePrompt: normalizedPrompt,
    positivePrompt,
    negativePrompt: DEFAULT_NEGATIVE_TERMS.join(', '),
    systemConstraints: buildConstraintBlock(preset),
    outputGoals: DEFAULT_OUTPUT_GOALS,
  }
}
