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

// -----------------------------------------------------------------------------
// Face Detailer wrapper — runs a second pass on detected faces at higher
// effective resolution, fixes eyes/skin without re-rolling the whole image.
// Plugs in after VAEDecode (node '6' in txt2img / '7' in img2img) and before
// SaveImage. Caller passes the existing workflow and we mutate it in place.
// -----------------------------------------------------------------------------

export interface FaceDetailerOptions {
  imageNode: [string, number] // upstream image source, e.g. ['6', 0] for txt2img
  modelNode: [string, number] // KSampler model ref (after LoRAs)
  positiveNode: [string, number]
  negativeNode: [string, number]
  vaeNode: [string, number]
  clipNode: [string, number]
  guideSize?: number // resize detected face crop to this size before re-sample
  steps?: number
  cfg?: number
  denoise?: number // 0.5 is the standard "fix only" value
  bboxModel?: string // YOLO bbox model filename
}

export function appendFaceDetailer(
  wf: Record<string, unknown>,
  options: FaceDetailerOptions,
  nodePrefix: string = 'fd',
): [string, number] {
  // Returns the output ImageRef of the Face Detailer node, so caller can wire SaveImage to it.
  wf[`${nodePrefix}_bbox_loader`] = {
    class_type: 'UltralyticsDetectorProvider',
    inputs: { model_name: options.bboxModel ?? 'bbox/face_yolov8m.pt' },
  }
  wf[`${nodePrefix}_detailer`] = {
    class_type: 'FaceDetailer',
    inputs: {
      image: options.imageNode,
      model: options.modelNode,
      clip: options.clipNode,
      vae: options.vaeNode,
      positive: options.positiveNode,
      negative: options.negativeNode,
      bbox_detector: [`${nodePrefix}_bbox_loader`, 0],
      // Defaults tuned for SDXL face fix
      guide_size: options.guideSize ?? 512,
      guide_size_for: true,
      max_size: 1024,
      seed: Math.floor(Math.random() * 1_000_000_000),
      steps: options.steps ?? 20,
      cfg: options.cfg ?? 7.0,
      sampler_name: 'dpmpp_2m',
      scheduler: 'karras',
      denoise: options.denoise ?? 0.5,
      feather: 5,
      noise_mask: true,
      force_inpaint: true,
      bbox_threshold: 0.50,
      bbox_dilation: 10,
      bbox_crop_factor: 3.0,
      sam_detection_hint: 'center-1',
      sam_dilation: 0,
      sam_threshold: 0.93,
      sam_bbox_expansion: 0,
      sam_mask_hint_threshold: 0.7,
      sam_mask_hint_use_negative: 'False',
      drop_size: 10,
      wildcard: '',
      cycle: 1,
      inpaint_model: false,
      noise_mask_feather: 20,
    },
  }
  return [`${nodePrefix}_detailer`, 0]
}

// -----------------------------------------------------------------------------
// Txt2Img + Face Detailer convenience builder. Generates image then auto-fixes face.
// -----------------------------------------------------------------------------
export function buildTxt2ImgWithFaceFixWorkflow(params: Txt2ImgWorkflowParams): Record<string, unknown> {
  const wf = buildTxt2ImgWorkflow(params)
  // Käivitame 2 detektorit järjest: 1) face_yolov8m -> näo+silmade fix, 2) hand_yolov8s -> käte fix.
  const loras = params.loras ?? []
  const lastLoraId = loras.length > 0 ? `lora_${loras.length - 1}` : null
  const modelRef: [string, number] = lastLoraId ? [lastLoraId, 0] : ['1', 0]
  const clipRef: [string, number] = lastLoraId ? [lastLoraId, 1] : ['1', 1]
  const faceOut = appendFaceDetailer(wf, {
    imageNode: ['6', 0], // VAEDecode output
    modelNode: modelRef,
    clipNode: clipRef,
    vaeNode: ['1', 2],
    positiveNode: ['2', 0],
    negativeNode: ['3', 0],
    bboxModel: 'bbox/face_yolov8m.pt',
  }, 'face')
  // Käte fix jätkab näo-fix väljundi peal
  const handsOut = appendFaceDetailer(wf, {
    imageNode: faceOut,
    modelNode: modelRef,
    clipNode: clipRef,
    vaeNode: ['1', 2],
    positiveNode: ['2', 0],
    negativeNode: ['3', 0],
    guideSize: 384, // käed väiksemad kui nägu
    denoise: 0.4, // veidi õrnem, kuna käed on tundlikud
    bboxModel: 'bbox/hand_yolov8s.pt',
  }, 'hand')
  ;(wf['7'] as { inputs: { images: [string, number] } }).inputs.images = handsOut
  return wf
}

export interface LineArtWorkflowParams {
  sourceImageName: string
  filenamePrefix?: string
  resolution?: number
  lowThreshold?: number
  highThreshold?: number
}

export function buildLineArtWorkflow(params: LineArtWorkflowParams): Record<string, unknown> {
  return {
    '1': { class_type: 'LoadImage', inputs: { image: params.sourceImageName } },
    '2': { class_type: 'CannyEdgePreprocessor', inputs: { image: ['1', 0], low_threshold: params.lowThreshold ?? 120, high_threshold: params.highThreshold ?? 240, resolution: params.resolution ?? 512 } },
    '3': { class_type: 'ImageInvert', inputs: { image: ['2', 0] } },
    '4': { class_type: 'SaveImage', inputs: { images: ['3', 0], filename_prefix: params.filenamePrefix ?? 'line-art' } },
  }
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
