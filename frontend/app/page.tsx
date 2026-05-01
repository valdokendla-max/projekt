'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type FileUIPart } from 'ai'
import Image from 'next/image'
import { Settings2, Sparkles, WandSparkles, X } from 'lucide-react'
import { ChatHeader } from '@/components/chat-header'
import { ChatInput } from '@/components/chat-input'
import { EngravingOptimizerPanel } from '@/components/engraving-optimizer-panel'
import { ChatMessage } from '@/components/chat-message'
import { KnowledgePanel } from '@/components/knowledge-panel'
import { LaserSettingsPanel } from '@/components/laser-settings-panel'
import { SEO_GUIDE_SUMMARIES } from './seo-content'
import { readSavedLaserSettings, type StoredLaserSettings } from '@/lib/engraving/saved-settings-storage'
import type { ImageAsset, OptimizerAsyncJob, WorkerProcessingResult } from '@/lib/engraving/types'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'

const MAX_CHAT_IMAGE_BYTES = 3 * 1024 * 1024
const SUPPORTED_CHAT_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const UI_LANGUAGE_STORAGE_KEY = 'laser-graveerimine:ui-language'
const SITE_URL = 'https://vkengraveai.eu'
type RightUtilityPanel = 'settings' | 'optimizer'
type UiLanguage = 'et' | 'en'
type ShowcaseAction = { label: string; value: string; prompt: string }
type UseCaseAction = { label: string; description: string; prompt: string }
type ImageTransformStyle = 'bas-relief' | 'medallion' | 'stone-carving' | 'wood-carving'

const IMAGE_STYLE_OPTIONS: Record<UiLanguage, Array<{ key: ImageTransformStyle; label: string }>> = {
  et: [
    { key: 'bas-relief', label: 'Reljeef' },
    { key: 'medallion', label: 'Medaljon' },
    { key: 'stone-carving', label: 'Kivinikerdus' },
    { key: 'wood-carving', label: 'Puunikerdus' },
  ],
  en: [
    { key: 'bas-relief', label: 'Relief' },
    { key: 'medallion', label: 'Medallion' },
    { key: 'stone-carving', label: 'Stone carve' },
    { key: 'wood-carving', label: 'Wood carve' },
  ],
}

const STYLE_OPTIMIZE_PROMPTS: Record<UiLanguage, Record<ImageTransformStyle, string>> = {
  et: {
    'bas-relief': 'Optimeeri see reljeefne nikerduspilt lasergraveerimiseks.',
    medallion: 'Optimeeri see medaljon-stiilis nikerduspilt lasergraveerimiseks.',
    'stone-carving': 'Optimeeri see kivinikerdus-stiilis pilt lasergraveerimiseks.',
    'wood-carving': 'Optimeeri see puunikerdus-stiilis pilt lasergraveerimiseks.',
  },
  en: {
    'bas-relief': 'Optimize this bas-relief carving for laser engraving.',
    medallion: 'Optimize this medallion carving for laser engraving.',
    'stone-carving': 'Optimize this stone-carved image for laser engraving.',
    'wood-carving': 'Optimize this wood-carved image for laser engraving.',
  },
}

interface OptimizeImageResponse {
  ok: boolean
  queued: boolean
  jobId: string
  job: OptimizerAsyncJob
  workerResult: WorkerProcessingResult | null
  workerError: string
}

function wait(durationMs: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, durationMs)
  })
}

function formatModeChip(mode: 'engrave' | 'cut', language: UiLanguage) {
  if (language === 'en') {
    return mode === 'cut' ? 'Cut preset' : 'Engrave preset'
  }

  return mode === 'cut' ? 'Lõike preset' : 'Graveerimise preset'
}

function getPreviewSizeLabel(savedSettings: StoredLaserSettings | null, language: UiLanguage) {
  if (!savedSettings) {
    return language === 'en' ? 'Not set' : 'Määramata'
  }

  const widthMm = savedSettings.widthMm ?? savedSettings.recommendation?.estimates?.widthMm ?? null
  const heightMm = savedSettings.heightMm ?? savedSettings.recommendation?.estimates?.heightMm ?? null

  if (widthMm && heightMm) {
    return `${widthMm} x ${heightMm} mm`
  }

  if (widthMm) {
    return `${widthMm} x ? mm`
  }

  if (heightMm) {
    return `? x ${heightMm} mm`
  }

  return language === 'en' ? 'Add size' : 'Lisa mõõt'
}

