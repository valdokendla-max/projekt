import type {
  EngravingPreset,
  LightBurnProjectManifest,
  ModeDecision,
} from '@/lib/engraving/types'

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function buildLightBurnProjectManifest(args: {
  preset?: EngravingPreset | null
  modeDecision: ModeDecision
  assetReferences: string[]
}): LightBurnProjectManifest {
  const { preset, modeDecision, assetReferences } = args
  const fileName = `${preset?.machineLabel || 'engraving'}-${preset?.materialLabel || 'material'}-plan.lbrn2`
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')

  return {
    fileName,
    layers: [
      {
        id: 'layer-01',
        name: preset?.materialLabel || 'Main layer',
        mode: modeDecision.mode,
        speedMmpm: preset?.settings.speedMmpm || 1200,
        powerPct: preset?.settings.powerPct || 30,
        passes: preset?.settings.passes || 1,
        lineIntervalMm: preset?.settings.lineIntervalMm || 0.1,
        airAssist: preset?.settings.airAssist || false,
      },
    ],
    assetReferences,
    notes: [
      'Project manifest prepared for deterministic ZIP export.',
      'Review the generated layer settings in LightBurn before production.',
    ],
  }
}

export function serializeLightBurnProject(manifest: LightBurnProjectManifest) {
  const layerXml = manifest.layers
    .map(
      (layer, index) => `    <CutSetting index="${index}" id="${escapeXml(layer.id)}" name="${escapeXml(layer.name)}" mode="${escapeXml(layer.mode)}" speedMmpm="${layer.speedMmpm}" powerPct="${layer.powerPct}" passes="${layer.passes}" lineIntervalMm="${layer.lineIntervalMm}" airAssist="${layer.airAssist ? 'true' : 'false'}" />`,
    )
    .join('\n')

  const assetXml = manifest.assetReferences
    .map((assetPath, index) => `    <Asset index="${index}" path="${escapeXml(assetPath)}" />`)
    .join('\n')

  const notesXml = manifest.notes
    .map((note) => `    <Note>${escapeXml(note)}</Note>`)
    .join('\n')

  return ['<?xml version="1.0" encoding="UTF-8"?>', '<LightBurnProject format="ai-optimizer" version="1">', '  <CutSettings>', layerXml, '  </CutSettings>', '  <Assets>', assetXml, '  </Assets>', '  <Notes>', notesXml, '  </Notes>', '</LightBurnProject>']
    .filter(Boolean)
    .join('\n')
}
