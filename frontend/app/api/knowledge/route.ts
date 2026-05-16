import { getServerBackendUrl } from '@/lib/backend-url'

export const runtime = 'nodejs'

const BACKEND_URL = getServerBackendUrl()

function getBearerToken(request: Request) {
  const header = request.headers.get('authorization') || ''
  if (!header.startsWith('Bearer ')) return ''
  return header.slice(7).trim()
}

export async function GET() {
  const res = await fetch(`${BACKEND_URL}/api/knowledge`, { cache: 'no-store' })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

export async function POST(req: Request) {
  const token = getBearerToken(req)
  const body = await req.json()
  const res = await fetch(`${BACKEND_URL}/api/knowledge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

export async function DELETE(req: Request) {
  const token = getBearerToken(req)
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id') || ''
  const res = await fetch(`${BACKEND_URL}/api/knowledge?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
