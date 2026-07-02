// Per-variant ComfyUI img2img configuration.
// denoise: 0..1 — lower preserves source structure more, higher follows prompt more.
// checkpoint: which model file (must exist in ComfyUI models/checkpoints/).

import type { ImageTransformVariant } from './image-prompts'

export interface VariantConfig {
  checkpoint: string
  denoise: number
  steps: number
  cfg: number
  // If true, run via ComfyUI when COMFYUI_BASE_URL is set; otherwise OpenAI.
  comfyEnabled: boolean
}

export const VARIANT_CONFIG: Record<ImageTransformVariant, VariantConfig> = {
  // SD 1.5 — works with ZLUDA on AMD GPU; SDXL models crash on ZLUDA
  enhance: {
    checkpoint: 'dreamShaper_8.safetensors',
    denoise: 0.35,
    steps: 20,
    cfg: 6.5,
    comfyEnabled: true,
  },
  'relief-3d': {
    checkpoint: 'dreamShaper_8.safetensors',
    denoise: 0.75,
    steps: 22,
    cfg: 7.0,
    comfyEnabled: true,
  },
  'tattoo-realistic': {
    checkpoint: 'dreamShaper_8.safetensors',
    denoise: 0.70,
    steps: 22,
    cfg: 7.0,
    comfyEnabled: true,
  },
  'tattoo-portrait': {
    checkpoint: 'dreamShaper_8.safetensors',
    denoise: 0.40,
    steps: 20,
    cfg: 6.0,
    comfyEnabled: true,
  },
  'line-art': {
    checkpoint: 'dreamShaper_8.safetensors',
    denoise: 0.38,
    steps: 18,
    cfg: 6.5,
    comfyEnabled: true,
  },
  'text-logo': {
    checkpoint: 'dreamShaper_8.safetensors',
    denoise: 0.40,
    steps: 20,
    cfg: 7.0,
    comfyEnabled: true,
  },
}
