'use client'

import { useEffect, useState } from 'react'
import {
  CHECKPOINT_LABELS,
  DEFAULT_PLAYGROUND,
  loadPlayground,
  savePlayground,
  type PlaygroundCheckpoint,
  type PlaygroundSettings,
} from '@/lib/playground-storage'

const CHECKPOINTS: PlaygroundCheckpoint[] = [
  'juggernautXI.safetensors',
  'ponyDiffusionV6XL.safetensors',
  'sd_xl_base_1.0.safetensors',
]

export function PlaygroundEditor() {
  const [settings, setSettings] = useState<PlaygroundSettings>(DEFAULT_PLAYGROUND)
  const [savedFlash, setSavedFlash] = useState(false)

  useEffect(() => {
    setSettings(loadPlayground())
  }, [])

  const handleSave = () => {
    savePlayground(settings)
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1800)
  }

  return (
    <section className="rounded-2xl border border-primary/20 bg-black/30 p-4">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-50">Loo ise</h3>
          <p className="mt-1 text-xs text-cyan-100/50">
            Kirjuta oma prompt, vajuta Salvesta. Pealehel ikoon &quot;Loo ise&quot; kasutab seda prompti.
            Saad katsetada — lisa, eemalda, muuda sõnu ja vaata kuidas tulemus muutub.
          </p>
        </div>
      </header>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/60" htmlFor="pg-prompt">
            Prompt (inglise keeles toimib paremini)
          </label>
          <textarea
            id="pg-prompt"
            value={settings.prompt}
            onChange={(e) => setSettings({ ...settings, prompt: e.target.value })}
            rows={5}
            maxLength={2000}
            placeholder="nt: beautiful sunset over mountain lake, cinematic photography, ultra realistic, 8k detail"
            className="w-full rounded-2xl border border-primary/14 bg-black/40 px-3 py-2 text-sm text-cyan-50 placeholder:text-cyan-100/30 focus:border-primary/32 focus:outline-none"
          />
          <div className="mt-1 text-right text-[10px] text-cyan-100/40">{settings.prompt.length}/2000</div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/60" htmlFor="pg-neg">
            Negative prompt (mida vältida)
          </label>
          <textarea
            id="pg-neg"
            value={settings.negativePrompt}
            onChange={(e) => setSettings({ ...settings, negativePrompt: e.target.value })}
            rows={2}
            maxLength={1000}
            className="w-full rounded-2xl border border-primary/14 bg-black/40 px-3 py-2 text-sm text-cyan-50 placeholder:text-cyan-100/30 focus:border-primary/32 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/60" htmlFor="pg-ckpt">
            Mudel
          </label>
          <select
            id="pg-ckpt"
            value={settings.checkpoint}
            onChange={(e) => setSettings({ ...settings, checkpoint: e.target.value as PlaygroundCheckpoint })}
            className="w-full rounded-2xl border border-primary/14 bg-black/40 px-3 py-2 text-sm text-cyan-50 focus:border-primary/32 focus:outline-none"
          >
            {CHECKPOINTS.map((c) => (
              <option key={c} value={c}>{CHECKPOINT_LABELS[c]}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-[11px] text-cyan-100/40">
            {settings.savedAt ? `Salvestatud: ${new Date(settings.savedAt).toLocaleString('et-EE')}` : 'Pole veel salvestatud'}
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={settings.prompt.trim().length < 3}
            className="rounded-2xl border border-primary/40 bg-primary/14 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-50 transition hover:bg-primary/24 disabled:opacity-30 disabled:hover:bg-primary/14"
          >
            {savedFlash ? '✓ Salvestatud' : 'Salvesta'}
          </button>
        </div>
      </div>
    </section>
  )
}
