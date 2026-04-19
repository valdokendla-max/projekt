'use client'

import { FormEvent, useEffect, useState } from 'react'
import { ArrowLeft, LoaderCircle, LockKeyhole, Mail, UserRound } from 'lucide-react'
import type { AuthActionResult, LoginCredentials, RegisterCredentials, RequestPasswordResetCredentials } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type AuthMode = 'login' | 'register'

interface AuthDialogProps {
  initialMode: AuthMode
  onLogin: (credentials: LoginCredentials) => Promise<AuthActionResult>
  onOpenChange: (open: boolean) => void
  onRegister: (credentials: RegisterCredentials) => Promise<AuthActionResult>
  onRequestPasswordReset: (credentials: RequestPasswordResetCredentials) => Promise<AuthActionResult>
  open: boolean
}

const emptyLoginForm = {
  email: '',
  password: '',
}

const emptyRegisterForm = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
}

const emptyPasswordResetForm = {
  email: '',
  note: '',
}

export function AuthDialog({
  initialMode,
  onLogin,
  onOpenChange,
  onRegister,
  onRequestPasswordReset,
  open,
}: AuthDialogProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loginForm, setLoginForm] = useState(emptyLoginForm)
  const [registerForm, setRegisterForm] = useState(emptyRegisterForm)
  const [passwordResetForm, setPasswordResetForm] = useState(emptyPasswordResetForm)
  const [showPasswordReset, setShowPasswordReset] = useState(false)
  const [passwordResetSuccess, setPasswordResetSuccess] = useState('')

  useEffect(() => {
    if (!open) {
      setMode(initialMode)
      setError('')
      setIsSubmitting(false)
      setLoginForm(emptyLoginForm)
      setRegisterForm(emptyRegisterForm)
      setPasswordResetForm(emptyPasswordResetForm)
      setShowPasswordReset(false)
      setPasswordResetSuccess('')
    }
  }, [initialMode, open])

  const closeDialog = () => {
    setError('')
    setIsSubmitting(false)
    setPasswordResetSuccess('')
    setPasswordResetForm(emptyPasswordResetForm)
    setShowPasswordReset(false)
    onOpenChange(false)
  }

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    const result = await onLogin(loginForm)

    setIsSubmitting(false)
    if (!result.ok) {
      setError(result.error || 'Sisselogimine ebaõnnestus.')
      return
    }

    setLoginForm(emptyLoginForm)
    setRegisterForm(emptyRegisterForm)
    closeDialog()
  }

  const handleRegisterSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (registerForm.password !== registerForm.confirmPassword) {
      setError('Paroolid ei kattu.')
      return
    }

    setIsSubmitting(true)

    const result = await onRegister({
      name: registerForm.name,
      email: registerForm.email,
      password: registerForm.password,
    })

    setIsSubmitting(false)
    if (!result.ok) {
      setError(result.error || 'Registreerimine ebaõnnestus.')
      return
    }

    setLoginForm(emptyLoginForm)
    setRegisterForm(emptyRegisterForm)
    closeDialog()
  }

  const handlePasswordResetRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setPasswordResetSuccess('')
    setIsSubmitting(true)

    const result = await onRequestPasswordReset(passwordResetForm)

    setIsSubmitting(false)
    if (!result.ok) {
      setError(result.error || 'Parooli reseti taotlus ebaõnnestus.')
      return
    }

    setPasswordResetSuccess('Kui konto on olemas, jõuab parooli reseti taotlus adminini. Admin saab sulle luua ajutise parooli, millega sisse logida ja seejärel parool kohe ära vahetada.')
    setPasswordResetForm(emptyPasswordResetForm)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="overflow-hidden border border-primary/14 bg-[radial-gradient(circle_at_top,rgba(84,244,255,0.16),rgba(3,9,16,0.98)_42%),linear-gradient(180deg,rgba(5,15,24,0.98),rgba(2,7,12,0.98))] p-0 text-cyan-50 shadow-[0_32px_90px_rgba(0,0,0,0.5)] sm:max-w-140"
        showCloseButton={false}
      >
        <div className="pointer-events-none absolute inset-x-14 top-0 h-px bg-linear-to-r from-transparent via-cyan-200/65 to-transparent" />

        <div className="p-6 sm:p-7">
          <DialogHeader className="text-left">
            <span className="hud-label w-fit">Kontojuurdepääs</span>
            <DialogTitle className="text-2xl font-semibold uppercase tracking-[0.08em] text-cyan-50">
              {showPasswordReset ? 'Taotle parooli resetti' : 'Logi sisse või loo konto'}
            </DialogTitle>
            <DialogDescription className="max-w-md text-sm leading-relaxed text-cyan-100/55">
              {showPasswordReset
                ? 'Mailiserveri asemel läheb taotlus adminile, kes saab sulle luua ajutise parooli.'
                : 'Sessioon salvestatakse lokaalselt ja taastub automaatselt, kuni logid välja või token aegub.'}
            </DialogDescription>
          </DialogHeader>

          {showPasswordReset ? (
            <form className="mt-6 space-y-4" onSubmit={handlePasswordResetRequest}>
              <div className="space-y-2">
                <Label htmlFor="auth-reset-email" className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/58">
                  <Mail className="h-3.5 w-3.5 text-cyan-300" />
                  E-post
                </Label>
                <Input
                  id="auth-reset-email"
                  type="email"
                  autoComplete="email"
                  value={passwordResetForm.email}
                  onChange={(event) => setPasswordResetForm((current) => ({ ...current, email: event.target.value }))}
                  className="h-11 rounded-2xl border-primary/14 bg-black/36 px-4 text-cyan-50 placeholder:text-cyan-100/32"
                  placeholder="nimi@domeen.ee"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="auth-reset-note" className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/58">
                  <UserRound className="h-3.5 w-3.5 text-cyan-300" />
                  Märkus adminile
                </Label>
                <textarea
                  id="auth-reset-note"
                  value={passwordResetForm.note}
                  onChange={(event) => setPasswordResetForm((current) => ({ ...current, note: event.target.value }))}
                  className="min-h-28 w-full resize-none rounded-2xl border border-primary/14 bg-black/36 px-4 py-3 text-sm text-cyan-50 placeholder:text-cyan-100/32 focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Soovi korral lisa märkus, näiteks et vajad uut ajutist parooli."
                  maxLength={500}
                />
              </div>

              {error && (
                <div className="rounded-2xl border border-rose-400/18 bg-rose-400/8 px-4 py-3 text-sm text-rose-100">
                  {error}
                </div>
              )}

              {passwordResetSuccess && (
                <div className="rounded-2xl border border-emerald-400/18 bg-emerald-400/8 px-4 py-3 text-sm text-emerald-100">
                  {passwordResetSuccess}
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordReset(false)
                    setError('')
                    setPasswordResetSuccess('')
                  }}
                  className="inline-flex items-center gap-2 text-xs font-medium text-cyan-100/55 transition-colors hover:text-cyan-50"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Tagasi sisselogimisse
                </button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-11 rounded-full bg-cyan-300 px-5 text-sm font-semibold text-slate-950 hover:bg-cyan-200"
                >
                  {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                  Saada taotlus
                </Button>
              </div>
            </form>
          ) : (
            <Tabs value={mode} onValueChange={(value) => {
              setMode(value as AuthMode)
              setError('')
            }} className="mt-6">
              <TabsList className="h-auto w-full rounded-full border border-primary/14 bg-black/32 p-1">
                <TabsTrigger
                  value="login"
                  className="rounded-full border-0 px-4 py-2 text-sm text-cyan-100/68 data-[state=active]:bg-cyan-300 data-[state=active]:text-slate-950 data-[state=active]:shadow-none"
                >
                  Logi sisse
                </TabsTrigger>
                <TabsTrigger
                  value="register"
                  className="rounded-full border-0 px-4 py-2 text-sm text-cyan-100/68 data-[state=active]:bg-cyan-300 data-[state=active]:text-slate-950 data-[state=active]:shadow-none"
                >
                  Registreeru
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-5">
                <form className="space-y-4" onSubmit={handleLoginSubmit}>
                  <div className="space-y-2">
                    <Label htmlFor="auth-login-email" className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/58">
                      <Mail className="h-3.5 w-3.5 text-cyan-300" />
                      E-post
                    </Label>
                    <Input
                      id="auth-login-email"
                      type="email"
                      autoComplete="email"
                      value={loginForm.email}
                      onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
                      className="h-11 rounded-2xl border-primary/14 bg-black/36 px-4 text-cyan-50 placeholder:text-cyan-100/32"
                      placeholder="nimi@domeen.ee"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="auth-login-password" className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/58">
                      <LockKeyhole className="h-3.5 w-3.5 text-cyan-300" />
                      Parool
                    </Label>
                    <Input
                      id="auth-login-password"
                      type="password"
                      autoComplete="current-password"
                      value={loginForm.password}
                      onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                      className="h-11 rounded-2xl border-primary/14 bg-black/36 px-4 text-cyan-50 placeholder:text-cyan-100/32"
                      placeholder="Sisesta parool"
                      required
                    />
                  </div>

                  {error && (
                    <div className="rounded-2xl border border-rose-400/18 bg-rose-400/8 px-4 py-3 text-sm text-rose-100">
                      {error}
                    </div>
                  )}

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-2">
                      <p className="text-xs leading-relaxed text-cyan-100/45">
                        Kasuta sama kontot mitmel sessioonil. Token aegub 30 päeva jooksul.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setShowPasswordReset(true)
                          setError('')
                          setPasswordResetSuccess('')
                        }}
                        className="text-xs font-medium text-cyan-100/65 transition-colors hover:text-cyan-50"
                      >
                        Unustasid parooli?
                      </button>
                    </div>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="h-11 rounded-full bg-cyan-300 px-5 text-sm font-semibold text-slate-950 hover:bg-cyan-200"
                    >
                      {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                      Sisene
                    </Button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="register" className="mt-5">
                <form className="space-y-4" onSubmit={handleRegisterSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="auth-register-name" className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/58">
                      <UserRound className="h-3.5 w-3.5 text-cyan-300" />
                      Nimi
                    </Label>
                    <Input
                      id="auth-register-name"
                      type="text"
                      autoComplete="name"
                      value={registerForm.name}
                      onChange={(event) => setRegisterForm((current) => ({ ...current, name: event.target.value }))}
                      className="h-11 rounded-2xl border-primary/14 bg-black/36 px-4 text-cyan-50 placeholder:text-cyan-100/32"
                      placeholder="Sisesta oma nimi"
                      required
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="auth-register-email" className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/58">
                      <Mail className="h-3.5 w-3.5 text-cyan-300" />
                      E-post
                    </Label>
                    <Input
                      id="auth-register-email"
                      type="email"
                      autoComplete="email"
                      value={registerForm.email}
                      onChange={(event) => setRegisterForm((current) => ({ ...current, email: event.target.value }))}
                      className="h-11 rounded-2xl border-primary/14 bg-black/36 px-4 text-cyan-50 placeholder:text-cyan-100/32"
                      placeholder="nimi@domeen.ee"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="auth-register-password" className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/58">
                      <LockKeyhole className="h-3.5 w-3.5 text-cyan-300" />
                      Parool
                    </Label>
                    <Input
                      id="auth-register-password"
                      type="password"
                      autoComplete="new-password"
                      value={registerForm.password}
                      onChange={(event) => setRegisterForm((current) => ({ ...current, password: event.target.value }))}
                      className="h-11 rounded-2xl border-primary/14 bg-black/36 px-4 text-cyan-50 placeholder:text-cyan-100/32"
                      placeholder="Vähemalt 8 märki"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="auth-register-confirm" className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/58">
                      <LockKeyhole className="h-3.5 w-3.5 text-cyan-300" />
                      Korda parooli
                    </Label>
                    <Input
                      id="auth-register-confirm"
                      type="password"
                      autoComplete="new-password"
                      value={registerForm.confirmPassword}
                      onChange={(event) => setRegisterForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                      className="h-11 rounded-2xl border-primary/14 bg-black/36 px-4 text-cyan-50 placeholder:text-cyan-100/32"
                      placeholder="Korda parooli"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-2xl border border-rose-400/18 bg-rose-400/8 px-4 py-3 text-sm text-rose-100">
                    {error}
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-relaxed text-cyan-100/45">
                    Uus konto logitakse kohe sisse ja seanss taastatakse automaatselt järgmisel külastusel.
                  </p>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-11 rounded-full bg-cyan-300 px-5 text-sm font-semibold text-slate-950 hover:bg-cyan-200"
                  >
                    {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                    Loo konto
                  </Button>
                </div>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}