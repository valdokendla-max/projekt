import { createRequire } from 'node:module'
import { afterEach, describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const { createApp } = require('../backend/server')

function createAuthStub() {
  const users = new Map<string, {
    id: string
    name: string
    email: string
    password: string
    role: 'user' | 'admin'
    createdAt: string
  }>()
  const sessions = new Map<string, string>()
  let userCounter = 1
  let sessionCounter = 1

  function sanitizeUser(user: {
    id: string
    name: string
    email: string
    role: 'user' | 'admin'
    createdAt: string
  }) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    }
  }

  return {
    normalizeEmail(value: string) {
      return String(value || '').trim().toLowerCase()
    },
    async registerUser({ name, email, password }: { name: string; email: string; password: string }) {
      if (users.has(email)) {
        const error = new Error('Kasutaja on juba registreeritud.') as Error & { status?: number }
        error.status = 409
        throw error
      }

      const user = {
        id: `user-${userCounter++}`,
        name,
        email,
        password,
        role: 'user' as const,
        createdAt: new Date('2026-04-29T00:00:00.000Z').toISOString(),
      }
      const token = `session-${sessionCounter++}`
      users.set(email, user)
      sessions.set(token, user.id)
      return { user: sanitizeUser(user), token }
    },
    async loginUser({ email, password }: { email: string; password: string }) {
      const user = users.get(email)
      if (!user || user.password !== password) {
        const error = new Error('Vale kasutaja või parool.') as Error & { status?: number }
        error.status = 401
        throw error
      }

      const token = `session-${sessionCounter++}`
      sessions.set(token, user.id)
      return { user: sanitizeUser(user), token }
    },
    async getUserByToken(token: string) {
      const userId = sessions.get(token)
      if (!userId) {
        return null
      }

      for (const user of users.values()) {
        if (user.id === userId) {
          return sanitizeUser(user)
        }
      }

      return null
    },
    async invalidateSession(token: string) {
      sessions.delete(token)
    },
    async changePassword({ token, currentPassword, nextPassword }: { token: string; currentPassword: string; nextPassword: string }) {
      const userId = sessions.get(token)
      const user = [...users.values()].find((candidate) => candidate.id === userId)
      if (!user || user.password !== currentPassword) {
        const error = new Error('Praegune parool ei klapi.') as Error & { status?: number }
        error.status = 400
        throw error
      }

      user.password = nextPassword
      return { user: sanitizeUser(user), token }
    },
    async requestPasswordReset() {
      return { success: true }
    },
    async verifyPasswordResetToken() {
      return null
    },
    async resetPasswordWithToken() {
      return { success: true }
    },
    async listUsers() {
      return [...users.values()].map(sanitizeUser)
    },
    async listPasswordResetRequests() {
      return []
    },
    async issueTemporaryPassword() {
      return { success: true }
    },
    async updateUserRole() {
      throw new Error('not implemented in test')
    },
  }
}

async function startTestServer() {
  const app = createApp({
    authStore: createAuthStub(),
    emailService: {
      getMailConfig: () => ({ isConfigured: false, appBaseUrl: '', from: '' }),
      sendPasswordResetEmail: async () => {},
      sendRegistrationNotifications: async () => {},
    },
    laserData: {
      LASER_MACHINES: [],
      MATERIALS: [],
      getRecommendation: () => ({ error: 'unused' }),
    },
  })

  const server = await new Promise<any>((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance))
  })

  return {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error: Error | undefined) => {
          if (error) {
            reject(error)
            return
          }
          resolve()
        })
      })
    },
  }
}

let activeServer: Awaited<ReturnType<typeof startTestServer>> | null = null

afterEach(async () => {
  if (activeServer) {
    await activeServer.close()
    activeServer = null
  }
})

describe('auth flow', () => {
  it('supports register, login, session lookup, password change, and logout', async () => {
    activeServer = await startTestServer()

    const registerResponse = await fetch(`${activeServer.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: 'tester@example.com',
        password: 'Secret123!',
      }),
    })
    expect(registerResponse.status).toBe(201)
    const registered = await registerResponse.json()
    expect(registered.user.email).toBe('tester@example.com')

    const loginResponse = await fetch(`${activeServer.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'tester@example.com',
        password: 'Secret123!',
      }),
    })
    expect(loginResponse.status).toBe(200)
    const loggedIn = await loginResponse.json()
    expect(loggedIn.token).toMatch(/^session-/)

    const meResponse = await fetch(`${activeServer.baseUrl}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${loggedIn.token}`,
      },
    })
    expect(meResponse.status).toBe(200)
    await expect(meResponse.json()).resolves.toMatchObject({
      user: {
        email: 'tester@example.com',
        role: 'user',
      },
    })

    const changePasswordResponse = await fetch(`${activeServer.baseUrl}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${loggedIn.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        currentPassword: 'Secret123!',
        nextPassword: 'NewSecret456!',
      }),
    })
    expect(changePasswordResponse.status).toBe(200)

    const reloginResponse = await fetch(`${activeServer.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'tester@example.com',
        password: 'NewSecret456!',
      }),
    })
    expect(reloginResponse.status).toBe(200)
    const relogged = await reloginResponse.json()

    const logoutResponse = await fetch(`${activeServer.baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${relogged.token}`,
      },
    })
    expect(logoutResponse.status).toBe(200)

    const afterLogoutResponse = await fetch(`${activeServer.baseUrl}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${relogged.token}`,
      },
    })
    expect(afterLogoutResponse.status).toBe(401)
  })
})