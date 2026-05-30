import { Hono } from 'hono'
import { randomUUID, randomBytes } from 'node:crypto'
import type { Bindings, Variables } from '../bindings'
import { hashPassword, verifyPassword, generateTemporaryPassword } from '../auth/password'
import { createSession, hashToken } from '../auth/session'
import { requireAuth, requireAdmin, pruneExpiredSessions } from '../auth/middleware'
import { normalizeEmail, isValidEmail, isValidRole } from '../utils/validation'
import { sendPasswordResetEmail, sendRegistrationNotification } from '../utils/email'

const PASSWORD_RESET_TOKEN_TTL_MS = 1000 * 60 * 30 // 30 minutes

const auth = new Hono<{ Bindings: Bindings; Variables: Variables }>()

interface UserRow {
  id: string
  name: string
  email: string
  role: string
  password_hash: string
  created_at: string
}

interface PublicUser {
  id: string
  name: string
  email: string
  role: 'admin' | 'user'
  createdAt: string
}

function sanitizeUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: (row.role === 'admin' ? 'admin' : 'user') as PublicUser['role'],
    createdAt: row.created_at,
  }
}

async function findUserByEmail(env: Bindings, email: string): Promise<UserRow | null> {
  return env.DB.prepare('SELECT * FROM app_auth_users WHERE email = ? LIMIT 1').bind(email).first<UserRow>()
}

async function findUserById(env: Bindings, id: string): Promise<UserRow | null> {
  return env.DB.prepare('SELECT * FROM app_auth_users WHERE id = ? LIMIT 1').bind(id).first<UserRow>()
}

async function countAdmins(env: Bindings): Promise<number> {
  const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM app_auth_users WHERE role = 'admin'").first<{ n: number }>()
  return row?.n ?? 0
}

