'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Flame, Layers, Settings2 } from 'lucide-react'
import { getClientBackendUrl } from '@/lib/backend-url'
import {
  clearSavedLaserSettings,
  readSavedLaserSettings,
  writeSavedLaserSettings,
  type StoredLaserSettings,
  type StoredLaserSettingsRecommendation,
} from '@/lib/engraving/saved-settings-storage'
import { cn } from '@/lib/utils'

function buildAuthHeaders(token: string | null | undefined): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {}
}

type LaserMode = 'engrave' | 'cut'
type UiLanguage = 'et' | 'en'

interface Machine {
  id: string
  brand: string
  model: string
  laserType: string
  powerW: number
}

interface Material {
  id: string
  name: string
  thicknessRangeMm: [number, number]
  note: string
  supportedLaserTypes: string[]
}

interface Recommendation {
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
  mode: LaserMode
  settings: {
    speedMmpm: number
    powerPct: number
    passes: number
    lineIntervalMm: number
    airAssist: boolean
  }
  estimates?: {
    widthMm: number | null
    heightMm: number | null
    durationMinutes: number | null
    durationLabel: string | null
    requiresDimensions: boolean
  }
  exports: string[]
  warnings: string[]
}

interface LaserSettingsPanelProps {
  className?: string
  language?: UiLanguage
  authToken?: string | null
  savedSettingsSummary?: string
  onSavedSettingsSummaryChange?: (summary: string) => void
  onSavedSettingsChange?: (settings: StoredLaserSettings | null) => void
}

const PANEL_COPY = {
  et: {
    loadingMachines: 'Masinate laadimine ebaõnnestus.',
    loadingMaterials: 'Materjalide laadimine ebaõnnestus.',
    loadingPanel: 'Laen laserimasinaid ja materjale...',
    calculateError: 'Seadete arvutamine ebaõnnestus.',
    recommendationMissing: 'Soovituse vastus puudub.',
    title: 'Seadistusmoodul',
    description: 'Vali laserimasin, materjal ja paksus ning arvuta soovituslikud seaded.',
    badge: 'Laser setup',
    machine: 'Laserimasin',
    material: 'Materjal',
    thickness: 'Paksus',
    width: 'Laius',
    height: 'Kõrgus',
    optional: 'valikuline',
    mode: 'Režiim',
    engrave: 'Graveerimine',
    cut: 'Lõikamine',
    save: 'Salvesta seadistus',
    calculate: 'Arvuta seaded',
    calculating: 'Arvutan...',
    clear: 'Eemalda salvestus',
    saveStatus: 'Salvestuse olek',
    savedActive: 'Salvestatud seadistus on aktiivne ja taastub ka pärast refreshi.',
    savedRemoved: 'Salvestatud seadistus eemaldati.',
    savedNowActive: 'Seadistus salvestati ja on nüüd aktiivne.',
    unsavedChanges: 'Paneelis on muudatused, mis pole veel salvestatud.',
    noSaved: 'Ühtegi salvestatud seadistust pole.',
    selectedMachine: 'Valitud masin',
    selectedMaterial: 'Materjal',
    selectedMode: 'Režiim',
    materialInfo: 'Materjali info',
    materialRange: 'Tavavahemik',
    note: 'Märkus',
    speed: 'Kiirus',
    power: 'Võimsus',
    passes: 'Passid',
    lineInterval: 'Joone vahe',
    airAssist: 'Air assist',
    estimatedTime: 'Hinnanguline aeg',
    estimatedTimeMissing: 'Lisa laius ja kõrgus, et süsteem saaks tööaja ligikaudselt arvutada.',
    yes: 'Jah',
    no: 'Ei',
    recommendedExports: 'Soovituslikud ekspordid',
    loginRequired: 'Seadistusmooduli kasutamiseks logi sisse.',
  },
  en: {
    loadingMachines: 'Failed to load machines.',
    loadingMaterials: 'Failed to load materials.',
    loadingPanel: 'Loading laser machines and materials...',
    calculateError: 'Failed to calculate settings.',
    recommendationMissing: 'Recommendation response is missing.',
    title: 'Settings module',
    description: 'Choose a laser machine, material, and thickness, then calculate recommended settings.',
    badge: 'Laser setup',
    machine: 'Laser machine',
    material: 'Material',
    thickness: 'Thickness',
    width: 'Width',
    height: 'Height',
    optional: 'optional',
    mode: 'Mode',
    engrave: 'Engrave',
    cut: 'Cut',
    save: 'Save settings',
    calculate: 'Calculate settings',
    calculating: 'Calculating...',
    clear: 'Remove saved preset',
    saveStatus: 'Save status',
    savedActive: 'The saved settings are active and restore after refresh.',
    savedRemoved: 'Saved settings removed.',
    savedNowActive: 'Settings saved and now active.',
    unsavedChanges: 'The panel has changes that have not been saved yet.',
    noSaved: 'There are no saved settings.',
    selectedMachine: 'Selected machine',
    selectedMaterial: 'Material',
    selectedMode: 'Mode',
    materialInfo: 'Material info',
    materialRange: 'Typical range',
    note: 'Note',
    speed: 'Speed',
    power: 'Power',
    passes: 'Passes',
    lineInterval: 'Line interval',
    airAssist: 'Air assist',
    estimatedTime: 'Estimated time',
    estimatedTimeMissing: 'Add width and height so the system can estimate the job duration.',
    yes: 'Yes',
    no: 'No',
    recommendedExports: 'Recommended exports',
    loginRequired: 'Sign in to use the settings module.',
  },
} satisfies Record<UiLanguage, {
  loadingMachines: string
  loadingMaterials: string
  loadingPanel: string
  loginRequired: string
  calculateError: string
  recommendationMissing: string
  title: string
  description: string
  badge: string
  machine: string
  material: string
  thickness: string
  width: string
  height: string
  optional: string
  mode: string
  engrave: string
  cut: string
  save: string
  calculate: string
  calculating: string
  clear: string
  saveStatus: string
  savedActive: string
  savedRemoved: string
  savedNowActive: string
  unsavedChanges: string
  noSaved: string
  selectedMachine: string
  selectedMaterial: string
  selectedMode: string
  materialInfo: string
  materialRange: string
  note: string
  speed: string
  power: string
  passes: string
  lineInterval: string
  airAssist: string
  estimatedTime: string
  estimatedTimeMissing: string
  yes: string
  no: string
  recommendedExports: string
}>

