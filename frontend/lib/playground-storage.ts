// LocalStorage interface for the "Loo ise" prompt playground.
// User writes a prompt template in Knowledge panel -> saves -> uses it via
// the homepage "Loo ise" icon. Iterating quickly is the point.

export type PlaygroundCheckpoint =
  | 'juggernautXI.safetensors'
  | 'ponyDiffusionV6XL.safetensors'
  | 'sd_xl_base_1.0.safetensors'

export interface PlaygroundSettings {
  prompt: string
  negativePrompt: string
  checkpoint: PlaygroundCheckpoint
  savedAt: string
}

const KEY = 'vk_playground_settings'

export const DEFAULT_PLAYGROUND: PlaygroundSettings = {
  prompt: '',
  negativePrompt: 'low quality, blurry, bad anatomy, watermark, text, logo',
  checkpoint: 'juggernautXI.safetensors',
  savedAt: '',
}

export const CHECKPOINT_LABELS: Record<PlaygroundCheckpoint, string> = {
  'juggernautXI.safetensors': 'Juggernaut XI — fotorealism',
  'ponyDiffusionV6XL.safetensors': 'Pony Diffusion V6 — illustratsioon / tattoo',
  'sd_xl_base_1.0.safetensors': 'SDXL Base — neutraalne',
}

export function loadPlayground(): PlaygroundSettings {
  if (typeof window === 'undefined') return DEFAULT_PLAYGROUND
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return DEFAULT_PLAYGROUND
    const parsed = JSON.parse(raw) as Partial<PlaygroundSettings>
    return {
      prompt: parsed.prompt ?? '',
      negativePrompt: parsed.negativePrompt ?? DEFAULT_PLAYGROUND.negativePrompt,
      checkpoint: parsed.checkpoint ?? DEFAULT_PLAYGROUND.checkpoint,
      savedAt: parsed.savedAt ?? '',
    }
  } catch {
    return DEFAULT_PLAYGROUND
  }
}

export function savePlayground(s: PlaygroundSettings) {
  if (typeof window === 'undefined') return
  const next: PlaygroundSettings = { ...s, savedAt: new Date().toISOString() }
  window.localStorage.setItem(KEY, JSON.stringify(next))
}
