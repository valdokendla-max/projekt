import { getServerBackendUrl } from '@/lib/backend-url'

export const runtime = 'nodejs'

const BACKEND_URL = getServerBackendUrl()

function buildProxyHeaders(request: Request) {
  const headers = new Headers()
  const authorization = request.headers.get('authorization')
  const contentType = request.headers.get('content-type')

  if (authorization) {
    headers.set('authorization', authorization)
  }

  if (contentType) {
    headers.set('content-type', contentType)
  }

  return headers
}

async function proxyKnowledgeRequest(request: Request) {
  const targetUrl = `${BACKEND_URL}/api/knowledge${new URL(request.url).search}`
  const body = request.method === 'POST' ? await request.text() : undefined

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: buildProxyHeaders(request),
      body,
      cache: 'no-store',
    })

    return new Response(await response.text(), {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json; charset=utf-8',
      },
    })
  } catch {
    return Response.json({ error: 'Teadmistebaasi teenusega ei saanud ühendust.' }, { status: 503 })
  }
}

export async function GET(req: Request) {
  return proxyKnowledgeRequest(req)
}

export async function POST(req: Request) {
  return proxyKnowledgeRequest(req)
}

export async function DELETE(req: Request) {
  return proxyKnowledgeRequest(req)
}
