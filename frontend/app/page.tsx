'use client'

import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type FileUIPart, type UIMessage } from 'ai'
import Image from 'next/image'
import { Camera, Download, Layers, PenLine, Plus, Settings2, SlidersHorizontal, Sparkles, X } from 'lucide-react'
import { ChatHeader } from '@/components/chat-header'
import { ChatInput } from '@/components/chat-input'
import { ChatMessage } from '@/components/chat-message'
import { KnowledgePanel } from '@/components/knowledge-panel'
import { LaserSettingsPanel } from '@/components/laser-settings-panel'
import { readSavedLaserSettings, type StoredLaserSettings } from '@/lib/engraving/saved-settings-storage'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'

const MAX_CHAT_IMAGE_BYTES = 3 * 1024 * 1024
const SUPPORTED_CHAT_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_CONVERSATIONS = 5
const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000').replace(/\/$/, '')
type RightUtilityPanel = 'settings'
type ShowcaseAction = { label: string; value: string; prompt: string }
type UseCaseAction = { label: string; icon: ReactNode; prompt: string; onCustomAction?: () => void; isCustomActionRunning?: boolean }
interface Conversation { id: string; name: string; messages: UIMessage[]; createdAt: Date }

async function fetchServerConversations(token: string): Promise<Conversation[] | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/conversations`, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) return null
    const data = (await res.json()) as { conversations?: Conversation[] }
    return data.conversations ?? null
  } catch { return null }
}

async function saveConversationToServer(token: string, conv: Conversation): Promise<void> {
  try {
    await fetch(`${BACKEND_URL}/api/conversations/${conv.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: conv.id, name: conv.name, messages: conv.messages, createdAt: conv.createdAt }),
    })
  } catch { /* non-critical */ }
}

