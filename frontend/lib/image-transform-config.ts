// Per-variant ComfyUI img2img configuration.
// denoise: 0..1 — lower preserves source structure more, higher follows prompt more.
// checkpoint: which model file (must exist in ComfyUI models/checkpoints/).

import type { ImageTransformVariant } from './image-prompts'
import type { ControlNetPreprocessor } from './comfyui-workflows'

export interface VariantConfig {
  checkpoint: string
  denoise: number
  steps: number
  cfg: number
  // If true, run via ComfyUI when COMFYUI_BASE_URL is set; otherwise OpenAI.
  comfyEnabled: boolean
  // If set, use the ControlNet-guided img2img workflow instead of plain img2img
  // — locks the source image's structure (edges/depth/pose) so higher denoise
  // can't wander into an unrelated subject.
  controlNet?: {
    modelName: string
    preprocessor: ControlNetPreprocessor
    strength: number
    cannyLowThreshold?: number
    cannyHighThreshold?: number
  }
}

// Quality/speed tiers — trade steps (and slightly cfg) for generation time.
// "balanced" matches each variant's tuned default (VariantConfig.steps/cfg below).
export type QualityTier = 'fast' | 'balanced' | 'high'

const QUALITY_STEP_MULTIPLIER: Record<QualityTier, number> = {
  fast: 0.6,
  balanced: 1.0,
  high: 1.4,
}
const QUALITY_CFG_DELTA: Record<QualityTier, number> = {
  fast: -0.5,
  balanced: 0,
  high: 0.5,
}

export function resolveVariantConfig(base: VariantConfig, quality: QualityTier): VariantConfig {
  if (quality === 'balanced') return base
  return {
    ...base,
    steps: Math.max(4, Math.round(base.steps * QUALITY_STEP_MULTIPLIER[quality])),
    cfg: Math.max(1, Math.round((base.cfg + QUALITY_CFG_DELTA[quality]) * 10) / 10),
  }
}

// SD1.5 Canny ControlNet — matches the SD1.5 checkpoints used below (SDXL crashes on this AMD/DirectML setup).
// NB: control_v11f1p_sd15_depth_fp16.safetensors is also downloaded in models/controlnet/,
// but no depth preprocessor currently works on this AMD ZLUDA/DirectML setup (see relief-3d comment below).
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
    // NB: Depth ControlNet oleks siin kontseptuaalselt sobivam (3D-reljeef =
    // sügavusstruktuur), aga kõik testitud depth-preprotsessorid (MiDaS,
    // DepthAnythingV2) ebaõnnestuvad sellel AMD ZLUDA/DirectML seadistusel —
    // MiDaS nõuab torch>=2.6 (meil 2.4.1), DepthAnythingV2 annab
    // "privateuseoneFloatType" seadme-sobimatuse vea. OpenPose (ONNX-põhine)
    // töötab küll, aga pole reljeefi jaoks asjakohane. Jäädud Canny juurde.
    controlNet: { modelName: CANNY_CONTROLNET, preprocessor: 'canny', strength: 1.0, cannyLowThreshold: 0.3, cannyHighThreshold: 0.8 },
  },
  'tattoo-realistic': {
    checkpoint: 'dreamShaper_8.safetensors',
    denoise: 0.5,
    steps: 25,
    cfg: 7.0,
    comfyEnabled: true,
    controlNet: { modelName: CANNY_CONTROLNET, preprocessor: 'canny', strength: 1.1, cannyLowThreshold: 0.3, cannyHighThreshold: 0.8 },
  },
  'tattoo-portrait': {
    checkpoint: 'dreamShaper_8.safetensors',
    denoise: 0.42,
    steps: 22,
    cfg: 6.0,
    comfyEnabled: true,
    controlNet: { modelName: CANNY_CONTROLNET, preprocessor: 'canny', strength: 1.2, cannyLowThreshold: 0.3, cannyHighThreshold: 0.8 },
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
