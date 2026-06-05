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
  // Photoreal cleanup — low denoise to preserve composition, Juggernaut for photo quality
  enhance: {
    checkpoint: 'juggernautXI.safetensors',
    denoise: 0.35,
    steps: 25,
    cfg: 6.5,
    comfyEnabled: true,
  },
  // Sculptural transform — high denoise (strong style change), Juggernaut for realism
  'relief-3d': {
    checkpoint: 'juggernautXI.safetensors',
    denoise: 0.78,
    steps: 28,
    cfg: 7.0,
    comfyEnabled: true,
  },
  // Stylized tattoo flash — Pony excels at illustration/tattoo style
  'tattoo-realistic': {
    checkpoint: 'ponyDiffusionV6XL.safetensors',
    denoise: 0.72,
    steps: 28,
    cfg: 7.0,
    comfyEnabled: true,
  },
  // Identity preservation needed — pure img2img won't keep faces; needs IPAdapter/InstantID later
  'tattoo-portrait': {
    checkpoint: 'juggernautXI.safetensors',
    denoise: 0.45,
    steps: 25,
    cfg: 6.0,
    comfyEnabled: false, // OpenAI for now until InstantID added
  },
  // Needs Canny ControlNet for clean vector lines; SDXL alone produces sketchy output
  'line-art': {
    checkpoint: 'ponyDiffusionV6XL.safetensors',
    denoise: 0.85,
    steps: 25,
    cfg: 7.5,
    comfyEnabled: false, // OpenAI for now until ControlNet added
  },
  // Needs ControlNet for text preservation; SDXL garbles letters
  'text-logo': {
    checkpoint: 'juggernautXI.safetensors',
    denoise: 0.4,
    steps: 25,
    cfg: 7.0,
    comfyEnabled: false, // OpenAI for now until ControlNet added
  },
}
