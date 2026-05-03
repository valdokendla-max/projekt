'use client'

import type { UIMessage } from 'ai'
import Image from 'next/image'
import { Bot, Download, User } from 'lucide-react'
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

export function ChatMessage({ message }: { message: UIMessage }) {
  const isUser = message.role === 'user'
  const text = getMessageText(message)
  const images = getMessageImages(message)
  const label = isUser ? 'Käsk' : 'Laser AI'
  const mode = isUser ? 'User input' : 'Analysis stream'

  return (
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
                <figure key={`${image.url}-${image.filename || 'image'}`} className="overflow-hidden rounded-2xl border border-white/8 bg-black/24">
                  <Image
                    src={image.url}
                    alt={image.filename || 'Laaditud pilt'}
                    width={960}
                    height={720}
                    unoptimized
                    className="max-h-70 w-full object-cover"
                  />
                  {!isUser && image.url.startsWith('data:') && (
                    <div className="flex items-center justify-between px-3 py-2">
                      {image.filename && <span className="text-xs text-cyan-100/52">{image.filename}</span>}
                      <a
                        href={image.url}
                        download={image.filename || 'image.png'}
                        className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-cyan-400/22 bg-cyan-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100 transition-colors hover:border-cyan-400/40 hover:bg-cyan-400/18"
                      >
                        <Download className="h-3 w-3" />
                        Laadi alla
                      </a>
                    </div>
                  )}
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
  )
}
