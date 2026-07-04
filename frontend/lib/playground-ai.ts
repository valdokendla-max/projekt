// AI-põhine parameetrite valik "Loo ise" (Playground) jaoks.
// Kasutaja kirjutab lühikese idee ("Tee sellest münt"); Groq laiendab selle
// täielikuks ComfyUI genereerimise plaaniks (prompt, checkpoint, resolutsioon, steps, cfg).
import { CHECKPOINT_LABELS, type PlaygroundCheckpoint } from './playground-storage'

export interface PlaygroundAIPlan {
  prompt: string
  negativePrompt: string
  checkpoint: PlaygroundCheckpoint
  width: number
  height: number
  steps: number
  cfg: number
}

const VALID_CHECKPOINTS: PlaygroundCheckpoint[] = [
  'juggernautXI.safetensors',
  'cyberrealisticPony_v18.safetensors',
  'ponyDiffusionV6XL.safetensors',
  'sd_xl_base_1.0.safetensors',
]

const ORIENTATION_PRESETS = {
  portrait: { width: 832, height: 1216 },
  landscape: { width: 1216, height: 832 },
} as const

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

const SYSTEM_PROMPT = `You are a ComfyUI generation planner. Given a short user idea, output a JSON object (and nothing else) with this exact shape:
{
  "prompt": "rich English Stable Diffusion prompt describing the scene, 40-80 words, comma separated tags, ending with quality tags like 'photorealistic, highly detailed, masterpiece'",
  "negativePrompt": "English negative prompt, comma separated, e.g. 'low quality, blurry, bad anatomy, watermark, text, logo'",
  "checkpoint": one of ${VALID_CHECKPOINTS.map((c) => `"${c}"`).join(', ')},
  "orientation": "portrait" or "landscape",
  "steps": integer 20-40,
  "cfg": number 4-9
}

Checkpoint guide:
${VALID_CHECKPOINTS.map((c) => `- ${c}: ${CHECKPOINT_LABELS[c]}`).join('\n')}

Pick "portrait" orientation for single-subject/coin/object close-ups, "landscape" for scenes/wide shots.
Respond with ONLY the JSON object, no explanation.`

export async function planPlaygroundGeneration(idea: string): Promise<PlaygroundAIPlan> {
  const groqApiKey = String(process.env.GROQ_API_KEY || '').trim()
  if (!groqApiKey) {
    throw new Error('AI-režiim vajab GROQ_API_KEY seadistust serveris.')
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: idea },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
    }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Groq planeerimise päring ebaõnnestus (${response.status}): ${text.slice(0, 200)}`)
  }

  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] }
  const raw = data.choices?.[0]?.message?.content
  if (!raw) throw new Error('Groq ei tagastanud sisu.')

  let parsed: Partial<{
    prompt: string
    negativePrompt: string
    checkpoint: string
    orientation: string
    steps: number
    cfg: number
  }>
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('Groq tagastas vigase JSON-i.')
  }

  const prompt = String(parsed.prompt || '').trim()
  const negativePrompt = String(parsed.negativePrompt || '').trim()
  if (prompt.length < 3) throw new Error('AI ei suutnud prompti genereerida.')

  const checkpoint = VALID_CHECKPOINTS.includes(parsed.checkpoint as PlaygroundCheckpoint)
    ? (parsed.checkpoint as PlaygroundCheckpoint)
    : 'juggernautXI.safetensors'

  const orientation = parsed.orientation === 'landscape' ? 'landscape' : 'portrait'
  const { width, height } = ORIENTATION_PRESETS[orientation]

  const steps = clamp(Math.round(Number(parsed.steps)), 20, 40)
  const cfg = clamp(Number(parsed.cfg), 4, 9)

  return {
    prompt,
    negativePrompt: negativePrompt || 'low quality, blurry, bad anatomy, watermark, text, logo',
    checkpoint,
    width,
    height,
    steps,
    cfg,
  }
}
