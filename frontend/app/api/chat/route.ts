import { knowledgeStore } from '@/lib/knowledge-store'

export const maxDuration = 60
export const runtime = 'nodejs'

const BASE_SYSTEM = `Sa oled Laser Graveerimine - lasergraveerimise tehniline assistent.
Sinu fookus: lasergraveerimise seaded, materjalid, failiformaadid, toodangu kvaliteet, ohutus ja probleemide diagnoos.
Vasta praktiliselt ja lühidalt. Kasuta tabelit või punktloendit, kui see aitab.
Kui kasutaja ei anna piisavalt infot, küsi täpsustavaid andmeid: masin, laseri tüüp, võimsus, materjal, paksus ja eesmärk (graveerimine või lõikamine).
Kui kasutaja kirjutab eesti keeles, vasta eesti keeles. Kui inglise keeles, vasta inglise keeles.
Kui kasutaja lisab pildi, analüüsi selle sobivust lasergraveerimiseks ning kirjelda konkreetsed muudatused kasutaja masina ja materjali jaoks: kontrast, detaili tase, tausta eemaldus, threshold/grayscale, mõõtkava, DPI ja paigutus.
Kui kasutaja palub pilti masina jaoks kohandada, anna praktiline töötlusplaan ja laserile sobiv ettevalmistus. Ära väida, et genereerisid või muutsid valmis pildifaili, kui sa tegelikult andsid ainult juhised.
Ära anna ohtlikke või ilmselgelt kahjustavaid juhiseid; paku turvalisem alternatiiv.`

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

type ImageUIMessagePart = UIMessagePart & {
  url: string
  mediaType: string
}

type GroqContentPart =
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

function toGroqContent(msg: UIMessage) {
  if (!msg.parts || !Array.isArray(msg.parts)) {
    return msg.content || ''
  }

  const content: GroqContentPart[] = []

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

export async function POST(req: Request) {
  const { messages, savedSettingsSummary }: { messages: UIMessage[]; savedSettingsSummary?: string } = await req.json()

  if (!process.env.GROQ_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'GROQ_API_KEY puudub. Lisa see frontend/.env.local faili.' }),
      { status: 500 }
    )
  }

  const knowledgeContext = await knowledgeStore.getContext()
  const system = BASE_SYSTEM + knowledgeContext + buildSavedSettingsContext(savedSettingsSummary)
  const usesVision = messages.some((message) => message.parts?.some(isImagePart))

  const groqMessages = [
    { role: 'system', content: system },
    ...messages.map((m) => ({
      role: m.role as string,
      content: toGroqContent(m),
    })),
  ]

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: usesVision ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'llama-3.3-70b-versatile',
      messages: groqMessages,
      stream: true,
    }),
    signal: req.signal,
  })

  if (!response.ok) {
    const error = await response.text()
    return new Response(JSON.stringify({ error }), { status: response.status })
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