async function persistSession(env: Bindings, userId: string): Promise<string> {
  const newSession = createSession(userId)
  await env.DB.prepare(
    'INSERT INTO app_auth_sessions (id, user_id, token_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(newSession.id, userId, newSession.tokenHash, newSession.createdAt, newSession.expiresAt)
    .run()
  return newSession.token
}

async function determineRoleForNewUser(env: Bindings): Promise<'admin' | 'user'> {
  const admins = await countAdmins(env)
  return admins === 0 ? 'admin' : 'user'
}

// POST /api/auth/register
auth.post('/register', async (c) => {
  const body = await c.req.json().catch(() => ({})) as { name?: unknown; email?: unknown; password?: unknown }
  const name = String(body.name || '').trim()
  const email = normalizeEmail(body.email)
  const password = String(body.password || '')

  if (name.length < 2) return c.json({ error: 'Nimi peab olema vähemalt 2 tähemärki pikk.' }, 400)
  if (!isValidEmail(email)) return c.json({ error: 'Sisesta korrektne e-posti aadress.' }, 400)
  if (password.length < 8) return c.json({ error: 'Parool peab olema vähemalt 8 tähemärki pikk.' }, 400)

  const existing = await findUserByEmail(c.env, email)
  if (existing) return c.json({ error: 'Selle e-postiga konto on juba olemas.' }, 409)

  await pruneExpiredSessions(c)

  const role = await determineRoleForNewUser(c.env)
  const user: UserRow = {
    id: randomUUID(),
    name,
    email,
    role,
    password_hash: hashPassword(password),
    created_at: new Date().toISOString(),
  }

  await c.env.DB.prepare(
    'INSERT INTO app_auth_users (id, name, email, role, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  )
    .bind(user.id, user.name, user.email, user.role, user.password_hash, user.created_at)
    .run()

  const token = await persistSession(c.env, user.id)

  // Best-effort registration notifications (do not block on failure)
  c.executionCtx.waitUntil(
    sendRegistrationNotification(c.env, { name: user.name, email: user.email, role: user.role }).catch(() => {}),
  )

  return c.json({ user: sanitizeUser(user), token }, 201)
})

// POST /api/auth/login
auth.post('/login', async (c) => {
  const body = await c.req.json().catch(() => ({})) as { email?: unknown; password?: unknown }
  const email = normalizeEmail(body.email)
  const password = String(body.password || '')

  if (!email || !password) return c.json({ error: 'E-post ja parool on kohustuslikud.' }, 400)

  const user = await findUserByEmail(c.env, email)
  if (!user || !verifyPassword(password, user.password_hash)) {
    return c.json({ error: 'Vale e-post või parool.' }, 401)
  }

  await pruneExpiredSessions(c)
  const token = await persistSession(c.env, user.id)
  return c.json({ user: sanitizeUser(user), token })
})

// GET /api/auth/me
auth.get('/me', requireAuth, (c) => {
  const session = c.get('session')!
  return c.json({ user: { ...session.user, createdAt: undefined } })
})

// POST /api/auth/logout
auth.post('/logout', async (c) => {
  const header = c.req.header('Authorization') || ''
  const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : ''
  if (token) {
    await c.env.DB.prepare('DELETE FROM app_auth_sessions WHERE token_hash = ?').bind(hashToken(token)).run()
  }
  return c.json({ success: true })
})

// POST /api/auth/change-password
auth.post('/change-password', requireAuth, async (c) => {
  const body = await c.req.json().catch(() => ({})) as { currentPassword?: unknown; nextPassword?: unknown }
  const currentPassword = String(body.currentPassword || '')
  const nextPassword = String(body.nextPassword || '')

  if (!currentPassword || !nextPassword) {
    return c.json({ error: 'Praegune ja uus parool on kohustuslikud.' }, 400)
  }
  if (nextPassword.length < 8) {
    return c.json({ error: 'Uus parool peab olema vähemalt 8 tähemärki pikk.' }, 400)
  }

  const session = c.get('session')!
  const user = await findUserById(c.env, session.user.id)
  if (!user) return c.json({ error: 'Sessioon on aegunud või vigane.' }, 401)

  if (!verifyPassword(currentPassword, user.password_hash)) {
    return c.json({ error: 'Praegune parool on vale.' }, 401)
  }
  if (verifyPassword(nextPassword, user.password_hash)) {
    return c.json({ error: 'Uus parool peab erinema praegusest paroolist.' }, 400)
  }

  const newHash = hashPassword(nextPassword)
  await c.env.DB.prepare('UPDATE app_auth_users SET password_hash = ? WHERE id = ?').bind(newHash, user.id).run()
  await c.env.DB.prepare('DELETE FROM app_auth_sessions WHERE user_id = ?').bind(user.id).run()

  const newToken = await persistSession(c.env, user.id)
  return c.json({ user: sanitizeUser({ ...user, password_hash: newHash }), token: newToken })
})

// POST /api/auth/request-password-reset
auth.post('/request-password-reset', async (c) => {
  const body = await c.req.json().catch(() => ({})) as { email?: unknown; note?: unknown }
  const email = normalizeEmail(body.email)
  const note = String(body.note || '').trim().slice(0, 500)

  if (!isValidEmail(email)) return c.json({ error: 'Sisesta korrektne e-posti aadress.' }, 400)

  const user = await findUserByEmail(c.env, email)
  if (!user) {
    // Silent success to prevent email enumeration
    return c.json({ success: true, message: 'Kui konto on olemas, jõuab parooli reseti taotlus adminini.' })
  }

  // Remove any existing reset requests for this user
  await c.env.DB.prepare('DELETE FROM app_auth_password_reset_requests WHERE user_id = ?').bind(user.id).run()
  await c.env.DB.prepare(
    'INSERT INTO app_auth_password_reset_requests (id, user_id, email, name, note, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  )
    .bind(randomUUID(), user.id, user.email, user.name, note, new Date().toISOString())
    .run()

  // Token-based email flow (in parallel to admin notification)
  const resetToken = randomBytes(32).toString('hex')
  const tokenHash = hashToken(resetToken)
  const now = Date.now()
  await c.env.DB.prepare('DELETE FROM app_auth_password_reset_tokens WHERE user_id = ?').bind(user.id).run()
  await c.env.DB.prepare(
    'INSERT INTO app_auth_password_reset_tokens (id, user_id, token_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(
      randomUUID(),
      user.id,
      tokenHash,
      new Date(now).toISOString(),
      new Date(now + PASSWORD_RESET_TOKEN_TTL_MS).toISOString(),
    )
    .run()

  c.executionCtx.waitUntil(
    sendPasswordResetEmail(c.env, { name: user.name, email: user.email }, resetToken).catch(() => {}),
  )

  return c.json({ success: true, message: 'Kui konto on olemas, jõuab parooli reseti taotlus adminini.' })
})

// GET /api/auth/password-reset/verify?token=...
auth.get('/password-reset/verify', async (c) => {
  const token = String(c.req.query('token') || '').trim()
  if (!token) return c.json({ error: 'Token puudub.' }, 400)

  const row = await c.env.DB.prepare(
    'SELECT id, user_id, expires_at FROM app_auth_password_reset_tokens WHERE token_hash = ? LIMIT 1',
  )
    .bind(hashToken(token))
    .first<{ id: string; user_id: string; expires_at: string }>()

  if (!row) return c.json({ error: 'Token on vigane.' }, 404)
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await c.env.DB.prepare('DELETE FROM app_auth_password_reset_tokens WHERE id = ?').bind(row.id).run()
    return c.json({ error: 'Token on aegunud.' }, 410)
  }
  return c.json({ ok: true })
})

// POST /api/auth/reset-password
auth.post('/reset-password', async (c) => {
  const body = await c.req.json().catch(() => ({})) as { token?: unknown; nextPassword?: unknown }
  const token = String(body.token || '').trim()
  const nextPassword = String(body.nextPassword || '')

  if (!token) return c.json({ error: 'Token puudub.' }, 400)
  if (nextPassword.length < 8) return c.json({ error: 'Parool peab olema vähemalt 8 tähemärki pikk.' }, 400)

  const row = await c.env.DB.prepare(
    'SELECT id, user_id, expires_at FROM app_auth_password_reset_tokens WHERE token_hash = ? LIMIT 1',
  )
    .bind(hashToken(token))
    .first<{ id: string; user_id: string; expires_at: string }>()

  if (!row) return c.json({ error: 'Token on vigane.' }, 404)
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await c.env.DB.prepare('DELETE FROM app_auth_password_reset_tokens WHERE id = ?').bind(row.id).run()
    return c.json({ error: 'Token on aegunud.' }, 410)
  }

  const newHash = hashPassword(nextPassword)
  await c.env.DB.prepare('UPDATE app_auth_users SET password_hash = ? WHERE id = ?').bind(newHash, row.user_id).run()
  await c.env.DB.prepare('DELETE FROM app_auth_password_reset_tokens WHERE user_id = ?').bind(row.user_id).run()
  await c.env.DB.prepare('DELETE FROM app_auth_sessions WHERE user_id = ?').bind(row.user_id).run()

  return c.json({ success: true })
})

// GET /api/auth/users (admin)
auth.get('/users', requireAdmin, async (c) => {
  const rows = await c.env.DB.prepare(
    'SELECT id, name, email, role, created_at FROM app_auth_users ORDER BY created_at ASC',
  ).all<UserRow>()
  const users = (rows.results || []).map((r) => sanitizeUser(r as UserRow))
  return c.json({ users })
})

// GET /api/auth/password-reset-requests (admin)
auth.get('/password-reset-requests', requireAdmin, async (c) => {
  const rows = await c.env.DB.prepare(
    'SELECT id, user_id, email, name, note, created_at FROM app_auth_password_reset_requests ORDER BY created_at DESC',
  ).all<{ id: string; user_id: string; email: string; name: string; note: string; created_at: string }>()

  const requests = (rows.results || []).map((r) => ({
    id: r.id,
    userId: r.user_id,
    email: r.email,
    name: r.name,
    note: r.note,
    createdAt: r.created_at,
  }))
  return c.json({ requests })
})

// POST /api/auth/password-reset-requests/:requestId/issue-temp-password (admin)
auth.post('/password-reset-requests/:requestId/issue-temp-password', requireAdmin, async (c) => {
  const requestId = String(c.req.param('requestId') || '').trim()
  if (!requestId) return c.json({ error: 'Taotluse ID on kohustuslik.' }, 400)

  const request = await c.env.DB.prepare(
    'SELECT id, user_id, email, name, note, created_at FROM app_auth_password_reset_requests WHERE id = ? LIMIT 1',
  )
    .bind(requestId)
    .first<{ id: string; user_id: string; email: string; name: string; note: string; created_at: string }>()

  if (!request) return c.json({ error: 'Parooli reseti taotlust ei leitud.' }, 404)

  const user = await findUserById(c.env, request.user_id)
  if (!user) {
    await c.env.DB.prepare('DELETE FROM app_auth_password_reset_requests WHERE id = ?').bind(requestId).run()
    return c.json({ error: 'Kasutajat ei leitud.' }, 404)
  }

  const temporaryPassword = generateTemporaryPassword()
  const newHash = hashPassword(temporaryPassword)
  await c.env.DB.prepare('UPDATE app_auth_users SET password_hash = ? WHERE id = ?').bind(newHash, user.id).run()
  await c.env.DB.prepare('DELETE FROM app_auth_sessions WHERE user_id = ?').bind(user.id).run()
  await c.env.DB.prepare('DELETE FROM app_auth_password_reset_requests WHERE id = ?').bind(requestId).run()

  return c.json({
    request: {
      id: request.id,
      userId: request.user_id,
      email: request.email,
      name: request.name,
      note: request.note,
      createdAt: request.created_at,
    },
    temporaryPassword,
    user: sanitizeUser({ ...user, password_hash: newHash }),
  })
})

// POST /api/auth/users/:userId/role (admin)
auth.post('/users/:userId/role', requireAdmin, async (c) => {
  const targetUserId = String(c.req.param('userId') || '').trim()
  const body = await c.req.json().catch(() => ({})) as { role?: unknown }
  const role = String(body.role || '').trim()

  if (!targetUserId) return c.json({ error: 'Kasutaja ID on kohustuslik.' }, 400)
  if (!isValidRole(role)) return c.json({ error: 'Roll peab olema kas admin või user.' }, 400)

  const actingUser = c.get('session')!.user
  const target = await findUserById(c.env, targetUserId)
  if (!target) return c.json({ error: 'Kasutajat ei leitud.' }, 404)

  if (actingUser.id === target.id && role !== target.role) {
    return c.json({ error: 'Oma aktiivset rolli ei saa sellest vaatest muuta.' }, 400)
  }

  if (target.role === role) {
    return c.json({ user: sanitizeUser(target) })
  }

  if (target.role === 'admin' && role !== 'admin') {
    const adminCount = await countAdmins(c.env)
    if (adminCount <= 1) {
      return c.json({ error: 'Süsteemis peab alati olema vähemalt üks admin.' }, 400)
    }
  }

  await c.env.DB.prepare('UPDATE app_auth_users SET role = ? WHERE id = ?').bind(role, target.id).run()
  return c.json({ user: sanitizeUser({ ...target, role }) })
})

// DELETE /api/auth/users/:userId (admin)
auth.delete('/users/:userId', requireAdmin, async (c) => {
  const targetUserId = String(c.req.param('userId') || '').trim()
  if (!targetUserId) return c.json({ error: 'Kasutaja ID on kohustuslik.' }, 400)

  const actingUser = c.get('session')!.user
  if (targetUserId === actingUser.id) {
    return c.json({ error: 'Sa ei saa oma kontot kustutada.' }, 400)
  }

  const target = await findUserById(c.env, targetUserId)
  if (!target) return c.json({ error: 'Kasutajat ei leitud.' }, 404)

  if (target.role === 'admin') {
    const adminCount = await countAdmins(c.env)
    if (adminCount <= 1) {
      return c.json({ error: 'Süsteemis peab alati olema vähemalt üks admin.' }, 400)
    }
  }

  // FK ON DELETE CASCADE handles sessions, reset requests, reset tokens, settings, conversations
  await c.env.DB.prepare('DELETE FROM app_auth_users WHERE id = ?').bind(targetUserId).run()
  return c.json({ success: true })
})

export default auth
