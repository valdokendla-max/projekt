import { getServerBackendUrl } from '@/lib/backend-url'

export const maxDuration = 60
export const runtime = 'edge'

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


function toModelContent(msg: UIMessage) {
  if (!msg.parts || !Array.isArray(msg.parts)) {
    return msg.content || ''
  }

  // OpenAI lubab image_url ainult role='user' sõnumites. Assistant'i pildiosad
  // (logo, photo-enhance, tattoo, threshold preview) jäetakse vaikselt välja.
  const allowImages = msg.role === 'user'
  const content: ModelContentPart[] = []

  for (const part of msg.parts) {
    if (part.type === 'text' && part.text) {
      content.push({ type: 'text', text: part.text })
      continue
    }

    if (allowImages && isImagePart(part)) {
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

function formatProviderError(message: string) {
  const normalized = message.toLowerCase()
  if (normalized.includes('image') && normalized.includes('invalid')) {
    return `Groq ei suutnud pilti korrektselt lugeda. Proovi salvestatud PNG/JPG faili või tavalist screenshot-faili. Teade: ${message}`
  }
  return message
}

function resolveProvider(usesVision: boolean): ProviderConfig | null {
  const groqApiKey = String(process.env.GROQ_API_KEY || '').trim()
  if (!groqApiKey) return null
  return {
    apiKey: groqApiKey,
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    model: usesVision ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'llama-3.3-70b-versatile',
  }
}

export async function POST(req: Request) {
  try {
  const rawText = await req.text()
  const { id: messageId, messages, savedSettingsSummary, language: rawLanguage }: { id?: string; messages: UIMessage[]; savedSettingsSummary?: string; language?: string } = JSON.parse(rawText)
  const language: 'est' | 'eng' = rawLanguage === 'eng' ? 'eng' : 'est'

  const usesVision = messages.some((message) => message.parts?.some(isImagePart))
  const provider = resolveProvider(usesVision)

  if (!provider) {
    return new Response(
      JSON.stringify({ error: 'Puudub GROQ_API_KEY serveri seadistuses.' }),
      { status: 500 }
    )
  }

  const knowledgeContext = await fetchKnowledgeContext()
  const system = (language === 'eng' ? BASE_SYSTEM_ENG : BASE_SYSTEM_EST) + knowledgeContext + buildSavedSettingsContext(savedSettingsSummary, language)

  const providerMessages = [
    { role: 'system', content: system },
    ...messages.map((m) => ({
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
  })

  if (!response.ok) {
    const providerError = await response.text()
    const providerMessage = extractProviderMessage(providerError)
    let formatted = formatProviderError(providerMessage)
    // Kui Groq blokeerib sisu või tagastab 5xx, suuna kasutaja pildi-ikoonidele.
    const looksLikeContentBlock =
      response.status === 400 ||
      response.status === 403 ||
      response.status === 422 ||
      response.status >= 500 ||
      /content|policy|filter|moderation|safety|blocked|nsfw|adult/i.test(providerMessage)
    if (response.status === 429) {
      formatted =
        language === 'eng'
          ? 'Groq free daily limit reached. Chat will automatically reopen tomorrow (resets every 24 h). No action needed.'
          : 'Groq tasuta päevalimiit on täis. Chat avaneb automaatselt homme uuesti (resetib iga 24 h). Midagi tegema ei pea.'
    } else if (looksLikeContentBlock) {
      formatted =
        (language === 'eng'
          ? 'Your message was blocked by the chat content filter. The chat is for laser engraving tech questions. To generate an image, use the icons "Loo ise" (your own prompt, saved in Knowledge) or "Täiskasvanutele" (21 styles).'
          : 'Sinu sõnum blokeeriti vestluse modereerimisega. Pealehe chat on tehniliste küsimuste jaoks. Pildi loomiseks kasuta ikoone "Loo ise" (sinu enda prompt Teadmistest) või "Täiskasvanutele" (21 stiili).')
    }
    return new Response(JSON.stringify({ error: formatted }), { status: response.status })
  }

  const encoder = new TextEncoder()

  const msgId = messageId || crypto.randomUUID()
  const finish = JSON.stringify({ finishReason: 'stop', usage: { promptTokens: 0, completionTokens: 0 }, isContinued: false })
  const msgFinish = JSON.stringify({ finishReason: 'stop', usage: { promptTokens: 0, completionTokens: 0 } })

  const stream = new ReadableStream({
    async start(controller) {
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      controller.enqueue(encoder.encode(`f:${JSON.stringify({ messageId: msgId })}\n`))

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
              controller.enqueue(encoder.encode(`e:${finish}\n`))
              controller.enqueue(encoder.encode(`d:${msgFinish}\n`))
              controller.close()
              return
            }

            try {
              const parsed = JSON.parse(data)
              const delta = parsed.choices?.[0]?.delta?.content
              if (delta) {
                controller.enqueue(encoder.encode(`0:${JSON.stringify(delta)}\n`))
              }
            } catch {
              // skip broken chunks
            }
          }
        }

        controller.enqueue(encoder.encode(`e:${finish}\n`))
        controller.enqueue(encoder.encode(`d:${msgFinish}\n`))
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
  } catch (err: unknown) {
    const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
    return Response.json({ error: msg }, { status: 500 })
  }
}
