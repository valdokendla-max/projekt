'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Settings2 } from 'lucide-react'
import { getClientBackendUrl } from '@/lib/backend-url'
import {
  clearSavedLaserSettings,
  readSavedLaserSettings,
  writeSavedLaserSettings,
  type StoredLaserSettings,
} from '@/lib/engraving/saved-settings-storage'
import { cn } from '@/lib/utils'

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
    loadingPanel: 'Laen laserimasinaid ja materjale...',
    loadingMachines: 'Masinate laadimine ebaõnnestus.',
    loadingMaterials: 'Materjalide laadimine ebaõnnestus.',
    title: 'Seadistusmoodul',
    description: 'Vali laserimasin, materjal, režiim ja pildi suurus.',
    badge: 'Laser setup',
    machine: 'Masina mark',
    material: 'Materjal',
    mode: 'Režiim',
    engrave: 'Graveerimine',
    cut: 'Lõikamine',
    imageSize: 'Pildi suurus',
    width: 'Laius',
    height: 'Kõrgus',
    optional: 'valikuline',
    save: 'Salvesta seadistus',
    clear: 'Eemalda salvestus',
    saveStatus: 'Salvestuse olek',
    savedActive: 'Seadistus on salvestatud ja aktiivne.',
    savedRemoved: 'Salvestatud seadistus eemaldati.',
    savedNowActive: 'Seadistus salvestati.',
    unsavedChanges: 'Muudatused pole veel salvestatud.',
    noSaved: 'Ühtegi salvestatud seadistust pole.',
    loginRequired: 'Seadistusmooduli kasutamiseks logi sisse.',
  },
  en: {
    loadingPanel: 'Loading laser machines and materials...',
    loadingMachines: 'Failed to load machines.',
    loadingMaterials: 'Failed to load materials.',
    title: 'Settings module',
    description: 'Choose a laser machine, material, mode, and image size.',
    badge: 'Laser setup',
    machine: 'Machine',
    material: 'Material',
    mode: 'Mode',
    engrave: 'Engrave',
    cut: 'Cut',
    imageSize: 'Image size',
    width: 'Width',
    height: 'Height',
    optional: 'optional',
    save: 'Save settings',
    clear: 'Remove saved preset',
    saveStatus: 'Save status',
    savedActive: 'Settings are saved and active.',
    savedRemoved: 'Saved settings removed.',
    savedNowActive: 'Settings saved.',
    unsavedChanges: 'Changes have not been saved yet.',
    noSaved: 'No saved settings.',
    loginRequired: 'Sign in to use the settings module.',
  },
} satisfies Record<UiLanguage, Record<string, string>>

const BACKEND_URL = getClientBackendUrl()

function parseOptionalMillimeters(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function formatLaserType(laserType: string) {
  switch (laserType) {
    case 'co2': return 'CO2'
    case 'infrared': return 'IR'
    default: return laserType.toUpperCase()
  }
}

function formatMachineLabel(machine: Machine) {
  return `${machine.brand} ${machine.model} (${formatLaserType(machine.laserType)}, ${machine.powerW}W)`
}

function sortMachines(machines: Machine[]) {
  const typePriority: Record<string, number> = { diode: 0, co2: 1, fiber: 2, infrared: 3 }
  return [...machines].sort((a, b) => {
    const ap = typePriority[a.laserType] ?? 9
    const bp = typePriority[b.laserType] ?? 9
    if (ap !== bp) return ap - bp
    return `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`)
  })
}

function buildSummary(args: {
  machineName: string
  materialName: string
  mode: LaserMode
  widthMm: number | null
  heightMm: number | null
}) {
  const { machineName, materialName, mode, widthMm, heightMm } = args
  const modeLabel = mode === 'engrave' ? 'Graveerimine' : 'Lõikamine'
  const sizeLabel = widthMm && heightMm
    ? `${widthMm} x ${heightMm} mm`
    : widthMm
      ? `${widthMm} x ? mm`
      : heightMm
        ? `? x ${heightMm} mm`
        : 'Suurus määramata'

  return [
    `Masin: ${machineName}`,
    `Materjal: ${materialName}`,
    `Režiim: ${modeLabel}`,
    `Pildi suurus: ${sizeLabel}`,
  ].join('\n')
}

