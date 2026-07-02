import Potrace from 'potrace'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { imageDataUrl?: string }
  if (!body.imageDataUrl) {
    return Response.json({ ok: false, error: 'imageDataUrl puudub.' }, { status: 400 })
  }

  const base64 = body.imageDataUrl.includes(',')
    ? body.imageDataUrl.split(',')[1]!
    : body.imageDataUrl
  const buffer = Buffer.from(base64, 'base64')

  return new Promise<Response>((resolve) => {
    Potrace.trace(buffer, {
      threshold: 128,
      turdSize: 25,
      optTolerance: 0.5,
      alphaMax: 1,
    }, (err: Error | null, svg: string) => {
      if (err) {
        resolve(Response.json({ ok: false, error: err.message }, { status: 500 }))
        return
      }
      resolve(Response.json({
        ok: true,
        svgDataUrl: `data:image/svg+xml,${encodeURIComponent(svg)}`,
      }))
    })
  })
}
