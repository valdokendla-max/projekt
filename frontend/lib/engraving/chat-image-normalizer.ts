import sharp from 'sharp'
import { bufferToDataUrl, parseDataUrl } from '@/lib/engraving/data-url'

const MAX_NORMALIZED_IMAGE_BYTES = 2_800_000
const MIN_IMAGE_SIDE = 64

const NORMALIZATION_VARIANTS = [
  { maxDimension: 2048, quality: 90 },
  { maxDimension: 1600, quality: 82 },
  { maxDimension: 1280, quality: 74 },
]

interface NormalizedChatImage {
  dataUrl: string
  mediaType: string
  width: number
  height: number
}

function resolveTargetSize(width: number, height: number, maxDimension: number) {
  const largestSide = Math.max(width, height)
  const smallestSide = Math.min(width, height)

  if (largestSide > maxDimension) {
    const scale = maxDimension / largestSide
    return {
      width: Math.max(1, Math.round(width * scale)),
      height: Math.max(1, Math.round(height * scale)),
    }
  }

  if (smallestSide < MIN_IMAGE_SIDE) {
    const scale = MIN_IMAGE_SIDE / smallestSide
    return {
      width: Math.max(1, Math.round(width * scale)),
      height: Math.max(1, Math.round(height * scale)),
    }
  }

  return { width, height }
}

async function encodeNormalizedImage(args: {
  buffer: Buffer
  width: number
  height: number
  maxDimension: number
  quality: number
}) {
  const { buffer, width, height, maxDimension, quality } = args
  const targetSize = resolveTargetSize(width, height, maxDimension)

  const { data, info } = await sharp(buffer, {
    failOn: 'none',
    limitInputPixels: 40_000_000,
  })
    .rotate()
    .resize({
      width: targetSize.width,
      height: targetSize.height,
      fit: 'fill',
    })
    .flatten({ background: '#ffffff' })
    .jpeg({
      quality,
      mozjpeg: true,
      chromaSubsampling: '4:4:4',
    })
    .toBuffer({ resolveWithObject: true })

  return {
    buffer: data,
    width: info.width,
    height: info.height,
  }
}

export async function normalizeChatImageDataUrl(dataUrl: string): Promise<NormalizedChatImage> {
  const { buffer } = parseDataUrl(dataUrl)

  const probe = sharp(buffer, {
    failOn: 'none',
    limitInputPixels: 40_000_000,
  }).rotate()

  const metadata = await probe.metadata()

  if (!metadata.width || !metadata.height) {
    throw new Error('Pildi mõõte ei õnnestunud tuvastada. Proovi teist pilti või salvesta see PNG/JPG failina.')
  }

  let bestResult: Awaited<ReturnType<typeof encodeNormalizedImage>> | null = null

  for (const variant of NORMALIZATION_VARIANTS) {
    const result = await encodeNormalizedImage({
      buffer,
      width: metadata.width,
      height: metadata.height,
      maxDimension: variant.maxDimension,
      quality: variant.quality,
    })

    bestResult = result

    if (result.buffer.length <= MAX_NORMALIZED_IMAGE_BYTES) {
      break
    }
  }

  if (!bestResult) {
    throw new Error('Pildi normaliseerimine ebaõnnestus. Proovi uuesti.')
  }

  return {
    dataUrl: bufferToDataUrl(bestResult.buffer, 'image/jpeg'),
    mediaType: 'image/jpeg',
    width: bestResult.width,
    height: bestResult.height,
  }
}