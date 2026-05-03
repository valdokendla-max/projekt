import {
  buildUserRateLimitKey,
  enforceRouteRateLimit,
  parseJsonBodyWithLimit,
  requireAuthenticatedRouteUser,
} from '@/lib/api-security'
import { editImageWithProvider } from '@/lib/engraving/image-generation'

export const runtime = 'nodejs'
export const maxDuration = 60

interface RequestBody {
  sourceImageDataUrl?: string
  savedSettingsSummary?: string
  language?: string
}

const CLEANUP_PROMPT_ET = `Tee sellest pildist lasergraveerimiseks sobiv must-valge versioon.
Tee järgmist:
- Muuda pilt must-valgeks (grayscale)
- Suurenda kontrasti tugevalt nii et tumedad alad on mustad ja heledad alad valged
- Eemalda taust kui see on ühtlane
- Teravda detaile
- Optimeeri threshold nii et detailid säiluvad graveerimiseks
Tagasta ainult töödeldud pilt, mitte tekst.`

const CLEANUP_PROMPT_EN = `Convert this image to a laser engraving-ready black and white version.
Do the following:
- Convert to grayscale
- Boost contrast strongly so dark areas are black and light areas are white
- Remove background if it is uniform
- Sharpen details
- Optimize threshold so details are preserved for engraving
Return only the processed image, not text.`

export async function POST(req: Request) {
  const auth = await requireAuthenticatedRouteUser(req)
  if (!auth.ok) {
    return auth.response
  }

  const rateLimitResponse = await enforceRouteRateLimit({
    routeId: 'photo-cleanup',
    actorKey: buildUserRateLimitKey(req, auth.value.user),
    maxRequests: 8,
    windowSeconds: 600,
  })
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  const parsed = await parseJsonBodyWithLimit<RequestBody>(req, {
    maxBytes: 8 * 1024 * 1024,
    routeLabel: '/api/photo-cleanup',
  })
  if ('response' in parsed) {
    return parsed.response
  }

  const { sourceImageDataUrl, language } = parsed.data
  if (!sourceImageDataUrl) {
    return Response.json({ error: 'sourceImageDataUrl is required.' }, { status: 400 })
  }

  const prompt = language === 'en' ? CLEANUP_PROMPT_EN : CLEANUP_PROMPT_ET

  try {
    const generated = await editImageWithProvider({
      prompt,
      sourceImageDataUrl,
      signal: req.signal,
    })

    return Response.json({
      ok: true,
      imageDataUrl: generated.asset.dataUrl,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Pildi töötlemine ebaõnnestus.'
    return Response.json({ ok: false, error: message }, { status: 502 })
  }
}
