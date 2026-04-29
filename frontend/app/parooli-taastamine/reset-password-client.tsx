'use client'

import Link from 'next/link'
import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import { LoaderCircle, LockKeyhole, MailCheck } from 'lucide-react'
import { getClientBackendUrl } from '@/lib/backend-url'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type UiLanguage = 'et' | 'en'

const BACKEND_URL = getClientBackendUrl()
const LANGUAGE_KEY = 'laser-graveerimine:ui-language'

const COPY = {
  et: {
    badge: 'Parooli taastamine',
    title: 'Sisesta uus parool',
    description: 'See link on saadetud sinu e-postile. Määra uus parool ja logi seejärel uuesti sisse.',
    password: 'Uus parool',
    confirmPassword: 'Korda uut parooli',
    passwordPlaceholder: 'Vähemalt 8 märki',
    verifyFailed: 'Parooli taastamise link on aegunud või vigane.',
    tokenMissing: 'Parooli taastamise link puudub või on vigane.',
    mismatch: 'Paroolid ei kattu.',
    minLength: 'Uus parool peab olema vähemalt 8 tähemärki pikk.',
    submit: 'Salvesta uus parool',
    submitting: 'Salvestan...',
    success: 'Parool on uuendatud. Nüüd saad avalehel sisse logida.',
    backHome: 'Tagasi avalehele',
    verifying: 'Kontrollin linki...',
  },
  en: {
    badge: 'Password reset',
    title: 'Enter a new password',
    description: 'This link was sent to your email. Set a new password and then sign in again.',
    password: 'New password',
    confirmPassword: 'Repeat new password',
    passwordPlaceholder: 'At least 8 characters',
    verifyFailed: 'The password reset link is invalid or expired.',
    tokenMissing: 'The password reset link is missing or invalid.',
    mismatch: 'The passwords do not match.',
    minLength: 'The new password must be at least 8 characters long.',
    submit: 'Save new password',
    submitting: 'Saving...',
    success: 'Your password has been updated. You can now sign in on the homepage.',
    backHome: 'Back to homepage',
    verifying: 'Checking the link...',
  },
} satisfies Record<UiLanguage, Record<string, string>>

export function ResetPasswordClient() {
  const searchParams = useSearchParams()
  const [language, setLanguage] = useState<UiLanguage>('et')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isVerifying, setIsVerifying] = useState(true)

  const token = String(searchParams.get('token') || '').trim()
  const copy = COPY[language]

  useEffect(() => {
    const storedLanguage = window.localStorage.getItem(LANGUAGE_KEY)
    if (storedLanguage === 'en' || storedLanguage === 'et') {
      setLanguage(storedLanguage)
    }
  }, [])

  useEffect(() => {
    if (!token) {
      setError(copy.tokenMissing)
      setIsVerifying(false)
      return
    }

    let cancelled = false

    void (async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/auth/password-reset/verify?token=${encodeURIComponent(token)}`, {
          cache: 'no-store',
        })

        if (!response.ok) {
          throw new Error(copy.verifyFailed)
        }

        if (!cancelled) {
          setError('')
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : copy.verifyFailed)
        }
      } finally {
        if (!cancelled) {
          setIsVerifying(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [copy.tokenMissing, copy.verifyFailed, token])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!token) {
      setError(copy.tokenMissing)
      return
    }

    if (password.length < 8) {
      setError(copy.minLength)
      return
    }

    if (password !== confirmPassword) {
      setError(copy.mismatch)
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, nextPassword: password }),
      })

      const payload = await response.json().catch(() => null) as { error?: string } | null

      if (!response.ok) {
        throw new Error(payload?.error || copy.verifyFailed)
      }

      setSuccess(copy.success)
      setPassword('')
      setConfirmPassword('')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : copy.verifyFailed)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(84,244,255,0.18),rgba(3,9,16,0.98)_38%),linear-gradient(180deg,rgba(5,15,24,0.98),rgba(2,7,12,0.98))] px-4 py-10 text-cyan-50">
      <div className="mx-auto max-w-xl rounded-4xl border border-primary/14 bg-black/30 p-6 shadow-[0_32px_90px_rgba(0,0,0,0.45)] sm:p-8">
        <span className="hud-label w-fit">{copy.badge}</span>
        <h1 className="mt-4 text-3xl font-semibold uppercase tracking-[0.08em] text-cyan-50">{copy.title}</h1>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-cyan-100/60">{copy.description}</p>

        {isVerifying ? (
          <div className="mt-8 flex items-center gap-3 rounded-2xl border border-primary/14 bg-black/36 px-4 py-4 text-sm text-cyan-100/70">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            {copy.verifying}
          </div>
        ) : success ? (
          <div className="mt-8 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-4 text-sm text-emerald-100">
            <div className="flex items-center gap-2 font-medium">
              <MailCheck className="h-4 w-4" />
              {success}
            </div>
            <div className="mt-4">
              <Link href="/" className="inline-flex items-center rounded-full border border-emerald-300/30 bg-emerald-300/18 px-4 py-2 text-sm font-semibold text-emerald-50 transition-colors hover:bg-emerald-300/24">
                {copy.backHome}
              </Link>
            </div>
          </div>
        ) : (
          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="reset-password" className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/58">
                <LockKeyhole className="h-3.5 w-3.5 text-cyan-300" />
                {copy.password}
              </Label>
              <Input
                id="reset-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 rounded-2xl border-primary/14 bg-black/36 px-4 text-cyan-50 placeholder:text-cyan-100/32"
                placeholder={copy.passwordPlaceholder}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reset-password-confirm" className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/58">
                <LockKeyhole className="h-3.5 w-3.5 text-cyan-300" />
                {copy.confirmPassword}
              </Label>
              <Input
                id="reset-password-confirm"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="h-11 rounded-2xl border-primary/14 bg-black/36 px-4 text-cyan-50 placeholder:text-cyan-100/32"
                placeholder={copy.passwordPlaceholder}
                required
              />
            </div>

            {error ? (
              <div className="rounded-2xl border border-rose-400/18 bg-rose-400/8 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            ) : null}

            <Button type="submit" disabled={isSubmitting} className="h-11 rounded-full bg-cyan-300 px-5 text-sm font-semibold text-slate-950 hover:bg-cyan-200">
              {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {isSubmitting ? copy.submitting : copy.submit}
            </Button>
          </form>
        )}
      </div>
    </main>
  )
}