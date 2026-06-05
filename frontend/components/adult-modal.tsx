'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  ADULT_CATEGORY_LABELS,
  ADULT_VARIANTS,
  getAdultVariantsByCategory,
  type AdultCategory,
  type AdultVariant,
} from '@/lib/adult-prompts'
import type { Language } from '@/lib/image-prompts'

interface AdultModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (variant: AdultVariant, subject: string) => void
  language: Language
}

const AGE_FLAG_KEY = 'vk_adult_18_confirmed_at'
const CATEGORY_ORDER: AdultCategory[] = ['portrait', 'glamour', 'atmosphere', 'beach', 'group', 'tattoo']

const COPY = {
  est: {
    gateTitle: 'Sisu täiskasvanutele',
    gateText: 'Selle sektsiooni avamiseks pead kinnitama, et oled vähemalt 18 aastat vana. Genereeritud sisu võib sisaldada täiskasvanute teemasid (boudoir, akt, glamuur).',
    gateCheckbox: 'Olen vähemalt 18 aastat vana ja nõustun nägema täiskasvanute sisu',
    gateContinue: 'Jätka',
    title: 'Loo täiskasvanute pilt',
    pickVariant: 'Vali stiil',
    subjectLabel: 'Kirjelda subjekti (inglise keeles toimib paremini)',
    subjectPlaceholder: 'nt brunette woman in her 30s, athletic build, blue eyes',
    cancel: 'Tühista',
    back: 'Tagasi',
    submit: 'Genereeri',
  },
  eng: {
    gateTitle: 'Adult content',
    gateText: 'To access this section, you must confirm you are at least 18 years old. Generated content may include adult themes (boudoir, nude, glamour).',
    gateCheckbox: 'I am at least 18 years old and consent to viewing adult content',
    gateContinue: 'Continue',
    title: 'Create adult image',
    pickVariant: 'Pick style',
    subjectLabel: 'Describe the subject (English works best)',
    subjectPlaceholder: 'e.g. brunette woman in her 30s, athletic build, blue eyes',
    cancel: 'Cancel',
    back: 'Back',
    submit: 'Generate',
  },
} as const

export function AdultModal({ open, onOpenChange, onSubmit, language }: AdultModalProps) {
  const copy = COPY[language]
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [gateChecked, setGateChecked] = useState(false)
  const [variant, setVariant] = useState<AdultVariant | null>(null)
  const [subject, setSubject] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    if (typeof window === 'undefined') return
    setAgeConfirmed(Boolean(window.localStorage.getItem(AGE_FLAG_KEY)))
  }, [open])

  const reset = () => {
    setVariant(null)
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
    if (!variant) return
    const trimmed = subject.trim()
    if (trimmed.length < 3) {
      setError(language === 'eng' ? 'Describe the subject (min 3 characters).' : 'Kirjelda subjekti (vähemalt 3 tähemärki).')
      return
    }
    onSubmit(variant, trimmed)
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

  // ---- Variant picker (all 21 variants grouped by category) ----
  if (!variant) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{copy.title}</DialogTitle>
            <p className="text-sm text-cyan-100/60">{copy.pickVariant}</p>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-5 overflow-y-auto pr-1">
            {CATEGORY_ORDER.map((cat) => {
              const variants = getAdultVariantsByCategory(cat)
              const catLabel = ADULT_CATEGORY_LABELS[cat][language]
              return (
                <section key={cat}>
                  <div className="mb-2 flex items-baseline justify-between border-b border-primary/14 pb-1">
                    <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-50">{catLabel.name}</h4>
                    <span className="text-[10px] text-cyan-100/40">{catLabel.description}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {variants.map((v) => {
                      const label = ADULT_VARIANTS[v].labels[language]
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setVariant(v)}
                          className="rounded-2xl border border-primary/14 bg-black/40 px-3 py-2 text-left transition hover:border-primary/40 hover:bg-black/60"
                        >
                          <div className="text-sm font-semibold text-cyan-50">{label.name}</div>
                          <div className="mt-0.5 text-xs text-cyan-100/50">{label.description}</div>
                        </button>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => handleClose(false)}>{copy.cancel}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // ---- Subject input ----
  const variantLabel = ADULT_VARIANTS[variant].labels[language]
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{variantLabel.name}</DialogTitle>
          <p className="text-sm text-cyan-100/60">{variantLabel.description}</p>
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
              maxLength={300}
              rows={3}
              className="w-full rounded-2xl border border-primary/14 bg-black/40 px-3 py-2 text-sm text-cyan-50 placeholder:text-cyan-100/30 focus:border-primary/32 focus:outline-none"
              required
            />
            <div className="mt-1 text-right text-[10px] text-cyan-100/40">{subject.length}/300</div>
          </div>
          {error && (
            <p className="rounded-2xl border border-red-500/24 bg-red-500/8 px-3 py-2 text-xs text-red-200">{error}</p>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setVariant(null)}>{copy.back}</Button>
            <Button type="submit">{copy.submit}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
