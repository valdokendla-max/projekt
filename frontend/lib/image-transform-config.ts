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
  // If set, use the ControlNet (Canny)-guided img2img workflow instead of plain
  // img2img — locks the source image's edge structure so higher denoise can't
  // wander into an unrelated subject.
  controlNet?: {
    modelName: string
    strength: number
    cannyLowThreshold: number
    cannyHighThreshold: number
  }
}

// SD1.5 Canny ControlNet — matches the SD1.5 checkpoints used below (SDXL crashes on this AMD/DirectML setup).
const CANNY_CONTROLNET = 'control_v11p_sd15_canny_fp16.safetensors'

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
    denoise: 0.55,
    steps: 22,
    cfg: 7.0,
    comfyEnabled: true,
    controlNet: { modelName: CANNY_CONTROLNET, strength: 1.0, cannyLowThreshold: 0.3, cannyHighThreshold: 0.8 },
  },
  'tattoo-realistic': {
    checkpoint: 'dreamShaper_8.safetensors',
    denoise: 0.5,
    steps: 25,
    cfg: 7.0,
    comfyEnabled: true,
    controlNet: { modelName: CANNY_CONTROLNET, strength: 1.1, cannyLowThreshold: 0.3, cannyHighThreshold: 0.8 },
  },
  'tattoo-portrait': {
    checkpoint: 'dreamShaper_8.safetensors',
    denoise: 0.42,
    steps: 22,
    cfg: 6.0,
    comfyEnabled: true,
    controlNet: { modelName: CANNY_CONTROLNET, strength: 1.2, cannyLowThreshold: 0.3, cannyHighThreshold: 0.8 },
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
