import { analyzeImageForEngraving } from '@/lib/engraving/image-analyzer'
import { buildImageGenerationRequest } from '@/lib/engraving/image-generation'
import { decideEngravingMode, calculateLineDensity } from '@/lib/engraving/engraving-mode'
import { planImageNormalization } from '@/lib/engraving/image-normalization'
import { simulateLaserResult } from '@/lib/engraving/laser-simulation'
import { buildLightBurnProjectManifest } from '@/lib/engraving/lightburn-project'
import { parseSavedSettingsSummary } from '@/lib/engraving/preset-engine'
import { optimizeEngravingPrompt } from '@/lib/engraving/prompt-optimizer'
import type { OptimizerPipelineInput, OptimizerPipelineResult } from '@/lib/engraving/types'
import { buildVectorizationPlan } from '@/lib/engraving/vector-engraving'
import { buildZipExportPlan } from '@/lib/engraving/zip-export'

function buildNextActions(result: Omit<OptimizerPipelineResult, 'nextActions'>) {
  const nextActions: string[] = []

  if (result.simulationReport.verdict === 'fail') {
    nextActions.push('Reduce fine detail and retry the optimizer pipeline.')
    nextActions.push('Increase threshold aggressiveness or lower line density.')
  } else if (result.simulationReport.verdict === 'warn') {
    nextActions.push('Validate the result on scrap material before production.')
  } else {
    nextActions.push('Proceed to deterministic image processing and export.')
  }

  if (result.vectorizationPlan.enabled) {
    nextActions.push('Generate SVG and DXF outputs for vector-capable workflows.')
  }

  if (result.optimizedPrompt) {
    const requestPlan = buildImageGenerationRequest({
      optimizedPrompt: result.optimizedPrompt,
      preset: result.preset,
    })
    nextActions.push(`Generation provider plan prepared for model ${requestPlan.model}.`)
  }

  return nextActions
}

export function runEngravingOptimizerPipeline(input: OptimizerPipelineInput): OptimizerPipelineResult {
  const preset = parseSavedSettingsSummary(input.savedSettingsSummary)
  const optimizedPrompt = input.userPrompt
    ? optimizeEngravingPrompt({ userPrompt: input.userPrompt, preset })
    : null
  const normalizationPlan = planImageNormalization(input.source, preset)
  const analysisReport = analyzeImageForEngraving(input.source, preset)
  const modeDecision = decideEngravingMode(analysisReport, preset)
  const lineDensityPlan = calculateLineDensity(input.source, modeDecision, preset)
  const simulationReport = simulateLaserResult({
    analysis: analysisReport,
    decision: modeDecision,
    lineDensity: lineDensityPlan,
    preset,
  })
  const vectorizationPlan = buildVectorizationPlan(analysisReport, modeDecision)

  const assetReferences = ['exports/output.png']
  if (vectorizationPlan.enabled) {
    assetReferences.push('exports/output.svg', 'exports/output.dxf')
  }

  const lightBurnProject = buildLightBurnProjectManifest({
    preset,
    modeDecision,
    assetReferences,
  })
  const exportManifest = buildZipExportPlan({
    preset,
    lightBurnProject,
    vectorizationPlan,
    includePreview: true,
  })

  const resultWithoutActions = {
    preset,
    optimizedPrompt,
    normalizationPlan,
    analysisReport,
    modeDecision,
    lineDensityPlan,
    simulationReport,
    vectorizationPlan,
    exportManifest,
  }

  return {
    ...resultWithoutActions,
    nextActions: buildNextActions(resultWithoutActions),
  }
}
