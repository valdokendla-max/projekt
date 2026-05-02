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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await request.text()
    const response = await fetch(`${BACKEND_URL}/api/conversations/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: buildProxyHeaders(request),
      body,
      cache: 'no-store',
    })
    const text = await response.text()
    return new Response(text, {
      status: response.status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
  } catch {
    return Response.json({ error: 'Vestluse salvestamine ebaõnnestus.' }, { status: 503 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const response = await fetch(`${BACKEND_URL}/api/conversations/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: buildProxyHeaders(request),
      cache: 'no-store',
    })
    const text = await response.text()
    return new Response(text, {
      status: response.status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
  } catch {
    return Response.json({ error: 'Vestluse kustutamine ebaõnnestus.' }, { status: 503 })
  }
}
