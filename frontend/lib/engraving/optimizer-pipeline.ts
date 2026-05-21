import { decideEngravingMode, calculateLineDensity } from '@/lib/engraving/engraving-mode'
import { analyzeImageForEngraving } from '@/lib/engraving/image-analyzer'
import { planImageNormalization } from '@/lib/engraving/image-normalization'
import { buildLightBurnProjectManifest } from '@/lib/engraving/lightburn-project'
import { optimizeEngravingPrompt } from '@/lib/engraving/prompt-optimizer'
import { parseSavedSettingsSummary } from '@/lib/engraving/preset-engine'
import { simulateLaserResult } from '@/lib/engraving/laser-simulation'
import type { ExportArtifact, OptimizerPipelineInput, OptimizerPipelineResult } from '@/lib/engraving/types'
import { buildVectorizationPlan } from '@/lib/engraving/vector-engraving'
import { buildZipExportPlan } from '@/lib/engraving/zip-export'

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
  const assetArtifacts: ExportArtifact[] = [
    {
      path: 'exports/output.png',
      mediaType: 'image/png',
      description: 'Primary processed engraving raster',
    },
  ]

  const lightBurnProject = buildLightBurnProjectManifest({
    preset,
    modeDecision,
    assetReferences: assetArtifacts.map((artifact) => artifact.path),
  })
  const exportManifest = buildZipExportPlan({
    preset,
    lightBurnProject,
    vectorizationPlan,
    assetArtifacts,
    includePreview: true,
  })
  const nextActions = [
    simulationReport.verdict === 'fail'
      ? 'Review source contrast, detail density, and preset settings before export.'
      : 'Proceed to deterministic image processing and export.',
  ]

  return {
    preset,
    optimizedPrompt,
    normalizationPlan,
    analysisReport,
    modeDecision,
    lineDensityPlan,
    simulationReport,
    vectorizationPlan,
    exportManifest,
    nextActions,
  }
}
