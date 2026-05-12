'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type FileUIPart } from 'ai'
import { History, Pencil, Settings2, Sparkles, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ChatHeader } from '@/components/chat-header'
import { ChatInput } from '@/components/chat-input'
import { ChatMessage } from '@/components/chat-message'
import { KnowledgePanel } from '@/components/knowledge-panel'
import { LaserSettingsPanel } from '@/components/laser-settings-panel'
import { SEO_GUIDE_SUMMARIES } from './seo-content'
import { readSavedLaserSettings, type StoredLaserSettings } from '@/lib/engraving/saved-settings-storage'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'

const MAX_CHAT_IMAGE_BYTES = 3 * 1024 * 1024
const QUICK_ACTIONS_STORAGE_KEY = 'laser-graveerimine:quick-actions'
const IMAGE_CLEANUP_PROMPT_MARKER = '__IMAGE_CLEANUP__'
const IMAGE_GENERATE_PROMPT_PREFIX = '__IMAGE_GENERATE__:'

const PRESET_PROMPTS: Record<UiLanguage, Array<{ label: string; prompt: string }>> = {
  et: [
    { label: 'Seadistusoovitus', prompt: 'Koosta seadistusoovitus minu aktiivse masina ja materjali jaoks koos kiiruse, võimsuse ja passide soovitusega.' },
    { label: 'Logo ettevalmistus', prompt: 'Anna juhised logo või märgistuse faili ettevalmistamiseks lasergraveerimiseks minu aktiivse masina jaoks.' },
    { label: 'Foto puhastus (AI)', prompt: IMAGE_CLEANUP_PROMPT_MARKER },
    { label: 'LightBurn eksport', prompt: 'Selgita LightBurn ekspordi seadistust minu aktiivse masina ja materjali jaoks ning millised formaadid valida.' },
    { label: 'Ohutuskontroll', prompt: 'Tee ohutuskontroll minu aktiivse masina ja materjali jaoks enne graveerimise alustamist.' },
    { label: 'Materjali presetid', prompt: 'Anna minu aktiivse masina jaoks konkreetsed lähteseaded erinevate materjalide jaoks.' },
  ],
  en: [
    { label: 'Settings advice', prompt: 'Build a settings recommendation for my active machine and material including speed, power, and passes.' },
    { label: 'Logo prep', prompt: 'Give guidance on preparing a logo or marking file for laser engraving with my active machine.' },
    { label: 'Photo cleanup (AI)', prompt: IMAGE_CLEANUP_PROMPT_MARKER },
    { label: 'LightBurn export', prompt: 'Explain LightBurn export settings for my active machine and material and which formats to choose.' },
    { label: 'Safety check', prompt: 'Run a safety check for my active machine and material before starting engraving.' },
    { label: 'Material presets', prompt: 'Give me baseline settings for various materials with my active machine.' },
  ],
}
const SUPPORTED_CHAT_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const UI_LANGUAGE_STORAGE_KEY = 'laser-graveerimine:ui-language'
const SITE_URL = 'https://vkengraveai.eu'
type RightUtilityPanel = 'settings' | 'conversations'
type UiLanguage = 'et' | 'en'
type UseCaseAction = { label: string; description: string; prompt: string }