const PAGE_COPY = {
  et: {
    header: {
      subtitle: 'Lasergraveerimise assistent',
      sessionActive: 'Sessioon aktiivne',
      userRole: 'Kasutaja',
      account: 'Konto',
      checking: 'Kontrollin',
      login: 'Logi sisse',
      register: 'Registreeru',
      changePassword: 'Muuda parooli',
      logout: 'Logi välja',
      knowledge: 'Teadmised',
      newChat: 'Uus vestlus',
      languageLabel: 'Keel',
      est: 'EST',
      eng: 'ENG',
    },
    chatInput: {
      sendHint: 'Enter = saada',
      newlineHint: 'Shift+Enter = uus rida',
      imageHint: 'Pilt = vision',
      imageAlt: 'Laaditud pilt',
      imageReady: 'Pilt valmis',
      imageAttachment: 'Pildi manus',
      imageVisionHint: 'Vision-mudel analüüsib pilti koos sinu salvestatud masina seadistusega.',
      reliefAction: 'Genereeri reljeef',
      reliefWorking: 'Töötlen stiili',
      analyzeImageLabel: 'Anna parimad seadistused sellele pildile',
      analyzeImageSubLabel: 'Kiirus · Võimsus · DPI · Passid · Soovitused',
      placeholder: 'Küsi masina, materjali või seadete kohta...',
      footer: 'Laser Graveerimine - sinu lasergraveerimise abiline',
    },
    hero: {
      plateCode: 'Näidisgraveering',
      plateStatus: 'Preview ready',
      imageAlt: 'Laser Graveerimine näidisgraveering',
      label: 'Precision Array',
      titleFirstLine: 'Laser',
      titleSecondLine: 'Graveerimine',
      kicker: 'Precision. Power. Control.',
      description: 'Reaalne tööala lasergraveerimise jaoks: vestlus, masinapõhised soovitused ja eksporditav väljund samas vaates. Avalehe hero-plokk näitab nüüd päris näidisstiili, mitte ainult dekoratiivset illustratsiooni.',
      quickActionPrefix: 'Kiirtoiming',
    },
    showcaseActions: [
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
    ],
    useCaseActions: [
      {
        label: 'Logo ja märgistus',
        description: 'Anna juhised logo või märgistuse faili ettevalmistamiseks puidule või metallile.',
        prompt: 'Anna soovitus, kuidas valmistada logo või märgistuse fail ette minu aktiivse masina ja materjali jaoks.',
      },
      {
        label: 'Foto puhastus',
        description: 'Selgita, kuidas teha fotost lasergraveerimiseks sobiv kõrge kontrastiga väljund.',
      },
      {
        label: 'Seadistusoovitus',
        description: 'Kasuta valitud masinat ja materjali ning anna praktiline töötlusplaan.',
        prompt: 'Koosta mulle praktiline seadistusoovitus minu aktiivse masina, materjali ja režiimi jaoks ning lisa lühike töötlusplaan.',
      },
    ],
    commandModes: [
      {
        label: 'Materjali presetid',
        description: '',
        prompt: 'Anna minu aktiivse masina ja materjali jaoks konkreetsed lähteseaded koos kiiruse, võimsuse, passide, joone vahe ja air assisti soovitusega.',
      },
      {
        label: 'Foto ettevalmistus',
        description: '',
      },
      {
        label: 'LightBurn eksport',
        description: '',
        prompt: 'Selgita, kuidas valmistada töö LightBurn ekspordiks minu aktiivse masina ja materjali jaoks ning millised formaadid valida.',
      },
      {
        label: 'Ohutuskontroll',
        description: '',
        prompt: 'Tee lühike ohutuskontroll minu aktiivse masina, materjali ja töö tüübi jaoks enne graveerimise alustamist.',
      },
    ],
    panels: {
      settingsDock: 'Ava seadistusmoodul',
      optimizerDock: 'Ava optimizer',
      shell: 'Parempaneel',
      closePanel: 'Sulge paneel',
      settingsTitle: 'Seadistusmoodul',
      settingsDescription: 'Ava laserimasina, materjali ja soovituslike seadete paneel ainult siis, kui seda päriselt vajad.',
      optimizerTitle: 'Optimizer pipeline',
      optimizerDescription: 'Ava pildi genereerimise, optimeerimise ja ekspordi tööriistad ainult kliki peale.',
    },
    chat: {
      label: 'Vestluskeskus',
      description: 'Küsi seadistusi, materjale, ohutust või töövooge. Vestlus elab nüüd sama HUD-ekraani sees nagu ülejäänud juhtpind.',
      settings: 'Seaded',
      saved: 'Salvestatud',
      openPanel: 'Ava paneel',
      optimizer: 'Optimizer',
      processing: 'Töötlen',
    },
    errors: {
      fileRead: 'Pildi lugemine ebaõnnestus.',
      sendMessage: 'Sõnumi saatmine ebaõnnestus. Proovi uuesti.',
      unsupportedImage: 'Toetatud on JPG, PNG ja WEBP pildid.',
      imageTooLarge: 'Pilt peab olema kuni 3 MB, et vision-mudel selle vastu võtaks.',
      imageLoadFailed: 'Pildi laadimine ebaõnnestus.',
    },
    seo: {
      badge: 'Laser graveerimine Eestis',
      title: 'Lasergraveerimise seadistused, materjalid ja töövood ühest kohast',
      intro: 'Laser Graveerimine aitab koostada praktilisi lasergraveerimise seadistusi puidu, metalli, naha ja teiste materjalide jaoks. Tööriist ühendab vestluse, masinapõhised soovitused, foto ettevalmistuse ja LightBurni ekspordi juhised samasse töövoogu.',
      topics: [
        {
          title: 'Masinapõhised lähteseaded',
          description: 'Sisesta masin, materjal ja töörežiim ning saa lähtekiirus, võimsus, passid, joone vahe ja tähelepanekud enne katsetust.',
        },
        {
          title: 'Foto ja logo ettevalmistus',
          description: 'Kasuta tööriista, et muuta foto, logo või märgistus failiks, mis sobib lasergraveerimiseks ning hoiab olulised detailid alles.',
        },
        {
          title: 'LightBurni ja tootmisfaili eksport',
          description: 'Valmista graveerimistöö ette PNG, SVG või DXF väljundina ning koosta praktiline töövoog alates promptist kuni ekspordini.',
        },
      ],
      faqTitle: 'Korduma kippuvad küsimused',
      guidesTitle: 'Lisajuhendid Google jaoks ja päris kasutuseks',
      guidesDescription: 'Need sihtlehed aitavad Google’il mõista konkreetseid teemasid nagu puidule graveerimine, metallile märgistus, logo ettevalmistus ja LightBurni eksport.',
      allGuidesLabel: 'Vaata kõiki juhendeid',
      faqs: [
        {
          question: 'Milleks see lasergraveerimise tööriist sobib?',
          answer: 'See sobib lasergraveerimise seadistuste leidmiseks, materjalide töötlemise planeerimiseks, fotode ettevalmistuseks ja LightBurni ekspordi juhendamiseks.',
        },
        {
          question: 'Kas see aitab valida seadistusi erinevatele materjalidele?',
          answer: 'Jah. Tööriist aitab koostada praktilisi lähteseadeid puidu, metalli, naha ja teiste materjalide jaoks sinu masina ja töörežiimi põhjal.',
        },
        {
          question: 'Kas siit saab ka pildi graveerimiseks ette valmistada?',
          answer: 'Jah. Saad juhiseid kontrasti, thresholdi, tausta, resolutsiooni ja sobiva väljundformaadi kohta, et pilt oleks lasergraveerimiseks valmis.',
        },
      ],
    },
  },
  en: {
    header: {
      subtitle: 'Laser engraving assistant',
      sessionActive: 'Session active',
      userRole: 'User',
      account: 'Account',
      checking: 'Checking',
      login: 'Sign in',
      register: 'Register',
      changePassword: 'Change password',
      logout: 'Sign out',
      knowledge: 'Knowledge',
      newChat: 'New chat',
      languageLabel: 'Language',
      est: 'EST',
      eng: 'ENG',
    },
    chatInput: {
      sendHint: 'Enter = send',
      newlineHint: 'Shift+Enter = new line',
      imageHint: 'Image = vision',
      imageAlt: 'Uploaded image',
      imageReady: 'Image ready',
      imageAttachment: 'Image attachment',
      imageVisionHint: 'The vision model analyzes the image together with your saved machine settings.',
      reliefAction: 'Generate relief',
      reliefWorking: 'Transforming style',
      analyzeImageLabel: 'Get best settings for this image',
      analyzeImageSubLabel: 'Speed · Power · DPI · Passes · Recommendations',
      placeholder: 'Ask about machine, material, or settings...',
      footer: 'Laser Graveerimine - your laser engraving assistant',
    },
    hero: {
      plateCode: 'Sample engraving',
      plateStatus: 'Preview ready',
      imageAlt: 'Laser Graveerimine sample engraving',
      label: 'Precision Array',
      titleFirstLine: 'Laser',
      titleSecondLine: 'Engraving',
      kicker: 'Precision. Power. Control.',
      description: 'A real laser-engraving workspace: chat, machine-based recommendations, and exportable output in the same view. The homepage hero now shows an actual sample style instead of a decorative illustration.',
      quickActionPrefix: 'Quick action',
    },
    showcaseActions: [
      {
        label: 'Materials',
        value: 'Wood, metal, leather',
        prompt: 'Give me concrete starting settings for my active machine and material, including speed, power, passes, line interval, air assist, and key notes.',
      },
      {
        label: 'Workflow',
        value: 'Prompt -> optimize -> export',
        prompt: 'Describe the workflow step by step from an image or prompt to an engraving-ready export based on my active setup.',
      },
      {
        label: 'Output',
        value: 'PNG, SVG, DXF',
        prompt: 'Explain when to use PNG, SVG, or DXF output for my active machine and material.',
      },
    ],
    useCaseActions: [
      {
        label: 'Logo and marking',
        description: 'Give guidance for preparing a logo or marking file for wood or metal.',
        prompt: 'Give me guidance on how to prepare a logo or marking file for my active machine and material.',
      },
      {
        label: 'Photo cleanup',
        description: 'Explain how to turn a photo into a high-contrast output suitable for laser engraving.',
      },
      {
        label: 'Settings recommendation',
        description: 'Use the selected machine and material to build a practical processing plan.',
        prompt: 'Create a practical settings recommendation for my active machine, material, and mode, and include a short processing plan.',
      },
    ],
    commandModes: [
      {
        label: 'Material presets',
        description: '',
        prompt: 'Give me concrete starting settings for my active machine and material, including speed, power, passes, line interval, and air assist recommendations.',
      },
      {
        label: 'Photo prep',
        description: '',
      },
      {
        label: 'LightBurn export',
        description: '',
        prompt: 'Explain how to prepare the job for LightBurn export for my active machine and material, and which formats to choose.',
      },
      {
        label: 'Safety check',
        description: '',
        prompt: 'Run a short safety check for my active machine, material, and job type before engraving starts.',
      },
    ],
    panels: {
      settingsDock: 'Open settings module',
      optimizerDock: 'Open optimizer',
      shell: 'Right panel',
      closePanel: 'Close panel',
      settingsTitle: 'Settings module',
      settingsDescription: 'Open the laser machine, material, and recommended settings panel only when you actually need it.',
      optimizerTitle: 'Optimizer pipeline',
      optimizerDescription: 'Open the image generation, optimization, and export tools on demand.',
    },
    chat: {
      label: 'Chat hub',
      description: 'Ask about settings, materials, safety, or workflows. The chat now lives in the same HUD screen as the rest of the control surface.',
      settings: 'Settings',
      saved: 'Saved',
      openPanel: 'Open panel',
      optimizer: 'Optimizer',
      processing: 'Processing',
    },
    errors: {
      fileRead: 'Failed to read image.',
      sendMessage: 'Failed to send message. Please try again.',
      unsupportedImage: 'Supported image types are JPG, PNG, and WEBP.',
      imageTooLarge: 'The image must be up to 3 MB so the vision model can accept it.',
      imageLoadFailed: 'Failed to load image.',
    },
    seo: {
      badge: 'Laser engraving workspace',
      title: 'Laser engraving settings, materials, and workflows in one place',
      intro: 'Laser Graveerimine helps users build practical laser engraving settings for wood, metal, leather, and other materials. The app combines chat guidance, machine-based recommendations, photo preparation, and LightBurn export guidance in a single workflow.',
      topics: [
        {
          title: 'Machine-based starting settings',
          description: 'Choose the machine, material, and mode to get starting values for speed, power, passes, line interval, and useful production notes.',
        },
        {
          title: 'Photo and logo preparation',
          description: 'Use the tool to turn a photo, logo, or marking concept into a laser-ready file while keeping the important detail intact.',
        },
        {
          title: 'LightBurn and production export',
          description: 'Prepare an engraving job for PNG, SVG, or DXF output and build a practical workflow from prompt to export.',
        },
      ],
      faqTitle: 'Frequently asked questions',
      guidesTitle: 'Additional guides for search visibility and real users',
      guidesDescription: 'These landing pages help Google understand specific topics like engraving on wood, marking metal, preparing logos, and exporting for LightBurn.',
      allGuidesLabel: 'View all guides',
      faqs: [
        {
          question: 'What is this laser engraving tool for?',
          answer: 'It is designed to help with laser engraving settings, material planning, photo preparation, and LightBurn export guidance.',
        },
        {
          question: 'Can it recommend settings for different materials?',
          answer: 'Yes. It helps generate practical starting settings for wood, metal, leather, and other materials based on your machine and engraving mode.',
        },
        {
          question: 'Can it help prepare an image for engraving?',
          answer: 'Yes. It can guide contrast, threshold, background cleanup, resolution, and output format choices so the image is ready for laser engraving.',
        },
      ],
    },
  },
} satisfies Record<UiLanguage, {
  header: {
    subtitle: string
    sessionActive: string
    userRole: string
    account: string
    checking: string
    login: string
    register: string
    changePassword: string
    logout: string
    knowledge: string
    newChat: string
    languageLabel: string
    est: string
    eng: string
  }
  chatInput: {
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
  hero: {
    plateCode: string
    plateStatus: string
    imageAlt: string
    label: string
    titleFirstLine: string
    titleSecondLine: string
    kicker: string
    description: string
    quickActionPrefix: string
  }
  showcaseActions: ShowcaseAction[]
  useCaseActions: Array<Omit<UseCaseAction, 'prompt'> & { prompt?: string }>
  commandModes: Array<Omit<UseCaseAction, 'prompt'> & { prompt?: string }>
  panels: {
    settingsDock: string
    optimizerDock: string
    shell: string
    closePanel: string
    settingsTitle: string
    settingsDescription: string
    optimizerTitle: string
    optimizerDescription: string
  }
  chat: {
    label: string
    description: string
    settings: string
    saved: string
    openPanel: string
    optimizer: string
    processing: string
  }
  errors: {
    fileRead: string
    sendMessage: string
    unsupportedImage: string
    imageTooLarge: string
    imageLoadFailed: string
  }
  seo: {
    badge: string
    title: string
    intro: string
    topics: Array<{
      title: string
      description: string
    }>
    faqTitle: string
    guidesTitle: string
    guidesDescription: string
    allGuidesLabel: string
    faqs: Array<{
      question: string
      answer: string
    }>
  }
}>

function buildStructuredData(language: UiLanguage, copy: (typeof PAGE_COPY)[UiLanguage]['seo']) {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Laser Graveerimine',
      url: SITE_URL,
      inLanguage: language === 'et' ? 'et-EE' : 'en',
      description: copy.intro,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Laser Graveerimine',
      url: SITE_URL,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      inLanguage: language === 'et' ? 'et-EE' : 'en',
      description: copy.intro,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'EUR',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: copy.faqs.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      itemListElement: SEO_GUIDE_SUMMARIES.map((guide, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${SITE_URL}/${guide.slug}`,
        name: guide.title[language],
      })),
    },
  ]
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }

      reject(new Error(PAGE_COPY.et.errors.fileRead))
    }
    reader.onerror = () => reject(new Error(PAGE_COPY.et.errors.fileRead))
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
  shellLabel,
  title,
  description,
  closeLabel,
  onClose,
  children,
}: {
  shellLabel: string
  title: string
  description: string
  closeLabel: string
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
                <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-100/44">{shellLabel}</div>
                <h2 className="mt-1 text-base font-semibold text-cyan-50">{title}</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">{description}</p>
              </div>

              <button
                type="button"
                aria-label={closeLabel}
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
  copy,
  showcaseActions,
  useCaseActions,
  language,
  savedSettings,
  onQuickAction,
}: {
  copy: (typeof PAGE_COPY)[UiLanguage]['hero']
  showcaseActions: ShowcaseAction[]
  useCaseActions: UseCaseAction[]
  language: UiLanguage
  savedSettings: StoredLaserSettings | null
  onQuickAction: (prompt: string) => void
}) {
  const recommendation = savedSettings?.recommendation
  const hasSavedPreview = Boolean(savedSettings && recommendation)
  const timeLabel = recommendation?.estimates?.durationLabel || (language === 'en' ? 'Add size for estimate' : 'Lisa mõõt aja jaoks')
  const sizeLabel = getPreviewSizeLabel(savedSettings, language)
  const previewModeLabel = savedSettings ? formatModeChip(savedSettings.mode, language) : ''

  return (
    <section className="hud-panel px-5 py-5 md:px-6 md:py-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] xl:items-center">
        <div className="hero-stage">
          <div className="hud-plate overflow-hidden">
            <span className="hud-plate-bolt left-5 top-5" />
            <span className="hud-plate-bolt right-5 top-5" />
            <span className="hud-plate-bolt bottom-5 left-5" />
            <span className="hud-plate-bolt bottom-5 right-5" />
            <div className="hero-plate-code">{copy.plateCode}</div>
            <div className="hero-plate-status">{copy.plateStatus}</div>

            <div
              className="absolute z-0 overflow-hidden rounded-[18px] border border-white/10"
              style={{ inset: '18px' }}
            >
              {hasSavedPreview ? (
                <div className="relative h-full w-full overflow-hidden bg-[radial-gradient(circle_at_top,rgba(84,244,255,0.18),transparent_38%),linear-gradient(135deg,rgba(2,6,13,0.95),rgba(7,20,29,0.92)_45%,rgba(5,14,24,0.98))]">
                  <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(rgba(84,244,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(84,244,255,0.08) 1px, transparent 1px)', backgroundSize: '26px 26px' }} />
                  <div className="absolute left-[14%] top-[20%] h-[52%] w-[46%] rounded-[20px] border border-cyan-300/35 bg-cyan-300/8 shadow-[0_0_40px_rgba(84,244,255,0.18)]">
                    <div className="absolute inset-x-3 top-3 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100/70">
                      <span>{previewModeLabel}</span>
                      <span>{recommendation?.machine.powerW}W</span>
                    </div>
                    <div className="absolute inset-x-6 top-[34%] h-0.5 bg-linear-to-r from-transparent via-cyan-300/75 to-transparent shadow-[0_0_18px_rgba(84,244,255,0.7)]" />
                    <div className="absolute left-[20%] top-[20%] h-[56%] w-0.5 bg-linear-to-b from-transparent via-cyan-300/55 to-transparent" />
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-2xl border border-primary/12 bg-black/45 px-3 py-3 backdrop-blur-sm">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-100/44">{language === 'en' ? 'Machine' : 'Masin'}</div>
                      <div className="mt-1 text-sm font-semibold text-cyan-50">{recommendation?.machine.label}</div>
                    </div>
                    <div className="rounded-2xl border border-primary/12 bg-black/45 px-3 py-3 backdrop-blur-sm">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-100/44">{language === 'en' ? 'Size' : 'Suurus'}</div>
                      <div className="mt-1 text-sm font-semibold text-cyan-50">{sizeLabel}</div>
                    </div>
                    <div className="rounded-2xl border border-primary/12 bg-black/45 px-3 py-3 backdrop-blur-sm">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-100/44">{language === 'en' ? 'Estimate' : 'Aeg'}</div>
                      <div className="mt-1 text-sm font-semibold text-cyan-50">{timeLabel}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <Image
                  src="/laser-graveerimine-logo.svg"
                  alt={copy.imageAlt}
                  fill
                  priority
                  className="object-cover opacity-90"
                  sizes="(max-width: 1280px) 100vw, 55vw"
                />
              )}
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
            {copy.label}
          </span>

          <div>
            <h1 className="hero-title font-semibold uppercase">
              <span className="hero-title-line">{copy.titleFirstLine}</span>
              <span className="hero-title-line hero-title-line--long">{copy.titleSecondLine}</span>
            </h1>
            <p className="mt-4 hero-kicker">{copy.kicker}</p>
          </div>

          <p className="max-w-xl text-sm leading-relaxed text-slate-300">{copy.description}</p>

          <div className="grid gap-3">
            {useCaseActions.map((item, index) => (
              <button
                key={item.label}
                type="button"
                onClick={() => onQuickAction(item.prompt)}
                className="rounded-[20px] border border-primary/12 bg-black/24 px-4 py-3 text-left text-sm leading-relaxed text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors hover:border-primary/24 hover:bg-black/32"
              >
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100/44">{copy.quickActionPrefix} {index + 1}</div>
                <p className="mt-1 font-semibold text-cyan-50">{item.label}</p>
                <p className="mt-1">{item.description}</p>
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
  const [language, setLanguage] = useState<UiLanguage>('et')
  const [input, setInput] = useState('')
  const [knowledgeOpen, setKnowledgeOpen] = useState(false)
  const [activeRightPanel, setActiveRightPanel] = useState<RightUtilityPanel | null>(null)
  const [pendingImage, setPendingImage] = useState<FileUIPart | null>(null)
  const [savedSettingsSummary, setSavedSettingsSummary] = useState('')
  const [savedSettings, setSavedSettings] = useState<StoredLaserSettings | null>(null)
  const [activeTransformStyle, setActiveTransformStyle] = useState<ImageTransformStyle | null>(null)
  const [chatInputError, setChatInputError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const auth = useAuth()
  const canAccessKnowledge = auth.status === 'authenticated' && auth.user?.role === 'admin'
  const copy = PAGE_COPY[language]

  const chatTransport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: savedSettingsSummary ? { savedSettingsSummary } : undefined,
        headers: auth.token
          ? {
              Authorization: `Bearer ${auth.token}`,
            }
          : undefined,
      }),
    [auth.token, savedSettingsSummary]
  )

  const { messages, sendMessage, status, setMessages, error: chatStreamError } = useChat({
    transport: chatTransport,
  })

  useEffect(() => {
    if (chatStreamError) {
      setChatInputError(chatStreamError.message || copy.errors.sendMessage)
    }
  }, [chatStreamError, copy.errors.sendMessage])

  const hasMessages = messages.length > 0
  const hasImageContext = Boolean(pendingImage) || messages.some(messageHasImage)
  const isLoading = status === 'streaming' || status === 'submitted'
  const showcaseActions = copy.showcaseActions
  const imageStyleActions = IMAGE_STYLE_OPTIONS[language]
  const structuredData = useMemo(() => buildStructuredData(language, copy.seo), [copy.seo, language])
  const useCaseActions = useMemo(
    () => copy.useCaseActions.map((item, index) => {
      if (index !== 1) {
        return item as UseCaseAction
      }

      return {
        ...item,
        prompt: language === 'en'
          ? hasImageContext
            ? 'Analyze the image in the chat and give me a precise photo-preparation plan for laser engraving for my active machine and material.'
            : 'Describe how to prepare a photo for laser engraving for my active machine and material, including contrast, threshold, background, and DPI.'
          : hasImageContext
            ? 'Analüüsi vestluses olevat pilti ja anna täpne foto ettevalmistuse plaan lasergraveerimiseks minu aktiivse masina ja materjali jaoks.'
            : 'Kirjelda, kuidas valmistada foto lasergraveerimiseks ette minu aktiivse masina ja materjali jaoks, sh kontrast, threshold, taust ja DPI.',
      }
    }),
    [copy.useCaseActions, hasImageContext, language],
  )
  const commandModes = useMemo(
    () => copy.commandModes.map((item, index) => {
      if (index !== 1) {
        return item as UseCaseAction
      }

      return {
        ...item,
        prompt: language === 'en'
          ? hasImageContext
            ? 'Analyze the image in the chat and describe exactly how to prepare it for laser engraving for my active setup.'
            : 'Describe how to prepare a photo for laser engraving for my active setup.'
          : hasImageContext
            ? 'Analüüsi vestluses olevat pilti ja kirjelda täpselt, kuidas see lasergraveerimiseks ette valmistada minu aktiivse seadistuse jaoks.'
            : 'Kirjelda, kuidas valmistada foto lasergraveerimiseks ette minu aktiivse seadistuse jaoks.',
      }
    }),
    [copy.commandModes, hasImageContext, language],
  )

  useEffect(() => {
    const storedLanguage = window.localStorage.getItem(UI_LANGUAGE_STORAGE_KEY)

    if (storedLanguage === 'et' || storedLanguage === 'en') {
      setLanguage(storedLanguage)
      return
    }

    if (window.navigator.language.toLowerCase().startsWith('en')) {
      setLanguage('en')
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(UI_LANGUAGE_STORAGE_KEY, language)
    document.documentElement.lang = language
  }, [language])

  useEffect(() => {
    const storedSettings = readSavedLaserSettings()

    setSavedSettings(storedSettings)
    setSavedSettingsSummary(storedSettings?.summary || '')
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
      setChatInputError(copy.errors.sendMessage)
    }
  }

  const handleAnalyzeImage = async () => {
    if (!pendingImage || isLoading) return
    const settingsCtx = savedSettingsSummary
      ? language === 'en'
        ? `My active machine and material settings: ${savedSettingsSummary}.`
        : `Minu aktiivne masina ja materjali seadistus: ${savedSettingsSummary}.`
      : language === 'en'
        ? 'No machine/material settings saved yet — give general recommendations.'
        : 'Masina ja materjali seadistus puudub — anna üldised soovitused.'

    const prompt = language === 'en'
      ? `Analyze this image for laser engraving. ${settingsCtx}

Please provide in a clear structured format:
1. **Image quality assessment** — Is this image suitable for engraving as-is? What are the main issues (contrast, detail, background, gradients)?
2. **Preparation steps** — Exact steps to prepare this image: contrast adjustment, threshold, background removal, recommended resolution (DPI), and output format (PNG/BMP/SVG).
3. **Laser settings** — Based on my machine and material, give concrete starting values: speed (mm/min), power (%), passes, line interval (mm), DPI, and air assist on/off.
4. **Tips** — Any specific notes for this image/material combination to get the best result.`
      : `Analüüsi seda pilti lasergraveerimiseks. ${settingsCtx}

Anna selges struktureeritud formaadis:
1. **Pildi kvaliteedi hinnang** — Kas pilt sobib graveerimiseks sellisena nagu on? Mis on peamised probleemid (kontrast, detail, taust, gradandid)?
2. **Ettevalmistuse sammud** — Täpsed sammud pildi ettevalmistamiseks: kontrastikorrektioon, threshold, tausta eemaldus, soovituslik resolutsioon (DPI) ja väljundformaat (PNG/BMP/SVG).
3. **Laseri seadistused** — Anna minu masina ja materjali põhjal konkreetsed lähteseaded: kiirus (mm/min), võimsus (%), passid, joone vahe (mm), DPI ja air assist sees/väljas.
4. **Soovitused** — Erilised märkused selle pildi ja materjali kombinatsiooni jaoks parima tulemuse saavutamiseks.`

    await sendChatRequest(prompt)
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
      setChatInputError(copy.errors.unsupportedImage)
      return
    }

    if (file.size > MAX_CHAT_IMAGE_BYTES) {
      setChatInputError(copy.errors.imageTooLarge)
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
      setChatInputError(error instanceof Error ? error.message : copy.errors.imageLoadFailed)
    }
  }

  const handleClearPendingImage = () => {
    setPendingImage(null)
    setChatInputError('')
  }

  const handleTransformImage = async (style: ImageTransformStyle) => {
    if (!pendingImage || activeTransformStyle || isLoading) {
      return
    }

    setActiveTransformStyle(style)
    setChatInputError('')

    try {
      const response = await fetch('/api/image-generation', {
        method: 'POST',
        headers: {
          ...(auth.token
            ? {
                Authorization: `Bearer ${auth.token}`,
              }
            : {}),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: input.trim() || undefined,
          sourceImageDataUrl: pendingImage.url,
          transformStyle: style,
          savedSettingsSummary: savedSettingsSummary || undefined,
        }),
      })

      const data = (await response.json().catch(() => null)) as {
        error?: string
        generatedAsset?: {
          dataUrl: string
          mediaType: string
          fileName: string
        }
      } | null

      if (!response.ok || !data?.generatedAsset) {
        throw new Error(data?.error || (language === 'en' ? 'Failed to generate relief image.' : 'Reljeefse pildi genereerimine ebaõnnestus.'))
      }

      const optimizeResponse = await fetch('/api/optimize-image', {
        method: 'POST',
        headers: {
          ...(auth.token
            ? {
                Authorization: `Bearer ${auth.token}`,
              }
            : {}),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userPrompt: STYLE_OPTIMIZE_PROMPTS[language][style],
          savedSettingsSummary: savedSettingsSummary || undefined,
          sourceImageDataUrl: data.generatedAsset.dataUrl,
          source: {
            sourceKind: 'generated-text',
            width: 1024,
            height: 1024,
            hasAlpha: data.generatedAsset.mediaType !== 'image/jpeg',
            mimeType: data.generatedAsset.mediaType || 'image/png',
          },
        }),
      })

      let optimized = (await optimizeResponse.json().catch(() => null)) as (OptimizeImageResponse & {
        error?: string
      }) | null

      if (!optimizeResponse.ok && !optimized?.jobId) {
        setPendingImage({
          type: 'file',
          filename: data.generatedAsset.fileName,
          mediaType: data.generatedAsset.mediaType,
          url: data.generatedAsset.dataUrl,
        })
        throw new Error(optimized?.error || (language === 'en' ? 'Image optimization failed.' : 'Pildi optimeerimine ebaõnnestus.'))
      }

      if (optimized?.queued && optimized.jobId) {
        for (let attempt = 0; attempt < 40; attempt += 1) {
          await wait(1500)

          const pollResponse = await fetch(`/api/optimize-image?jobId=${encodeURIComponent(optimized.jobId)}`, {
            headers: auth.token
              ? {
                  Authorization: `Bearer ${auth.token}`,
                }
              : undefined,
            cache: 'no-store',
          })

          const polled = (await pollResponse.json().catch(() => null)) as OptimizeImageResponse | null

          if (!pollResponse.ok || !polled) {
            break
          }

          optimized = polled

          if (polled.job.status === 'completed' || polled.job.status === 'failed') {
            break
          }
        }
      }

      const finalAsset = optimized?.workerResult?.optimizedAsset || data.generatedAsset

      setPendingImage({
        type: 'file',
        filename: finalAsset.fileName,
        mediaType: finalAsset.mediaType,
        url: finalAsset.dataUrl,
      })

      if (optimized?.job?.status === 'failed') {
        setChatInputError(optimized.workerError || (language === 'en' ? 'Image optimization failed, using the styled image instead.' : 'Pildi optimeerimine ebaõnnestus, kasutan stiilitud pilti.'))
      } else if (optimized?.workerError) {
        setChatInputError(optimized.workerError)
      }
    } catch (error) {
      setChatInputError(error instanceof Error ? error.message : copy.errors.imageLoadFailed)
    } finally {
      setActiveTransformStyle(null)
    }
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
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <KnowledgePanel
        authStatus={auth.status}
        currentUser={auth.user}
        isOpen={Boolean(canAccessKnowledge && knowledgeOpen)}
        language={language}
        onClose={() => setKnowledgeOpen(false)}
        sessionToken={auth.token}
      />

      <div className="hud-shell relative mx-auto flex min-h-[calc(100dvh-1.5rem)] max-w-400 flex-col p-3 md:p-5 xl:pr-24">
        <ChatHeader
          authStatus={auth.status}
          copy={copy.header}
          onChangePassword={auth.changePassword}
          currentUser={auth.user}
          hasMessages={hasMessages}
          language={language}
          onLanguageChange={setLanguage}
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
              label={copy.panels.settingsDock}
              onClick={() => toggleRightPanel('settings')}
            >
              <Settings2 className="h-5 w-5" />
            </RightDockButton>
            <RightDockButton
              active={activeRightPanel === 'optimizer'}
              label={copy.panels.optimizerDock}
              onClick={() => toggleRightPanel('optimizer')}
            >
              <WandSparkles className="h-5 w-5" />
            </RightDockButton>
          </div>
        </div>

        <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4">
          <HeroDisplay
            copy={copy.hero}
            language={language}
            savedSettings={savedSettings}
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
                    <span className="hud-label">{copy.chat.label}</span>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">{copy.chat.description}</p>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 xl:w-88">
                    <button
                      type="button"
                      onClick={() => toggleRightPanel('settings')}
                      className="hud-chip rounded-[18px] px-3 py-2 text-left transition-colors hover:border-primary/24"
                    >
                      <span className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/58">{copy.chat.settings}</span>
                      <strong className="text-cyan-50">{savedSettingsSummary ? copy.chat.saved : copy.chat.openPanel}</strong>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleRightPanel('optimizer')}
                      className="hud-chip rounded-[18px] px-3 py-2 text-left transition-colors hover:border-primary/24"
                    >
                      <span className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/58">{copy.chat.optimizer}</span>
                      <strong className="text-cyan-50">{isLoading ? copy.chat.processing : copy.chat.openPanel}</strong>
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
                  onTransformImage={(style) => void handleTransformImage(style as ImageTransformStyle)}
                  onAnalyzeImage={pendingImage ? handleAnalyzeImage : undefined}
                  imageStyleActions={imageStyleActions}
                  activeTransformStyle={activeTransformStyle}
                  transformWorkingLabel={copy.chatInput.reliefWorking}
                  inputError={chatInputError}
                  copy={copy.chatInput}
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
                onTransformImage={(style) => void handleTransformImage(style as ImageTransformStyle)}
                onAnalyzeImage={pendingImage ? handleAnalyzeImage : undefined}
                imageStyleActions={imageStyleActions}
                activeTransformStyle={activeTransformStyle}
                transformWorkingLabel={copy.chatInput.reliefWorking}
                inputError={chatInputError}
                copy={copy.chatInput}
              />
            )}
          </section>
        </div>

        {activeRightPanel === 'settings' && (
          <RightPanelShell
            shellLabel={copy.panels.shell}
            title={copy.panels.settingsTitle}
            description={copy.panels.settingsDescription}
            closeLabel={copy.panels.closePanel}
            onClose={() => setActiveRightPanel(null)}
          >
            <LaserSettingsPanel
              language={language}
              authToken={auth.token}
              savedSettingsSummary={savedSettingsSummary}
              onSavedSettingsChange={setSavedSettings}
              onSavedSettingsSummaryChange={setSavedSettingsSummary}
            />
          </RightPanelShell>
        )}

        {activeRightPanel === 'optimizer' && (
          <RightPanelShell
            shellLabel={copy.panels.shell}
            title={copy.panels.optimizerTitle}
            description={copy.panels.optimizerDescription}
            closeLabel={copy.panels.closePanel}
            onClose={() => setActiveRightPanel(null)}
          >
            <EngravingOptimizerPanel
              language={language}
              prompt={input}
              pendingImage={pendingImage}
              onPromoteImage={handlePromoteOptimizerImage}
              savedSettingsSummary={savedSettingsSummary}
              sessionToken={auth.token}
            />
          </RightPanelShell>
        )}
      </div>

    </div>
  )
}
