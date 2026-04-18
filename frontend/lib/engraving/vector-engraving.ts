import { PNG } from 'pngjs'
import { bufferToDataUrl, parseDataUrl } from '@/lib/engraving/data-url'
import type { ImageAnalysisReport, ModeDecision, VectorizationPlan } from '@/lib/engraving/types'

const DARK_PIXEL_THRESHOLD = 176
const MAX_VECTOR_RECTANGLES = 40000

interface VectorRectangle {
  x: number
  y: number
  width: number
  height: number
}

interface RowRun {
  x: number
  width: number
}

export interface GeneratedVectorAssets {
  svgDataUrl: string
  dxfDataUrl: string
  width: number
  height: number
  rectangleCount: number
}

export function buildVectorizationPlan(
  analysis: ImageAnalysisReport,
  decision: ModeDecision,
): VectorizationPlan {
  const enabled = decision.vectorAllowed && (analysis.classification === 'logo' || analysis.classification === 'text-mark' || analysis.classification === 'line-art')

  return {
    enabled,
    targetFormats: enabled ? ['svg', 'dxf'] : [],
    strokeStrategy: analysis.classification === 'line-art' ? 'centerline' : 'outline',
    reasons: enabled
      ? ['Source class and selected mode both support deterministic SVG and DXF export.']
      : ['Vector output was disabled because the source is too photographic or mixed.'],
  }
}

function isDarkPixel(data: Buffer, offset: number, threshold: number) {
  const alpha = data[offset + 3] ?? 255

  if (alpha < 64) {
    return false
  }

  const red = data[offset] ?? 255
  const green = data[offset + 1] ?? 255
  const blue = data[offset + 2] ?? 255
  const luma = red * 0.2126 + green * 0.7152 + blue * 0.0722

  return luma < threshold
}

function collectRowRuns(png: PNG, y: number, threshold: number) {
  const runs: RowRun[] = []

  for (let x = 0; x < png.width;) {
    const offset = (y * png.width + x) * 4

    if (!isDarkPixel(png.data, offset, threshold)) {
      x += 1
      continue
    }

    const startX = x
    x += 1

    while (x < png.width) {
      const nextOffset = (y * png.width + x) * 4

      if (!isDarkPixel(png.data, nextOffset, threshold)) {
        break
      }

      x += 1
    }

    runs.push({
      x: startX,
      width: x - startX,
    })
  }

  return runs
}

function mergeRunsIntoRectangles(png: PNG, threshold: number) {
  const rectangles: VectorRectangle[] = []
  let activeRectangles = new Map<string, VectorRectangle>()

  for (let y = 0; y < png.height; y += 1) {
    const rowRuns = collectRowRuns(png, y, threshold)
    const nextActiveRectangles = new Map<string, VectorRectangle>()

    for (const run of rowRuns) {
      const key = `${run.x}:${run.width}`
      const activeRectangle = activeRectangles.get(key)

      if (activeRectangle) {
        activeRectangle.height += 1
        nextActiveRectangles.set(key, activeRectangle)
        continue
      }

      nextActiveRectangles.set(key, {
        x: run.x,
        y,
        width: run.width,
        height: 1,
      })
    }

    for (const [key, rectangle] of activeRectangles.entries()) {
      if (!nextActiveRectangles.has(key)) {
        rectangles.push(rectangle)
      }
    }

    activeRectangles = nextActiveRectangles

    if (rectangles.length + activeRectangles.size > MAX_VECTOR_RECTANGLES) {
      throw new Error('Raster sisaldab liiga palju eraldi tumedaid piirkondi, et genereerida turvalise suurusega SVG/DXF eksporti.')
    }
  }

  rectangles.push(...activeRectangles.values())

  if (rectangles.length === 0) {
    throw new Error('PNG failist ei leitud piisavalt tumedaid piirkondi, et vektorjälge koostada.')
  }

  return rectangles
}

function formatDxfNumber(value: number) {
  const rounded = Number(value.toFixed(3))
  return Number.isInteger(rounded) ? String(rounded) : String(rounded)
}

