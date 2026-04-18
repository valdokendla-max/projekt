'use client'

import { useEffect, useMemo, useState } from 'react'
import { Flame, Layers, Settings2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type LaserMode = 'engrave' | 'cut'

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
  exports: string[]
  warnings: string[]
}

interface LaserSettingsPanelProps {
  className?: string
}

const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000').replace(/\/$/, '')

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

function formatModeLabel(mode: LaserMode) {
  return mode === 'engrave' ? 'Graveerimine' : 'Lõikamine'
}

function formatMachineLabel(machine: Machine) {
  return `${machine.brand} ${machine.model} (${formatLaserType(machine.laserType)}, ${machine.powerW}W)`
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
        if (cancelled) {
          return
        }

        setMachines(sortMachines(data))
        setError('')
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Masinate laadimine ebaõnnestus.')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
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
        if (cancelled) {
          return
        }

        setMaterials(data)
        setError('')
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Materjalide laadimine ebaõnnestus.')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
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

export function LaserSettingsPanel({ className }: LaserSettingsPanelProps) {
  const { machines, loading: loadingMachines, error: machinesError } = useBackendMachines()
  const { materials, loading: loadingMaterials, error: materialsError } = useBackendMaterials()

  const [machineId, setMachineId] = useState('')
  const [materialId, setMaterialId] = useState('')
  const [thicknessMm, setThicknessMm] = useState(3)
  const [mode, setMode] = useState<LaserMode>('engrave')
  const [loadingRecommendation, setLoadingRecommendation] = useState(false)
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null)
  const [error, setError] = useState('')

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
        },
        body: JSON.stringify({
          machineId,
          materialId,
          thicknessMm,
          mode,
        }),
      })
      const data = (await response.json().catch(() => null)) as Recommendation | { error?: string } | null

      if (!response.ok) {
        throw new Error(data && 'error' in data && data.error ? data.error : 'Seadete arvutamine ebaõnnestus.')
      }

      if (!isRecommendation(data)) {
        throw new Error('Soovituse vastus puudub.')
      }

      setRecommendation(data)
    } catch (requestError) {
      setRecommendation(null)
      setError(requestError instanceof Error ? requestError.message : 'Seadete arvutamine ebaõnnestus.')
    } finally {
      setLoadingRecommendation(false)
    }
  }

  if (loadingMachines || loadingMaterials) {
    return (
      <section className={cn('hud-panel p-4 md:p-5', className)}>
        <p className="text-sm text-slate-300">Laen laserimasinaid ja materjale...</p>
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
            Seadistusmoodul
          </span>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            Vali laserimasin, materjal ja paksus ning arvuta soovituslikud seaded.
          </p>
        </div>
        <div className="rounded-full border border-primary/14 bg-black/30 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100/60">
          Laser setup
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <label className="space-y-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-100/44">Laserimasin</span>
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
          <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-100/44">Materjal</span>
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
            <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-100/44">Paksus (mm)</span>
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
            <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-100/44">Režiim</span>
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
                Graveerimine
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
                Lõikamine
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleCalculate()}
          disabled={loadingRecommendation || !machineId || !materialId}
          className="inline-flex items-center justify-center gap-2 rounded-[20px] border border-primary/18 bg-linear-to-r from-cyan-300/90 via-primary to-cyan-400/80 px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_24px_rgba(84,244,255,0.25)] transition-opacity hover:opacity-92 disabled:opacity-45"
        >
          <Flame className="h-4 w-4" />
          {loadingRecommendation ? 'Arvutan...' : 'Arvuta seaded'}
        </button>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-[18px] border border-primary/12 bg-black/24 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-100/44">Valitud masin</div>
          <div className="mt-1 text-sm font-semibold text-cyan-50">{selectedMachine ? formatMachineLabel(selectedMachine) : '--'}</div>
        </div>
        <div className="rounded-[18px] border border-primary/12 bg-black/24 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-100/44">Materjal</div>
          <div className="mt-1 text-sm font-semibold text-cyan-50">{selectedMaterial ? selectedMaterial.name : '--'}</div>
        </div>
        <div className="rounded-[18px] border border-primary/12 bg-black/24 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-100/44">Režiim</div>
          <div className="mt-1 text-sm font-semibold text-cyan-50">{formatModeLabel(mode)}</div>
        </div>
      </div>

      {selectedMaterial && (
        <div className="mt-3 rounded-[18px] border border-primary/12 bg-black/24 px-3 py-3 text-xs leading-relaxed text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-100/44">
            <Layers className="h-3.5 w-3.5" />
            Materjali info
          </div>
          <p className="mt-2">Tavavahemik: {selectedMaterial.thicknessRangeMm[0]}-{selectedMaterial.thicknessRangeMm[1]} mm</p>
          <p className="mt-1">Märkus: {selectedMaterial.note}</p>
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
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100/42">Kiirus</div>
              <div className="mt-1 text-sm font-semibold text-cyan-50">{recommendation.settings.speedMmpm} mm/min</div>
            </div>
            <div className="rounded-[18px] border border-primary/10 bg-black/24 px-3 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100/42">Võimsus</div>
              <div className="mt-1 text-sm font-semibold text-cyan-50">{recommendation.settings.powerPct}%</div>
            </div>
            <div className="rounded-[18px] border border-primary/10 bg-black/24 px-3 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100/42">Passid</div>
              <div className="mt-1 text-sm font-semibold text-cyan-50">{recommendation.settings.passes}</div>
            </div>
            <div className="rounded-[18px] border border-primary/10 bg-black/24 px-3 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100/42">Joone vahe</div>
              <div className="mt-1 text-sm font-semibold text-cyan-50">{recommendation.settings.lineIntervalMm} mm</div>
            </div>
          </div>

          <div className="rounded-[18px] border border-primary/10 bg-black/24 px-3 py-3 text-sm text-slate-300">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100/42">Air assist</div>
            <div className="mt-1 font-semibold text-cyan-50">{recommendation.settings.airAssist ? 'Jah' : 'Ei'}</div>
          </div>

          <div className="rounded-[18px] border border-primary/10 bg-black/24 px-3 py-3 text-sm text-slate-300">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100/42">Soovituslikud ekspordid</div>
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