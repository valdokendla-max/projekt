const LOCAL_BACKEND_URL = 'http://localhost:4000'

function normalizeBaseUrl(value: string | undefined) {
  return String(value || '').trim().replace(/\/$/, '')
}

function isAbsoluteHttpUrl(value: string) {
  return /^https?:\/\//i.test(value)
}

export function getClientBackendUrl() {
  return normalizeBaseUrl(process.env.NEXT_PUBLIC_BACKEND_URL) || '/backend'
}

export function getServerBackendUrl() {
  const upstreamTarget = normalizeBaseUrl(process.env.BACKEND_PROXY_TARGET)

  if (isAbsoluteHttpUrl(upstreamTarget)) {
    return upstreamTarget
  }

  const publicBackendUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_BACKEND_URL)

  if (isAbsoluteHttpUrl(publicBackendUrl)) {
    return publicBackendUrl
  }

  return LOCAL_BACKEND_URL
}