async function deleteConversationFromServer(token: string, convId: string): Promise<void> {
  try {
    await fetch(`${BACKEND_URL}/api/conversations/${convId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch { /* non-critical */ }
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }

      reject(new Error('Pildi lugemine ebaõnnestus.'))
    }
    reader.onerror = () => reject(new Error('Pildi lugemine ebaõnnestus.'))
    reader.readAsDataURL(file)
  })
}

function messageHasImage(message: { parts?: Array<{ type?: string; mediaType?: string }> }) {
  return Array.isArray(message.parts)
    && message.parts.some(
      (part) => part.type === 'file' && typeof part.mediaType === 'string' && part.mediaType.startsWith('image/'),
    )
}

function RightDockButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        'flex h-12 w-12 items-center justify-center rounded-2xl border shadow-[0_0_24px_rgba(84,244,255,0.12)] transition-colors',
        active
          ? 'border-primary/30 bg-primary/14 text-cyan-50'
          : 'border-primary/14 bg-black/50 text-cyan-100/74 hover:border-primary/28 hover:text-cyan-50',
      )}
    >
      {children}
    </button>
  )
}

function RightPanelShell({
  title,
  description,
  onClose,
  children,
}: {
  title: string
  description: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-40 bg-slate-950/48 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="absolute inset-y-3 left-3 right-3 md:left-auto md:w-105"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex h-full flex-col gap-3">
          <div className="rounded-3xl border border-primary/14 bg-black/72 px-4 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-100/44">Parempaneel</div>
                <h2 className="mt-1 text-base font-semibold text-cyan-50">{title}</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">{description}</p>
              </div>

              <button
                type="button"
                aria-label="Sulge paneel"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/14 bg-black/40 text-cyan-100/74 transition-colors hover:border-primary/28 hover:text-cyan-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="cyan-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">{children}</div>
        </div>
      </div>
    </div>
  )
}

function HeroDisplay({
  showcaseActions,
  useCaseActions,
  onQuickAction,
  language,
  previewImageUrl,
  powerPct,
  materialName,
}: {
  showcaseActions: ShowcaseAction[]
  useCaseActions: UseCaseAction[]
  onQuickAction: (prompt: string) => void
  language: 'est' | 'eng'
  previewImageUrl: string | null
  powerPct: number
  materialName: string
}) {
  const hasPreview = Boolean(previewImageUrl)
  // CSS filter graveeringu efekt: grayscale → invert → kontrast vastavalt võimsusele
  const contrast = (1.2 + (powerPct / 100) * 2).toFixed(1)
  const engravingFilter = `grayscale(100%) invert(100%) contrast(${contrast}) brightness(0.85)`

  return (
    <section className="hud-panel px-5 py-5 md:px-6 md:py-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] xl:items-center">
        <div className="hero-stage">
          <div className="hud-plate overflow-hidden">
            <span className="hud-plate-bolt left-5 top-5" />
            <span className="hud-plate-bolt right-5 top-5" />
            <span className="hud-plate-bolt bottom-5 left-5" />
            <span className="hud-plate-bolt bottom-5 right-5" />
            <div className="hero-plate-code">{hasPreview ? (language === 'eng' ? 'Preview' : 'Eelvaade') : 'Näidisgraveering'}</div>
            <div className="hero-plate-status">
              {hasPreview ? `${powerPct}% võimsus` : 'Preview ready'}
            </div>

            <div
              className="absolute z-0 overflow-hidden rounded-[18px] border border-white/10"
              style={{ inset: '18px', background: hasPreview ? '#0a0f18' : undefined }}
            >
              {/* Staatiline logo */}
              <Image
                src="/laser-graveerimine-logo.svg"
                alt="Laser Graveerimine näidisgraveering"
                fill
                priority
                className={cn('object-cover transition-opacity duration-500', hasPreview ? 'opacity-0' : 'opacity-90')}
                sizes="(max-width: 1280px) 100vw, 55vw"
              />

              {/* Graveeringu eelvaade — CSS filter, ei vaja Canvas API-t */}
              {hasPreview && previewImageUrl && (
                <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                  {/* Scanline overlay */}
                  <div
                    className="absolute inset-0 z-10 pointer-events-none"
                    style={{
                      background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0px, rgba(0,0,0,0.18) 1px, transparent 1px, transparent 3px)',
                    }}
                  />
                  {/* Tsüaan tint overlay */}
                  <div
                    className="absolute inset-0 z-10 pointer-events-none"
                    style={{ background: 'rgba(0, 180, 220, 0.08)', mixBlendMode: 'screen' }}
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewImageUrl}
                    alt="Graveeringu eelvaade"
                    className="h-full w-full object-contain"
                    style={{ filter: engravingFilter }}
                  />
                </div>
              )}

              {/* Materjali silt */}
              {hasPreview && materialName && (
                <div className="absolute left-3 top-3 z-20 rounded-md border border-cyan-400/20 bg-black/70 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-cyan-300/80 backdrop-blur-sm">
                  {materialName}
                </div>
              )}

              <div
                className="absolute inset-0 z-10"
                style={{ background: 'linear-gradient(to top, rgba(3, 7, 15, 0.82), rgba(5, 10, 18, 0.16), rgba(224, 255, 255, 0.04))' }}
              />
              <div
                className="absolute inset-x-0 bottom-0 z-10 h-30"
                style={{ background: 'linear-gradient(to top, #02060d, rgba(2, 6, 13, 0.72), transparent)' }}
              />
            </div>

            <div className="hero-plate-spectrum">
              <span />
              <span />
              <span />
              <span />
            </div>

            <div className="absolute inset-x-7 bottom-7 z-10 grid gap-3 sm:grid-cols-3">
              {showcaseActions.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => onQuickAction(item.prompt)}
                  className="rounded-[18px] border border-primary/12 bg-black/50 px-3 py-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-sm transition-colors hover:border-primary/24 hover:bg-black/58"
                >
                  <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100/44">{item.label}</div>
                  <div className="mt-1 text-sm font-semibold text-cyan-50">{item.value}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5 xl:pr-0">
          <span className="hud-label">
            <Sparkles className="h-3.5 w-3.5" />
            Precision Array
          </span>

          <div>
            <h1 className="hero-title font-semibold uppercase">
              <span className="hero-title-line">Laser</span>
              <span className="hero-title-line hero-title-line--long">Graveerimine</span>
            </h1>
            <p className="mt-4 hero-kicker">Precision. Power. Control.</p>
          </div>

          <p className="max-w-xl text-sm leading-relaxed text-slate-300">
            Reaalne tööala lasergraveerimise jaoks: vestlus, masinapõhised soovitused ja eksporditav väljund samas
            vaates. Avalehe hero-plokk näitab nüüd päris näidisstiili, mitte ainult dekoratiivset illustratsiooni.
          </p>

          <div className="grid grid-cols-3 gap-3">
            {useCaseActions.map((item) => {
              const isRunning = item.isCustomActionRunning ?? false
              return (
                <button
                  key={item.label}
                  type="button"
                  disabled={isRunning}
                  onClick={() => item.onCustomAction ? item.onCustomAction() : onQuickAction(item.prompt)}
                  className="flex flex-col items-center gap-2 rounded-[20px] border border-primary/12 bg-black/24 px-2 py-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors hover:border-primary/24 hover:bg-black/32 disabled:opacity-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/14 bg-primary/8 text-primary">
                    {isRunning ? (
                      <span className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    ) : (
                      item.icon
                    )}
                  </div>
                  <span className="text-xs font-semibold leading-tight text-cyan-50">
                    {isRunning ? (language === 'eng' ? 'Creating...' : 'Loon...') : item.label}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="hud-divider" />
        </div>
      </div>
    </section>
  )
}

export default function LaserGraveerimiseApp() {
  const [input, setInput] = useState('')
  const [knowledgeOpen, setKnowledgeOpen] = useState(false)
  const [activeRightPanel, setActiveRightPanel] = useState<RightUtilityPanel | null>(null)
  const [pendingImage, setPendingImage] = useState<FileUIPart | null>(null)
  const [savedSettingsSummary, setSavedSettingsSummary] = useState('')
  const [savedSettings, setSavedSettings] = useState<StoredLaserSettings | null>(null)
  const [chatInputError, setChatInputError] = useState('')
  const [isGeneratingLogo, setIsGeneratingLogo] = useState(false)
  const [isGeneratingTattoo, setIsGeneratingTattoo] = useState(false)
  const [isEnhancingPhoto, setIsEnhancingPhoto] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([
    { id: 'conv-0', name: 'Vestlus 1', messages: [], createdAt: new Date() },
  ])
  const [activeConversationId, setActiveConversationId] = useState('conv-0')
  const [conversationCounter, setConversationCounter] = useState(2)
  const scrollRef = useRef<HTMLDivElement>(null)
  const hasLoadedRef = useRef(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const auth = useAuth()
  const canAccessKnowledge = auth.status === 'authenticated' && auth.user?.role === 'admin'
  const [language, setLanguage] = useState<'est' | 'eng'>('est')
  const effectiveLanguage: 'est' | 'eng' = auth.user?.role === 'admin' ? 'est' : language

  const chatTransport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: { ...(savedSettingsSummary ? { savedSettingsSummary } : {}), language: effectiveLanguage },
      }),
    [savedSettingsSummary, effectiveLanguage]
  )

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: chatTransport,
  })

  const hasMessages = messages.length > 0
  const hasImageContext = Boolean(pendingImage) || messages.some(messageHasImage)
  const isLoading = status === 'streaming' || status === 'submitted'

  const getActiveImage = (): { url: string; mediaType: string } | null => {
    if (pendingImage?.url) return { url: pendingImage.url, mediaType: pendingImage.mediaType || 'image/png' }
    for (let i = messages.length - 1; i >= 0; i--) {
      const parts = messages[i].parts
      if (!Array.isArray(parts)) continue
      for (const p of parts) {
        if (p.type === 'file' && typeof (p as { url?: unknown }).url === 'string' && typeof (p as { mediaType?: unknown }).mediaType === 'string' && ((p as { mediaType: string }).mediaType).startsWith('image/')) {
          return { url: (p as { url: string }).url, mediaType: (p as { mediaType: string }).mediaType }
        }
      }
    }
    return null
  }

  const activeImageUrl = useMemo(
    () => getActiveImage()?.url ?? null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pendingImage, messages]
  )
  const previewPowerPct = savedSettings?.recommendation?.settings?.powerPct ?? 60
  const previewMaterialName = savedSettingsSummary.match(/^Materjal:\s*(.+)$/m)?.[1] ?? ''

  // Kui uus pilt ilmub, skrolli hero paneelini
  const prevActiveImageRef = useRef<string | null>(null)
  useEffect(() => {
    if (activeImageUrl && activeImageUrl !== prevActiveImageRef.current) {
      prevActiveImageRef.current = activeImageUrl
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    if (!activeImageUrl) prevActiveImageRef.current = null
  }, [activeImageUrl])

  const handleShowSettings = () => {
    if (!savedSettingsSummary) {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant' as const, parts: [{ type: 'text', text: effectiveLanguage === 'eng' ? 'No settings have been saved yet. Open the settings module (gear icon) and save your settings first.' : 'Seadistusmoodulisse pole veel seadeid salvestatud. Ava seadistusmoodul (hammasratta ikoon) ja salvesta esmalt seadistused.' }], content: '', createdAt: new Date() } as UIMessage,
      ])
      return
    }
    const context = input.trim()
    const prompt = effectiveLanguage === 'eng'
      ? (context ? `Based on my saved settings, recommend the best speed, power, passes, line interval and air assist setting for the following job: ${context}` : 'Based on my saved settings, recommend the best speed, power, passes, line interval and air assist setting.')
      : (context ? `Minu salvestatud seadistuste põhjal soovita parim kiirus, võimsus, passid, joonevahe ja air assist seadistus järgmise töö jaoks: ${context}` : 'Minu salvestatud seadistuste põhjal soovita parim kiirus, võimsus, passid, joonevahe ja air assist seadistus.')
    void sendChatRequest(prompt)
  }

  const handleLogoCreate = async () => {    if (isGeneratingLogo) return
    setIsGeneratingLogo(true)
    setChatInputError('')
    try {
      const inputText = input.trim()
      const activeImage = getActiveImage()
      const sourceUrl = activeImage?.url
      const res = await fetch('/api/logo-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandText: inputText,
          sourceImageDataUrl: sourceUrl || undefined,
        }),
      })
      const data = (await res.json()) as { ok: boolean; imageDataUrl?: string; error?: string }
      if (!data.ok || !data.imageDataUrl) throw new Error(data.error || 'Logo loomine ebaõnnestus.')
      const userParts: UIMessage['parts'] = []
      if (inputText) userParts.push({ type: 'text', text: inputText })
      if (sourceUrl) userParts.push({ type: 'file', url: sourceUrl, mediaType: activeImage?.mediaType || 'image/png', filename: 'allikas.png' } as UIMessage['parts'][number])
      setMessages((prev) => [
        ...prev,
        ...(userParts.length > 0 ? [{ id: crypto.randomUUID(), role: 'user' as const, parts: userParts, content: inputText, createdAt: new Date() } as UIMessage] : []),
        { id: crypto.randomUUID(), role: 'assistant' as const, parts: [{ type: 'file', url: data.imageDataUrl, mediaType: 'image/png', filename: 'logo.png' } as UIMessage['parts'][number], { type: 'text', text: effectiveLanguage === 'eng' ? 'Logo has been created.' : 'Logo on loodud.' }], content: '', createdAt: new Date() } as UIMessage,
      ])
      setInput('')
      setPendingImage(null)
    } catch (error) {
      setChatInputError(error instanceof Error ? error.message : 'Logo loomine ebaõnnestus.')
    } finally {
      setIsGeneratingLogo(false)
    }
  }

  const handleTattooCreate = async () => {
    if (isGeneratingTattoo) return
    setIsGeneratingTattoo(true)
    setChatInputError('')
    try {
      const inputText = input.trim()
      const activeImage = getActiveImage()
      const sourceUrl = activeImage?.url
      const res = await fetch('/api/tattoo-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectText: inputText,
          sourceImageDataUrl: sourceUrl || undefined,
        }),
      })
      const data = (await res.json()) as { ok: boolean; imageDataUrl?: string; error?: string }
      if (!data.ok || !data.imageDataUrl) throw new Error(data.error || 'Tatoo eskiisi loomine ebaõnnestus.')
      const userParts: UIMessage['parts'] = []
      if (inputText) userParts.push({ type: 'text', text: inputText })
      if (sourceUrl) userParts.push({ type: 'file', url: sourceUrl, mediaType: activeImage?.mediaType || 'image/png', filename: 'allikas.png' } as UIMessage['parts'][number])
      setMessages((prev) => [
        ...prev,
        ...(userParts.length > 0 ? [{ id: crypto.randomUUID(), role: 'user' as const, parts: userParts, content: inputText, createdAt: new Date() } as UIMessage] : []),
        { id: crypto.randomUUID(), role: 'assistant' as const, parts: [{ type: 'file', url: data.imageDataUrl, mediaType: 'image/png', filename: 'tattoo-eskiis.png' } as UIMessage['parts'][number], { type: 'text', text: effectiveLanguage === 'eng' ? 'Tattoo sketch has been created.' : 'Tatoo eskiis on loodud.' }], content: '', createdAt: new Date() } as UIMessage,
      ])
      setInput('')
      setPendingImage(null)
    } catch (error) {
      setChatInputError(error instanceof Error ? error.message : 'Tatoo eskiisi loomine ebaõnnestus.')
    } finally {
      setIsGeneratingTattoo(false)
    }
  }

  const handlePhotoEnhance = async () => {
    const activeImage = getActiveImage()
    if (!activeImage) {
      setChatInputError(effectiveLanguage === 'eng' ? 'Please add an image first for photo enhancement.' : 'Foto puhastuseks lisa esmalt pilt.')
      return
    }
    if (isEnhancingPhoto) return
    setIsEnhancingPhoto(true)
    setChatInputError('')
    try {
      const sourceUrl = activeImage.url
      const res = await fetch('/api/photo-enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceImageDataUrl: sourceUrl }),
      })
      const data = (await res.json()) as { ok: boolean; imageDataUrl?: string; error?: string }
      if (!data.ok || !data.imageDataUrl) throw new Error(data.error || 'Foto puhastamine ebaõnnestus.')
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'user' as const, parts: [{ type: 'file', url: sourceUrl, mediaType: activeImage.mediaType, filename: 'originaal.png' } as UIMessage['parts'][number]], content: '', createdAt: new Date() } as UIMessage,
        { id: crypto.randomUUID(), role: 'assistant' as const, parts: [{ type: 'file', url: data.imageDataUrl, mediaType: 'image/png', filename: 'puhastatud.png' } as UIMessage['parts'][number], { type: 'text', text: effectiveLanguage === 'eng' ? 'Photo has been cleaned and enhanced.' : 'Foto on puhastatud ja täiustatud.' }], content: '', createdAt: new Date() } as UIMessage,
      ])
      setPendingImage(null)
    } catch (error) {
      setChatInputError(error instanceof Error ? error.message : 'Foto puhastamine ebaõnnestus.')
    } finally {
      setIsEnhancingPhoto(false)
    }
  }

  const handleLightBurnExport = async () => {
    let imageUrl = pendingImage?.url
    let imageMediaType = pendingImage?.mediaType || 'image/png'
    if (!imageUrl) {
      for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i]
        const imgPart = msg.parts?.find((p): p is { type: 'file'; url: string; mediaType: string } =>
          p.type === 'file' && typeof (p as { url?: unknown }).url === 'string' && typeof (p as { mediaType?: unknown }).mediaType === 'string' && ((p as { mediaType: string }).mediaType).startsWith('image/')
        )
        if (imgPart) { imageUrl = imgPart.url; imageMediaType = imgPart.mediaType; break }
      }
    }
    if (!imageUrl) {
      setChatInputError(effectiveLanguage === 'eng' ? 'Please add an image first for LightBurn export.' : 'LightBurn ekspordiks lisa esmalt pilt.')
      return
    }
    if (isExporting) return
    setIsExporting(true)
    setChatInputError('')
    try {
      const res = await fetch('/api/engraving-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assets: [{
            path: 'exports/output.png',
            dataUrl: imageUrl,
            mediaType: imageMediaType,
            description: 'Source image for LightBurn export',
          }],
          mode: 'threshold',
          savedSettingsSummary: savedSettingsSummary || undefined,
        }),
      })
      const data = (await res.json()) as { ok: boolean; archiveBase64?: string; exportManifest?: { archiveName: string }; lightBurnProject?: { fileName: string }; error?: string }
      if (!data.archiveBase64) throw new Error(data.error || 'LightBurn eksport ebaõnnestus.')
      const archiveName = data.exportManifest?.archiveName || 'lightburn-export.zip'
      const lbrnName = data.lightBurnProject?.fileName || 'project.lbrn'
      const binary = window.atob(data.archiveBase64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const blob = new Blob([bytes], { type: 'application/zip' })
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = archiveName
      anchor.click()
      URL.revokeObjectURL(objectUrl)
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant' as const, parts: [{ type: 'text', text: effectiveLanguage === 'eng' ? `LightBurn export package **${archiveName}** has been downloaded.\n\nZIP contains:\n- \`${lbrnName}\` — LightBurn project file\n- \`exports/output.png\` — processed image\n- \`exports/settings.json\` — machine settings\n\nOpen the ZIP, import the \`.lbrn\` file into LightBurn and configure speed/power.` : `LightBurn eksportpakett **${archiveName}** on alla laaditud.\n\nZIP sisaldab:\n- \`${lbrnName}\` — LightBurn projekti fail\n- \`exports/output.png\` — töödeldud pilt\n- \`exports/settings.json\` — masina seadistused\n\nAvage ZIP, importige \`.lbrn\` fail LightBurni ja seadistage kiirus/võimsus.` }], content: '', createdAt: new Date() } as UIMessage,
      ])
    } catch (error) {
      setChatInputError(error instanceof Error ? error.message : 'LightBurn eksport ebaõnnestus.')
    } finally {
      setIsExporting(false)
    }
  }

  const showcaseActions: ShowcaseAction[] = [
    {
      label: effectiveLanguage === 'eng' ? 'Materials' : 'Materjalid',
      value: effectiveLanguage === 'eng' ? 'Wood, metal, leather' : 'Puit, metall, nahk',
      prompt: effectiveLanguage === 'eng'
        ? 'Give me concrete starting settings for my active machine and material including speed, power, passes, line interval, air assist and notes.'
        : 'Anna minu aktiivse masina ja materjali jaoks konkreetsed lähteseaded koos kiiruse, võimsuse, passide, joone vahe, air assisti ja tähelepanekutega.',
    },
    {
      label: effectiveLanguage === 'eng' ? 'Workflow' : 'Töövoog',
      value: 'Prompt -> optimize -> export',
      prompt: effectiveLanguage === 'eng'
        ? 'Describe step by step the workflow from image or prompt to a ready-to-engrave file export based on my active settings.'
        : 'Kirjelda mulle samm-sammult töövoogu alates pildist või promptist kuni graveerimiseks valmis faili ekspordini minu aktiivse seadistuse järgi.',
    },
    {
      label: effectiveLanguage === 'eng' ? 'Output' : 'Väljund',
      value: 'PNG, SVG, DXF',
      prompt: effectiveLanguage === 'eng'
        ? 'Explain when to use PNG, SVG or DXF output for my active machine and material.'
        : 'Selgita, millal kasutada PNG, SVG või DXF väljundit minu aktiivse masina ja materjali puhul.',
    },
  ]
  const useCaseActions: UseCaseAction[] = [
    {
      label: effectiveLanguage === 'eng' ? 'Create logo' : 'Logo loomine',
      icon: <Layers className="h-5 w-5" />,
      onCustomAction: handleLogoCreate,
      isCustomActionRunning: isGeneratingLogo,
      prompt: '',
    },
    {
      label: effectiveLanguage === 'eng' ? 'Engrave settings' : 'Graveeri seaded',
      icon: <SlidersHorizontal className="h-5 w-5" />,
      onCustomAction: handleShowSettings,
      prompt: '',
    },
    {
      label: effectiveLanguage === 'eng' ? 'Tattoo sketch' : 'Tatoo eskiis',
      icon: <PenLine className="h-5 w-5" />,
      onCustomAction: handleTattooCreate,
      isCustomActionRunning: isGeneratingTattoo,
      prompt: '',
    },
    {
      label: effectiveLanguage === 'eng' ? 'Photo enhance (AI)' : 'Foto puhastus (AI)',
      icon: <Camera className="h-5 w-5" />,
      onCustomAction: handlePhotoEnhance,
      isCustomActionRunning: isEnhancingPhoto,
      prompt: '',
    },
    {
      label: effectiveLanguage === 'eng' ? 'LightBurn export' : 'LightBurn eksport',
      icon: <Download className="h-5 w-5" />,
      onCustomAction: handleLightBurnExport,
      isCustomActionRunning: isExporting,
      prompt: '',
    },
  ]
  const commandModes: { label: string; prompt: string }[] = [
    {
      label: effectiveLanguage === 'eng' ? 'Material presets' : 'Materjali presetid',
      prompt: effectiveLanguage === 'eng'
        ? 'Give me concrete starting settings for my active machine and material with speed, power, passes, line interval and air assist recommendation.'
        : 'Anna minu aktiivse masina ja materjali jaoks konkreetsed lähteseaded koos kiiruse, võimsuse, passide, joone vahe ja air assisti soovitusega.',
    },
    {
      label: effectiveLanguage === 'eng' ? 'Photo preparation' : 'Foto ettevalmistus',
      prompt: effectiveLanguage === 'eng'
        ? (hasImageContext ? 'Analyze the image in the conversation and describe exactly how to prepare it for laser engraving for my active settings.' : 'Describe how to prepare a photo for laser engraving for my active settings.')
        : (hasImageContext ? 'Analüüsi vestluses olevat pilti ja kirjelda täpselt, kuidas see lasergraveerimiseks ette valmistada minu aktiivse seadistuse jaoks.' : 'Kirjelda, kuidas valmistada foto lasergraveerimiseks ette minu aktiivse seadistuse jaoks.'),
    },
    {
      label: 'LightBurn eksport',
      prompt: effectiveLanguage === 'eng'
        ? 'Explain how to prepare a job for LightBurn export for my active machine and material and which formats to choose.'
        : 'Selgita, kuidas valmistada töö LightBurn ekspordiks minu aktiivse masina ja materjali jaoks ning millised formaadid valida.',
    },
    {
      label: effectiveLanguage === 'eng' ? 'Safety check' : 'Ohutuskontroll',
      prompt: effectiveLanguage === 'eng'
        ? 'Do a quick safety check for my active machine, material and job type before starting engraving.'
        : 'Tee lühike ohutuskontroll minu aktiivse masina, materjali ja töö tüübi jaoks enne graveerimise alustamist.',
    },
  ]

  useEffect(() => {
    const storedSettings = readSavedLaserSettings()

    if (storedSettings?.summary) {
      setSavedSettingsSummary(storedSettings.summary)
      setSavedSettings(storedSettings)
    }
  }, [])

  // Load language preference from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('laser-ui-language')
    if (saved === 'eng') setLanguage('eng')
  }, [])

  // Save language preference to localStorage
  useEffect(() => {
    if (auth.user?.role !== 'admin') {
      localStorage.setItem('laser-ui-language', language)
    }
  }, [language, auth.user?.role])

  // Load conversations from server when user logs in
  useEffect(() => {
    if (auth.status !== 'authenticated' || !auth.token || hasLoadedRef.current) return
    hasLoadedRef.current = true
    void (async () => {
      const serverConvs = await fetchServerConversations(auth.token!)
      if (!serverConvs || serverConvs.length === 0) return
      const first = serverConvs[0]
      setConversations(serverConvs)
      setActiveConversationId(first.id)
      setMessages(first.messages)
      const maxNum = serverConvs.reduce((max, c) => {
        const m = c.name.match(/Vestlus (\d+)/)
        return Math.max(max, m ? parseInt(m[1]) : 0)
      }, 0)
      if (maxNum > 0) setConversationCounter(maxNum + 1)
    })()
  }, [auth.status, auth.token])

  // Reset when logged out
  useEffect(() => {
    if (auth.status === 'anonymous') {
      hasLoadedRef.current = false
      setConversations([{ id: 'conv-0', name: 'Vestlus 1', messages: [], createdAt: new Date() }])
      setActiveConversationId('conv-0')
      setConversationCounter(2)
      setMessages([])
    }
  }, [auth.status])

  // Auto-save: kohe kui streaming lõpeb, + 500ms debounce muudel juhtudel
  useEffect(() => {
    if (auth.status !== 'authenticated' || !auth.token || messages.length === 0) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    const activeConv = conversations.find((c) => c.id === activeConversationId)
    if (!activeConv) return
    const convToSave = { ...activeConv, messages }
    const token = auth.token
    // Kui streaming just lõppes — salvesta kohe, muidu 500ms debounce
    const delay = isLoading ? 0 : 500
    saveTimerRef.current = setTimeout(() => { void saveConversationToServer(token, convToSave) }, delay)
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [messages, activeConversationId, auth.token, auth.status, isLoading])

  // Salvesta kohe enne refressi/tab sulgemist
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (auth.status !== 'authenticated' || !auth.token || messages.length === 0) return
      const activeConv = conversations.find((c) => c.id === activeConversationId)
      if (!activeConv) return
      void saveConversationToServer(auth.token, { ...activeConv, messages })
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [auth.status, auth.token, messages, conversations, activeConversationId])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveRightPanel(null)
      }
    }

    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [])

  useEffect(() => {
    if (!canAccessKnowledge && knowledgeOpen) {
      setKnowledgeOpen(false)
    }
  }, [canAccessKnowledge, knowledgeOpen])

  const sendChatRequest = async (nextText?: string) => {
    const text = nextText?.trim()

    if ((!text && !pendingImage) || isLoading) {
      return
    }

    setChatInputError('')

    try {
      if (text) {
        await sendMessage({ text, files: pendingImage ? [pendingImage] : undefined })
      } else if (pendingImage) {
        await sendMessage({ files: [pendingImage] })
      }

      setInput('')
      setPendingImage(null)
    } catch {
      setChatInputError(effectiveLanguage === 'eng' ? 'Failed to send message. Please try again.' : 'Sõnumi saatmine ebaõnnestus. Proovi uuesti.')
    }
  }

  const handleSubmit = async () => {
    await sendChatRequest(input)
  }

  const handleQuickAction = async (prompt: string) => {
    await sendChatRequest(prompt)
  }

  const handleImageSelect = async (file: File | null) => {
    if (!file) {
      return
    }

    if (!SUPPORTED_CHAT_IMAGE_TYPES.has(file.type)) {
      setChatInputError(effectiveLanguage === 'eng' ? 'Supported formats: JPG, PNG and WEBP.' : 'Toetatud on JPG, PNG ja WEBP pildid.')
      return
    }

    if (file.size > MAX_CHAT_IMAGE_BYTES) {
      setChatInputError(effectiveLanguage === 'eng' ? 'Image must be up to 3 MB for the vision model to accept it.' : 'Pilt peab olema kuni 3 MB, et vision-mudel selle vastu võtaks.')
      return
    }

    try {
      const dataUrl = await readFileAsDataUrl(file)
      setPendingImage({
        type: 'file',
        filename: file.name,
        mediaType: file.type,
        url: dataUrl,
      })
      setChatInputError('')
    } catch (error) {
      setPendingImage(null)
      setChatInputError(error instanceof Error ? error.message : 'Pildi laadimine ebaõnnestus.')
    }
  }

  const handleClearPendingImage = () => {
    setPendingImage(null)
    setChatInputError('')
  }

  const handleNewConversation = () => {
    if (conversations.length >= MAX_CONVERSATIONS) {
      setChatInputError(effectiveLanguage === 'eng' ? `Maximum ${MAX_CONVERSATIONS} conversations at a time. Delete an old one using the × icon.` : `Maksimaalselt ${MAX_CONVERSATIONS} vestlust korraga. Kustuta × ikooni abil vana vestlus.`)
      return
    }
    const newId = `conv-${Date.now()}`
    const savedConversations = conversations.map((c) => (c.id === activeConversationId ? { ...c, messages } : c))
    if (auth.token && messages.length > 0) {
      const cur = savedConversations.find((c) => c.id === activeConversationId)
      if (cur) void saveConversationToServer(auth.token, cur)
    }
    setConversations([
      ...savedConversations,
      { id: newId, name: `Vestlus ${conversationCounter}`, messages: [], createdAt: new Date() },
    ])
    setConversationCounter((n) => n + 1)
    setActiveConversationId(newId)
    setMessages([])
    setPendingImage(null)
    setInput('')
    setChatInputError('')
  }

  const handleSwitchConversation = (id: string) => {
    if (id === activeConversationId) return
    const target = conversations.find((c) => c.id === id)
    if (!target) return
    const updatedCurrent = { ...conversations.find((c) => c.id === activeConversationId)!, messages }
    if (auth.token && messages.length > 0) void saveConversationToServer(auth.token, updatedCurrent)
    setConversations((prev) => prev.map((c) => (c.id === activeConversationId ? { ...c, messages } : c)))
    setActiveConversationId(id)
    setMessages(target.messages)
    setPendingImage(null)
    setInput('')
    setChatInputError('')
  }

  const handleDeleteConversation = (id: string, e: MouseEvent) => {
    e.stopPropagation()
    if (auth.token) void deleteConversationFromServer(auth.token, id)
    if (conversations.length === 1) {
      setMessages([])
      setPendingImage(null)
      setChatInputError('')
      return
    }
    const remaining = conversations.filter((c) => c.id !== id)
    const withSaved = remaining.map((c) => (c.id === activeConversationId ? { ...c, messages } : c))
    setConversations(withSaved)
    if (id === activeConversationId) {
      const newActive = withSaved[withSaved.length - 1]
      setActiveConversationId(newActive.id)
      setMessages(newActive.messages)
      setPendingImage(null)
      setInput('')
    }
  }

  const toggleRightPanel = (panel: RightUtilityPanel) => {
    setActiveRightPanel((currentPanel) => (currentPanel === panel ? null : panel))
  }

  return (
    <div className="relative z-1 min-h-dvh px-3 py-3 md:px-4">
      <KnowledgePanel
        authStatus={auth.status}
        currentUser={auth.user}
        isOpen={Boolean(canAccessKnowledge && knowledgeOpen)}
        onClose={() => setKnowledgeOpen(false)}
        sessionToken={auth.token}
      />

      <div className="hud-shell relative mx-auto flex min-h-[calc(100dvh-1.5rem)] max-w-400 flex-col p-3 md:p-5 xl:pr-24">
        <ChatHeader
          authStatus={auth.status}
          onChangePassword={auth.changePassword}
          currentUser={auth.user}
          hasMessages={hasMessages}
          language={effectiveLanguage}
          onLanguageChange={setLanguage}
          onLogin={auth.login}
          onLogout={auth.logout}
          onRegister={auth.register}
          onRequestPasswordReset={auth.requestPasswordReset}
          onReset={handleNewConversation}
          onOpenKnowledge={() => {
            if (canAccessKnowledge) {
              setKnowledgeOpen(true)
            }
          }}
        />

        <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex flex-col gap-3 md:bottom-6 md:right-6 xl:absolute xl:bottom-auto xl:right-5 xl:top-28">
          <div className="pointer-events-auto flex flex-col gap-3">
            <RightDockButton
              active={activeRightPanel === 'settings'}
              label="Ava seadistusmoodul"
              onClick={() => toggleRightPanel('settings')}
            >
              <Settings2 className="h-5 w-5" />
            </RightDockButton>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 cyan-scrollbar">
          {conversations.map((conv) => {
            const isActive = conv.id === activeConversationId
            const msgCount = isActive ? messages.length : conv.messages.length
            return (
              <button
                key={conv.id}
                type="button"
                onClick={() => handleSwitchConversation(conv.id)}
                className={cn(
                  'group flex shrink-0 items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-medium transition-colors',
                  isActive
                    ? 'border-primary/28 bg-primary/12 text-cyan-50 shadow-[0_0_16px_rgba(84,244,255,0.1)]'
                    : 'border-white/10 bg-black/28 text-cyan-100/52 hover:border-white/18 hover:text-cyan-50',
                )}
              >
                <span className="max-w-28 truncate">{conv.name}</span>
                {msgCount > 0 && (
                  <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-cyan-100/72">{msgCount}</span>
                )}
                <span
                  role="button"
                  onClick={(e) => handleDeleteConversation(conv.id, e)}
                  className="flex h-4 w-4 items-center justify-center rounded-full text-cyan-100/36 transition-colors hover:bg-white/18 hover:text-white"
                  title="Kustuta vestlus"
                >
                  <X className="h-3 w-3" />
                </span>
              </button>
            )
          })}
          <button
            type="button"
            onClick={handleNewConversation}
            disabled={conversations.length >= MAX_CONVERSATIONS}
            title={conversations.length >= MAX_CONVERSATIONS ? `Maksimaalselt ${MAX_CONVERSATIONS} vestlust` : 'Uus vestlus'}
            className="flex shrink-0 items-center gap-1.5 rounded-2xl border border-dashed border-white/16 bg-transparent px-3 py-2 text-xs font-medium text-cyan-100/46 transition-colors hover:border-white/28 hover:text-cyan-100/72 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-3 w-3" />
            Uus vestlus
          </button>
        </div>

        <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4">
          <HeroDisplay
            showcaseActions={showcaseActions}
            useCaseActions={useCaseActions}
            onQuickAction={(prompt) => {
              void handleQuickAction(prompt)
            }}
            language={effectiveLanguage}
            previewImageUrl={activeImageUrl}
            powerPct={previewPowerPct}
            materialName={previewMaterialName}
          />

          <section className={hasMessages ? 'hud-panel flex min-h-0 flex-1 flex-col p-4 md:p-5' : 'hud-panel p-4 md:p-5'}>
            {hasMessages ? (
              <>
                <div className="mb-4 flex flex-col gap-4 border-b border-white/6 pb-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <span className="hud-label">{effectiveLanguage === 'eng' ? 'Chat center' : 'Vestluskeskus'}</span>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">
                      {effectiveLanguage === 'eng'
                        ? 'Ask about settings, materials, safety or workflows. The chat now lives inside the same HUD screen as the rest of the control panel.'
                        : 'Küsi seadistusi, materjale, ohutust või töövooge. Vestlus elab nüüd sama HUD-ekraani sees nagu ülejäänud juhtpind.'}
                    </p>
                  </div>

                  <div className="xl:w-44">
                    <button
                      type="button"
                      onClick={() => toggleRightPanel('settings')}
                      className="hud-chip w-full rounded-[18px] px-3 py-2 text-left transition-colors hover:border-primary/24"
                    >
                      <span className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/58">{effectiveLanguage === 'eng' ? 'Settings' : 'Seaded'}</span>
                      <strong className="text-cyan-50">{savedSettingsSummary ? (effectiveLanguage === 'eng' ? 'Saved' : 'Salvestatud') : (effectiveLanguage === 'eng' ? 'Open panel' : 'Ava paneel')}</strong>
                    </button>
                  </div>
                </div>

                <div className="chat-deck flex min-h-0 flex-1 flex-col">
                  <div className="mb-4 flex flex-wrap gap-2">
                    {commandModes.map((mode, index) => (
                      <button
                        key={mode.label}
                        type="button"
                        onClick={() => {
                          void handleQuickAction(mode.prompt)
                        }}
                        className={index === 0 ? 'chat-command chat-command--active transition-colors hover:border-primary/28' : 'chat-command transition-colors hover:border-primary/22 hover:text-cyan-50'}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>

                  <div ref={scrollRef} className="chat-stage cyan-scrollbar min-h-0 flex-1 overflow-y-auto pr-2">
                    <div className="space-y-1">
                      {messages.map((message) => (
                        <ChatMessage key={message.id} message={message} />
                      ))}
                      {isLoading && messages[messages.length - 1]?.role === 'user' && (
                        <div className="flex gap-3 px-4 py-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/16 bg-primary/8 text-primary shadow-[0_0_24px_rgba(84,244,255,0.14)]">
                            <div className="flex gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
                              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
                              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <ChatInput
                  input={input}
                  setInput={setInput}
                  onSubmit={handleSubmit}
                  isLoading={isLoading}
                  pendingImage={pendingImage}
                  onImageSelect={handleImageSelect}
                  onClearImage={handleClearPendingImage}
                  inputError={chatInputError}
                  className="mt-4"
                />
              </>
            ) : (
              <ChatInput
                input={input}
                setInput={setInput}
                onSubmit={handleSubmit}
                isLoading={isLoading}
                pendingImage={pendingImage}
                onImageSelect={handleImageSelect}
                onClearImage={handleClearPendingImage}
                inputError={chatInputError}
              />
            )}
          </section>
        </div>

        {activeRightPanel === 'settings' && (
          <RightPanelShell
            title="Seadistusmoodul"
            description="Ava laserimasina, materjali ja soovituslike seadete paneel ainult siis, kui seda päriselt vajad."
            onClose={() => setActiveRightPanel(null)}
          >
            <LaserSettingsPanel
              savedSettingsSummary={savedSettingsSummary}
              onSavedSettingsSummaryChange={(summary) => {
                setSavedSettingsSummary(summary)
                setSavedSettings(readSavedLaserSettings())
              }}
            />
          </RightPanelShell>
        )}

      </div>
    </div>
  )
}
