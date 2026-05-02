import { createUIMessageStream, createUIMessageStreamResponse } from 'ai'
import { knowledgeStore } from '@/lib/knowledge-store'
import {
  buildUserRateLimitKey,
  enforceRouteRateLimit,
  parseJsonBodyWithLimit,
  requireAuthenticatedRouteUser,
} from '@/lib/api-security'
import { normalizeChatImageDataUrl } from '@/lib/engraving/chat-image-normalizer'

export const maxDuration = 60
export const runtime = 'nodejs'

const BASE_SYSTEM = `Sa oled Laser Graveerimine - lasergraveerimise tehniline assistent.
Sinu fookus: lasergraveerimise seaded, materjalid, failiformaadid, toodangu kvaliteet, ohutus ja probleemide diagnoos.
Kasuta tabelit või punktloendit, kui see aitab.
Kui kasutaja ei anna piisavalt infot, küsi täpsustavaid andmeid: masin, laseri tüüp, võimsus, materjal, paksus ja eesmärk (graveerimine või lõikamine).
Kui kasutaja küsib tööaja, paigutuse või tootmisplaani kohta ning pildi või tööala laius ja kõrgus millimeetrites puuduvad, küsi need enne täpsemat hinnangut.
Kui laius ja kõrgus on teada, anna ligikaudne graveerimis- või lõikeaja hinnang ning ütle selgelt, et see on hinnang.
Kui kasutaja küsib graveerimissoovitust kujundile, logole või toodetööle, paku vajadusel lisaks eraldi lõikeseadete variant ja märgista see selgelt.
Kui kasutaja kirjutab eesti keeles, vasta eesti keeles. Kui inglise keeles, vasta inglise keeles.
Kui kasutaja lisab pildi, analüüsi selle sobivust lasergraveerimiseks ning kirjelda konkreetsed muudatused kasutaja masina ja materjali jaoks: kontrast, detaili tase, tausta eemaldus, threshold/grayscale, mõõtkava, DPI ja paigutus.
Kui kasutaja palub pilti masina jaoks kohandada, anna praktiline töötlusplaan ja laserile sobiv ettevalmistus. Ära väida, et genereerisid või muutsid valmis pildifaili, kui sa tegelikult andsid ainult juhised.
Ära anna ohtlikke või ilmselgelt kahjustavaid juhiseid; paku turvalisem alternatiiv.

Kui kasutaja küsib seadistusi (kiirus, võimsus, passid, DPI jms) konkreetse masina ja materjali jaoks, vorminda vastus ALATI järgmise kaardina:

## [Masina nimi] — [Materjal] ([Režiim])

### ⚡ LightBurn seadistused

| Parameeter | Väärtus |
|---|---|
| Võimsus | XX% |
| Kiirus | XXXX mm/min |
| Passid | X |
| Sagedus | XX kHz |
| Joone vahe | X.XX mm |
| Air Assist | ON / OFF |

### 🖼 LightBurn pildirežiim

- **Image Mode:** Grayscale / Threshold / Dither
- **Dither:** Floyd–Steinberg / Jarvis / (ei rakendu)
- **Kontrast:** +XX%
- **Gamma:** X.XX
- **DPI:** XXX–XXX

### ✅ Soovitused

- Soovitus 1
- Soovitus 2
- Soovitus 3

---
*Optimeeritud: [lühike kirjeldus, nt "puhaste detailidega graveerimiseks puul"]*

Kui inglise keeles, kasuta sama struktuuri inglise keeles (Power, Speed, Passes, Frequency, Line Interval, Image Mode, Contrast, Gamma, Tips).`

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

function buildSavedSettingsContext(savedSettingsSummary: string | undefined) {
  const summary = String(savedSettingsSummary || '').trim()

  if (!summary) {
    return ''
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
  const auth = await requireAuthenticatedRouteUser(req)
  if (!auth.ok) {
    return auth.response
  }

  const rateLimitResponse = await enforceRouteRateLimit({
    routeId: 'chat',
    actorKey: buildUserRateLimitKey(req, auth.value.user),
    maxRequests: 30,
    windowSeconds: 300,
  })
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  const parsed = await parseJsonBodyWithLimit<{ messages: UIMessage[]; savedSettingsSummary?: string }>(req, {
    maxBytes: 4 * 1024 * 1024,
    routeLabel: '/api/chat',
  })
  if ('response' in parsed) {
    return parsed.response
  }

  const { messages = [], savedSettingsSummary } = parsed.data
  if (!Array.isArray(messages)) {
    return Response.json({ error: 'messages peab olema massiiv.' }, { status: 400 })
  }

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

  const knowledgeContext = await knowledgeStore.getContext()
  const system = BASE_SYSTEM + knowledgeContext + buildSavedSettingsContext(savedSettingsSummary)

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

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      const textId = 'text-1'
      let buffer = ''
      let isFinished = false

      const finish = () => {
        if (isFinished) {
          return
        }

        isFinished = true
        writer.write({ type: 'text-end', id: textId })
        writer.write({ type: 'finish-step' })
        writer.write({ type: 'finish', finishReason: 'stop' })
      }

      writer.write({ type: 'start' })
      writer.write({ type: 'start-step' })
      writer.write({ type: 'text-start', id: textId })

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            break
          }

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || !trimmed.startsWith('data:')) {
              continue
            }

            const data = trimmed.slice(5).trim()

            if (data === '[DONE]') {
              finish()
              return
            }

            try {
              const parsed = JSON.parse(data)
              const delta = parsed.choices?.[0]?.delta?.content

              if (typeof delta === 'string' && delta.length > 0) {
                writer.write({ type: 'text-delta', id: textId, delta })
              }
            } catch {
              // Skip malformed upstream chunks and keep streaming.
            }
          }
        }

        finish()
      } catch (error) {
        writer.write({
          type: 'error',
          errorText: error instanceof Error ? error.message : 'Vastuse voog katkes.',
        })
      } finally {
        reader.releaseLock()
      }
    },
  })

  return createUIMessageStreamResponse({ stream })
}
