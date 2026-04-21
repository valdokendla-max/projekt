export interface StoredLaserSettingsRecommendation {
  machine: {
    id: string
    label: string
    laserType: string
    powerW: number
  }
  material: {
    id: string
    label: string
    thicknessMm: number
    note: string
  }
  mode: 'engrave' | 'cut'
  settings: {
    speedMmpm: number
    powerPct: number
    passes: number
    lineIntervalMm: number
    airAssist: boolean
  }
  exports: string[]
  warnings: string[]
}

export interface StoredLaserSettings {
  machineId: string
  materialId: string
  thicknessMm: number
  mode: 'engrave' | 'cut'
  recommendation: StoredLaserSettingsRecommendation | null
  summary: string
  savedAt: string
}

const STORAGE_KEY = 'laser-graveerimine:saved-settings'

function isStoredLaserSettings(value: unknown): value is StoredLaserSettings {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<StoredLaserSettings>

  return typeof candidate.machineId === 'string'
    && typeof candidate.materialId === 'string'
    && typeof candidate.thicknessMm === 'number'
    && (candidate.mode === 'engrave' || candidate.mode === 'cut')
    && (candidate.recommendation === null || typeof candidate.recommendation === 'object')
    && typeof candidate.summary === 'string'
    && typeof candidate.savedAt === 'string'
}

export function readSavedLaserSettings() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)

    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as unknown
    return isStoredLaserSettings(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function writeSavedLaserSettings(settings: StoredLaserSettings) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export function clearSavedLaserSettings() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(STORAGE_KEY)
}