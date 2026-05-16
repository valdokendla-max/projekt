'use client'

import { useState } from 'react'
import type { UIMessage } from 'ai'
import Image from 'next/image'
import { Bot, User, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

function getMessageText(message: UIMessage): string {
  if (!message.parts || !Array.isArray(message.parts)) return ''
  return message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('')
}

function getMessageImages(message: UIMessage) {
  if (!message.parts || !Array.isArray(message.parts)) return []

  return message.parts.filter(
    (part): part is { type: 'file'; url: string; mediaType: string; filename?: string } =>
      part.type === 'file' && typeof part.url === 'string' && typeof part.mediaType === 'string' && part.mediaType.startsWith('image/')
  )
}

function ImageLightbox({ url, filename, onClose }: { url: string; filename?: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/16 bg-black/60 text-white transition-colors hover:bg-black/80"
      >
        <X className="h-5 w-5" />
      </button>
      <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={filename || 'Pilt'}
          className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
        />
        {filename && (
          <p className="mt-2 text-center text-xs text-white/50">{filename}</p>
        )}
      </div>
    </div>
  )
}

export function ChatMessage({ message }: { message: UIMessage }) {
  const isUser = message.role === 'user'
  const text = getMessageText(message)
  const images = getMessageImages(message)
  const label = isUser ? 'Käsk' : 'Laser AI'
  const mode = isUser ? 'User input' : 'Analysis stream'
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [lightboxFilename, setLightboxFilename] = useState<string | undefined>()

  return (
    <>
      {lightboxUrl && (
        <ImageLightbox
          url={lightboxUrl}
          filename={lightboxFilename}
          onClose={() => setLightboxUrl(null)}
        />
      )}
      <div
        className={cn(
          'flex gap-3 px-4 py-3',
          isUser ? 'justify-end' : 'justify-start'
        )}
      >
        {!isUser && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/16 bg-primary/8 text-primary shadow-[0_0_20px_rgba(84,244,255,0.12)]">
            <Bot className="h-4 w-4" />
          </div>
        )}
        <div className={cn('flex max-w-[84%] flex-col', isUser ? 'items-end' : 'items-start')}>
          <div className="mb-2 flex items-center gap-2 px-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-cyan-100/46">
            <span className={cn('h-1.5 w-1.5 rounded-full', isUser ? 'bg-amber-300' : 'bg-cyan-300')} />
            <span>{label}</span>
            <span className="text-cyan-100/28">{mode}</span>
          </div>

          <div
            className={cn(
              'relative overflow-hidden rounded-3xl px-4 py-3 text-sm leading-relaxed shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]',
              isUser
                ? 'border border-primary/18 bg-linear-to-br from-primary/18 via-primary/10 to-black/30 text-cyan-50 shadow-[0_0_24px_rgba(84,244,255,0.1)]'
                : 'border border-primary/12 bg-linear-to-br from-black/28 via-black/22 to-cyan-300/6 text-card-foreground'
            )}
          >
            <div className={cn('pointer-events-none absolute inset-x-0 top-0 h-px', isUser ? 'bg-linear-to-r from-transparent via-cyan-200/80 to-transparent' : 'bg-linear-to-r from-transparent via-cyan-300/60 to-transparent')} />
            <div className={cn('pointer-events-none absolute bottom-0 right-0 h-16 w-16 rounded-full blur-2xl', isUser ? 'bg-cyan-300/10' : 'bg-cyan-300/12')} />

            {images.length > 0 && (
              <div className="mb-3 grid gap-2 sm:grid-cols-2">
                {images.map((image) => (
                  <figure
                    key={`${image.url}-${image.filename || 'image'}`}
                    className="cursor-pointer overflow-hidden rounded-2xl border border-white/8 bg-black/24 transition-opacity hover:opacity-90"
                    onClick={() => { setLightboxUrl(image.url); setLightboxFilename(image.filename) }}
                    title="Kliki suuremaks"
                  >
                    <Image
                      src={image.url}
                      alt={image.filename || 'Laaditud pilt'}
                      width={960}
                      height={960}
                      unoptimized
                      className="w-full object-contain"
                    />
                    {image.filename && <figcaption className="px-3 py-2 text-xs text-cyan-100/52">{image.filename}</figcaption>}
                  </figure>
                ))}
              </div>
            )}

            {isUser ? (
              <p className="whitespace-pre-wrap">{text}</p>
            ) : (
              <div className="prose prose-invert prose-sm max-w-none text-slate-100 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-primary/10 [&_pre]:bg-background/70 [&_pre]:p-3 [&_code]:rounded [&_code]:bg-background/70 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-primary [&_a]:text-primary [&_a]:underline [&_ul]:mb-2 [&_ol]:mb-2 [&_li]:mb-1 [&_h1]:text-cyan-50 [&_h2]:text-cyan-50 [&_h3]:text-cyan-50 [&_strong]:text-cyan-50">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
              </div>
            )}
          </div>
        </div>
        {isUser && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/8 bg-white/4 text-muted-foreground">
            <User className="h-4 w-4" />
          </div>
        )}
      </div>
    </>
  )
}