const IMAGE_STYLE_ACTIONS_ET = [
  { key: 'bas-relief', label: 'Reljeef' },
  { key: 'medallion', label: 'Medaljon' },
  { key: 'stone-carving', label: 'Kivinikerdus' },
  { key: 'wood-carving', label: 'Puunikerdus' },
]
const IMAGE_STYLE_ACTIONS_EN = [
  { key: 'bas-relief', label: 'Relief' },
  { key: 'medallion', label: 'Medallion' },
  { key: 'stone-carving', label: 'Stone carving' },
  { key: 'wood-carving', label: 'Wood carving' },
]

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
        label: 'Tattoo eskiis',
        description: 'Loo neo-traditional must-valge tätoveeringu flash sheet puhtal valgel taustal.',
        prompt: '__IMAGE_GENERATE__:Tattoo stencil design of neo-traditional black and grey realism style, ornamental dotwork shading, whip shading technique, high contrast greyscale, intricate line work, ornamental realism, professional tattoo flash sheet, FLAT WHITE BACKGROUND, isolated design on pure white paper, NO SKIN, NO ARM, NO BODY, NOT ON SKIN, tattoo design reference sheet, clean white canvas, studio lighting, centered composition, 1:1 aspect ratio',
      },
    ],
    quickActionEdit: {
      title: 'Muuda kiirtoimingut',
      labelField: 'Pealkiri',
      promptField: 'Mis AI vastab',
      promptPresets: 'Vali preset',
      promptCustom: 'Või kirjuta oma tekst',
      save: 'Salvesta',
      reset: 'Taasta vaikimisi',
      cancel: 'Tühista',
    },
    conversations: {
      dock: 'Ava vestlused',
      title: 'Salvestatud vestlused',
      description: 'Klikka vestlusel selle laadimiseks.',
      shell: 'Vestluste ajalugu',
      empty: 'Salvestatud vestlusi pole veel.',
      deleteLabel: 'Kustuta',
      saving: 'Salvestatakse...',
      loadError: 'Vestluste laadimine ebaõnnestus.',
    },
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
      shell: 'Parempaneel',
      closePanel: 'Sulge paneel',
      settingsTitle: 'Seadistusmoodul',
      settingsDescription: 'Ava laserimasina, materjali ja soovituslike seadete paneel ainult siis, kui seda päriselt vajad.',
    },
    chat: {
      label: 'Vestluskeskus',
      description: 'Küsi seadistusi, materjale, ohutust või töövooge. Vestlus elab nüüd sama HUD-ekraani sees nagu ülejäänud juhtpind.',
      settings: 'Seaded',
      saved: 'Salvestatud',
      openPanel: 'Ava paneel',
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
    quickActionEdit: {
      title: 'Edit quick action',
      labelField: 'Title',
      promptField: 'What AI responds with',
      promptPresets: 'Choose preset',
      promptCustom: 'Or write your own',
      save: 'Save',
      reset: 'Reset to default',
      cancel: 'Cancel',
    },
    conversations: {
      dock: 'Open conversations',
      title: 'Saved conversations',
      description: 'Click a conversation to load it.',
      shell: 'Conversation history',
      empty: 'No saved conversations yet.',
      deleteLabel: 'Delete',
      saving: 'Saving...',
      loadError: 'Failed to load conversations.',
    },
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
      shell: 'Right panel',
      closePanel: 'Close panel',
      settingsTitle: 'Settings module',
      settingsDescription: 'Open the laser machine, material, and recommended settings panel only when you actually need it.',
    },
    chat: {
      label: 'Chat hub',
      description: 'Ask about settings, materials, safety, or workflows. The chat now lives in the same HUD screen as the rest of the control surface.',
      settings: 'Settings',
      saved: 'Saved',
      openPanel: 'Open panel',
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
  useCaseActions: Array<Omit<UseCaseAction, 'prompt'> & { prompt?: string }>
  commandModes: Array<Omit<UseCaseAction, 'prompt'> & { prompt?: string }>
  panels: {
    settingsDock: string
    shell: string
    closePanel: string
    settingsTitle: string
    settingsDescription: string
  }
  chat: {
    label: string
    description: string
    settings: string
    saved: string
    openPanel: string
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
  quickActionEdit: {
    title: string
    labelField: string
    promptField: string
    promptPresets: string
    promptCustom: string
    save: string
    reset: string
    cancel: string
  }
  conversations: {
    dock: string
    title: string
    description: string
    shell: string
    empty: string
    deleteLabel: string
    saving: string
    loadError: string
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

function QuickActionEditDialog({
  open,
  draft,
  language,
  editCopy,
  onDraftChange,
  onSave,
  onReset,
  onClose,
}: {
  open: boolean
  draft: UseCaseAction
  language: UiLanguage
  editCopy: (typeof PAGE_COPY)[UiLanguage]['quickActionEdit']
  onDraftChange: (next: UseCaseAction) => void
  onSave: () => void
  onReset: () => void
  onClose: () => void
}) {
  const inputClass = 'w-full rounded-[14px] border border-primary/12 bg-black/26 px-3 py-2.5 text-sm text-cyan-50 placeholder-slate-500 outline-none transition-colors focus:border-primary/28'
  const presets = PRESET_PROMPTS[language]
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg border-primary/14 bg-slate-950 text-cyan-50">
        <DialogHeader>
          <DialogTitle className="text-base text-cyan-50">{editCopy.title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-1">
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-100/44">{editCopy.labelField}</label>
            <input
              type="text"
              value={draft.label}
              onChange={(e) => onDraftChange({ ...draft, label: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-100/44">{editCopy.promptPresets}</label>
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => onDraftChange({ ...draft, prompt: p.prompt })}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                    draft.prompt === p.prompt
                      ? 'border-primary/50 bg-primary/20 text-cyan-200'
                      : 'border-primary/14 bg-black/24 text-cyan-100/60 hover:border-primary/30 hover:text-cyan-100/90'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-100/44">{editCopy.promptCustom}</label>
            <textarea
              rows={3}
              value={draft.prompt}
              onChange={(e) => onDraftChange({ ...draft, prompt: e.target.value })}
              className={inputClass + ' resize-none'}
            />
          </div>
        </div>
        <DialogFooter className="flex-wrap gap-2">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center justify-center rounded-[18px] border border-white/10 bg-black/24 px-4 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:border-white/18 hover:text-slate-100 mr-auto"
          >
            {editCopy.reset}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-[18px] border border-white/10 bg-black/24 px-4 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:border-white/18 hover:text-slate-100"
          >
            {editCopy.cancel}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!draft.label.trim() || !draft.prompt.trim()}
            className="inline-flex items-center justify-center rounded-[18px] border border-primary/18 bg-linear-to-r from-cyan-300/90 via-primary to-cyan-400/80 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-92 disabled:opacity-45"
          >
            {editCopy.save}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function HeroDisplay({
  copy,
  useCaseActions,
  onQuickAction,
  onEditAction,
  hasImage,
  language,
}: {
  copy: (typeof PAGE_COPY)[UiLanguage]['hero']
  useCaseActions: UseCaseAction[]
  onQuickAction: (prompt: string) => void
  onEditAction: (index: number) => void
  hasImage?: boolean
  language?: string
}) {

  return (
    <section className="hud-panel px-5 py-5 md:px-6 md:py-6">
      <div className="space-y-5">
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
              <div key={item.label} className="group relative">
                <button
                  type="button"
                  onClick={() => onQuickAction(item.prompt)}
                  className="w-full rounded-[20px] border border-primary/12 bg-black/24 px-4 py-3 pr-12 text-left text-sm leading-relaxed text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors hover:border-primary/24 hover:bg-black/32"
                >
                  <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100/44">{copy.quickActionPrefix} {index + 1}</div>
                  <p className="mt-1 font-semibold text-cyan-50">{item.label}</p>
                  <p className="mt-1">
                    {index === 1 && hasImage
                      ? (language === 'en' ? 'AI will clean up your image for laser engraving and send you the result.' : 'AI puhastab sinu pildi lasergraveerimiseks ja saadab tulemuse.')
                      : item.description}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => onEditAction(index)}
                  className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-xl border border-primary/10 bg-black/40 text-cyan-100/36 opacity-0 transition-all hover:border-primary/24 hover:text-cyan-100/80 group-hover:opacity-100"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="hud-divider" />
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
  const [chatInputError, setChatInputError] = useState('')
  const [customQuickActions, setCustomQuickActions] = useState<(UseCaseAction | null)[]>([null, null, null])
  const [editingActionIndex, setEditingActionIndex] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState<UseCaseAction>({ label: '', description: '', prompt: '' })
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [conversationsList, setConversationsList] = useState<Array<{ id: string; title: string; updated_at: string }>>([])
  const [conversationsLoading, setConversationsLoading] = useState(false)
  const [conversationsError, setConversationsError] = useState('')
  const [photoCleanupLoading, setPhotoCleanupLoading] = useState(false)
  const [activeTransformStyle, setActiveTransformStyle] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const auth = useAuth()
  const canAccessKnowledge = auth.status === 'authenticated' && auth.user?.role === 'admin'
  const copy = PAGE_COPY[language]

  const authTokenRef = useRef(auth.token)
  useEffect(() => {
    authTokenRef.current = auth.token
  }, [auth.token])

  const savedSettingsSummaryRef = useRef(savedSettingsSummary)
  useEffect(() => {
    savedSettingsSummaryRef.current = savedSettingsSummary
  }, [savedSettingsSummary])

  const chatTransport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        prepareSendMessagesRequest: ({ messages, body, headers }) => ({
          body: {
            ...(body ?? {}),
            messages,
            ...(savedSettingsSummaryRef.current ? { savedSettingsSummary: savedSettingsSummaryRef.current } : {}),
          },
          headers: authTokenRef.current
            ? { ...headers, Authorization: `Bearer ${authTokenRef.current}` }
            : headers,
        }),
      }),
    []
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

  // Auto-save conversation after AI finishes responding
  const prevStatusRef = useRef(status)
  const messagesRef = useRef(messages)
  useEffect(() => { messagesRef.current = messages }, [messages])

  useEffect(() => {
    const wasStreaming = prevStatusRef.current === 'streaming' || prevStatusRef.current === 'submitted'
    prevStatusRef.current = status

    if (!wasStreaming || status !== 'ready') return
    if (!auth.token || messagesRef.current.length === 0) return

    const currentMessages = messagesRef.current
    const firstUserParts = currentMessages.find(m => m.role === 'user')?.parts
    const firstUserTextPart = Array.isArray(firstUserParts)
      ? (firstUserParts as Array<{ type: string; text?: string }>).find(p => p.type === 'text')
      : null
    const firstUserText = firstUserTextPart?.text || ''
    const title = String(firstUserText).slice(0, 80) || new Date().toLocaleDateString()

    const safeMessages = currentMessages.map(m => ({
      ...m,
      parts: Array.isArray(m.parts)
        ? (m.parts as Array<{ type: string; mediaType?: string }>).filter(p => !(p.type === 'file' && p.mediaType?.startsWith('image/')))
        : m.parts,
    }))

    let id = conversationId
    if (!id) {
      id = crypto.randomUUID()
      setConversationId(id)
    }

    fetch(`/api/conversations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify({ title, messages: safeMessages }),
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])
  const structuredData = useMemo(() => buildStructuredData(language, copy.seo), [copy.seo, language])
  const useCaseActions = useMemo(
    () => copy.useCaseActions.map((item, index) => {
      const custom = customQuickActions[index]

      // Index 1 is always "Photo cleanup" — if image is pending, always use cleanup marker
      // regardless of any custom override stored in localStorage
      if (index === 1) {
        const base = custom ?? item
        return {
          ...base,
          prompt: pendingImage
            ? IMAGE_CLEANUP_PROMPT_MARKER
            : language === 'en'
              ? 'Describe how to prepare a photo for laser engraving for my active machine and material, including contrast, threshold, background, and DPI.'
              : 'Kirjelda, kuidas valmistada foto lasergraveerimiseks ette minu aktiivse masina ja materjali jaoks, sh kontrast, threshold, taust ja DPI.',
        } as UseCaseAction
      }

      if (custom) return custom

      return item as UseCaseAction
    }),
    [copy.useCaseActions, customQuickActions, pendingImage, language],
  )
  const commandModes = useMemo(
    () => copy.commandModes.map((item, index) => {
      if (index !== 1) {
        return item as UseCaseAction
      }

      return {
        ...item,
        prompt: pendingImage
          ? IMAGE_CLEANUP_PROMPT_MARKER
          : language === 'en'
            ? 'Describe how to prepare a photo for laser engraving for my active setup.'
            : 'Kirjelda, kuidas valmistada foto lasergraveerimiseks ette minu aktiivse seadistuse jaoks.',
      }
    }),
    [copy.commandModes, pendingImage, language],
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
    try {
      const raw = window.localStorage.getItem(QUICK_ACTIONS_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as (UseCaseAction | null)[]
        if (Array.isArray(parsed) && parsed.length === 3) {
          // Always null out index 1 (photo cleanup) from localStorage —
          // its prompt is controlled by pendingImage state, not stored overrides
          const sanitized = parsed.map((item, i) => (i === 1 ? null : item))
          setCustomQuickActions(sanitized)
        }
      }
    } catch {
      // ignore
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

  const handleEditAction = (index: number) => {
    const defaultAction = copy.useCaseActions[index] as UseCaseAction
    const current = customQuickActions[index] ?? defaultAction
    setEditDraft({ label: current.label, description: current.description, prompt: current.prompt || '' })
    setEditingActionIndex(index)
  }

  const handleSaveEdit = () => {
    if (editingActionIndex === null) return
    const next = [...customQuickActions] as (UseCaseAction | null)[]
    next[editingActionIndex] = { ...editDraft }
    setCustomQuickActions(next)
    window.localStorage.setItem(QUICK_ACTIONS_STORAGE_KEY, JSON.stringify(next))
    setEditingActionIndex(null)
  }

  const handleResetEdit = () => {
    if (editingActionIndex === null) return
    const next = [...customQuickActions] as (UseCaseAction | null)[]
    next[editingActionIndex] = null
    setCustomQuickActions(next)
    window.localStorage.setItem(QUICK_ACTIONS_STORAGE_KEY, JSON.stringify(next))
    setEditingActionIndex(null)
  }

  const sendChatRequest = async (nextText?: string) => {
    const text = nextText?.trim()

    if ((!text && !pendingImage) || isLoading) {
      return
    }

    setChatInputError('')

    if (!auth.token) {
      setChatInputError(language === 'en' ? 'Please log in to use the chat.' : 'Vestluse kasutamiseks logi sisse.')
      return
    }

    try {
      if (text) {
        await sendMessage({ text, files: pendingImage ? [pendingImage] : undefined })
      } else if (pendingImage) {
        await sendMessage({ files: [pendingImage] })
      }

      setInput('')
      setPendingImage(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (message.includes('401') || message.includes('Sessioon') || message.includes('logi sisse')) {
        setChatInputError(language === 'en' ? 'Session expired. Please log in again.' : 'Sessioon on aegunud. Logi uuesti sisse.')
      } else {
        setChatInputError(copy.errors.sendMessage)
      }
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

  const handleTransformImage = async (style: string) => {
    if (!pendingImage || !auth.token) return
    setActiveTransformStyle(style)
    setChatInputError('')
    const styleLabels: Record<string, { et: string; en: string }> = {
      'bas-relief': { et: 'Reljeef', en: 'Relief' },
      medallion: { et: 'Medaljon', en: 'Medallion' },
      'stone-carving': { et: 'Kivinikerdus', en: 'Stone carving' },
      'wood-carving': { et: 'Puunikerdus', en: 'Wood carving' },
    }
    const styleLabel = styleLabels[style]?.[language] || style
    try {
      const res = await fetch('/api/image-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({
          sourceImageDataUrl: pendingImage.url,
          transformStyle: style,
          savedSettingsSummary: savedSettingsSummary || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'Pildi teisendamine ebaõnnestus.')
      const userMsgId = crypto.randomUUID()
      const assistantMsgId = crypto.randomUUID()
      setMessages(prev => [
        ...prev,
        {
          id: userMsgId,
          role: 'user' as const,
          parts: [
            { type: 'text', text: language === 'en' ? `Transform image to ${styleLabel} style.` : `Muuda pilt ${styleLabel} stiiliks.` },
            { type: 'file', url: pendingImage.url, mediaType: pendingImage.mediaType, filename: pendingImage.filename },
          ],
        },
        {
          id: assistantMsgId,
          role: 'assistant' as const,
          parts: [
            { type: 'text', text: language === 'en' ? `✅ Image transformed to ${styleLabel} style. Download below. The transformed image is now active.` : `✅ Pilt teisendatud ${styleLabel} stiiliks. Saad selle alla laadida. Teisendatud pilt on nüüd aktiivne.` },
            { type: 'file', url: data.generatedAsset.dataUrl, mediaType: data.generatedAsset.mediaType, filename: data.generatedAsset.fileName },
          ],
        },
      ])
      setPendingImage({
        type: 'file',
        filename: data.generatedAsset.fileName,
        mediaType: data.generatedAsset.mediaType,
        url: data.generatedAsset.dataUrl,
      })
    } catch (err) {
      setChatInputError(err instanceof Error ? err.message : 'Pildi teisendamine ebaõnnestus.')
    } finally {
      setActiveTransformStyle(null)
    }
  }

  const handleSubmit = async () => {
    await sendChatRequest(input)
  }

  const handleQuickAction = async (prompt: string) => {
    if (prompt === IMAGE_CLEANUP_PROMPT_MARKER) {
      if (!pendingImage) {
        setChatInputError(language === 'en' ? 'Please add an image first to use photo cleanup.' : 'Foto puhastuseks lisa esmalt pilt.')
        return
      }
      if (!auth.token) {
        setChatInputError(language === 'en' ? 'Please log in to use the chat.' : 'Vestluse kasutamiseks logi sisse.')
        return
      }
      setPhotoCleanupLoading(true)
      setChatInputError('')
      try {
        const res = await fetch('/api/photo-cleanup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
          body: JSON.stringify({ sourceImageDataUrl: pendingImage.url, language }),
        })
        const data = await res.json()
        if (!res.ok || !data.ok) throw new Error(data.error || 'Pildi töötlemine ebaõnnestus.')
        // Add user + assistant messages directly — do NOT call sendMessage (it would trigger chat AI)
        const userMsgId = crypto.randomUUID()
        const assistantMsgId = crypto.randomUUID()
        setMessages(prev => [
          ...prev,
          {
            id: userMsgId,
            role: 'user' as const,
            parts: [
              { type: 'text', text: language === 'en' ? 'Clean up this photo for laser engraving.' : 'Puhasta see foto lasergraveerimiseks.' },
              { type: 'file', url: pendingImage.url, mediaType: pendingImage.mediaType, filename: pendingImage.filename },
            ],
          },
          {
            id: assistantMsgId,
            role: 'assistant' as const,
            parts: [
              { type: 'text', text: language === 'en' ? '✅ Photo cleaned up for laser engraving. You can download it below. The cleaned image is now active — your next request will use it.' : '✅ Foto puhastatud lasergraveerimiseks. Saad selle alla laadida. Puhastatud pilt on nüüd aktiivne — järgmine päring kasutab seda.' },
              { type: 'file', url: data.imageDataUrl, mediaType: 'image/png', filename: 'cleaned.png' },
            ],
          },
        ])
        // Set cleaned image as active pendingImage so next actions use the cleaned version
        setPendingImage({
          type: 'file',
          filename: 'cleaned.png',
          mediaType: 'image/png',
          url: data.imageDataUrl,
        })
      } catch (err) {
        setChatInputError(err instanceof Error ? err.message : 'Pildi töötlemine ebaõnnestus.')
      } finally {
        setPhotoCleanupLoading(false)
      }
      return
    }
    if (prompt.startsWith(IMAGE_GENERATE_PROMPT_PREFIX)) {
      if (!auth.token) {
        setChatInputError(language === 'en' ? 'Please log in to use image generation.' : 'Pildi genereerimiseks logi sisse.')
        return
      }
      const imagePrompt = prompt.slice(IMAGE_GENERATE_PROMPT_PREFIX.length)
      setChatInputError('')
      setActiveTransformStyle('generating')
      try {
        const res = await fetch('/api/image-generation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
          body: JSON.stringify({ prompt: imagePrompt, savedSettingsSummary: savedSettingsSummary || undefined }),
        })
        const data = await res.json()
        if (!res.ok || !data.ok) throw new Error(data.error || 'Pildi genereerimine ebaõnnestus.')
        const userMsgId = crypto.randomUUID()
        const assistantMsgId = crypto.randomUUID()
        setMessages(prev => [
          ...prev,
          { id: userMsgId, role: 'user' as const, parts: [{ type: 'text', text: language === 'en' ? 'Generate tattoo flash sheet.' : 'Genereeri tattoo flash sheet.' }] },
          {
            id: assistantMsgId,
            role: 'assistant' as const,
            parts: [
              { type: 'text', text: language === 'en' ? '✅ Tattoo flash sheet generated. Download below.' : '✅ Tattoo flash sheet genereeritud. Saad selle alla laadida.' },
              { type: 'file', url: data.generatedAsset.dataUrl, mediaType: data.generatedAsset.mediaType, filename: data.generatedAsset.fileName },
            ],
          },
        ])
        setPendingImage({ type: 'file', filename: data.generatedAsset.fileName, mediaType: data.generatedAsset.mediaType, url: data.generatedAsset.dataUrl })
      } catch (err) {
        setChatInputError(err instanceof Error ? err.message : 'Pildi genereerimine ebaõnnestus.')
      } finally {
        setActiveTransformStyle(null)
      }
      return
    }
    const fullPrompt = pendingImage
      ? (language === 'en'
          ? `${prompt}\n\n(I have attached an image — apply this to the image I uploaded.)`
          : `${prompt}\n\n(Olen lisanud pildi — rakenda see üleslaaditud pildile.)`)
      : prompt
    await sendChatRequest(fullPrompt)
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

  const handleReset = () => {
    setMessages([])
    setPendingImage(null)
    setChatInputError('')
    setConversationId(null)
  }

  const loadConversations = async () => {
    if (!auth.token) return
    setConversationsLoading(true)
    setConversationsError('')
    try {
      const res = await fetch('/api/conversations', {
        headers: { Authorization: `Bearer ${auth.token}` },
        cache: 'no-store',
      })
      if (!res.ok) throw new Error()
      const data = await res.json() as Array<{ id: string; title: string; updated_at: string }>
      setConversationsList(data)
    } catch {
      setConversationsError(copy.conversations.loadError)
    } finally {
      setConversationsLoading(false)
    }
  }

  const handleDeleteConversation = async (id: string) => {
    if (!auth.token) return
    await fetch(`/api/conversations/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${auth.token}` },
    }).catch(() => {})
    setConversationsList((prev) => prev.filter((c) => c.id !== id))
    if (conversationId === id) {
      setConversationId(null)
    }
  }

  const handleLoadConversation = (conv: { id: string; messages?: unknown[] }) => {
    if (!Array.isArray(conv.messages)) return
    setMessages(conv.messages as Parameters<typeof setMessages>[0])
    setConversationId(conv.id)
    setActiveRightPanel(null)
  }

  const toggleRightPanel = (panel: RightUtilityPanel) => {
    setActiveRightPanel((currentPanel) => {
      if (currentPanel === panel) return null
      if (panel === 'conversations') {
        // Load fresh list when opening
        setTimeout(() => loadConversations(), 0)
      }
      return panel
    })
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
            {auth.status === 'authenticated' && (
              <RightDockButton
                active={activeRightPanel === 'conversations'}
                label={copy.conversations.dock}
                onClick={() => toggleRightPanel('conversations')}
              >
                <History className="h-5 w-5" />
              </RightDockButton>
            )}
            <RightDockButton
              active={activeRightPanel === 'settings'}
              label={copy.panels.settingsDock}
              onClick={() => toggleRightPanel('settings')}
            >
              <Settings2 className="h-5 w-5" />
            </RightDockButton>
          </div>
        </div>

        <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4">
          <HeroDisplay
            copy={copy.hero}
            useCaseActions={useCaseActions}
            onQuickAction={(prompt) => {
              void handleQuickAction(prompt)
            }}
            onEditAction={handleEditAction}
            hasImage={Boolean(pendingImage)}
            language={language}
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
                  isLoading={isLoading || Boolean(activeTransformStyle)}
                  pendingImage={pendingImage}
                  onImageSelect={handleImageSelect}
                  onClearImage={handleClearPendingImage}
                  onAnalyzeImage={pendingImage ? handleAnalyzeImage : undefined}
                  onTransformImage={pendingImage ? handleTransformImage : undefined}
                  imageStyleActions={pendingImage ? (language === 'en' ? IMAGE_STYLE_ACTIONS_EN : IMAGE_STYLE_ACTIONS_ET) : undefined}
                  activeTransformStyle={activeTransformStyle}
                  transformWorkingLabel={language === 'en' ? 'Transforming...' : 'Töötlen...'}
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
                isLoading={isLoading || Boolean(activeTransformStyle)}
                pendingImage={pendingImage}
                onImageSelect={handleImageSelect}
                onClearImage={handleClearPendingImage}
                onAnalyzeImage={pendingImage ? handleAnalyzeImage : undefined}
                onTransformImage={pendingImage ? handleTransformImage : undefined}
                imageStyleActions={pendingImage ? (language === 'en' ? IMAGE_STYLE_ACTIONS_EN : IMAGE_STYLE_ACTIONS_ET) : undefined}
                activeTransformStyle={activeTransformStyle}
                transformWorkingLabel={language === 'en' ? 'Transforming...' : 'Töötlen...'}
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

        {activeRightPanel === 'conversations' && (
          <RightPanelShell
            shellLabel={copy.conversations.shell}
            title={copy.conversations.title}
            description={copy.conversations.description}
            closeLabel={copy.panels.closePanel}
            onClose={() => setActiveRightPanel(null)}
          >
            <div className="space-y-2 pb-2">
              {conversationsLoading && (
                <p className="px-1 text-sm text-slate-400">{copy.conversations.saving}</p>
              )}
              {conversationsError && (
                <p className="px-1 text-sm text-red-400">{conversationsError}</p>
              )}
              {!conversationsLoading && !conversationsError && conversationsList.length === 0 && (
                <p className="px-1 text-sm text-slate-400">{copy.conversations.empty}</p>
              )}
              {conversationsList.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    'group flex items-start justify-between gap-2 rounded-[18px] border px-4 py-3 transition-colors',
                    conv.id === conversationId
                      ? 'border-primary/28 bg-primary/8'
                      : 'border-primary/12 bg-black/24 hover:border-primary/22 hover:bg-black/32',
                  )}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => {
                      fetch(`/api/conversations/${conv.id}`, {
                        headers: { Authorization: `Bearer ${auth.token}` },
                        cache: 'no-store',
                      })
                        .then((r) => r.ok ? r.json() : null)
                        .then((data) => { if (data) handleLoadConversation(data as { id: string; messages: unknown[] }) })
                        .catch(() => {})
                    }}
                  >
                    <p className="truncate text-sm font-semibold text-cyan-50">{conv.title || conv.id}</p>
                    <p className="mt-0.5 text-[11px] text-cyan-100/44">
                      {new Date(conv.updated_at).toLocaleString(language === 'et' ? 'et-EE' : 'en-GB', {
                        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </button>
                  <button
                    type="button"
                    aria-label={copy.conversations.deleteLabel}
                    onClick={() => void handleDeleteConversation(conv.id)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-black/30 text-slate-400 opacity-0 transition-all hover:border-red-500/30 hover:text-red-400 group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </RightPanelShell>
        )}


      </div>

      {editingActionIndex !== null && (
        <QuickActionEditDialog
          open={editingActionIndex !== null}
          draft={editDraft}
          language={language}
          editCopy={copy.quickActionEdit}
          onDraftChange={setEditDraft}
          onSave={handleSaveEdit}
          onReset={handleResetEdit}
          onClose={() => setEditingActionIndex(null)}
        />
      )}

    </div>
  )
}
