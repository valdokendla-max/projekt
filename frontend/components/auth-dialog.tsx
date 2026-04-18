'use client'

import { FormEvent, useState } from 'react'
import { LoaderCircle, LockKeyhole, Mail, UserRound } from 'lucide-react'
import type { AuthActionResult, LoginCredentials, RegisterCredentials } from '@/hooks/use-auth'
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

export function AuthDialog({
  initialMode,
  onLogin,
  onOpenChange,
  onRegister,
  open,
}: AuthDialogProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loginForm, setLoginForm] = useState(emptyLoginForm)
  const [registerForm, setRegisterForm] = useState(emptyRegisterForm)

  const closeDialog = () => {
    setError('')
    setIsSubmitting(false)
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
              Logi sisse või loo konto
            </DialogTitle>
            <DialogDescription className="max-w-md text-sm leading-relaxed text-cyan-100/55">
              Sessioon salvestatakse lokaalselt ja taastub automaatselt, kuni logid välja või token aegub.
            </DialogDescription>
          </DialogHeader>

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
                  <p className="text-xs leading-relaxed text-cyan-100/45">
                    Kasuta sama kontot mitmel sessioonil. Token aegub 30 päeva jooksul.
                  </p>
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
        </div>
      </DialogContent>
    </Dialog>
  )
}