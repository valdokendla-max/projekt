'use client'

import { useState, type FormEvent } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  CHINESE_ZODIAC_ANIMALS,
  ZODIAC_SIGNS,
  type ChineseZodiacAnimal,
  type Language,
  type ZodiacSign,
} from '@/lib/image-prompts'

interface BirthCardInputs {
  tahtkuju: ZodiacSign
  sunniaasta_loom: ChineseZodiacAnimal
  hingeloom: string
}

interface BirthCardModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (inputs: BirthCardInputs) => void
  language: Language
}

const COPY = {
  est: {
    title: 'Loo sünnikaart',
    description: 'Vali kolm sümbolit — kombineerime need ühele kaardile.',
    zodiacLabel: 'Tähtkuju',
    zodiacPlaceholder: 'Vali tähtkuju',
    yearAnimalLabel: 'Sünniaasta loom',
    yearAnimalPlaceholder: 'Vali loom',
    spiritAnimalLabel: 'Hingeloom',
    spiritAnimalPlaceholder: 'nt hunt, kotkas, karu, ilves',
    cancel: 'Tühista',
    submit: 'Genereeri',
  },
  eng: {
    title: 'Create birth card',
    description: 'Pick three symbols — we combine them into one card.',
    zodiacLabel: 'Zodiac sign',
    zodiacPlaceholder: 'Pick zodiac sign',
    yearAnimalLabel: 'Year animal',
    yearAnimalPlaceholder: 'Pick animal',
    spiritAnimalLabel: 'Spirit animal',
    spiritAnimalPlaceholder: 'e.g. wolf, eagle, bear, lynx',
    cancel: 'Cancel',
    submit: 'Generate',
  },
} as const

export function BirthCardModal({ open, onOpenChange, onSubmit, language }: BirthCardModalProps) {
  const copy = COPY[language]
  const [tahtkuju, setTahtkuju] = useState<ZodiacSign | ''>('')
  const [yearAnimal, setYearAnimal] = useState<ChineseZodiacAnimal | ''>('')
  const [hingeloom, setHingeloom] = useState('')
  const [error, setError] = useState('')

  const reset = () => {
    setTahtkuju('')
    setYearAnimal('')
    setHingeloom('')
    setError('')
  }

  const handleClose = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!tahtkuju || !yearAnimal) {
      setError(language === 'eng' ? 'All fields are required.' : 'Kõik väljad on kohustuslikud.')
      return
    }
    const trimmed = hingeloom.trim()
    if (trimmed.length < 2) {
      setError(language === 'eng' ? 'Spirit animal min 2 characters.' : 'Hingeloom vähemalt 2 tähemärki.')
      return
    }
    onSubmit({ tahtkuju, sunniaasta_loom: yearAnimal, hingeloom: trimmed })
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <p className="text-sm text-cyan-100/60">{copy.description}</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/60" htmlFor="bc-zodiac">
              {copy.zodiacLabel}
            </label>
            <select
              id="bc-zodiac"
              name="bc-zodiac"
              value={tahtkuju}
              onChange={(e) => setTahtkuju(e.target.value as ZodiacSign | '')}
              className="w-full rounded-2xl border border-primary/14 bg-black/40 px-3 py-2 text-sm text-cyan-50 focus:border-primary/32 focus:outline-none"
              required
            >
              <option value="" disabled>{copy.zodiacPlaceholder}</option>
              {ZODIAC_SIGNS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/60" htmlFor="bc-year">
              {copy.yearAnimalLabel}
            </label>
            <select
              id="bc-year"
              name="bc-year"
              value={yearAnimal}
              onChange={(e) => setYearAnimal(e.target.value as ChineseZodiacAnimal | '')}
              className="w-full rounded-2xl border border-primary/14 bg-black/40 px-3 py-2 text-sm text-cyan-50 focus:border-primary/32 focus:outline-none"
              required
            >
              <option value="" disabled>{copy.yearAnimalPlaceholder}</option>
              {CHINESE_ZODIAC_ANIMALS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/60" htmlFor="bc-spirit">
              {copy.spiritAnimalLabel}
            </label>
            <input
              id="bc-spirit"
              name="bc-spirit"
              type="text"
              value={hingeloom}
              onChange={(e) => setHingeloom(e.target.value)}
              placeholder={copy.spiritAnimalPlaceholder}
              maxLength={60}
              className="w-full rounded-2xl border border-primary/14 bg-black/40 px-3 py-2 text-sm text-cyan-50 placeholder:text-cyan-100/30 focus:border-primary/32 focus:outline-none"
              required
            />
          </div>

          {error && (
            <p className="rounded-2xl border border-red-500/24 bg-red-500/8 px-3 py-2 text-xs text-red-200">{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => handleClose(false)}>
              {copy.cancel}
            </Button>
            <Button type="submit">{copy.submit}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
