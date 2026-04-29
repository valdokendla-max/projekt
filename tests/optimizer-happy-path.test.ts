import { describe, expect, it } from 'vitest'
import { runEngravingOptimizerPipeline } from '@/lib/engraving/optimizer-pipeline'

const SAVED_SETTINGS_SUMMARY = [
  'Masin: xTool D1 Pro 10W (diode, 10W)',
  'Materjal: Kaskvineer',
  'Paksus: 3 mm',
  'Režiim: graveerimine',
  'Materjali märkus: Tee alati test enne seeriat.',
  '- Kiirus: 1800 mm/min',
  '- Võimsus: 55 %',
  '- Passid: 1',
  '- Joone vahe: 0.1 mm',
  '- Air assist: jah',
  'Soovituslik eksport: png, svg, dxf, lbrn2',
].join('\n')

describe('optimizer happy path', () => {
  it('produces a passing pipeline result with export and LightBurn-ready artifacts for a clean uploaded logo', () => {
    const result = runEngravingOptimizerPipeline({
      userPrompt: 'Minimal logo for laser engraving',
      savedSettingsSummary: SAVED_SETTINGS_SUMMARY,
      source: {
        sourceKind: 'uploaded-image',
        width: 1200,
        height: 900,
        hasAlpha: false,
        mimeType: 'image/png',
        colorProfile: 'srgb',
        detailDensity: 'low',
        backgroundComplexity: 'low',
        tonalRange: 'binary',
      },
    })

    expect(result.preset?.machineLabel).toBe('xTool D1 Pro 10W')
    expect(result.optimizedPrompt?.positivePrompt).toContain('engraving')
    expect(result.modeDecision.mode).toBe('vector')
    expect(result.simulationReport.verdict).toBe('pass')
    expect(result.vectorizationPlan.enabled).toBe(true)
    expect(result.exportManifest.artifacts.map((artifact) => artifact.path)).toEqual(
      expect.arrayContaining([
        'exports/output.png',
        'exports/vectorization-report.txt',
        'exports/preview.png',
      ]),
    )
    expect(result.nextActions).toContain('Proceed to deterministic image processing and export.')
  })
})