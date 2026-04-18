import type { EngravingPreset, OperationMode } from '@/lib/engraving/types'

function parseNumber(value: string) {
  const normalized = value.replace(',', '.').trim()
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function parseOperationMode(value: string): OperationMode {
  return value.toLowerCase().includes('l') ? 'cut' : 'engrave'
}

function parseMachineLine(value: string) {
  const openParenIndex = value.lastIndexOf('(')
  const closeParenIndex = value.lastIndexOf(')')

  if (openParenIndex < 0 || closeParenIndex < 0 || closeParenIndex < openParenIndex) {
    return {
      machineLabel: value.trim(),
      laserType: 'unknown',
      powerW: 0,
    }
  }

  const machineLabel = value.slice(0, openParenIndex).trim()
  const details = value.slice(openParenIndex + 1, closeParenIndex)
  const [laserTypeRaw, powerRaw] = details.split(',')

  return {
    machineLabel,
    laserType: (laserTypeRaw || 'unknown').trim(),
    powerW: parseNumber((powerRaw || '').replace(/w/i, '')),
  }
}

export function parseSavedSettingsSummary(summary: string | undefined | null): EngravingPreset | null {
  const normalizedSummary = String(summary || '').trim()
  if (!normalizedSummary) {
    return null
  }

  const lines = normalizedSummary
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const machineLine = lines.find((line) => line.startsWith('Masin:'))?.replace('Masin:', '').trim() || ''
  const materialLabel = lines.find((line) => line.startsWith('Materjal:'))?.replace('Materjal:', '').trim() || 'Unknown material'
  const thicknessMm = parseNumber(lines.find((line) => line.startsWith('Paksus:'))?.replace('Paksus:', '').replace('mm', '') || '0')
  const operationMode = parseOperationMode(lines.find((line) => line.startsWith('Režiim:'))?.replace('Režiim:', '').trim() || 'graveerimine')
  const materialNote = lines.find((line) => line.startsWith('Materjali märkus:'))?.replace('Materjali märkus:', '').trim() || ''
  const speedMmpm = parseNumber(lines.find((line) => line.startsWith('- Kiirus:'))?.replace('- Kiirus:', '').replace('mm/min', '') || '0')
  const powerPct = parseNumber(lines.find((line) => line.startsWith('- Võimsus:'))?.replace('- Võimsus:', '').replace('%', '') || '0')
  const passes = parseNumber(lines.find((line) => line.startsWith('- Passid:'))?.replace('- Passid:', '') || '0')
  const lineIntervalMm = parseNumber(lines.find((line) => line.startsWith('- Joone vahe:'))?.replace('- Joone vahe:', '').replace('mm', '') || '0')
  const airAssist = (lines.find((line) => line.startsWith('- Air assist:')) || '').toLowerCase().includes('jah')
  const exportLine = lines.find((line) => line.startsWith('Soovituslik eksport:'))?.replace('Soovituslik eksport:', '').trim() || ''
  const recommendedExports = exportLine
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  const warningHeaderIndex = lines.findIndex((line) => line === 'Tähelepanekud:')
  const warnings = warningHeaderIndex >= 0
    ? lines.slice(warningHeaderIndex + 1).map((line) => line.replace(/^[-*]\s*/, '').trim()).filter(Boolean)
    : []

  const machine = parseMachineLine(machineLine)

  return {
    summary: normalizedSummary,
    machineLabel: machine.machineLabel,
    laserType: machine.laserType,
    powerW: machine.powerW,
    materialLabel,
    thicknessMm,
    operationMode,
    materialNote,
    settings: {
      speedMmpm,
      powerPct,
      passes,
      lineIntervalMm,
      airAssist,
    },
    recommendedExports,
    warnings,
  }
}

export function hasSavedPreset(summary: string | undefined | null) {
  return parseSavedSettingsSummary(summary) !== null
}

export function describePreset(preset: EngravingPreset | null) {
  if (!preset) {
    return 'No saved engraving preset'
  }

  return `${preset.machineLabel} / ${preset.materialLabel} / ${preset.operationMode}`
}
