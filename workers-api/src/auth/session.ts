// Session token creation + validation. Tokens are 32 random bytes hex; stored as SHA-256 hash.
import { createHash, randomBytes, randomUUID } from 'node:crypto'

export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30 // 30 days

export interface NewSession {
  token: string
  id: string
  userId: string
  tokenHash: string
  createdAt: string
  expiresAt: string
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function createSession(userId: string): NewSession {
  const token = randomBytes(32).toString('hex')
  const now = Date.now()
  return {
    token,
    id: randomUUID(),
    userId,
    tokenHash: hashToken(token),
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + SESSION_TTL_MS).toISOString(),
  }
}

export function generateBearerToken(): string {
  return randomBytes(32).toString('hex')
}
