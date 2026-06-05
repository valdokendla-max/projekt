// ComfyUI HTTP API client. Calls a local instance through a Cloudflare Tunnel
// (e.g. https://comfy.vkengraveai.eu). Async flow:
//   1. POST /prompt with a workflow JSON -> prompt_id
//   2. Poll /history/{prompt_id} until execution finishes
//   3. GET /view?filename=...&subfolder=...&type=output -> PNG bytes
//   4. Return as data URL for the chat to render

export interface ComfyImageRef {
  filename: string
  subfolder: string
  type: string
}

export interface ComfyHistoryEntry {
  status?: { status_str?: string; completed?: boolean }
  outputs?: Record<string, { images?: ComfyImageRef[] }>
}

interface SubmitResponse {
  prompt_id: string
  number: number
  node_errors?: Record<string, unknown>
}

export interface ComfyClientOptions {
  baseUrl: string
  pollIntervalMs?: number
  timeoutMs?: number
}

export class ComfyError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message)
    this.name = 'ComfyError'
  }
}

export class ComfyClient {
  private base: string
  private pollMs: number
  private timeoutMs: number

  constructor(opts: ComfyClientOptions) {
    this.base = opts.baseUrl.replace(/\/$/, '')
    this.pollMs = opts.pollIntervalMs ?? 2000
    this.timeoutMs = opts.timeoutMs ?? 300_000 // 5 min default
  }

  async submit(workflow: unknown, signal?: AbortSignal): Promise<string> {
    const res = await fetch(`${this.base}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: workflow }),
      signal,
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new ComfyError(`ComfyUI submit failed: ${res.status} ${body.slice(0, 200)}`, res.status)
    }
    const data = (await res.json()) as SubmitResponse
    if (!data.prompt_id) throw new ComfyError('ComfyUI did not return prompt_id')
    return data.prompt_id
  }

  async waitForCompletion(promptId: string, signal?: AbortSignal): Promise<ComfyImageRef[]> {
    const deadline = Date.now() + this.timeoutMs
    while (Date.now() < deadline) {
      if (signal?.aborted) throw new ComfyError('aborted')
      await new Promise((r) => setTimeout(r, this.pollMs))

      const res = await fetch(`${this.base}/history/${encodeURIComponent(promptId)}`, { signal })
      if (!res.ok) continue
      const data = (await res.json().catch(() => ({}))) as Record<string, ComfyHistoryEntry>
      const entry = data[promptId]
      if (!entry) continue

      if (entry.status?.completed) {
        const images: ComfyImageRef[] = []
        for (const out of Object.values(entry.outputs || {})) {
          for (const img of out.images || []) images.push(img)
        }
        if (images.length === 0) throw new ComfyError('ComfyUI completed without images')
        return images
      }

      if (entry.status?.status_str === 'error') {
        throw new ComfyError('ComfyUI execution error')
      }
    }
    throw new ComfyError(`ComfyUI timeout after ${Math.round(this.timeoutMs / 1000)}s`)
  }

  async uploadImage(
    bytes: Uint8Array,
    filename: string,
    signal?: AbortSignal,
  ): Promise<{ name: string; subfolder: string; type: string }> {
    const form = new FormData()
    form.append('image', new Blob([bytes], { type: 'image/png' }), filename)
    form.append('overwrite', 'true')
    const res = await fetch(`${this.base}/upload/image`, { method: 'POST', body: form, signal })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new ComfyError(`ComfyUI upload failed: ${res.status} ${body.slice(0, 200)}`, res.status)
    }
    return (await res.json()) as { name: string; subfolder: string; type: string }
  }

  async fetchImage(ref: ComfyImageRef, signal?: AbortSignal): Promise<{ bytes: Uint8Array; mediaType: string }> {
    const url = new URL(`${this.base}/view`)
    url.searchParams.set('filename', ref.filename)
    url.searchParams.set('subfolder', ref.subfolder)
    url.searchParams.set('type', ref.type)

    const res = await fetch(url.toString(), { signal })
    if (!res.ok) throw new ComfyError(`ComfyUI fetchImage failed: ${res.status}`, res.status)
    const bytes = new Uint8Array(await res.arrayBuffer())
    const mediaType = res.headers.get('content-type') || 'image/png'
    return { bytes, mediaType }
  }

  async run(workflow: unknown, signal?: AbortSignal): Promise<{ bytes: Uint8Array; mediaType: string }> {
    const promptId = await this.submit(workflow, signal)
    const images = await this.waitForCompletion(promptId, signal)
    const first = images[0]
    if (!first) throw new ComfyError('No images returned')
    return this.fetchImage(first, signal)
  }
}

export function bytesToDataUrl(bytes: Uint8Array, mediaType = 'image/png'): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return `data:${mediaType};base64,${btoa(binary)}`
}
