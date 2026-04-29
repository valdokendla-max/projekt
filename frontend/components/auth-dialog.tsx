'use client'

import { FormEvent, useState } from 'react'
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
type UiLanguage = 'et' | 'en'

interface AuthDialogProps {
  initialMode: AuthMode
  language?: UiLanguage
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
}

const AUTH_DIALOG_COPY = {
  et: {
    access: 'Kontojuurdepääs',
    resetTitle: 'Taasta parool',
    mainTitle: 'Logi sisse või loo konto',
    resetDescription: 'Sisesta oma e-post ja saad sinna parooli taastamise lingi.',
    mainDescription: 'Sessioon salvestatakse lokaalselt ja taastub automaatselt, kuni logid välja või token aegub.',
    email: 'E-post',
    backToLogin: 'Tagasi sisselogimisse',
    sendRequest: 'Saada taastamislink',
    login: 'Logi sisse',
    register: 'Registreeru',
    password: 'Parool',
    enterPassword: 'Sisesta parool',
    sessionHint: 'Kasuta sama kontot mitmel sessioonil. Token aegub 30 päeva jooksul.',
    forgotPassword: 'Unustasid parooli?',
    enter: 'Sisene',
    name: 'Nimi',
    enterName: 'Sisesta oma nimi',
    minPassword: 'Vähemalt 8 märki',
    repeatPassword: 'Korda parooli',
    createAccountHint: 'Uus konto logitakse kohe sisse ja seanss taastatakse automaatselt järgmisel külastusel.',
    createAccount: 'Loo konto',
    loginFailed: 'Sisselogimine ebaõnnestus.',
    registerFailed: 'Registreerimine ebaõnnestus.',
    passwordMismatch: 'Paroolid ei kattu.',
    resetFailed: 'Parooli taastamise e-kirja saatmine ebaõnnestus.',
    resetSuccess: 'Kui konto on olemas, saadetakse sinu e-postile parooli taastamise link.',
  },
  en: {
    access: 'Account access',
    resetTitle: 'Reset password',
    mainTitle: 'Sign in or create an account',
    resetDescription: 'Enter your email and you will receive a password reset link.',
    mainDescription: 'The session is stored locally and restores automatically until you sign out or the token expires.',
    email: 'Email',
    backToLogin: 'Back to sign in',
    sendRequest: 'Send reset link',
    login: 'Sign in',
    register: 'Register',
    password: 'Password',
    enterPassword: 'Enter password',
    sessionHint: 'Use the same account across multiple sessions. The token expires within 30 days.',
    forgotPassword: 'Forgot password?',
    enter: 'Sign in',
    name: 'Name',
    enterName: 'Enter your name',
    minPassword: 'At least 8 characters',
    repeatPassword: 'Repeat password',
    createAccountHint: 'A new account is signed in immediately and the session restores automatically on the next visit.',
    createAccount: 'Create account',
    loginFailed: 'Sign-in failed.',
    registerFailed: 'Registration failed.',
    passwordMismatch: 'Passwords do not match.',
    resetFailed: 'Sending the password reset email failed.',
    resetSuccess: 'If the account exists, a password reset link will be sent to the email address.',
  },
} satisfies Record<UiLanguage, {
  access: string
  resetTitle: string
  mainTitle: string
  resetDescription: string
  mainDescription: string
  email: string
  backToLogin: string
  sendRequest: string
  login: string
  register: string
  password: string
  enterPassword: string
  sessionHint: string
  forgotPassword: string
  enter: string
  name: string
  enterName: string
  minPassword: string
  repeatPassword: string
  createAccountHint: string
  createAccount: string
  loginFailed: string
  registerFailed: string
  passwordMismatch: string
  resetFailed: string
  resetSuccess: string
}>

export function AuthDialog({
  initialMode,
  language = 'et',
  onLogin,
  onOpenChange,
  onRegister,
  onRequestPasswordReset,
  open,
}: AuthDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <AuthDialogContent
          initialMode={initialMode}
          language={language}
          onLogin={onLogin}
          onOpenChange={onOpenChange}
          onRegister={onRegister}
          onRequestPasswordReset={onRequestPasswordReset}
        />
      ) : null}
    </Dialog>
  )
}