const BACKEND_URL = getClientBackendUrl()

function parseOptionalMillimeters(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function formatJobSize(widthMm: number | null, heightMm: number | null) {
  if (widthMm && heightMm) {
    return `${formatNumber(widthMm)} x ${formatNumber(heightMm)} mm`
  }

  if (widthMm) {
    return `${formatNumber(widthMm)} x ? mm`
  }

  if (heightMm) {
    return `? x ${formatNumber(heightMm)} mm`
  }

  return 'Määramata'
}

function buildSavedSettingsSummary(args: {
  selectedMachine: Machine | null
  selectedMaterial: Material | null
  thicknessMm: number
  widthMm: number | null
  heightMm: number | null
  mode: LaserMode
  recommendation: Recommendation | null
}) {
  const { selectedMachine, selectedMaterial, thicknessMm, widthMm, heightMm, mode, recommendation } = args

  if (!selectedMachine || !selectedMaterial) {
    return ''
  }

  const lines = [
    `Masin: ${formatMachineLabel(selectedMachine)}`,
    `Materjal: ${selectedMaterial.name}`,
    `Paksus: ${formatNumber(thicknessMm)} mm`,
    `Pildi või tööala suurus: ${formatJobSize(widthMm, heightMm)}`,
    `Režiim: ${formatModeLabel(mode)}`,
    `Materjali märkus: ${selectedMaterial.note}`,
  ]

  if (recommendation) {
    lines.push(
      `- Kiirus: ${formatNumber(recommendation.settings.speedMmpm)} mm/min`,
      `- Võimsus: ${formatNumber(recommendation.settings.powerPct)}%`,
      `- Passid: ${formatNumber(recommendation.settings.passes)}`,
      `- Joone vahe: ${formatNumber(recommendation.settings.lineIntervalMm)} mm`,
      `- Air assist: ${recommendation.settings.airAssist ? 'Jah' : 'Ei'}`,
      `Soovituslik eksport: ${recommendation.exports.join(', ')}`,
    )

    if (recommendation.estimates?.durationLabel) {
      lines.push(`- Hinnanguline aeg: ${recommendation.estimates.durationLabel}`)
    } else {
      lines.push('- Hinnanguline aeg: lisa laius ja kõrgus millimeetrites')
    }

    if (recommendation.warnings.length > 0) {
      lines.push('Tähelepanekud:', ...recommendation.warnings.map((warning) => `- ${warning}`))
    }
  }

  return lines.join('\n')
}

function sortMachines(machines: Machine[]) {
  return [...machines].sort((left, right) => {
    const leftLabel = `${left.brand} ${left.model}`
    const rightLabel = `${right.brand} ${right.model}`
    return leftLabel.localeCompare(rightLabel)
  })
}

function formatLaserType(laserType: string) {
  switch (laserType) {
    case 'co2':
      return 'CO2'
    case 'infrared':
      return 'IR'
    default:
      return laserType.toUpperCase()
  }
}

function formatModeLabel(mode: LaserMode, language: UiLanguage = 'et') {
  const copy = PANEL_COPY[language]
  return mode === 'engrave' ? copy.engrave : copy.cut
}

function formatMachineLabel(machine: Machine) {
  return `${machine.brand} ${machine.model} (${formatLaserType(machine.laserType)}, ${machine.powerW}W)`
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '')
}

