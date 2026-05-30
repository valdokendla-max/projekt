export interface LaserMachine {
  id: string
  brand: string
  model: string
  laserType: string
  powerW: number
  [key: string]: unknown
}

export interface MaterialProfile {
  [key: string]: unknown
}

export interface Material {
  id: string
  name: string
  thicknessRangeMm: [number, number] | number[]
  note?: string
  profiles: Record<string, MaterialProfile>
  [key: string]: unknown
}

export interface RecommendationArgs {
  machineId: string
  materialId: string
  thicknessMm: number
  mode: string
  widthMm?: number
  heightMm?: number
}

export interface RecommendationResult {
  error?: string
  [key: string]: unknown
}

export const LASER_MACHINES: LaserMachine[]
export const MATERIALS: Material[]
export function getRecommendation(args: RecommendationArgs): RecommendationResult