function useBackendMachines() {
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch(`${BACKEND_URL}/api/machines`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Masinate laadimine ebaõnnestus.')
        return res.json() as Promise<Machine[]>
      })
      .then((data) => { if (!cancelled) { setMachines(sortMachines(data)); setError('') } })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Masinate laadimine ebaõnnestus.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
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
      .then(async (res) => {
        if (!res.ok) throw new Error('Materjalide laadimine ebaõnnestus.')
        return res.json() as Promise<Material[]>
      })
      .then((data) => { if (!cancelled) { setMaterials(data); setError('') } })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Materjalide laadimine ebaõnnestus.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return { materials, loading, error }
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
  const [mode, setMode] = useState<LaserMode>('engrave')
  const [widthMmInput, setWidthMmInput] = useState('')
  const [heightMmInput, setHeightMmInput] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [hasHydrated, setHasHydrated] = useState(false)
  const isRestoring = useRef(false)

  useEffect(() => {
    if (machines.length === 0 || materials.length === 0) return

    const applySettings = (settings: StoredLaserSettings | null) => {
      if (settings) {
        isRestoring.current = true
        setMachineId(machines.some(m => m.id === settings.machineId) ? settings.machineId : machines[0]?.id || '')
        setMaterialId(materials.some(m => m.id === settings.materialId) ? settings.materialId : materials[0]?.id || '')
        setMode(settings.mode)
        setWidthMmInput(settings.widthMm ? String(settings.widthMm) : '')
        setHeightMmInput(settings.heightMm ? String(settings.heightMm) : '')
        onSavedSettingsSummaryChange?.(settings.summary || '')
        onSavedSettingsChange?.(settings)
      } else {
        onSavedSettingsSummaryChange?.('')
        onSavedSettingsChange?.(null)
      }
      setHasHydrated(true)
    }

    if (authToken) {
      fetch('/api/user/laser-settings', {
        headers: { Authorization: `Bearer ${authToken}` },
        cache: 'no-store',
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: StoredLaserSettings | null) => {
          const settings = data && typeof data === 'object' && 'machineId' in data ? data : null
          if (settings) writeSavedLaserSettings(settings)
          applySettings(settings ?? readSavedLaserSettings())
        })
        .catch(() => applySettings(readSavedLaserSettings()))
    } else {
      applySettings(readSavedLaserSettings())
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken, machines.length, materials.length])

  useEffect(() => {
    if (!machineId && machines.length > 0) setMachineId(machines[0].id)
  }, [machines, machineId])

  useEffect(() => {
    if (!materialId && materials.length > 0) setMaterialId(materials[0].id)
  }, [materials, materialId])

  const selectedMachine = useMemo(() => machines.find(m => m.id === machineId) || null, [machines, machineId])
  const selectedMaterial = useMemo(() => materials.find(m => m.id === materialId) || null, [materials, materialId])
  const widthMm = useMemo(() => parseOptionalMillimeters(widthMmInput), [widthMmInput])
  const heightMm = useMemo(() => parseOptionalMillimeters(heightMmInput), [heightMmInput])

  const currentSummary = useMemo(() => {
    if (!selectedMachine || !selectedMaterial) return ''
    return buildSummary({
      machineName: formatMachineLabel(selectedMachine),
      materialName: selectedMaterial.name,
      mode,
      widthMm,
      heightMm,
    })
  }, [selectedMachine, selectedMaterial, mode, widthMm, heightMm])

  const isDirty = hasHydrated && currentSummary !== String(savedSettingsSummary || '')

  useEffect(() => {
    if (isRestoring.current) { isRestoring.current = false; return }
    setStatusMessage('')
  }, [machineId, materialId, mode, widthMmInput, heightMmInput])

  const handleSave = () => {
    if (!selectedMachine || !selectedMaterial || !currentSummary) return

    const next: StoredLaserSettings = {
      machineId,
      materialId,
      thicknessMm: 3,
      mode,
      widthMm,
      heightMm,
      recommendation: null,
      summary: currentSummary,
      savedAt: new Date().toISOString(),
      machineName: formatMachineLabel(selectedMachine),
      materialName: selectedMaterial.name,
    }

    writeSavedLaserSettings(next)
    onSavedSettingsSummaryChange?.(currentSummary)
    onSavedSettingsChange?.(next)
    setStatusMessage(copy.savedNowActive)

    if (authToken) {
      fetch('/api/user/laser-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(next),
      }).catch(() => {})
    }
  }

  const handleClear = () => {
    clearSavedLaserSettings()
    onSavedSettingsSummaryChange?.('')
    onSavedSettingsChange?.(null)
    setStatusMessage(copy.savedRemoved)

    if (authToken) {
      fetch('/api/user/laser-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(null),
      }).catch(() => {})
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
        <p className="text-sm text-red-400">{machinesError || materialsError}</p>
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

      <div className="mt-4 grid gap-4">
        <label className="space-y-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-100/44">{copy.machine}</span>
          <select
            value={machineId}
            onChange={(e) => setMachineId(e.target.value)}
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
            onChange={(e) => setMaterialId(e.target.value)}
            className="w-full rounded-[18px] border border-primary/12 bg-black/26 px-3 py-3 text-sm text-cyan-50 outline-none transition-colors focus:border-primary/28"
          >
            {materials.map((material) => (
              <option key={material.id} value={material.id} className="bg-slate-950 text-slate-100">
                {material.name}
              </option>
            ))}
          </select>
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

        <div className="space-y-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-100/44">
            {copy.imageSize} (mm, {copy.optional})
          </span>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min="1"
              step="1"
              placeholder={copy.width}
              value={widthMmInput}
              onChange={(e) => setWidthMmInput(e.target.value)}
              className="w-full rounded-[18px] border border-primary/12 bg-black/26 px-3 py-3 text-sm text-cyan-50 placeholder-slate-500 outline-none transition-colors focus:border-primary/28"
            />
            <input
              type="number"
              min="1"
              step="1"
              placeholder={copy.height}
              value={heightMmInput}
              onChange={(e) => setHeightMmInput(e.target.value)}
              className="w-full rounded-[18px] border border-primary/12 bg-black/26 px-3 py-3 text-sm text-cyan-50 placeholder-slate-500 outline-none transition-colors focus:border-primary/28"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={!machineId || !materialId}
            className="inline-flex items-center justify-center gap-2 rounded-[20px] border border-primary/18 bg-linear-to-r from-cyan-300/90 via-primary to-cyan-400/80 px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_24px_rgba(84,244,255,0.25)] transition-opacity hover:opacity-92 disabled:opacity-45"
          >
            <Settings2 className="h-4 w-4" />
            {copy.save}
          </button>

          {savedSettingsSummary ? (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center justify-center rounded-[20px] border border-white/10 bg-black/24 px-4 py-3 text-sm font-semibold text-slate-300 transition-colors hover:border-white/18 hover:text-slate-100"
            >
              {copy.clear}
            </button>
          ) : null}
        </div>

        <div className="rounded-[18px] border border-primary/12 bg-black/24 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-100/44">{copy.saveStatus}</div>
          <p className="mt-2 text-sm text-cyan-50">
            {statusMessage
              ? statusMessage
              : savedSettingsSummary
                ? isDirty ? copy.unsavedChanges : copy.savedActive
                : copy.noSaved}
          </p>
        </div>
      </div>
    </section>
  )
}
