export interface Bindings {
  DB: D1Database
  RESEND_API_KEY?: string
  RESEND_FROM_ADDRESS?: string
  PASSWORD_RESET_BASE_URL?: string
  ADMIN_NOTIFY_EMAIL?: string
}

export interface AuthUser {
  id: string
  name: string
  email: string
  role: 'admin' | 'user'
}

export interface SessionContext {
  user: AuthUser
  token: string
}

export interface Variables {
  session?: SessionContext
}
