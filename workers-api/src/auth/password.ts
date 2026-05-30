// Password hashing compatible with backend/auth-store.js (scrypt, hash format "salt:digest")
// Uses node:crypto via Workers nodejs_compat flag.
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto'

const KEYLEN = 64

export function hashPassword(password: string, saltOverride?: string): string {
  const salt = saltOverride ?? randomBytes(16).toString('hex')
  const digest = scryptSync(password, salt, KEYLEN).toString('hex')
  return `${salt}:${digest}`
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = String(storedHash || '').split(':')
  if (parts.length !== 2) return false
  const salt = parts[0]
  const digest = parts[1]
  if (!salt || !digest) return false

  const candidate = scryptSync(password, salt, KEYLEN).toString('hex')
  const left = Buffer.from(candidate, 'hex')
  const right = Buffer.from(digest, 'hex')

  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export function generateTemporaryPassword(): string {
  return `LG-${randomBytes(9).toString('base64url')}`
}