function useBackendMachines() {
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    fetch(`${BACKEND_URL}/api/machines`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Masinate laadimine ebaõnnestus.')
        }

        return response.json() as Promise<Machine[]>
      })
      .then((data) => {
        if (cancelled) return
        setMachines(sortMachines(data))
        setError('')
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Masinate laadimine ebaõnnestus.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { machines, loading, error }
}

function useBackendMaterials() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    fetch(`${BACKEND_URL}/api/materials`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Materjalide laadimine ebaõnnestus.')
        }

        return response.json() as Promise<Material[]>
      })
      .then((data) => {
        if (cancelled) return
        setMaterials(data)
        setError('')
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Materjalide laadimine ebaõnnestus.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { materials, loading, error }
}

function isRecommendation(value: Recommendation | { error?: string } | null): value is Recommendation {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'machine' in value &&
      'material' in value &&
      'settings' in value &&
      'exports' in value,
  )
}

export function LaserSettingsPanel({
  className,
  language = 'et',
  authToken,
  savedSettingsSummary,
  onSavedSettingsSummaryChange,
  onSavedSettingsChange,
}: LaserSettingsPanelProps) {
  const copy = PANEL_COPY[language]
  const { machines, loading: loadingMachines, error: machinesError } = useBackendMachines()
  const { materials, loading: loadingMaterials, error: materialsError } = useBackendMaterials()

  const [machineId, setMachineId] = useState('')
  const [materialId, setMaterialId] = useState('')
  const [thicknessMm, setThicknessMm] = useState(3)
  const [widthMmInput, setWidthMmInput] = useState('')
  const [heightMmInput, setHeightMmInput] = useState('')
  const [mode, setMode] = useState<LaserMode>('engrave')
  const [loadingRecommendation, setLoadingRecommendation] = useState(false)
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null)
  const [error, setError] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [pendingStoredSettings, setPendingStoredSettings] = useState(() => readSavedLaserSettings())
  const [hasHydratedStoredSettings, setHasHydratedStoredSettings] = useState(() => readSavedLaserSettings() === null)
  const isRestoringSavedSettings = useRef(false)

  useEffect(() => {
    const storedSettings = readSavedLaserSettings()

    setPendingStoredSettings(storedSettings)
    setHasHydratedStoredSettings(storedSettings === null)
    onSavedSettingsSummaryChange?.(storedSettings?.summary || '')
    onSavedSettingsChange?.(storedSettings)
  }, [onSavedSettingsChange, onSavedSettingsSummaryChange])

  useEffect(() => {
    if (!machineId && machines.length > 0) {
      setMachineId(machines[0].id)
    }
  }, [machines, machineId])

  useEffect(() => {
    if (!materialId && materials.length > 0) {
      setMaterialId(materials[0].id)
    }
  }, [materials, materialId])

  const selectedMachine = useMemo(
    () => machines.find((machine) => machine.id === machineId) || null,
    [machines, machineId],
  )
  const selectedMaterial = useMemo(
    () => materials.find((material) => material.id === materialId) || null,
    [materials, materialId],
  )
  const widthMm = useMemo(() => parseOptionalMillimeters(widthMmInput), [widthMmInput])
  const heightMm = useMemo(() => parseOptionalMillimeters(heightMmInput), [heightMmInput])

  const currentSummary = useMemo(
    () => buildSavedSettingsSummary({
      selectedMachine,
      selectedMaterial,
      thicknessMm,
      widthMm,
      heightMm,
      mode,
      recommendation,
    }),
    [heightMm, mode, recommendation, selectedMachine, selectedMaterial, thicknessMm, widthMm],
  )

  const isDirty = hasHydratedStoredSettings && currentSummary !== String(savedSettingsSummary || '')

  useEffect(() => {
    if (!pendingStoredSettings || machines.length === 0 || materials.length === 0) {
      return
    }

    const hasStoredMachine = machines.some((machine) => machine.id === pendingStoredSettings.machineId)
    const hasStoredMaterial = materials.some((material) => material.id === pendingStoredSettings.materialId)

    isRestoringSavedSettings.current = true
    setMachineId(
      hasStoredMachine ? pendingStoredSettings.machineId : machines[0]?.id || '',
    )
    setMaterialId(
      hasStoredMaterial ? pendingStoredSettings.materialId : materials[0]?.id || '',
    )
    setThicknessMm(pendingStoredSettings.thicknessMm > 0 ? pendingStoredSettings.thicknessMm : 0.1)
    setWidthMmInput(pendingStoredSettings.widthMm ? String(pendingStoredSettings.widthMm) : '')
    setHeightMmInput(pendingStoredSettings.heightMm ? String(pendingStoredSettings.heightMm) : '')
    setMode(pendingStoredSettings.mode)
    setRecommendation(
      hasStoredMachine
        && hasStoredMaterial
        && isRecommendation(
        pendingStoredSettings.recommendation as Recommendation | StoredLaserSettingsRecommendation | null,
      )
        ? (pendingStoredSettings.recommendation as Recommendation)
        : null,
    )
    onSavedSettingsSummaryChange?.(pendingStoredSettings.summary || '')
    onSavedSettingsChange?.(pendingStoredSettings)
    setPendingStoredSettings(null)
    setHasHydratedStoredSettings(true)
  }, [machines, materials, onSavedSettingsChange, onSavedSettingsSummaryChange, pendingStoredSettings])

  useEffect(() => {
    if (isRestoringSavedSettings.current) {
      isRestoringSavedSettings.current = false
      return
    }

    setRecommendation(null)
    setStatusMessage('')
  }, [heightMmInput, machineId, materialId, thicknessMm, mode, widthMmInput])

  const handleSave = () => {
    if (!selectedMachine || !selectedMaterial || !currentSummary) {
      return
    }

    const nextStoredSettings: StoredLaserSettings = {
      machineId,
      materialId,
      thicknessMm,
      mode,
      widthMm,
      heightMm,
      recommendation,
      summary: currentSummary,
      savedAt: new Date().toISOString(),
    }

    writeSavedLaserSettings(nextStoredSettings)
    onSavedSettingsSummaryChange?.(currentSummary)
    onSavedSettingsChange?.(nextStoredSettings)
    setStatusMessage(copy.savedNowActive)
  }

  const handleClearSavedSettings = () => {
    clearSavedLaserSettings()
    onSavedSettingsSummaryChange?.('')
    onSavedSettingsChange?.(null)
    setStatusMessage(copy.savedRemoved)
  }

  const handleCalculate = async () => {
    if (!machineId || !materialId) {
      return
    }

    setLoadingRecommendation(true)
    setError('')

    try {
      const response = await fetch(`${BACKEND_URL}/api/recommendation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...buildAuthHeaders(authToken),
        },
        body: JSON.stringify({
          machineId,
          materialId,
          thicknessMm,
          widthMm,
          heightMm,
          mode,
        }),
      })
      const data = (await response.json().catch(() => null)) as Recommendation | { error?: string } | null

      if (!response.ok) {
        throw new Error(data && 'error' in data && data.error ? data.error : copy.calculateError)
      }

      if (!isRecommendation(data)) {
        throw new Error(copy.recommendationMissing)
      }

      setRecommendation(data)
    } catch (requestError) {
      setRecommendation(null)
      setError(requestError instanceof Error ? requestError.message : copy.calculateError)
    } finally {
      setLoadingRecommendation(false)
    }
  }

  if (loadingMachines || loadingMaterials) {
    return (
      <section className={cn('hud-panel p-4 md:p-5', className)}>
        <p className="text-sm text-slate-300">{copy.loadingPanel}</p>
      </section>
    )
  }

  if (machinesError || materialsError) {
    return (
      <section className={cn('hud-panel p-4 md:p-5', className)}>
        <p className="text-sm text-destructive">{machinesError || materialsError}</p>
      </section>
    )
  }

  return (
    <section className={cn('hud-panel p-4 md:p-5', className)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="hud-label">
            <Settings2 className="h-3.5 w-3.5" />
            {copy.title}
          </span>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">{copy.description}</p>
        </div>
        <div className="rounded-full border border-primary/14 bg-black/30 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100/60">
          {copy.badge}
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <label className="space-y-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-100/44">{copy.machine}</span>
          <select
            value={machineId}
            onChange={(event) => setMachineId(event.target.value)}
            className="w-full rounded-[18px] border border-primary/12 bg-black/26 px-3 py-3 text-sm text-cyan-50 outline-none transition-colors focus:border-primary/28"
          >
            {machines.map((machine) => (
              <option key={machine.id} value={machine.id} className="bg-slate-950 text-slate-100">
                {formatMachineLabel(machine)}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-100/44">{copy.material}</span>
          <select
            value={materialId}
            onChange={(event) => setMaterialId(event.target.value)}
            className="w-full rounded-[18px] border border-primary/12 bg-black/26 px-3 py-3 text-sm text-cyan-50 outline-none transition-colors focus:border-primary/28"
          >
            {materials.map((material) => (
              <option key={material.id} value={material.id} className="bg-slate-950 text-slate-100">
                {material.name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-100/44">{copy.thickness} (mm)</span>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={thicknessMm}
              onChange={(event) => setThicknessMm(Number(event.target.value) || 0)}
              className="w-full rounded-[18px] border border-primary/12 bg-black/26 px-3 py-3 text-sm text-cyan-50 outline-none transition-colors focus:border-primary/28"
            />
          </label>

          <div className="space-y-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-100/44">{copy.mode}</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('engrave')}
                className={cn(
                  'rounded-[18px] border px-3 py-3 text-sm font-semibold transition-colors',
                  mode === 'engrave'
                    ? 'border-primary/28 bg-primary/12 text-cyan-50'
                    : 'border-primary/12 bg-black/26 text-slate-300 hover:border-primary/22',
                )}
              >
                {copy.engrave}
              </button>
              <button
                type="button"
                onClick={() => setMode('cut')}
                className={cn(
                  'rounded-[18px] border px-3 py-3 text-sm font-semibold transition-colors',
                  mode === 'cut'
                    ? 'border-primary/28 bg-primary/12 text-cyan-50'
                    : 'border-primary/12 bg-black/26 text-slate-300 hover:border-primary/22',
                )}
              >
                {copy.cut}
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-100/44">{copy.width} (mm, {copy.optional})</span>
            <input
              type="number"
              min="1"
              step="1"
              value={widthMmInput}
              onChange={(event) => setWidthMmInput(event.target.value)}
              className="w-full rounded-[18px] border border-primary/12 bg-black/26 px-3 py-3 text-sm text-cyan-50 outline-none transition-colors focus:border-primary/28"
            />
          </label>

          <label className="space-y-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-100/44">{copy.height} (mm, {copy.optional})</span>
            <input
              type="number"
              min="1"
              step="1"
              value={heightMmInput}
              onChange={(event) => setHeightMmInput(event.target.value)}
              className="w-full rounded-[18px] border border-primary/12 bg-black/26 px-3 py-3 text-sm text-cyan-50 outline-none transition-colors focus:border-primary/28"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={!machineId || !materialId || !currentSummary}
            className="inline-flex items-center justify-center gap-2 rounded-[20px] border border-primary/14 bg-black/30 px-4 py-3 text-sm font-semibold text-cyan-50 transition-colors hover:border-primary/28 disabled:opacity-45"
          >
            <Settings2 className="h-4 w-4" />
            {copy.save}
          </button>

          <button
            type="button"
            onClick={() => void handleCalculate()}
            disabled={loadingRecommendation || !machineId || !materialId}
            className="inline-flex items-center justify-center gap-2 rounded-[20px] border border-primary/18 bg-linear-to-r from-cyan-300/90 via-primary to-cyan-400/80 px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_24px_rgba(84,244,255,0.25)] transition-opacity hover:opacity-92 disabled:opacity-45"
          >
            <Flame className="h-4 w-4" />
            {loadingRecommendation ? copy.calculating : copy.calculate}
          </button>

          {savedSettingsSummary ? (
            <button
              type="button"
              onClick={handleClearSavedSettings}
              className="inline-flex items-center justify-center rounded-[20px] border border-white/10 bg-black/24 px-4 py-3 text-sm font-semibold text-slate-300 transition-colors hover:border-white/18 hover:text-slate-100"
            >
              {copy.clear}
            </button>
          ) : null}
        </div>

        <div className="rounded-[18px] border border-primary/12 bg-black/24 px-3 py-3 text-xs leading-relaxed text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-100/44">{copy.saveStatus}</div>
          <p className="mt-2 text-sm text-cyan-50">
            {statusMessage
              ? statusMessage
              : savedSettingsSummary
                ? isDirty
                  ? copy.unsavedChanges
                  : copy.savedActive
                : copy.noSaved}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-[18px] border border-primary/12 bg-black/24 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-100/44">{copy.selectedMachine}</div>
          <div className="mt-1 text-sm font-semibold text-cyan-50">{selectedMachine ? formatMachineLabel(selectedMachine) : '--'}</div>
        </div>
        <div className="rounded-[18px] border border-primary/12 bg-black/24 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-100/44">{copy.selectedMaterial}</div>
          <div className="mt-1 text-sm font-semibold text-cyan-50">{selectedMaterial ? selectedMaterial.name : '--'}</div>
        </div>
        <div className="rounded-[18px] border border-primary/12 bg-black/24 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-100/44">{copy.selectedMode}</div>
          <div className="mt-1 text-sm font-semibold text-cyan-50">{formatModeLabel(mode, language)}</div>
        </div>
      </div>

      {selectedMaterial && (
        <div className="mt-3 rounded-[18px] border border-primary/12 bg-black/24 px-3 py-3 text-xs leading-relaxed text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-100/44">
            <Layers className="h-3.5 w-3.5" />
            {copy.materialInfo}
          </div>
          <p className="mt-2">{copy.materialRange}: {selectedMaterial.thicknessRangeMm[0]}-{selectedMaterial.thicknessRangeMm[1]} mm</p>
          <p className="mt-1">{copy.note}: {selectedMaterial.note}</p>
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-[18px] border border-destructive/20 bg-destructive/10 px-3 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {recommendation && (
        <div className="mt-4 space-y-3 rounded-[22px] border border-primary/12 bg-black/24 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-[18px] border border-primary/10 bg-black/24 px-3 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100/42">{copy.speed}</div>
              <div className="mt-1 text-sm font-semibold text-cyan-50">{recommendation.settings.speedMmpm} mm/min</div>
            </div>
            <div className="rounded-[18px] border border-primary/10 bg-black/24 px-3 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100/42">{copy.power}</div>
              <div className="mt-1 text-sm font-semibold text-cyan-50">{recommendation.settings.powerPct}%</div>
            </div>
            <div className="rounded-[18px] border border-primary/10 bg-black/24 px-3 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100/42">{copy.passes}</div>
              <div className="mt-1 text-sm font-semibold text-cyan-50">{recommendation.settings.passes}</div>
            </div>
            <div className="rounded-[18px] border border-primary/10 bg-black/24 px-3 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100/42">{copy.lineInterval}</div>
              <div className="mt-1 text-sm font-semibold text-cyan-50">{recommendation.settings.lineIntervalMm} mm</div>
            </div>
          </div>

          <div className="rounded-[18px] border border-primary/10 bg-black/24 px-3 py-3 text-sm text-slate-300">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100/42">{copy.airAssist}</div>
            <div className="mt-1 font-semibold text-cyan-50">{recommendation.settings.airAssist ? copy.yes : copy.no}</div>
          </div>

          <div className="rounded-[18px] border border-primary/10 bg-black/24 px-3 py-3 text-sm text-slate-300">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100/42">{copy.estimatedTime}</div>
            <div className="mt-1 font-semibold text-cyan-50">{recommendation.estimates?.durationLabel || copy.estimatedTimeMissing}</div>
          </div>

          <div className="rounded-[18px] border border-primary/10 bg-black/24 px-3 py-3 text-sm text-slate-300">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100/42">{copy.recommendedExports}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {recommendation.exports.map((format) => (
                <span
                  key={format}
                  className="rounded-full border border-primary/14 bg-black/30 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-50"
                >
                  {format}
                </span>
              ))}
            </div>
          </div>

          {recommendation.warnings.length > 0 && (
            <div className="rounded-[18px] border border-amber-400/20 bg-amber-400/8 px-3 py-3 text-sm text-amber-100">
              {recommendation.warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}