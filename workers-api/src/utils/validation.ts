export function normalizeEmail(value: unknown): string {
  return String(value || '').trim().toLowerCase()
}

export function isValidEmail(email: string): boolean {
  return /^\S+@\S+\.\S+$/.test(email)
}

export function isValidRole(role: string): role is 'admin' | 'user' {
  return role === 'admin' || role === 'user'
}
