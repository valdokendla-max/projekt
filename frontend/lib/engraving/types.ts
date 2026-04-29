export type SourceKind = 'generated-text' | 'uploaded-image'
export type OperationMode = 'engrave' | 'cut'
export type ImageClass = 'photo' | 'logo' | 'line-art' | 'text-mark' | 'mixed'
export type EngravingMode = 'threshold' | 'dither' | 'vector'
export type BackgroundComplexity = 'low' | 'medium' | 'high'
export type DetailDensity = 'low' | 'medium' | 'high'
export type DitherAlgorithm = 'floyd-steinberg' | 'jarvis-judice-ninke' | 'stucki' | 'atkinson'
export type SimulationVerdict = 'pass' | 'warn' | 'fail'

export interface EngravingPreset {
  summary: string
  machineLabel: string
  laserType: string
  powerW: number
  materialLabel: string
  thicknessMm: number
  operationMode: OperationMode
  materialNote: string
  settings: {
    speedMmpm: number
    powerPct: number
    passes: number
    lineIntervalMm: number
    airAssist: boolean
  }
  recommendedExports: string[]
  warnings: string[]
}

export interface PromptOptimizationInput {
  userPrompt: string
  preset?: EngravingPreset | null
}

export interface OptimizedPrompt {
  sourcePrompt: string
  positivePrompt: string
  negativePrompt: string
  systemConstraints: string[]
  outputGoals: string[]
}

export interface ImageMetadataInput {
  sourceKind: SourceKind
  width: number
  height: number
  hasAlpha: boolean
  mimeType: string
  colorProfile?: 'srgb' | 'display-p3' | 'unknown'
  detailDensity?: DetailDensity
  backgroundComplexity?: BackgroundComplexity
  tonalRange?: 'binary' | 'limited' | 'full'
}

export interface ImageNormalizationPlan {
  targetMimeType: 'image/png'
  convertToGrayscale: boolean
  flattenAlphaTo: 'white' | 'transparent'
  preserveAspectRatio: boolean
  targetLongEdgePx: number
  steps: string[]
}

export interface ImageAnalysisReport {
  classification: ImageClass
  contrastScore: number
  noiseScore: number
  edgeClarityScore: number
  backgroundComplexity: BackgroundComplexity
  detailDensity: DetailDensity
  risks: string[]
  notes: string[]
}

export interface ModeDecision {
  mode: EngravingMode
  ditherAlgorithm?: DitherAlgorithm
  thresholdBias?: 'soft' | 'balanced' | 'hard'
  vectorAllowed: boolean
  reasons: string[]
}

export interface LineDensityPlan {
  targetDpi: number
  effectiveLineIntervalMm: number
  maxLinesPerCm: number
  reasons: string[]
}

export interface LaserSimulationReport {
  score: number
  verdict: SimulationVerdict
  risks: string[]
  notes: string[]
}

export interface ImageGenerationRequestPlan {
  provider: string
  model: string
  quality: 'low' | 'medium' | 'high'
  size: '1024x1024' | '1536x1024' | '1024x1536'
  responseFormat: 'png'
  prompt: string
  negativePrompt: string
  notes: string[]
}

export interface ImageAsset {
  dataUrl: string
  mediaType: string
  fileName: string
  width?: number
  height?: number
  source: 'generated' | 'uploaded' | 'optimized'
}

export interface StoredAssetReference {
  location: string
  fileName: string
  contentType: string
  storageBackend: 'local' | 'vercel-blob'
  pathname?: string
  downloadUrl?: string
  etag?: string
  size?: number
}

export interface WorkerProcessingResult {
  normalizedAsset: ImageAsset
  optimizedAsset: ImageAsset
  previewAsset: ImageAsset
  width: number
  height: number
  notes: string[]
}

export interface RemoteWorkerProcessingResult {
  normalizedAsset: StoredAssetReference
  optimizedAsset: StoredAssetReference
  previewAsset: StoredAssetReference
  width: number
  height: number
  notes: string[]
}

export interface OptimizerAsyncJob {
  jobId: string
  ownerUserId?: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  createdAt: string
  updatedAt: string
  requestedMode: EngravingMode
  processingStrategy: 'qstash' | 'direct'
  pipelineResult: OptimizerPipelineResult
  sourceImageDataUrl: string
  source: ImageMetadataInput
  userPrompt?: string
  savedSettingsSummary?: string
  sourceAsset?: StoredAssetReference | null
  workerResult?: RemoteWorkerProcessingResult | null
  workerError?: string
  qstashMessageId?: string
  notes: string[]
}

export interface VectorizationPlan {
  enabled: boolean
  targetFormats: Array<'svg' | 'dxf'>
  strokeStrategy: 'centerline' | 'outline'
  reasons: string[]
}

export interface LightBurnProjectManifest {
  fileName: string
  layers: Array<{
    id: string
    name: string
    mode: EngravingMode
    speedMmpm: number
    powerPct: number
    passes: number
    lineIntervalMm: number
    airAssist: boolean
  }>
  assetReferences: string[]
  notes: string[]
}

export interface ExportArtifact {
  path: string
  mediaType: string
  description: string
}

export interface ExportAssetPayload extends ExportArtifact {
  dataUrl: string
}

export interface ExportManifest {
  archiveName: string
  artifacts: ExportArtifact[]
  notes: string[]
}

export interface OptimizerPipelineInput {
  source: ImageMetadataInput
  userPrompt?: string
  savedSettingsSummary?: string
}

export interface OptimizerPipelineResult {
  preset: EngravingPreset | null
  optimizedPrompt: OptimizedPrompt | null
  normalizationPlan: ImageNormalizationPlan
  analysisReport: ImageAnalysisReport
  modeDecision: ModeDecision
  lineDensityPlan: LineDensityPlan
  simulationReport: LaserSimulationReport
  vectorizationPlan: VectorizationPlan
  exportManifest: ExportManifest
  nextActions: string[]
}
