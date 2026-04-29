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

type UiLanguage = 'et' | 'en'

interface PasswordChangeDialogProps {
  language?: UiLanguage
  onOpenChange: (open: boolean) => void
  onSubmit: (credentials: ChangePasswordCredentials) => Promise<AuthActionResult>
  open: boolean
}

const emptyForm = {
  currentPassword: '',
  nextPassword: '',
  confirmPassword: '',
}

const PASSWORD_DIALOG_COPY = {
  et: {
    security: 'Konto turve',
    title: 'Muuda parooli',
    description: 'Pärast parooli vahetust uuendatakse sinu aktiivne sessioon ja vanad sessioonid lõpetatakse.',
    fillAll: 'Täida kõik parooliväljad.',
    minLength: 'Uus parool peab olema vähemalt 8 tähemärki pikk.',
    mismatch: 'Uued paroolid ei kattu.',
    changeFailed: 'Parooli vahetamine ebaõnnestus.',
    currentPassword: 'Praegune parool',
    currentPasswordPlaceholder: 'Sisesta praegune parool',
    newPassword: 'Uus parool',
    minChars: 'Vähemalt 8 märki',
    repeatNewPassword: 'Korda uut parooli',
    repeatNewPasswordPlaceholder: 'Korda uut parooli',
    info: 'Turvalisuse huvides logitakse teised sama konto sessioonid pärast paroolivahetust välja.',
    save: 'Salvesta uus parool',
  },
  en: {
    security: 'Account security',
    title: 'Change password',
    description: 'After changing the password, your active session is refreshed and old sessions are terminated.',
    fillAll: 'Fill in all password fields.',
    minLength: 'The new password must be at least 8 characters long.',
    mismatch: 'The new passwords do not match.',
    changeFailed: 'Password change failed.',
    currentPassword: 'Current password',
    currentPasswordPlaceholder: 'Enter current password',
    newPassword: 'New password',
    minChars: 'At least 8 characters',
    repeatNewPassword: 'Repeat new password',
    repeatNewPasswordPlaceholder: 'Repeat new password',
    info: 'For security reasons, other sessions of the same account are signed out after the password change.',
    save: 'Save new password',
  },
} satisfies Record<UiLanguage, {
  security: string
  title: string
  description: string
  fillAll: string
  minLength: string
  mismatch: string
  changeFailed: string
  currentPassword: string
  currentPasswordPlaceholder: string
  newPassword: string
  minChars: string
  repeatNewPassword: string
  repeatNewPasswordPlaceholder: string
  info: string
  save: string
}>

export function PasswordChangeDialog({ language = 'et', onOpenChange, onSubmit, open }: PasswordChangeDialogProps) {
  const copy = PASSWORD_DIALOG_COPY[language]
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
      setError(copy.fillAll)
      return
    }

    if (form.nextPassword.length < 8) {
      setError(copy.minLength)
      return
    }

    if (form.nextPassword !== form.confirmPassword) {
      setError(copy.mismatch)
      return
    }

    setIsSubmitting(true)

    const result = await onSubmit({
      currentPassword: form.currentPassword,
      nextPassword: form.nextPassword,
    })

    setIsSubmitting(false)

    if (!result.ok) {
      setError(result.error || copy.changeFailed)
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
              {copy.security}
            </span>
            <DialogTitle className="text-2xl font-semibold uppercase tracking-[0.08em] text-cyan-50">
              {copy.title}
            </DialogTitle>
            <DialogDescription className="max-w-md text-sm leading-relaxed text-cyan-100/55">
              {copy.description}
            </DialogDescription>
          </DialogHeader>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="auth-current-password" className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/58">
                <LockKeyhole className="h-3.5 w-3.5 text-cyan-300" />
                  {copy.currentPassword}
              </Label>
              <Input
                id="auth-current-password"
                type="password"
                autoComplete="current-password"
                value={form.currentPassword}
                onChange={(event) => setForm((current) => ({ ...current, currentPassword: event.target.value }))}
                className="h-11 rounded-2xl border-primary/14 bg-black/36 px-4 text-cyan-50 placeholder:text-cyan-100/32"
                placeholder={copy.currentPasswordPlaceholder}
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="auth-next-password" className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/58">
                  <LockKeyhole className="h-3.5 w-3.5 text-cyan-300" />
                  {copy.newPassword}
                </Label>
                <Input
                  id="auth-next-password"
                  type="password"
                  autoComplete="new-password"
                  value={form.nextPassword}
                  onChange={(event) => setForm((current) => ({ ...current, nextPassword: event.target.value }))}
                  className="h-11 rounded-2xl border-primary/14 bg-black/36 px-4 text-cyan-50 placeholder:text-cyan-100/32"
                  placeholder={copy.minChars}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="auth-confirm-next-password" className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/58">
                  <LockKeyhole className="h-3.5 w-3.5 text-cyan-300" />
                  {copy.repeatNewPassword}
                </Label>
                <Input
                  id="auth-confirm-next-password"
                  type="password"
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                  className="h-11 rounded-2xl border-primary/14 bg-black/36 px-4 text-cyan-50 placeholder:text-cyan-100/32"
                  placeholder={copy.repeatNewPasswordPlaceholder}
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
                {copy.info}
              </p>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-11 rounded-full bg-cyan-300 px-5 text-sm font-semibold text-slate-950 hover:bg-cyan-200"
              >
                {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                {copy.save}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}