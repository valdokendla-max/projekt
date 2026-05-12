'use client'

import { useRef, useEffect } from 'react'
import type { FileUIPart } from 'ai'
import Image from 'next/image'
import { ArrowUp, ImagePlus, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImageStyleAction {
  key: string
  label: string
}

interface ChatInputProps {
  input: string
  setInput: (value: string) => void
  onSubmit: () => Promise<void> | void
  isLoading: boolean
  pendingImage: FileUIPart | null
  onImageSelect: (file: File | null) => Promise<void> | void
  onClearImage: () => void
  onTransformImage?: (style: string) => Promise<void> | void
  onAnalyzeImage?: () => Promise<void> | void
  imageStyleActions?: ImageStyleAction[]
  activeTransformStyle?: string | null
  transformWorkingLabel?: string
  inputError?: string
  copy: {
    sendHint: string
    newlineHint: string
    imageHint: string
    imageAlt: string
    imageReady: string
    imageAttachment: string
    imageVisionHint: string
    reliefAction: string
    reliefWorking: string
    analyzeImageLabel: string
    analyzeImageSubLabel: string
    placeholder: string
    footer: string
  }
  className?: string
}

export function ChatInput({
  input,
  setInput,
  onSubmit,
  isLoading,
  pendingImage,
  onImageSelect,
  onClearImage,
  onTransformImage,
  onAnalyzeImage,
  imageStyleActions,
  activeTransformStyle = null,
  transformWorkingLabel,
  inputError,
  copy,
  className,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [input])

  const handleSubmit = () => {
    if ((!input.trim() && !pendingImage) || isLoading) return
    void onSubmit()
  }

  const handleInsertNewLine = () => {
    if (isLoading) {
      return
    }

    const textarea = textareaRef.current

    if (!textarea) {
      setInput(`${input}${input ? '\n' : ''}`)
      return
    }

    const selectionStart = textarea.selectionStart ?? input.length
    const selectionEnd = textarea.selectionEnd ?? input.length
    const nextValue = `${input.slice(0, selectionStart)}\n${input.slice(selectionEnd)}`

    setInput(nextValue)

    requestAnimationFrame(() => {
      textarea.focus()
      const nextCursorPosition = selectionStart + 1
      textarea.setSelectionRange(nextCursorPosition, nextCursorPosition)
    })
  }

  const handleOpenImagePicker = () => {
    if (isLoading) {
      return
    }

    fileInputRef.current?.click()
  }

  const canSubmit = Boolean(input.trim() || pendingImage)

  return (
    <div className={cn('pt-4', className)}>
      <div className="mb-3 flex flex-wrap gap-2 px-1">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || isLoading}
          className="inline-flex items-center rounded-full border border-primary/16 bg-cyan-300/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100/68 transition-colors hover:border-primary/28 hover:text-cyan-50 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {copy.sendHint}
        </button>
        <button
          type="button"
          onClick={handleInsertNewLine}
          disabled={isLoading}
          className="inline-flex items-center rounded-full border border-white/8 bg-white/4 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100/36 transition-colors hover:border-primary/18 hover:text-cyan-50 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {copy.newlineHint}
        </button>
        <button
          type="button"
          onClick={handleOpenImagePicker}
          disabled={isLoading}
          className="inline-flex items-center rounded-full border border-white/8 bg-white/4 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100/36 transition-colors hover:border-primary/18 hover:text-cyan-50 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {copy.imageHint}
        </button>
      </div>

      <div className="rounded-[26px] border border-primary/12 bg-black/30 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_40px_rgba(0,0,0,0.22)]">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(event) => {
            const nextFile = event.target.files?.[0] || null
            void onImageSelect(nextFile)
            event.target.value = ''
          }}
        />

        {pendingImage && (
          <div className="mb-2 rounded-[22px] border border-primary/12 bg-black/24 p-2.5">
            <div className="flex items-center gap-3">
              <Image
                src={pendingImage.url}
                alt={pendingImage.filename || copy.imageAlt}
                width={240}
                height={180}
                unoptimized
                className="max-h-44 w-auto rounded-2xl border border-white/8 object-contain"
              />
              <button
                type="button"
                onClick={onClearImage}
                className="ml-auto inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/8 bg-white/4 text-slate-300 transition-colors hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {imageStyleActions && imageStyleActions.length > 0 && onTransformImage && (
              <div className="mt-2.5 flex flex-wrap gap-2">
                {imageStyleActions.map((action) => {
                  const isActive = activeTransformStyle === action.key
                  return (
                    <button
                      key={action.key}
                      type="button"
                      disabled={isLoading || Boolean(activeTransformStyle)}
                      onClick={() => void onTransformImage(action.key)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors disabled:cursor-not-allowed disabled:opacity-45',
                        isActive
                          ? 'border-cyan-400/40 bg-cyan-400/16 text-cyan-100'
                          : 'border-primary/18 bg-black/24 text-cyan-100/68 hover:border-primary/30 hover:text-cyan-50',
                      )}
                    >
                      {isActive ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                      {isActive ? (transformWorkingLabel || action.label) : action.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        <div className="flex items-end gap-3 rounded-[22px] border border-white/6 bg-black/22 px-3 py-2 transition-all focus-within:border-primary/28 focus-within:shadow-[0_0_0_1px_rgba(84,244,255,0.08)]">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/12 bg-black/30 text-sm font-semibold text-cyan-50 shadow-[0_0_18px_rgba(84,244,255,0.12)]">
            LG
          </div>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
            placeholder={copy.placeholder}
            rows={1}
            className="flex-1 resize-none bg-transparent px-1 py-2 text-sm text-slate-100 placeholder:text-cyan-100/28 focus:outline-none"
            disabled={isLoading}
          />

          <button
            type="button"
            onClick={handleOpenImagePicker}
            disabled={isLoading}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/8 bg-white/4 text-slate-300 transition-all hover:text-cyan-50 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <ImagePlus className="h-4 w-4" />
          </button>

          <button
            onClick={handleSubmit}
            disabled={!canSubmit || isLoading}
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition-all',
              canSubmit && !isLoading
                ? 'border-primary/18 bg-linear-to-br from-cyan-300 via-primary to-cyan-400 text-slate-950 shadow-[0_0_24px_rgba(84,244,255,0.25)] hover:opacity-92'
                : 'border-white/8 bg-white/4 text-slate-500'
            )}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
          </button>
        </div>

        {inputError && (
          <p className="mt-2 rounded-2xl border border-rose-400/18 bg-rose-400/8 px-3 py-2 text-xs text-rose-100">
            {inputError}
          </p>
        )}

        <p className="mt-2 text-center text-[11px] font-medium uppercase tracking-[0.22em] text-cyan-100/36">
          {copy.footer}
        </p>
      </div>
    </div>
  )
}
