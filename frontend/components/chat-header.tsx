'use client'

import { useState } from 'react'
import { BookOpen, KeyRound, LogIn, LogOut, RotateCcw, UserPlus } from 'lucide-react'
import type { AuthActionResult, AuthUser, ChangePasswordCredentials, LoginCredentials, RegisterCredentials, RequestPasswordResetCredentials } from '@/hooks/use-auth'
import { AuthDialog } from '@/components/auth-dialog'
import { BrandLogo } from '@/components/brand-logo'
import { PasswordChangeDialog } from '@/components/password-change-dialog'

interface ChatHeaderProps {
  authStatus: 'loading' | 'authenticated' | 'anonymous'
  onChangePassword: (credentials: ChangePasswordCredentials) => Promise<AuthActionResult>
  currentUser: AuthUser | null
  hasMessages: boolean
  language: 'est' | 'eng'
  onLanguageChange: (lang: 'est' | 'eng') => void
  onLogin: (credentials: LoginCredentials) => Promise<AuthActionResult>
  onLogout: () => Promise<void> | void
  onReset: () => void
  onOpenKnowledge: () => void
  onRegister: (credentials: RegisterCredentials) => Promise<AuthActionResult>
  onRequestPasswordReset: (credentials: RequestPasswordResetCredentials) => Promise<AuthActionResult>
}

export function ChatHeader({
  authStatus,
  onChangePassword,
  currentUser,
  hasMessages,
  language,
  onLanguageChange,
  onLogin,
  onLogout,
  onReset,
  onOpenKnowledge,
  onRegister,
  onRequestPasswordReset,
}: ChatHeaderProps) {
  const [authDialogOpen, setAuthDialogOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [dialogInstance, setDialogInstance] = useState(0)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const showKnowledgeButton = authStatus === 'authenticated' && currentUser?.role === 'admin'

  const openAuthDialog = (mode: 'login' | 'register') => {
    setAuthMode(mode)
    setDialogInstance((current) => current + 1)
    setAuthDialogOpen(true)
  }

  const initials = currentUser?.name
    ?.split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  return (
    <>
      <header className="relative overflow-hidden rounded-[30px] border border-primary/12 bg-black/26 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_20px_50px_rgba(0,0,0,0.25)]">
        <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-linear-to-r from-transparent via-cyan-200/55 to-transparent" />

        <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[auto_minmax(0,1fr)_auto] xl:items-center">
          <div className="flex items-center gap-3">
            <a
              href="https://vkgraveerimine.eu"
              target="_blank"
              rel="noopener noreferrer"
              title="VK Laser Graveerimine"
              className="flex items-center justify-center rounded-2xl border border-primary/16 bg-black/30 px-3 py-2 transition-all hover:border-primary/32 hover:bg-black/40 shadow-[0_0_18px_rgba(84,244,255,0.1)]"
            >
              <svg width="48" height="40" viewBox="0 0 48 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <polygon points="24,1 44,12 44,28 24,39 4,28 4,12" fill="none" stroke="url(#vkGrad)" strokeWidth="1.5"/>
                <text x="24" y="26" textAnchor="middle" fontFamily="sans-serif" fontWeight="800" fontSize="16" fill="url(#vkGrad)">VK</text>
                <defs>
                  <linearGradient id="vkGrad" x1="0" y1="0" x2="48" y2="40" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#f0f" />
                    <stop offset="50%" stopColor="#0ff" />
                    <stop offset="100%" stopColor="#80f" />
                  </linearGradient>
                </defs>
              </svg>
            </a>
            <div className="flex items-center gap-3 rounded-3xl border border-primary/12 bg-black/28 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <BrandLogo variant="header" />
              <div>
                <h1 className="text-sm font-semibold leading-none text-cyan-50">Laser Graveerimine</h1>
                <p className="mt-1 text-xs text-cyan-100/45">Lasergraveerimise assistent</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-start gap-2 xl:justify-center xl:px-6">
            {authStatus === 'authenticated' && currentUser ? (
              <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-primary/14 bg-linear-to-r from-cyan-300/10 via-black/26 to-black/34 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-200/22 bg-cyan-300/14 text-sm font-semibold text-cyan-50">
                  {initials || 'LG'}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100/52">Sessioon aktiivne</p>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="max-w-56 truncate text-sm font-semibold text-cyan-50">{currentUser.name}</p>
                    <span className="inline-flex items-center rounded-full border border-cyan-200/18 bg-cyan-300/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-50">
                      {currentUser.role === 'admin' ? 'Admin' : 'Kasutaja'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPasswordDialogOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-primary/14 bg-black/32 px-4 py-2 text-xs font-medium text-cyan-100/72 transition-colors hover:text-cyan-50"
                >
                  <KeyRound className="h-3 w-3" />
                  Muuda parooli
                </button>
                <button
                  onClick={() => void onLogout()}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/4 px-4 py-2 text-xs font-medium text-slate-300 transition-colors hover:text-white"
                >
                  <LogOut className="h-3 w-3" />
                  Logi välja
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 rounded-3xl border border-primary/14 bg-black/30 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100/52">Konto</span>
                <button
                  onClick={() => openAuthDialog('login')}
                  disabled={authStatus === 'loading'}
                  className="inline-flex items-center gap-2 rounded-full border border-primary/14 bg-black/32 px-4 py-2 text-xs font-medium text-cyan-100/72 transition-colors hover:text-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <LogIn className="h-3 w-3" />
                  {authStatus === 'loading' ? 'Kontrollin' : 'Logi sisse'}
                </button>
                <button
                  onClick={() => openAuthDialog('register')}
                  disabled={authStatus === 'loading'}
                  className="inline-flex items-center gap-2 rounded-full border border-cyan-200/18 bg-cyan-300/12 px-4 py-2 text-xs font-medium text-cyan-50 transition-colors hover:bg-cyan-300/18 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <UserPlus className="h-3 w-3" />
                  Registreeru
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 self-end xl:self-auto xl:justify-self-end">
            {currentUser?.role !== 'admin' && authStatus !== 'loading' ? (
              <div className="flex items-center gap-0.5 rounded-full border border-white/10 bg-black/28 p-1">
                <button
                  type="button"
                  onClick={() => onLanguageChange('est')}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${language === 'est' ? 'bg-cyan-300/18 text-cyan-50' : 'text-cyan-100/46 hover:text-cyan-50'}`}
                >
                  EST
                </button>
                <button
                  type="button"
                  onClick={() => onLanguageChange('eng')}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${language === 'eng' ? 'bg-cyan-300/18 text-cyan-50' : 'text-cyan-100/46 hover:text-cyan-50'}`}
                >
                  ENG
                </button>
              </div>
            ) : null}
            {showKnowledgeButton ? (
              <button
                onClick={onOpenKnowledge}
                className="inline-flex items-center gap-2 rounded-full border border-primary/14 bg-black/32 px-4 py-2 text-xs font-medium text-cyan-100/72 transition-colors hover:text-cyan-50"
              >
                <BookOpen className="h-3 w-3" />
                Teadmised
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <AuthDialog
        key={`${dialogInstance}-${authMode}`}
        initialMode={authMode}
        onLogin={onLogin}
        onOpenChange={setAuthDialogOpen}
        onRegister={onRegister}
        onRequestPasswordReset={onRequestPasswordReset}
        open={authDialogOpen}
      />

      <PasswordChangeDialog
        onOpenChange={setPasswordDialogOpen}
        onSubmit={onChangePassword}
        open={passwordDialogOpen}
      />
    </>
  )
}
