declare module 'upng-js' {
  interface UPNGImage {
    width: number
    height: number
  }

  const UPNG: {
    decode(buffer: ArrayBuffer): UPNGImage
    toRGBA8(image: UPNGImage): ArrayBuffer[]
  }

  export default UPNG
}

declare module 'imagetracerjs' {
  interface ImageData {
    width: number
    height: number
    data: Uint8ClampedArray
  }

  interface ImageTracer {
    imagedataToSVG(imgd: ImageData, options?: Record<string, unknown>): string
  }

  const ImageTracer: ImageTracer
  export default ImageTracer
}
