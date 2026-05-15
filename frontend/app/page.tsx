'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type FileUIPart } from 'ai'
import Image from 'next/image'
import { Camera, Download, Layers, PenLine, Settings2, SlidersHorizontal, Sparkles, WandSparkles, X } from 'lucide-react'
import { ChatHeader } from '@/components/chat-header'
import { ChatInput } from '@/components/chat-input'
import { EngravingOptimizerPanel } from '@/components/engraving-optimizer-panel'
import { ChatMessage } from '@/components/chat-message'
import { KnowledgePanel } from '@/components/knowledge-panel'
import { LaserSettingsPanel } from '@/components/laser-settings-panel'
import { readSavedLaserSettings } from '@/lib/engraving/saved-settings-storage'
import type { ImageAsset } from '@/lib/engraving/types'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'

const MAX_CHAT_IMAGE_BYTES = 3 * 1024 * 1024
const SUPPORTED_CHAT_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
type RightUtilityPanel = 'settings' | 'optimizer'
type ShowcaseAction = { label: string; value: string; prompt: string }
type UseCaseAction = { label: string; icon: ReactNode; prompt: string }

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
}: {
  showcaseActions: ShowcaseAction[]
  useCaseActions: UseCaseAction[]
  onQuickAction: (prompt: string) => void
}) {
  return (
    <section className="hud-panel px-5 py-5 md:px-6 md:py-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] xl:items-center">
        <div className="hero-stage">
          <div className="hud-plate overflow-hidden">
            <span className="hud-plate-bolt left-5 top-5" />
            <span className="hud-plate-bolt right-5 top-5" />
            <span className="hud-plate-bolt bottom-5 left-5" />
            <span className="hud-plate-bolt bottom-5 right-5" />
            <div className="hero-plate-code">Näidisgraveering</div>
            <div className="hero-plate-status">Preview ready</div>

            <div
              className="absolute z-0 overflow-hidden rounded-[18px] border border-white/10"
              style={{ inset: '18px' }}
            >
              <Image
                src="/laser-graveerimine-logo.svg"
                alt="Laser Graveerimine näidisgraveering"
                fill
                priority
                className="object-cover opacity-90"
                sizes="(max-width: 1280px) 100vw, 55vw"
              />
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to top, rgba(3, 7, 15, 0.82), rgba(5, 10, 18, 0.16), rgba(224, 255, 255, 0.04))' }}
              />
              <div
                className="absolute inset-x-0 bottom-0 h-30"
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
            {useCaseActions.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => onQuickAction(item.prompt)}
                className="flex flex-col items-center gap-2 rounded-[20px] border border-primary/12 bg-black/24 px-2 py-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors hover:border-primary/24 hover:bg-black/32"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/14 bg-primary/8 text-primary">
                  {item.icon}
                </div>
                <span className="text-xs font-semibold leading-tight text-cyan-50">{item.label}</span>
              </button>
            ))}
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
  const [chatInputError, setChatInputError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const auth = useAuth()
  const canAccessKnowledge = auth.status === 'authenticated' && auth.user?.role === 'admin'

  const chatTransport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: savedSettingsSummary ? { savedSettingsSummary } : undefined,
      }),
    [savedSettingsSummary]
  )

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: chatTransport,
  })

  const hasMessages = messages.length > 0
  const hasImageContext = Boolean(pendingImage) || messages.some(messageHasImage)
  const isLoading = status === 'streaming' || status === 'submitted'
  const showcaseActions: ShowcaseAction[] = [
    {
      label: 'Materjalid',
      value: 'Puit, metall, nahk',
      prompt: 'Anna minu aktiivse masina ja materjali jaoks konkreetsed lähteseaded koos kiiruse, võimsuse, passide, joone vahe, air assisti ja tähelepanekutega.',
    },
    {
      label: 'Töövoog',
      value: 'Prompt -> optimize -> export',
      prompt: 'Kirjelda mulle samm-sammult töövoogu alates pildist või promptist kuni graveerimiseks valmis faili ekspordini minu aktiivse seadistuse järgi.',
    },
    {
      label: 'Väljund',
      value: 'PNG, SVG, DXF',
      prompt: 'Selgita, millal kasutada PNG, SVG või DXF väljundit minu aktiivse masina ja materjali puhul.',
    },
  ]
  const useCaseActions: UseCaseAction[] = [
    {
      label: 'Logo loomine',
      icon: <Layers className="h-5 w-5" />,
      prompt: 'Anna soovitus, kuidas luua ja valmistada logo fail minu aktiivse masina ja materjali jaoks lasergraveerimiseks.',
    },
    {
      label: 'Visuaalne täiustus',
      icon: <Sparkles className="h-5 w-5" />,
      prompt: hasImageContext
        ? 'Analüüsi vestluses olevat pilti ja kirjelda täpselt, kuidas seda visuaalselt täiustada lasergraveerimiseks minu aktiivse seadistuse jaoks.'
        : 'Kirjelda, kuidas visuaalselt täiustada pilti lasergraveerimiseks minu aktiivse seadistuse jaoks: kontrast, teravustamine ja optimaalne väljund.',
    },
    {
      label: 'Tatoo eskiis',
      icon: <PenLine className="h-5 w-5" />,
      prompt: 'Anna juhised tatoo eskiisi ettevalmistamiseks lasergraveerimiseks: joonte paksus, kontrast ja soovituslikud seadistused minu aktiivse masina ja materjali jaoks.',
    },
    {
      label: 'Vali preset',
      icon: <SlidersHorizontal className="h-5 w-5" />,
      prompt: 'Aita mul valida sobiv preset ning anna soovituslikud parameetrid minu laseri ja materjali jaoks.',
    },
    {
      label: 'Foto puhastus (AI)',
      icon: <Camera className="h-5 w-5" />,
      prompt: hasImageContext
        ? 'Analüüsi vestluses olevat pilti ja kirjelda täpselt, kuidas see lasergraveerimiseks ette valmistada minu aktiivse seadistuse jaoks.'
        : 'Kirjelda, kuidas valmistada foto lasergraveerimiseks ette minu aktiivse seadistuse jaoks.',
    },
    {
      label: 'LightBurn eksport',
      icon: <Download className="h-5 w-5" />,
      prompt: 'Selgita, kuidas valmistada töö LightBurn ekspordiks minu aktiivse masina ja materjali jaoks ning millised formaadid valida.',
    },
  ]
  const commandModes: { label: string; prompt: string }[] = [
    {
      label: 'Materjali presetid',
      prompt: 'Anna minu aktiivse masina ja materjali jaoks konkreetsed lähteseaded koos kiiruse, võimsuse, passide, joone vahe ja air assisti soovitusega.',
    },
    {
      label: 'Foto ettevalmistus',
      prompt: hasImageContext
        ? 'Analüüsi vestluses olevat pilti ja kirjelda täpselt, kuidas see lasergraveerimiseks ette valmistada minu aktiivse seadistuse jaoks.'
        : 'Kirjelda, kuidas valmistada foto lasergraveerimiseks ette minu aktiivse seadistuse jaoks.',
    },
    {
      label: 'LightBurn eksport',
      prompt: 'Selgita, kuidas valmistada töö LightBurn ekspordiks minu aktiivse masina ja materjali jaoks ning millised formaadid valida.',
    },
    {
      label: 'Ohutuskontroll',
      prompt: 'Tee lühike ohutuskontroll minu aktiivse masina, materjali ja töö tüübi jaoks enne graveerimise alustamist.',
    },
  ]

  useEffect(() => {
    const storedSettings = readSavedLaserSettings()

    if (storedSettings?.summary) {
      setSavedSettingsSummary(storedSettings.summary)
    }
  }, [])

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
      setChatInputError('Sõnumi saatmine ebaõnnestus. Proovi uuesti.')
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
      setChatInputError('Toetatud on JPG, PNG ja WEBP pildid.')
      return
    }

    if (file.size > MAX_CHAT_IMAGE_BYTES) {
      setChatInputError('Pilt peab olema kuni 3 MB, et vision-mudel selle vastu võtaks.')
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

  const handlePromoteOptimizerImage = (asset: Pick<ImageAsset, 'dataUrl' | 'fileName' | 'mediaType'>) => {
    setPendingImage({
      type: 'file',
      filename: asset.fileName,
      mediaType: asset.mediaType,
      url: asset.dataUrl,
    })
    setChatInputError('')
  }

  const handleReset = () => {
    setMessages([])
    setPendingImage(null)
    setChatInputError('')
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
          onLogin={auth.login}
          onLogout={auth.logout}
          onRegister={auth.register}
          onRequestPasswordReset={auth.requestPasswordReset}
          onReset={handleReset}
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
            <RightDockButton
              active={activeRightPanel === 'optimizer'}
              label="Ava optimizer"
              onClick={() => toggleRightPanel('optimizer')}
            >
              <WandSparkles className="h-5 w-5" />
            </RightDockButton>
          </div>
        </div>

        <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4">
          <HeroDisplay
            showcaseActions={showcaseActions}
            useCaseActions={useCaseActions}
            onQuickAction={(prompt) => {
              void handleQuickAction(prompt)
            }}
          />

          <section className={hasMessages ? 'hud-panel flex min-h-0 flex-1 flex-col p-4 md:p-5' : 'hud-panel p-4 md:p-5'}>
            {hasMessages ? (
              <>
                <div className="mb-4 flex flex-col gap-4 border-b border-white/6 pb-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <span className="hud-label">Vestluskeskus</span>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">
                      Küsi seadistusi, materjale, ohutust või töövooge. Vestlus elab nüüd sama HUD-ekraani sees nagu
                      ülejäänud juhtpind.
                    </p>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 xl:w-88">
                    <button
                      type="button"
                      onClick={() => toggleRightPanel('settings')}
                      className="hud-chip rounded-[18px] px-3 py-2 text-left transition-colors hover:border-primary/24"
                    >
                      <span className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/58">Seaded</span>
                      <strong className="text-cyan-50">{savedSettingsSummary ? 'Salvestatud' : 'Ava paneel'}</strong>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleRightPanel('optimizer')}
                      className="hud-chip rounded-[18px] px-3 py-2 text-left transition-colors hover:border-primary/24"
                    >
                      <span className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/58">Optimizer</span>
                      <strong className="text-cyan-50">{isLoading ? 'Töötlen' : 'Ava paneel'}</strong>
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
              onSavedSettingsSummaryChange={setSavedSettingsSummary}
            />
          </RightPanelShell>
        )}

        {activeRightPanel === 'optimizer' && (
          <RightPanelShell
            title="Optimizer pipeline"
            description="Ava pildi genereerimise, optimeerimise ja ekspordi tööriistad ainult kliki peale."
            onClose={() => setActiveRightPanel(null)}
          >
            <EngravingOptimizerPanel
              prompt={input}
              pendingImage={pendingImage}
              onPromoteImage={handlePromoteOptimizerImage}
              savedSettingsSummary={savedSettingsSummary}
            />
          </RightPanelShell>
        )}
      </div>
    </div>
  )
}
