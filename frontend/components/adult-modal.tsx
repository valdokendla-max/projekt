'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { Language } from '@/lib/image-prompts'

interface AdultModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (subject: string) => void
  language: Language
}

const AGE_FLAG_KEY = 'vk_adult_18_confirmed_at'

const COPY = {
  est: {
    gateTitle: 'Sisu täiskasvanutele',
    gateText: 'Selle sektsiooni avamiseks pead kinnitama, et oled vähemalt 18 aastat vana.',
    gateCheckbox: 'Olen vähemalt 18 aastat vana ja nõustun nägema täiskasvanute sisu',
    gateContinue: 'Jätka',
    title: 'Loo täiskasvanute pilt',
    subjectLabel: 'Kirjelda stseeni (inglise keeles toimib paremini)',
    subjectPlaceholder: 'nt beautiful adult woman, nude, lying on bed, soft lighting, photorealistic',
    cancel: 'Tühista',
    submit: 'Genereeri',
  },
  eng: {
    gateTitle: 'Adult content',
    gateText: 'To access this section, you must confirm you are at least 18 years old.',
    gateCheckbox: 'I am at least 18 years old and consent to viewing adult content',
    gateContinue: 'Continue',
    title: 'Create adult image',
    subjectLabel: 'Describe the scene (English works best)',
    subjectPlaceholder: 'e.g. beautiful adult woman, nude, lying on bed, soft lighting, photorealistic',
    cancel: 'Cancel',
    submit: 'Generate',
  },
} as const

export function AdultModal({ open, onOpenChange, onSubmit, language }: AdultModalProps) {
  const copy = COPY[language]
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [gateChecked, setGateChecked] = useState(false)
  const [subject, setSubject] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    if (typeof window === 'undefined') return
    setAgeConfirmed(Boolean(window.localStorage.getItem(AGE_FLAG_KEY)))
  }, [open])

  const reset = () => {
    setSubject('')
    setError('')
  }

  const handleClose = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const handleConfirmAge = () => {
    if (!gateChecked) return
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(AGE_FLAG_KEY, new Date().toISOString())
    }
    setAgeConfirmed(true)
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = subject.trim()
    if (trimmed.length < 3) {
      setError(language === 'eng' ? 'Describe the scene (min 3 characters).' : 'Kirjelda stseeni (vähemalt 3 tähemärki).')
      return
    }
    onSubmit(trimmed)
    handleClose(false)
  }

  // ---- Age gate ----
  if (!ageConfirmed) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{copy.gateTitle}</DialogTitle>
            <p className="text-sm text-cyan-100/60">{copy.gateText}</p>
          </DialogHeader>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-primary/14 bg-black/40 px-3 py-3 text-sm text-cyan-50">
            <input
              type="checkbox"
              checked={gateChecked}
              onChange={(e) => setGateChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4"
            />
            <span>{copy.gateCheckbox}</span>
          </label>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => handleClose(false)}>{copy.cancel}</Button>
            <Button type="button" disabled={!gateChecked} onClick={handleConfirmAge}>{copy.gateContinue}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // ---- Single freeform subject input ----
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/60" htmlFor="adult-subject">
              {copy.subjectLabel}
            </label>
            <textarea
              id="adult-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={copy.subjectPlaceholder}
              maxLength={400}
              rows={5}
              className="w-full rounded-2xl border border-primary/14 bg-black/40 px-3 py-2 text-sm text-cyan-50 placeholder:text-cyan-100/30 focus:border-primary/32 focus:outline-none"
              required
            />
            <div className="mt-1 text-right text-[10px] text-cyan-100/40">{subject.length}/400</div>
          </div>
          {error && (
            <p className="rounded-2xl border border-red-500/24 bg-red-500/8 px-3 py-2 text-xs text-red-200">{error}</p>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => handleClose(false)}>{copy.cancel}</Button>
            <Button type="submit">{copy.submit}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
