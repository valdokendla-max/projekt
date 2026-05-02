import { getServerBackendUrl } from '@/lib/backend-url'

export const runtime = 'nodejs'
export const maxDuration = 30

const BACKEND_URL = getServerBackendUrl()

function buildProxyHeaders(request: Request) {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  const authorization = request.headers.get('authorization')
  if (authorization) {
    headers.set('authorization', authorization)
  }
  return headers
}

export async function GET(request: Request) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/conversations`, {
      headers: buildProxyHeaders(request),
      cache: 'no-store',
    })
    const text = await response.text()
    return new Response(text, {
      status: response.status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
  } catch {
    return Response.json({ error: 'Vestluste laadimine ebaõnnestus.' }, { status: 503 })
  }
}
