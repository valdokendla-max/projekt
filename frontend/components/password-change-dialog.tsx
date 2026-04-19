'use client'

import { FormEvent, useState } from 'react'
import { KeyRound, LoaderCircle, LockKeyhole } from 'lucide-react'
import type { AuthActionResult, ChangePasswordCredentials } from '@/hooks/use-auth'
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

interface PasswordChangeDialogProps {
  onOpenChange: (open: boolean) => void
  onSubmit: (credentials: ChangePasswordCredentials) => Promise<AuthActionResult>
  open: boolean
}

const emptyForm = {
  currentPassword: '',
  nextPassword: '',
  confirmPassword: '',
}

export function PasswordChangeDialog({ onOpenChange, onSubmit, open }: PasswordChangeDialogProps) {
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const closeDialog = () => {
    setError('')
    setIsSubmitting(false)
    setForm(emptyForm)
    onOpenChange(false)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (!form.currentPassword || !form.nextPassword || !form.confirmPassword) {
      setError('Täida kõik parooliväljad.')
      return
    }

    if (form.nextPassword.length < 8) {
      setError('Uus parool peab olema vähemalt 8 tähemärki pikk.')
      return
    }

    if (form.nextPassword !== form.confirmPassword) {
      setError('Uued paroolid ei kattu.')
      return
    }

    setIsSubmitting(true)

    const result = await onSubmit({
      currentPassword: form.currentPassword,
      nextPassword: form.nextPassword,
    })

    setIsSubmitting(false)

    if (!result.ok) {
      setError(result.error || 'Parooli vahetamine ebaõnnestus.')
      return
    }

    closeDialog()
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!nextOpen) {
        closeDialog()
        return
      }

      onOpenChange(true)
    }}>
      <DialogContent
        className="overflow-hidden border border-primary/14 bg-[radial-gradient(circle_at_top,rgba(84,244,255,0.16),rgba(3,9,16,0.98)_42%),linear-gradient(180deg,rgba(5,15,24,0.98),rgba(2,7,12,0.98))] p-0 text-cyan-50 shadow-[0_32px_90px_rgba(0,0,0,0.5)] sm:max-w-125"
        showCloseButton={false}
      >
        <div className="pointer-events-none absolute inset-x-14 top-0 h-px bg-linear-to-r from-transparent via-cyan-200/65 to-transparent" />

        <div className="p-6 sm:p-7">
          <DialogHeader className="text-left">
            <span className="hud-label w-fit">
              <KeyRound className="h-3.5 w-3.5" />
              Konto turve
            </span>
            <DialogTitle className="text-2xl font-semibold uppercase tracking-[0.08em] text-cyan-50">
              Muuda parooli
            </DialogTitle>
            <DialogDescription className="max-w-md text-sm leading-relaxed text-cyan-100/55">
              Pärast parooli vahetust uuendatakse sinu aktiivne sessioon ja vanad sessioonid lõpetatakse.
            </DialogDescription>
          </DialogHeader>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="auth-current-password" className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/58">
                <LockKeyhole className="h-3.5 w-3.5 text-cyan-300" />
                Praegune parool
              </Label>
              <Input
                id="auth-current-password"
                type="password"
                autoComplete="current-password"
                value={form.currentPassword}
                onChange={(event) => setForm((current) => ({ ...current, currentPassword: event.target.value }))}
                className="h-11 rounded-2xl border-primary/14 bg-black/36 px-4 text-cyan-50 placeholder:text-cyan-100/32"
                placeholder="Sisesta praegune parool"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="auth-next-password" className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/58">
                  <LockKeyhole className="h-3.5 w-3.5 text-cyan-300" />
                  Uus parool
                </Label>
                <Input
                  id="auth-next-password"
                  type="password"
                  autoComplete="new-password"
                  value={form.nextPassword}
                  onChange={(event) => setForm((current) => ({ ...current, nextPassword: event.target.value }))}
                  className="h-11 rounded-2xl border-primary/14 bg-black/36 px-4 text-cyan-50 placeholder:text-cyan-100/32"
                  placeholder="Vähemalt 8 märki"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="auth-confirm-next-password" className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/58">
                  <LockKeyhole className="h-3.5 w-3.5 text-cyan-300" />
                  Korda uut parooli
                </Label>
                <Input
                  id="auth-confirm-next-password"
                  type="password"
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                  className="h-11 rounded-2xl border-primary/14 bg-black/36 px-4 text-cyan-50 placeholder:text-cyan-100/32"
                  placeholder="Korda uut parooli"
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
                Turvalisuse huvides logitakse teised sama konto sessioonid pärast paroolivahetust välja.
              </p>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-11 rounded-full bg-cyan-300 px-5 text-sm font-semibold text-slate-950 hover:bg-cyan-200"
              >
                {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                Salvesta uus parool
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}