// Workflow JSON builders for ComfyUI.

const SDXL_CHECKPOINT = 'sd_xl_base_1.0.safetensors'

const SDXL_DEFAULTS = {
  steps: 25,
  cfg: 7.5,
  sampler: 'euler',
  scheduler: 'normal',
  width: 1024,
  height: 1024,
}

export interface LoraEntry {
  name: string // filename in models/loras/
  strengthModel?: number // 0..1 typical
  strengthClip?: number // 0..1 typical
}

export interface Txt2ImgWorkflowParams {
  prompt: string
  negativePrompt?: string
  seed?: number
  steps?: number
  cfg?: number
  width?: number
  height?: number
  filenamePrefix?: string
  checkpoint?: string
  loras?: LoraEntry[]
}

export function buildTxt2ImgWorkflow(params: Txt2ImgWorkflowParams): Record<string, unknown> {
  const seed = params.seed ?? Math.floor(Math.random() * 1_000_000_000)
  const loras = params.loras ?? []
  const wf: Record<string, unknown> = {
    '1': {
      class_type: 'CheckpointLoaderSimple',
      inputs: { ckpt_name: params.checkpoint ?? SDXL_CHECKPOINT },
    },
  }

  // Chain LoraLoader nodes: each consumes prev model+clip refs.
  let modelRef: [string, number] = ['1', 0]
  let clipRef: [string, number] = ['1', 1]
  loras.forEach((lora, i) => {
    const id = `lora_${i}`
    wf[id] = {
      class_type: 'LoraLoader',
      inputs: {
        lora_name: lora.name,
        strength_model: lora.strengthModel ?? 1.0,
        strength_clip: lora.strengthClip ?? 1.0,
        model: modelRef,
        clip: clipRef,
      },
    }
    modelRef = [id, 0]
    clipRef = [id, 1]
  })

  wf['2'] = {
    class_type: 'CLIPTextEncode',
    inputs: { text: params.prompt, clip: clipRef },
  }
  wf['3'] = {
    class_type: 'CLIPTextEncode',
    inputs: { text: params.negativePrompt ?? '', clip: clipRef },
  }
  wf['4'] = {
    class_type: 'EmptyLatentImage',
    inputs: {
      width: params.width ?? SDXL_DEFAULTS.width,
      height: params.height ?? SDXL_DEFAULTS.height,
      batch_size: 1,
    },
  }
  wf['5'] = {
    class_type: 'KSampler',
    inputs: {
      model: modelRef,
      positive: ['2', 0],
      negative: ['3', 0],
      latent_image: ['4', 0],
      seed,
      steps: params.steps ?? SDXL_DEFAULTS.steps,
      cfg: params.cfg ?? SDXL_DEFAULTS.cfg,
      sampler_name: SDXL_DEFAULTS.sampler,
      scheduler: SDXL_DEFAULTS.scheduler,
      denoise: 1.0,
    },
  }
  wf['6'] = {
    class_type: 'VAEDecode',
    inputs: { samples: ['5', 0], vae: ['1', 2] },
  }
  wf['7'] = {
    class_type: 'SaveImage',
    inputs: {
      images: ['6', 0],
      filename_prefix: params.filenamePrefix ?? 'output',
    },
  }
  return wf
}

export interface Img2ImgWorkflowParams {
  prompt: string
  negativePrompt?: string
  sourceImageName: string // result of ComfyClient.uploadImage().name
  denoise?: number // 0..1, lower = more like source, higher = more like prompt
  seed?: number
  steps?: number
  cfg?: number
  filenamePrefix?: string
  checkpoint?: string
}

export function buildImg2ImgWorkflow(params: Img2ImgWorkflowParams): Record<string, unknown> {
  const seed = params.seed ?? Math.floor(Math.random() * 1_000_000_000)
  return {
    '1': {
      class_type: 'CheckpointLoaderSimple',
      inputs: { ckpt_name: params.checkpoint ?? SDXL_CHECKPOINT },
    },
    '2': {
      class_type: 'CLIPTextEncode',
      inputs: { text: params.prompt, clip: ['1', 1] },
    },
    '3': {
      class_type: 'CLIPTextEncode',
      inputs: { text: params.negativePrompt ?? '', clip: ['1', 1] },
    },
    '4': {
      class_type: 'LoadImage',
      inputs: { image: params.sourceImageName },
    },
    '5': {
      class_type: 'VAEEncode',
      inputs: { pixels: ['4', 0], vae: ['1', 2] },
    },
    '6': {
      class_type: 'KSampler',
      inputs: {
        model: ['1', 0],
        positive: ['2', 0],
        negative: ['3', 0],
        latent_image: ['5', 0],
        seed,
        steps: params.steps ?? SDXL_DEFAULTS.steps,
        cfg: params.cfg ?? SDXL_DEFAULTS.cfg,
        sampler_name: SDXL_DEFAULTS.sampler,
        scheduler: SDXL_DEFAULTS.scheduler,
        denoise: params.denoise ?? 0.65,
      },
    },
    '7': {
      class_type: 'VAEDecode',
      inputs: { samples: ['6', 0], vae: ['1', 2] },
    },
    '8': {
      class_type: 'SaveImage',
      inputs: {
        images: ['7', 0],
        filename_prefix: params.filenamePrefix ?? 'img2img',
      },
    },
  }
}
