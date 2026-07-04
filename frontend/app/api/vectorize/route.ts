import UPNG from 'upng-js'
import ImageTracer from 'imagetracerjs'

export const runtime = 'edge'

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { imageDataUrl?: string }
  if (!body.imageDataUrl) {
    return Response.json({ ok: false, error: 'imageDataUrl puudub.' }, { status: 400 })
  }

  const base64 = body.imageDataUrl.includes(',')
    ? body.imageDataUrl.split(',')[1]!
    : body.imageDataUrl

  try {
    const bytes = base64ToBytes(base64)
    const png = UPNG.decode(bytes.buffer as ArrayBuffer)
    const [rgba] = UPNG.toRGBA8(png)
    const svg = ImageTracer.imagedataToSVG(
      { width: png.width, height: png.height, data: new Uint8ClampedArray(rgba!) },
      { threshold: 128, ltres: 0.5, qtres: 0.5, turdsize: 25 }
    )

    return Response.json({
      ok: true,
      svgDataUrl: `data:image/svg+xml,${encodeURIComponent(svg)}`,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Vektoriseerimine ebaõnnestus.'
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
}
