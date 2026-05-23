export const runtime = 'edge'

const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '')
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1'

interface RequestBody {
  subjectText?: string
  sourceImageDataUrl?: string
}

function buildTattooPrompt(subjectText: string, hasReference: boolean) {
  const subject = subjectText.trim() ? subjectText.trim() : 'a detailed subject'
  const base =
    `Black and grey realistic tattoo design of ${subject}, neo-traditional illustrative tattoo style. ` +
    'For human subjects (portraits, faces, people): clean smooth skin texture, soft natural shading on faces, preserve natural age and youthful features, NO heavy stippling on facial features, NO wrinkles added, NO aging effects, NO rough texture on cheeks or foreheads, sharp clean portrait realism, faces remain crisp and unaltered from reference, only enhance with subtle smooth gradient shading. ' +
    'For ornamental elements (background, flowers, leaves, scrollwork, animals, objects): intricate detailed linework, smooth whip shading, soft gradient transitions, dense dotwork stippling on decorative elements only, sharp overlapping detail patterns, refined ornamental realism. ' +
    'Strong contrast between deep black shadows and soft grey highlights on ornaments. Cinematic shading. ' +
    'Professional tattoo flash artwork, centered composition, isolated on a completely clean white background. ' +
    'No composition elements outside the subject and its ornamental frame, no scenery, no random objects, no wooden structures, no architecture, no stairs, no railings, no buildings, no realistic environment, no photo background, no frame, no border. ' +
    'Negative prompt: aged faces, wrinkled skin on young people, rough facial texture, heavy stippling on faces, distorted facial features, low quality, blurry, bad anatomy, extra limbs, cartoon, anime, watercolor, colorful background, messy composition, flat shading, oversaturated, text, watermark, glowing neon, realistic environment, photo background, unfinished lines, rough sketch, wooden objects appearing randomly, architectural elements behind subject.'

  if (hasReference) {
    return base + ' Base the design on the uploaded reference image — preserve the exact identity, age, and facial features of all people in the reference. Do not alter ages.'
  }

  return base
}

async function fetchImageAsDataUrl(url: string, signal: AbortSignal) {
  const res = await fetch(url, { signal })
  const bytes = new Uint8Array(await res.arrayBuffer())
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  const ct = res.headers.get('content-type') || 'image/png'
  return `data:${ct};base64,${btoa(binary)}`
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as RequestBody
  const subjectText = body.subjectText || ''
  const sourceImageDataUrl = body.sourceImageDataUrl

  if (!sourceImageDataUrl) {
    return Response.json(
      { ok: false, error: 'Tatoo eskiis vajab lähtepilti.' },
      { status: 400 },
    )
  }

  const apiKey = (process.env.OPENAI_API_KEY || '').trim()
  if (!apiKey) {
    return Response.json({ ok: false, error: 'OPENAI_API_KEY puudub.' }, { status: 503 })
  }

  const prompt = buildTattooPrompt(subjectText, true)

  try {
    const base64 = sourceImageDataUrl.includes(',')
      ? sourceImageDataUrl.split(',')[1]
      : sourceImageDataUrl
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

    const formData = new FormData()
    formData.append('model', OPENAI_IMAGE_MODEL)
    formData.append('image', new Blob([bytes], { type: 'image/png' }), 'reference.png')
    formData.append('prompt', prompt)
    formData.append('n', '1')
    formData.append('size', '1024x1024')

    const res = await fetch(`${OPENAI_BASE_URL}/images/edits`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
      signal: req.signal,
    })

    const payload = (await res.json().catch(() => null)) as {
      data?: Array<{ b64_json?: string; url?: string }>
      error?: { message?: string }
    } | null

    if (!res.ok) {
      throw new Error(payload?.error?.message || `OpenAI edits viga ${res.status}`)
    }

    const first = payload?.data?.[0]
    let imageDataUrl: string
    if (first?.b64_json) {
      imageDataUrl = `data:image/png;base64,${first.b64_json}`
    } else if (first?.url) {
      imageDataUrl = await fetchImageAsDataUrl(first.url, req.signal)
    } else {
      throw new Error('Tatoo genereerimine ei tagastanud väljundit.')
    }

    return Response.json({ ok: true, imageDataUrl })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Tatoo loomine ebaõnnestus.'
    return Response.json({ ok: false, error: message }, { status: 502 })
  }
}
