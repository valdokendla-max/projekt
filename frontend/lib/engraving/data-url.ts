const DATA_URL_PATTERN = /^data:([^;,]+);base64,([a-z0-9+/=\s]+)$/i

export function parseDataUrl(dataUrl: string) {
  const match = DATA_URL_PATTERN.exec(dataUrl.trim())

  if (!match || !match[1] || !match[2]) {
    throw new Error('Pildi andmevorming on vigane.')
  }

  return {
    mediaType: match[1],
    buffer: Buffer.from(match[2].replace(/\s+/g, ''), 'base64'),
  }
}

export function bufferToDataUrl(buffer: Buffer, mediaType: string) {
  return `data:${mediaType};base64,${buffer.toString('base64')}`
}

export function fileExtensionForMediaType(mediaType: string) {
  switch (mediaType) {
    case 'image/jpeg':
      return 'jpg'
    case 'image/webp':
      return 'webp'
    case 'image/png':
    default:
      return 'png'
  }
}