function AuthDialogContent({
  initialMode,
  language = 'et',
  onLogin,
  onOpenChange,
  onRegister,
  onRequestPasswordReset,
}: Omit<AuthDialogProps, 'open'>) {
  const copy = AUTH_DIALOG_COPY[language]
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loginForm, setLoginForm] = useState(emptyLoginForm)
  const [registerForm, setRegisterForm] = useState(emptyRegisterForm)
  const [passwordResetForm, setPasswordResetForm] = useState(emptyPasswordResetForm)
  const [showPasswordReset, setShowPasswordReset] = useState(false)
  const [passwordResetSuccess, setPasswordResetSuccess] = useState('')

  const closeDialog = () => {
    onOpenChange(false)
  }

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    const result = await onLogin(loginForm)

    setIsSubmitting(false)
    if (!result.ok) {
      setError(result.error || copy.loginFailed)
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
      setError(copy.passwordMismatch)
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
      setError(result.error || copy.registerFailed)
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
      setError(result.error || copy.resetFailed)
      return
    }

    setPasswordResetSuccess(copy.resetSuccess)
    setPasswordResetForm(emptyPasswordResetForm)
  }

  return (
      <DialogContent
        className="overflow-hidden border border-primary/14 bg-[radial-gradient(circle_at_top,rgba(84,244,255,0.16),rgba(3,9,16,0.98)_42%),linear-gradient(180deg,rgba(5,15,24,0.98),rgba(2,7,12,0.98))] p-0 text-cyan-50 shadow-[0_32px_90px_rgba(0,0,0,0.5)] sm:max-w-140"
        showCloseButton={false}
      >
        <div className="pointer-events-none absolute inset-x-14 top-0 h-px bg-linear-to-r from-transparent via-cyan-200/65 to-transparent" />

        <div className="p-6 sm:p-7">
          <DialogHeader className="text-left">
            <span className="hud-label w-fit">{copy.access}</span>
            <DialogTitle className="text-2xl font-semibold uppercase tracking-[0.08em] text-cyan-50">
              {showPasswordReset ? copy.resetTitle : copy.mainTitle}
            </DialogTitle>
            <DialogDescription className="max-w-md text-sm leading-relaxed text-cyan-100/55">
              {showPasswordReset
                ? copy.resetDescription
                : copy.mainDescription}
            </DialogDescription>
          </DialogHeader>

          {showPasswordReset ? (
            <form className="mt-6 space-y-4" onSubmit={handlePasswordResetRequest}>
              <div className="space-y-2">
                <Label htmlFor="auth-reset-email" className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/58">
                  <Mail className="h-3.5 w-3.5 text-cyan-300" />
                  {copy.email}
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
                  {copy.backToLogin}
                </button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-11 rounded-full bg-cyan-300 px-5 text-sm font-semibold text-slate-950 hover:bg-cyan-200"
                >
                  {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                  {copy.sendRequest}
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
                  {copy.login}
                </TabsTrigger>
                <TabsTrigger
                  value="register"
                  className="rounded-full border-0 px-4 py-2 text-sm text-cyan-100/68 data-[state=active]:bg-cyan-300 data-[state=active]:text-slate-950 data-[state=active]:shadow-none"
                >
                  {copy.register}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-5">
                <form className="space-y-4" onSubmit={handleLoginSubmit}>
                  <div className="space-y-2">
                    <Label htmlFor="auth-login-email" className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/58">
                      <Mail className="h-3.5 w-3.5 text-cyan-300" />
                      {copy.email}
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
                      {copy.password}
                    </Label>
                    <Input
                      id="auth-login-password"
                      type="password"
                      autoComplete="current-password"
                      value={loginForm.password}
                      onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                      className="h-11 rounded-2xl border-primary/14 bg-black/36 px-4 text-cyan-50 placeholder:text-cyan-100/32"
                      placeholder={copy.enterPassword}
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
                        {copy.sessionHint}
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
                        {copy.forgotPassword}
                      </button>
                    </div>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="h-11 rounded-full bg-cyan-300 px-5 text-sm font-semibold text-slate-950 hover:bg-cyan-200"
                    >
                      {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                      {copy.enter}
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
                      {copy.name}
                    </Label>
                    <Input
                      id="auth-register-name"
                      type="text"
                      autoComplete="name"
                      value={registerForm.name}
                      onChange={(event) => setRegisterForm((current) => ({ ...current, name: event.target.value }))}
                      className="h-11 rounded-2xl border-primary/14 bg-black/36 px-4 text-cyan-50 placeholder:text-cyan-100/32"
                      placeholder={copy.enterName}
                      required
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="auth-register-email" className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/58">
                      <Mail className="h-3.5 w-3.5 text-cyan-300" />
                      {copy.email}
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
                      {copy.password}
                    </Label>
                    <Input
                      id="auth-register-password"
                      type="password"
                      autoComplete="new-password"
                      value={registerForm.password}
                      onChange={(event) => setRegisterForm((current) => ({ ...current, password: event.target.value }))}
                      className="h-11 rounded-2xl border-primary/14 bg-black/36 px-4 text-cyan-50 placeholder:text-cyan-100/32"
                      placeholder={copy.minPassword}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="auth-register-confirm" className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/58">
                      <LockKeyhole className="h-3.5 w-3.5 text-cyan-300" />
                      {copy.repeatPassword}
                    </Label>
                    <Input
                      id="auth-register-confirm"
                      type="password"
                      autoComplete="new-password"
                      value={registerForm.confirmPassword}
                      onChange={(event) => setRegisterForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                      className="h-11 rounded-2xl border-primary/14 bg-black/36 px-4 text-cyan-50 placeholder:text-cyan-100/32"
                      placeholder={copy.repeatPassword}
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
                    {copy.createAccountHint}
                  </p>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-11 rounded-full bg-cyan-300 px-5 text-sm font-semibold text-slate-950 hover:bg-cyan-200"
                  >
                    {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                    {copy.createAccount}
                  </Button>
                </div>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
  )
}