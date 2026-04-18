export interface ServiceStatus {
  label: string
  ok: boolean
  detail: string
  checkedAt: string
  configured?: boolean
  storage?: string
  itemCount?: number
}

export interface SystemStatusResponse {
  checkedAt: string
  frontend: ServiceStatus
  backend: ServiceStatus
  knowledgeBase: ServiceStatus
  ai: ServiceStatus
}