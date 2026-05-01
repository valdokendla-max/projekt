'use client'

import { useEffect, useState } from 'react'
import { getClientBackendUrl } from '@/lib/backend-url'

const BACKEND_URL = getClientBackendUrl()
const AUTH_TOKEN_KEY = 'lasergraveerimine.auth-token'

export type UserRole = 'admin' | 'user'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  createdAt: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials extends LoginCredentials {
  name: string
}

export interface ChangePasswordCredentials {
  currentPassword: string
  nextPassword: string
}

export interface RequestPasswordResetCredentials {
  email: string
  note?: string
}

export interface AuthActionResult {
  ok: boolean
  error?: string
}

type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

function readErrorMessage(payload: unknown, fallback: string) {
  if (
    payload &&
    typeof payload === 'object' &&
    'error' in payload &&
    typeof payload.error === 'string' &&
    payload.error.trim()
  ) {
    return payload.error
  }

  return fallback
}

async function fetchCurrentUser(sessionToken: string) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
    })

    if (!response.ok) {
      return null
    }

    const payload = (await response.json()) as { user?: AuthUser }
    return payload.user || null
  } catch {
    return null
  }
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  const persistToken = (nextToken: string | null) => {
    setToken(nextToken)

    if (nextToken) {
      window.localStorage.setItem(AUTH_TOKEN_KEY, nextToken)
      return
    }

    window.localStorage.removeItem(AUTH_TOKEN_KEY)
  }

  const clearSession = () => {
    persistToken(null)
    setUser(null)
    setStatus('anonymous')
  }

  const refreshSession = async (sessionToken: string) => {
    const currentUser = await fetchCurrentUser(sessionToken)

    if (!currentUser) {
      clearSession()
      return false
    }

    setUser(currentUser)
    setStatus('authenticated')
    return true
  }

  useEffect(() => {
    const storedToken = window.localStorage.getItem(AUTH_TOKEN_KEY)

    if (!storedToken) {
      setStatus('anonymous')
      return
    }

    void (async () => {
      const currentUser = await fetchCurrentUser(storedToken)

      if (!currentUser) {
        window.localStorage.removeItem(AUTH_TOKEN_KEY)
        setStatus('anonymous')
        return
      }

      persistToken(storedToken)
      setUser(currentUser)
      setStatus('authenticated')
    })()
  }, [])

  const commitAuthResponse = (payload: { token?: string; user?: AuthUser }) => {
    if (!payload.token || !payload.user) {
      clearSession()
      return false
    }

    persistToken(payload.token)
    setUser(payload.user)
    setStatus('authenticated')
    return true
  }

  const login = async (credentials: LoginCredentials): Promise<AuthActionResult> => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        return { ok: false, error: readErrorMessage(payload, 'Sisselogimine ebaõnnestus.') }
      }

      return commitAuthResponse(payload) ? { ok: true } : { ok: false, error: 'Sessiooni käivitamine ebaõnnestus.' }
    } catch {
      return { ok: false, error: 'Serveriga ei saanud ühendust.' }
    }
  }

  const register = async (credentials: RegisterCredentials): Promise<AuthActionResult> => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        return { ok: false, error: readErrorMessage(payload, 'Registreerimine ebaõnnestus.') }
      }

      return commitAuthResponse(payload) ? { ok: true } : { ok: false, error: 'Sessiooni käivitamine ebaõnnestus.' }
    } catch {
      return { ok: false, error: 'Serveriga ei saanud ühendust.' }
    }
  }

  const logout = async () => {
    const activeToken = token || window.localStorage.getItem(AUTH_TOKEN_KEY)

    try {
      if (activeToken) {
        await fetch(`${BACKEND_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${activeToken}`,
          },
        })
      }
    } finally {
      clearSession()
    }
  }

  const changePassword = async (credentials: ChangePasswordCredentials): Promise<AuthActionResult> => {
    const activeToken = token || window.localStorage.getItem(AUTH_TOKEN_KEY)

    if (!activeToken) {
      return { ok: false, error: 'Sessioon puudub.' }
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${activeToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        return { ok: false, error: readErrorMessage(payload, 'Parooli vahetamine ebaõnnestus.') }
      }

      return commitAuthResponse(payload)
        ? { ok: true }
        : { ok: false, error: 'Sessiooni uuendamine ebaõnnestus.' }
    } catch {
      return { ok: false, error: 'Serveriga ei saanud ühendust.' }
    }
  }

  const requestPasswordReset = async (credentials: RequestPasswordResetCredentials): Promise<AuthActionResult> => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/request-password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        return { ok: false, error: readErrorMessage(payload, 'Parooli reseti taotlus ebaõnnestus.') }
      }

      return { ok: true }
    } catch {
      return { ok: false, error: 'Serveriga ei saanud ühendust.' }
    }
  }

  return {
    changePassword,
    requestPasswordReset,
    user,
    token,
    status,
    isAuthenticated: status === 'authenticated',
    login,
    logout,
    refreshSession,
    register,
  }
}