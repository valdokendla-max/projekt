import { getServerBackendUrl } from '@/lib/backend-url'
import { normalizeChatImageDataUrl } from '@/lib/engraving/chat-image-normalizer'

export const maxDuration = 60
export const runtime = 'nodejs'

const BACKEND_URL = getServerBackendUrl()

async function fetchKnowledgeContext(): Promise<string> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/knowledge/context`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return ''
    const data = (await res.json()) as { context?: string }
    return data.context ?? ''
  } catch {
    return ''
  }
}

const BASE_SYSTEM_EST = `Sa oled Laser Graveerimine - lasergraveerimise tehniline assistent.
Sinu fookus: lasergraveerimise seaded, materjalid, failiformaadid, toodangu kvaliteet, ohutus ja probleemide diagnoos.
Vasta praktiliselt ja lühidalt. Kasuta tabelit või punktloendit, kui see aitab.
Kui kasutaja ei anna piisavalt infot, küsi täpsustavaid andmeid: masin, laseri tüüp, võimsus, materjal, paksus ja eesmärk (graveerimine või lõikamine).
Kui kasutaja kirjutab eesti keeles, vasta eesti keeles. Kui inglise keeles, vasta inglise keeles.
Kui kasutaja lisab pildi, analüüsi selle sobivust lasergraveerimiseks ning kirjelda konkreetsed muudatused kasutaja masina ja materjali jaoks: kontrast, detaili tase, tausta eemaldus, threshold/grayscale, mõõtkava, DPI ja paigutus.
Kui kasutaja palub pilti masina jaoks kohandada, anna praktiline töötlusplaan ja laserile sobiv ettevalmistus. Ära väida, et genereerisid või muutsid valmis pildifaili, kui sa tegelikult andsid ainult juhised.
Ära anna ohtlikke või ilmselgelt kahjustavaid juhiseid; paku turvalisem alternatiiv.`

const BASE_SYSTEM_ENG = `You are Laser Graveerimine - a technical laser engraving assistant.
Your focus: laser engraving settings, materials, file formats, output quality, safety and problem diagnosis.
Answer practically and concisely. Use tables or bullet points when helpful.
If the user does not provide enough information, ask for clarifying details: machine, laser type, power, material, thickness and goal (engraving or cutting).
Always respond in English.
If the user adds an image, analyze its suitability for laser engraving and describe specific changes for the user's machine and material: contrast, detail level, background removal, threshold/grayscale, scale, DPI and placement.
If the user asks to adapt an image for the machine, provide a practical processing plan and laser-ready preparation. Do not claim to have generated or modified a finished image file if you only provided instructions.
Do not give dangerous or obviously harmful instructions; offer a safer alternative.`

interface UIMessagePart {
  type: string
  text?: string
  url?: string
  mediaType?: string
}

interface UIMessage {
  role: string
  parts?: UIMessagePart[]
  content?: string
}

interface ProviderConfig {
  providerName: 'groq' | 'openai'
  apiKey: string
  endpoint: string
  model: string
}

type ImageUIMessagePart = UIMessagePart & {
  url: string
  mediaType: string
}

type ModelContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

function buildSavedSettingsContext(savedSettingsSummary: string | undefined, language: 'est' | 'eng' = 'est') {
  const summary = String(savedSettingsSummary || '').trim()

  if (!summary) {
    return ''
  }

  if (language === 'eng') {
    return `\n\nActive saved settings:\n${summary}\n\nUse these settings as the default background context in all responses. Do not repeat them in full unless the user explicitly asks. When the user asks for advice on machine, material, file preparation or workflow, assume these saved settings.`
  }

  return `\n\nAktiivne salvestatud seadistus:\n${summary}\n\nKasuta seda seadistust vaikimisi taustkontekstina kõigis vastustes. Ära korda seda tervikuna tagasi, kui kasutaja seda otseselt ei küsi. Kui kasutaja küsib nõu masina, materjali, faili ettevalmistuse või töövoo kohta, eelda seda salvestatud seadistust.`
}

function isImagePart(part: UIMessagePart): part is ImageUIMessagePart {
  return part.type === 'file' && typeof part.url === 'string' && typeof part.mediaType === 'string' && part.mediaType.startsWith('image/')
}

async function normalizeMessages(messages: UIMessage[]) {
  return Promise.all(
    messages.map(async (message) => {
      if (!Array.isArray(message.parts)) {
        return message
      }

      const parts = await Promise.all(
        message.parts.map(async (part) => {
          if (!isImagePart(part) || !part.url.startsWith('data:')) {
            return part
          }

          const normalized = await normalizeChatImageDataUrl(part.url)

          return {
            ...part,
            url: normalized.dataUrl,
            mediaType: normalized.mediaType,
          }
        }),
      )

      return {
        ...message,
        parts,
      }
    }),
  )
}

function toModelContent(msg: UIMessage) {
  if (!msg.parts || !Array.isArray(msg.parts)) {
    return msg.content || ''
  }

  const content: ModelContentPart[] = []

  for (const part of msg.parts) {
    if (part.type === 'text' && part.text) {
      content.push({ type: 'text', text: part.text })
      continue
    }

    if (isImagePart(part)) {
      content.push({ type: 'image_url', image_url: { url: part.url } })
    }
  }

  if (content.length === 0) {
    return msg.content || ''
  }

  if (content.length === 1 && content[0].type === 'text') {
    return content[0].text
  }

  return content
}

function getOpenAiBaseUrl() {
  return (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '')
}

function normalizeProviderPreference(value: string | undefined) {
  const normalized = String(value || '').trim().toLowerCase()

  if (normalized === 'groq' || normalized === 'openai') {
    return normalized
  }

  return null
}

function extractProviderMessage(rawError: string) {
  let current = rawError.trim()

  for (let index = 0; index < 2; index += 1) {
    try {
      const parsed = JSON.parse(current)
      const message = parsed?.error?.message || parsed?.message

      if (typeof message === 'string' && message.trim()) {
        current = message.trim()
        continue
      }
    } catch {
      break
    }
  }

  return current || 'Päring ebaõnnestus.'
}

function formatProviderError(message: string, provider: ProviderConfig) {
  const normalized = message.toLowerCase()

  if (provider.providerName === 'openai' && normalized.includes('safety system')) {
    return `OpenAI turvasüsteem blokeeris selle pildipäringu. Kui see on tavaline graveerimispilt, kasuta vaikimisi Groq visionit või proovi pilti kärpida ja uuesti saata. Provider teade: ${message}`
  }

  if ((provider.providerName === 'openai' || provider.providerName === 'groq') && normalized.includes('image') && normalized.includes('invalid')) {
    return `Provider ei suutnud pilti korrektselt lugeda. Proovi salvestatud PNG/JPG faili või tavalist screenshot-faili. Provider teade: ${message}`
  }

  return message
}

function resolveProvider(usesVision: boolean): ProviderConfig | null {
  const groqApiKey = String(process.env.GROQ_API_KEY || '').trim()
  const openAiApiKey = String(process.env.OPENAI_API_KEY || '').trim()
  const preferredProvider = normalizeProviderPreference(
    usesVision ? process.env.CHAT_VISION_PROVIDER : process.env.CHAT_TEXT_PROVIDER,
  )

  const providers: Record<'groq' | 'openai', ProviderConfig | null> = {
    groq: groqApiKey
      ? {
          providerName: 'groq',
          apiKey: groqApiKey,
          endpoint: 'https://api.groq.com/openai/v1/chat/completions',
          model: usesVision ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'llama-3.3-70b-versatile',
        }
      : null,
    openai: openAiApiKey
      ? {
          providerName: 'openai',
          apiKey: openAiApiKey,
          endpoint: `${getOpenAiBaseUrl()}/chat/completions`,
          model: usesVision
            ? process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini'
            : process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini',
        }
      : null,
  }

  if (preferredProvider && providers[preferredProvider]) {
    return providers[preferredProvider]
  }

  if (usesVision) {
    return providers.groq || providers.openai
  }

  return providers.groq || providers.openai
}

export async function POST(req: Request) {
  const { messages, savedSettingsSummary, language: rawLanguage }: { messages: UIMessage[]; savedSettingsSummary?: string; language?: string } = await req.json()
  const language: 'est' | 'eng' = rawLanguage === 'eng' ? 'eng' : 'est'
  let normalizedMessages = messages

  try {
    normalizedMessages = await normalizeMessages(messages)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Pildi normaliseerimine ebaõnnestus.'
    return new Response(JSON.stringify({ error: message }), { status: 400 })
  }

  const usesVision = normalizedMessages.some((message) => message.parts?.some(isImagePart))
  const provider = resolveProvider(usesVision)

  if (!provider) {
    return new Response(
      JSON.stringify({ error: 'Puudub sobiv AI provideri võti. Lisa GROQ_API_KEY või OPENAI_API_KEY.' }),
      { status: 500 }
    )
  }

  const knowledgeContext = await fetchKnowledgeContext()
  const system = (language === 'eng' ? BASE_SYSTEM_ENG : BASE_SYSTEM_EST) + knowledgeContext + buildSavedSettingsContext(savedSettingsSummary, language)

  const providerMessages = [
    { role: 'system', content: system },
    ...normalizedMessages.map((m) => ({
      role: m.role as string,
      content: toModelContent(m),
    })),
  ]

  const response = await fetch(provider.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: provider.model,
      messages: providerMessages,
      stream: true,
    }),
    signal: req.signal,
  })

  if (!response.ok) {
    const providerError = await response.text()
    const providerMessage = extractProviderMessage(providerError)
    return new Response(JSON.stringify({ error: formatProviderError(providerMessage, provider) }), { status: response.status })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || !trimmed.startsWith('data:')) continue
            const data = trimmed.slice(5).trim()

            if (data === '[DONE]') {
              controller.enqueue(encoder.encode('0:""\n'))
              controller.enqueue(encoder.encode('d:{"finishReason":"stop"}\n'))
              controller.close()
              return
            }

            try {
              const parsed = JSON.parse(data)
              const delta = parsed.choices?.[0]?.delta?.content
              if (delta) {
                const escaped = JSON.stringify(delta)
                controller.enqueue(encoder.encode(`0:${escaped}\n`))
              }
            } catch {
              // skip broken chunks
            }
          }
        }

        controller.enqueue(encoder.encode('d:{"finishReason":"stop"}\n'))
        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Vercel-AI-Data-Stream': 'v1',
    },
  })
}
