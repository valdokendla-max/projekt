import type { Context, MiddlewareHandler } from 'hono'
import type { Bindings, Variables, AuthUser, SessionContext } from '../bindings'
import { hashToken } from './session'

type AppContext = Context<{ Bindings: Bindings; Variables: Variables }>

interface SessionRow {
  id: string
  user_id: string
  expires_at: string
}

interface UserRow {
  id: string
  name: string
  email: string
  role: string
}

function extractBearer(c: AppContext): string | null {
  const header = c.req.header('Authorization') || ''
  if (!header.toLowerCase().startsWith('bearer ')) return null
  const token = header.slice(7).trim()
  return token || null
}

async function resolveSession(c: AppContext, token: string): Promise<SessionContext | null> {
  const tokenHash = hashToken(token)

  const session = await c.env.DB.prepare(
    'SELECT id, user_id, expires_at FROM app_auth_sessions WHERE token_hash = ? LIMIT 1',
  )
    .bind(tokenHash)
    .first<SessionRow>()

  if (!session) return null

  if (new Date(session.expires_at).getTime() <= Date.now()) {
    await c.env.DB.prepare('DELETE FROM app_auth_sessions WHERE id = ?').bind(session.id).run()
    return null
  }

  const user = await c.env.DB.prepare(
    'SELECT id, name, email, role FROM app_auth_users WHERE id = ? LIMIT 1',
  )
    .bind(session.user_id)
    .first<UserRow>()

  if (!user) return null

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: (user.role === 'admin' ? 'admin' : 'user') as AuthUser['role'],
    },
  }
}

export const optionalAuth: MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> = async (c, next) => {
  const token = extractBearer(c)
  if (token) {
    const session = await resolveSession(c, token)
    if (session) c.set('session', session)
  }
  await next()
}

export const requireAuth: MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> = async (c, next) => {
  const token = extractBearer(c)
  if (!token) {
    return c.json({ ok: false, error: 'Sisselogimine on vajalik.' }, 401)
  }
  const session = await resolveSession(c, token)
  if (!session) {
    return c.json({ ok: false, error: 'Sessioon on aegunud või vigane.' }, 401)
  }
  c.set('session', session)
  await next()
}

export const requireAdmin: MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> = async (c, next) => {
  const token = extractBearer(c)
  if (!token) {
    return c.json({ ok: false, error: 'Sisselogimine on vajalik.' }, 401)
  }
  const session = await resolveSession(c, token)
  if (!session) {
    return c.json({ ok: false, error: 'Sessioon on aegunud või vigane.' }, 401)
  }
  if (session.user.role !== 'admin') {
    return c.json({ ok: false, error: 'Administraatori õigused on vajalikud.' }, 403)
  }
  c.set('session', session)
  await next()
}

export async function pruneExpiredSessions(c: AppContext): Promise<void> {
  const now = new Date().toISOString()
  await c.env.DB.prepare('DELETE FROM app_auth_sessions WHERE expires_at <= ?').bind(now).run()
}
