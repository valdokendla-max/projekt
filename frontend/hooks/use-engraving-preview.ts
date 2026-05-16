'use client'

import { useEffect, useState } from 'react'

const BG = { r: 10, g: 15, b: 24 } // #0a0f18 — tume sinakas-must
const MARK = { r: 128, g: 232, b: 255 } // #80e8ff — tsüaan

export function useEngravingPreview(
  imageUrl: string | null,
  powerPct: number,
): { previewUrl: string | null; isProcessing: boolean } {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (!imageUrl || typeof window === 'undefined') {
      setPreviewUrl(null)
      return
    }

    let cancelled = false
    setIsProcessing(true)

    const img = new Image()

    img.onload = () => {
      if (cancelled) return

      const MAX = 400
      const scale = Math.min(1, MAX / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        setIsProcessing(false)
        return
      }

      ctx.drawImage(img, 0, 0, w, h)
      const imageData = ctx.getImageData(0, 0, w, h)
      const data = imageData.data

      const contrast = 1 + (powerPct / 100) * 1.5

      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
        // Invert: tume originaal → hele graveeritud mark
        const inverted = 255 - gray
        // Kontrasti boost
        const boosted = Math.min(255, Math.max(0, (inverted - 128) * contrast + 128))
        const t = boosted / 255

        data[i] = Math.round(BG.r + (MARK.r - BG.r) * t)
        data[i + 1] = Math.round(BG.g + (MARK.g - BG.g) * t)
        data[i + 2] = Math.round(BG.b + (MARK.b - BG.b) * t)
        data[i + 3] = 255
      }

      // Scanline efekt — iga 2. rida veidi tumedam
      for (let y = 1; y < h; y += 2) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4
          data[i] = Math.round(data[i] * 0.82)
          data[i + 1] = Math.round(data[i + 1] * 0.82)
          data[i + 2] = Math.round(data[i + 2] * 0.82)
        }
      }

      ctx.putImageData(imageData, 0, 0)

      if (!cancelled) {
        setPreviewUrl(canvas.toDataURL('image/jpeg', 0.88))
        setIsProcessing(false)
      }
    }

    img.onerror = () => {
      if (!cancelled) setIsProcessing(false)
    }

    img.src = imageUrl

    return () => {
      cancelled = true
    }
  }, [imageUrl, powerPct])

  return { previewUrl, isProcessing }
}
