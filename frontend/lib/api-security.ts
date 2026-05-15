import { createHash } from 'node:crypto'
import { getServerBackendUrl } from '@/lib/backend-url'

export interface AuthenticatedRouteUser {
  id: string
  name: string
  email: string
  role: 'admin' | 'user'
  createdAt: string
}

interface AuthenticatedRouteResult {
  user: AuthenticatedRouteUser
  token: string
}

interface RateLimitOptions {
  routeId: string
  actorKey: string
  maxRequests: number
  windowSeconds: number
}

interface JsonBodyLimitOptions {
  maxBytes: number
  routeLabel: string
}

interface InternalRouteAuthOptions {
  qstashVerified?: boolean
  fallbackTokenEnvNames?: string[]
}

const BACKEND_URL = getServerBackendUrl()
const inMemoryRateLimits = new Map<string, { count: number; windowStart: number }>()

function getBearerToken(request: Request) {
  const header = request.headers.get('authorization') || ''

  if (!header.startsWith('Bearer ')) {
    return ''
  }

  return header.slice(7).trim()
}

function hashActorKey(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for') || ''
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown'
  }

  return (
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-vercel-forwarded-for') ||
    'unknown'
  )
}

function requestTooLargeResponse(routeLabel: string, maxBytes: number) {
  return Response.json(
    {
      error: `${routeLabel} request ületab lubatud mahu ${Math.ceil(maxBytes / 1024)} KB.`,
    },
    { status: 413 },
  )
}

export async function parseJsonBodyWithLimit<T>(
  request: Request,
  options: JsonBodyLimitOptions,
): Promise<{ data: T; rawBody: string } | { response: Response }> {
  const contentLength = Number(request.headers.get('content-length') || '0')
  if (Number.isFinite(contentLength) && contentLength > options.maxBytes) {
    return { response: requestTooLargeResponse(options.routeLabel, options.maxBytes) }
  }

  const rawBody = await request.text()
  if (Buffer.byteLength(rawBody, 'utf8') > options.maxBytes) {
    return { response: requestTooLargeResponse(options.routeLabel, options.maxBytes) }
  }

  try {
    return {
      data: (rawBody ? JSON.parse(rawBody) : {}) as T,
      rawBody,
    }
  } catch {
    return {
      response: Response.json({ error: 'Vigane JSON request body.' }, { status: 400 }),
    }
  }
}

export async function requireAuthenticatedRouteUser(
  request: Request,
): Promise<{ ok: true; value: AuthenticatedRouteResult } | { ok: false; response: Response }> {
  const token = getBearerToken(request)

  if (!token) {
    return {
      ok: false,
      response: Response.json({ error: 'Selle tegevuse jaoks logi sisse.' }, { status: 401 }),
    }
  }

  let response: Response
  try {
    response = await fetch(`${BACKEND_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    })
  } catch {
    return {
      ok: false,
      response: Response.json({ error: 'Autentimisteenusega ei saanud ühendust.' }, { status: 503 }),
    }
  }

  if (!response.ok) {
    return {
      ok: false,
      response: Response.json({ error: 'Sessioon puudub või on aegunud.' }, { status: 401 }),
    }
  }

  const payload = (await response.json()) as { user?: AuthenticatedRouteUser }
  if (!payload.user) {
    return {
      ok: false,
      response: Response.json({ error: 'Sessioon puudub või on aegunud.' }, { status: 401 }),
    }
  }

  return {
    ok: true,
    value: {
      user: payload.user,
      token,
    },
  }
}

export async function enforceRouteRateLimit(options: RateLimitOptions) {
  const actorKeyHash = hashActorKey(options.actorKey)
  const windowMs = options.windowSeconds * 1000
  const now = Date.now()
  const windowStart = Math.floor(now / windowMs) * windowMs
  const key = `${options.routeId}:${actorKeyHash}:${windowStart}`

  const entry = inMemoryRateLimits.get(key) || { count: 0, windowStart }
  entry.count += 1
  inMemoryRateLimits.set(key, entry)

  if (entry.count > options.maxRequests) {
    return Response.json(
      {
        error: `Liiga palju päringuid route'i ${options.routeId} vastu. Proovi hiljem uuesti.`,
      },
      { status: 429 },
    )
  }

  return null
}

export async function requireInternalRouteAuthorization(
  request: Request,
  options: InternalRouteAuthOptions = {},
) {
  if (options.qstashVerified) {
    return { ok: true as const, actorKey: 'qstash-signed' }
  }

  const token = getBearerToken(request)
  const candidateEnvNames = options.fallbackTokenEnvNames || ['RESULTS_API_TOKEN', 'INTERNAL_API_TOKEN']
  const validTokens = candidateEnvNames
    .map((name) => String(process.env[name] || '').trim())
    .filter(Boolean)

  if (validTokens.length === 0) {
    return {
      ok: false as const,
      response: Response.json(
        { error: 'Sisemise callback route autentimine ei ole seadistatud.' },
        { status: 503 },
      ),
    }
  }

  if (!token || !validTokens.includes(token)) {
    return {
      ok: false as const,
      response: Response.json({ error: 'Sisemise route autentimine ebaõnnestus.' }, { status: 401 }),
    }
  }

  return {
    ok: true as const,
    actorKey: `internal-token:${hashActorKey(token)}`,
  }
}

export function buildUserRateLimitKey(request: Request, user: AuthenticatedRouteUser) {
  return `user:${user.id}:ip:${getClientIp(request)}`
}
