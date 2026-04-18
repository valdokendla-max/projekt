import Image from 'next/image'
import { cn } from '@/lib/utils'

interface BrandLogoProps {
  variant?: 'header' | 'hero'
  className?: string
}

export function BrandLogo({ variant = 'header', className }: BrandLogoProps) {
  const isHero = variant === 'hero'
  const isAboveTheFold = variant === 'header' || isHero

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-white/10 bg-black/30',
        isHero
          ? 'h-28 w-44 shadow-[0_20px_60px_rgba(0,0,0,0.4)]'
          : 'h-11 w-18 shadow-[0_10px_24px_rgba(0,0,0,0.35)]',
        className,
      )}
    >
      <Image
        src="/laser-graveerimine-logo.svg"
        alt="Laser Graveerimine logo"
        fill
        className="object-cover"
        sizes={isHero ? '176px' : '72px'}
        loading={isAboveTheFold ? 'eager' : 'lazy'}
        priority={isAboveTheFold}
      />
    </div>
  )
}