function buildSvgDocument(args: {
  width: number
  height: number
  rectangles: VectorRectangle[]
  strokeStrategy: VectorizationPlan['strokeStrategy']
}) {
  const { width, height, rectangles, strokeStrategy } = args
  const shapes = rectangles
    .map((rectangle) => `  <rect x="${rectangle.x}" y="${rectangle.y}" width="${rectangle.width}" height="${rectangle.height}" />`)
    .join('\n')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" shape-rendering="crispEdges">`,
    `  <desc>Deterministic ${strokeStrategy} trace generated from optimized PNG raster.</desc>`,
    '  <rect width="100%" height="100%" fill="#ffffff" />',
    '  <g fill="#000000">',
    shapes,
    '  </g>',
    '</svg>',
  ].join('\n')
}

function appendClosedPolyline(lines: string[], rectangle: VectorRectangle, documentHeight: number) {
  const x0 = rectangle.x
  const x1 = rectangle.x + rectangle.width
  const y0 = documentHeight - rectangle.y - rectangle.height
  const y1 = documentHeight - rectangle.y

  lines.push(
    '0',
    'LWPOLYLINE',
    '8',
    '0',
    '90',
    '4',
    '70',
    '1',
    '10',
    formatDxfNumber(x0),
    '20',
    formatDxfNumber(y0),
    '10',
    formatDxfNumber(x1),
    '20',
    formatDxfNumber(y0),
    '10',
    formatDxfNumber(x1),
    '20',
    formatDxfNumber(y1),
    '10',
    formatDxfNumber(x0),
    '20',
    formatDxfNumber(y1),
  )
}

function appendCenterline(lines: string[], rectangle: VectorRectangle, documentHeight: number) {
  const x0 = rectangle.x
  const x1 = rectangle.x + rectangle.width
  const centerY = documentHeight - rectangle.y - rectangle.height / 2

  lines.push(
    '0',
    'LINE',
    '8',
    '0',
    '10',
    formatDxfNumber(x0),
    '20',
    formatDxfNumber(centerY),
    '11',
    formatDxfNumber(x1),
    '21',
    formatDxfNumber(centerY),
  )
}

function buildDxfDocument(args: {
  height: number
  rectangles: VectorRectangle[]
  strokeStrategy: VectorizationPlan['strokeStrategy']
}) {
  const { height, rectangles, strokeStrategy } = args
  const lines = ['0', 'SECTION', '2', 'HEADER', '9', '$INSUNITS', '70', '4', '0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES']

  for (const rectangle of rectangles) {
    if (strokeStrategy === 'centerline' && rectangle.height === 1) {
      appendCenterline(lines, rectangle, height)
      continue
    }

    appendClosedPolyline(lines, rectangle, height)
  }

  lines.push('0', 'ENDSEC', '0', 'EOF')

  return lines.join('\n')
}

export function renderVectorAssetsFromRaster(args: {
  dataUrl: string
  strokeStrategy: VectorizationPlan['strokeStrategy']
}): GeneratedVectorAssets {
  const parsed = parseDataUrl(args.dataUrl)

  if (parsed.mediaType !== 'image/png') {
    throw new Error('Deterministlik vektor-eksport eeldab PNG formaadis optimeeritud rasterpilti.')
  }

  const png = PNG.sync.read(parsed.buffer)
  const threshold = args.strokeStrategy === 'centerline' ? DARK_PIXEL_THRESHOLD - 12 : DARK_PIXEL_THRESHOLD
  const rectangles = mergeRunsIntoRectangles(png, threshold)
  const svg = buildSvgDocument({
    width: png.width,
    height: png.height,
    rectangles,
    strokeStrategy: args.strokeStrategy,
  })
  const dxf = buildDxfDocument({
    height: png.height,
    rectangles,
    strokeStrategy: args.strokeStrategy,
  })

  return {
    svgDataUrl: bufferToDataUrl(Buffer.from(svg, 'utf8'), 'image/svg+xml'),
    dxfDataUrl: bufferToDataUrl(Buffer.from(dxf, 'utf8'), 'application/dxf'),
    width: png.width,
    height: png.height,
    rectangleCount: rectangles.length,
  }
}
