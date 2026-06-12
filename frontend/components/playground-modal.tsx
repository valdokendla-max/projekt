'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  CHECKPOINT_LABELS,
  DEFAULT_PLAYGROUND,
  loadPlayground,
  savePlayground,
  type PlaygroundCheckpoint,
  type PlaygroundSettings,
} from '@/lib/playground-storage'
import type { Language } from '@/lib/image-prompts'

interface PlaygroundModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (settings: PlaygroundSettings) => void
  language: Language
}

const CHECKPOINTS: PlaygroundCheckpoint[] = [
  'cyberrealisticPony_v18.safetensors',
  'juggernautXI.safetensors',
  'ponyDiffusionV6XL.safetensors',
  'sd_xl_base_1.0.safetensors',
]

const COPY = {
  est: {
    title: 'Loo pilt oma prompt\'iga',
    description: 'Kirjuta mida tahad näha. Inglise keeles toimib paremini.',
    promptLabel: 'Prompt — mida pildil olla peab',
    promptPlaceholder: 'nt: beautiful blonde woman in red dress, sunset beach, photorealistic, masterpiece',
    negLabel: 'Negative prompt — mida vältida (valikuline)',
    checkpointLabel: 'Mudel',
    saveAndGenerate: 'Salvesta + genereeri',
    generate: 'Genereeri',
    cancel: 'Tühista',
  },
  eng: {
    title: 'Create image with your prompt',
    description: 'Write what you want to see. English works best.',
    promptLabel: 'Prompt — what to show',
    promptPlaceholder: 'e.g. beautiful blonde woman in red dress, sunset beach, photorealistic, masterpiece',
    negLabel: 'Negative prompt — what to avoid (optional)',
    checkpointLabel: 'Model',
    saveAndGenerate: 'Save + generate',
    generate: 'Generate',
    cancel: 'Cancel',
  },
} as const

export function PlaygroundModal({ open, onOpenChange, onSubmit, language }: PlaygroundModalProps) {
  const copy = COPY[language]
  const [settings, setSettings] = useState<PlaygroundSettings>(DEFAULT_PLAYGROUND)

  useEffect(() => {
    if (open) setSettings(loadPlayground())
  }, [open])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (settings.prompt.trim().length < 3) return
    savePlayground(settings) // jätkuvalt salvestab et järgmisel korral oleks olemas
    onSubmit(settings)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <p className="text-sm text-cyan-100/60">{copy.description}</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/60" htmlFor="pg-modal-prompt">
              {copy.promptLabel}
            </label>
            <textarea
              id="pg-modal-prompt"
              value={settings.prompt}
              onChange={(e) => setSettings({ ...settings, prompt: e.target.value })}
              rows={5}
              maxLength={2000}
              placeholder={copy.promptPlaceholder}
              className="w-full rounded-2xl border border-primary/14 bg-black/40 px-3 py-2 text-sm text-cyan-50 placeholder:text-cyan-100/30 focus:border-primary/32 focus:outline-none"
              required
            />
            <div className="mt-1 text-right text-[10px] text-cyan-100/40">{settings.prompt.length}/2000</div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/60" htmlFor="pg-modal-neg">
              {copy.negLabel}
            </label>
            <textarea
              id="pg-modal-neg"
              value={settings.negativePrompt}
              onChange={(e) => setSettings({ ...settings, negativePrompt: e.target.value })}
              rows={2}
              maxLength={1000}
              className="w-full rounded-2xl border border-primary/14 bg-black/40 px-3 py-2 text-sm text-cyan-50 focus:border-primary/32 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/60" htmlFor="pg-modal-ckpt">
              {copy.checkpointLabel}
            </label>
            <select
              id="pg-modal-ckpt"
              value={settings.checkpoint}
              onChange={(e) => setSettings({ ...settings, checkpoint: e.target.value as PlaygroundCheckpoint })}
              className="w-full rounded-2xl border border-primary/14 bg-black/40 px-3 py-2 text-sm text-cyan-50 focus:border-primary/32 focus:outline-none"
            >
              {CHECKPOINTS.map((c) => (
                <option key={c} value={c}>{CHECKPOINT_LABELS[c]}</option>
              ))}
            </select>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{copy.cancel}</Button>
            <Button type="submit" disabled={settings.prompt.trim().length < 3}>{copy.generate}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
