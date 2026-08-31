export const SheetImageFormat = {
  PNG: { ext: 'png', mime: 'image/png' },
  GIF: { ext: 'gif', mime: 'image/gif' },
  WEBP: { ext: 'webp', mime: 'image/webp' },
  BMP: { ext: 'bmp', mime: 'image/bmp' },
  SVG: { ext: 'svg', mime: 'image/svg+xml' },
  JPEG: { ext: 'jpeg', mime: 'image/jpeg' },
} as const

const EXT_ALIASES: Record<string, string> = {
  jpg: SheetImageFormat.JPEG.ext,
}

const MIME_ALIASES: Record<string, string> = {
  'image/jpg': SheetImageFormat.JPEG.mime,
}

const MIME_BY_EXT = Object.fromEntries(
  Object.values(SheetImageFormat).map(({ ext, mime }) => [ext, mime]),
) as Record<string, string>

const EXT_BY_MIME = Object.fromEntries(
  Object.values(SheetImageFormat).map(({ ext, mime }) => [mime, ext]),
) as Record<string, string>

export const DEFAULT_IMAGE_EXT = SheetImageFormat.JPEG.ext
export const DEFAULT_IMAGE_MIME = SheetImageFormat.JPEG.mime

export function resolveImageMimeType(extension?: string): string {
  const ext = String(extension || DEFAULT_IMAGE_EXT).toLowerCase().replace(/^\./, '')
  const canonical = EXT_ALIASES[ext] ?? ext
  return MIME_BY_EXT[canonical] ?? DEFAULT_IMAGE_MIME
}

export function resolveImageExtension(mimeType?: string): string {
  const normalized = String(mimeType || '').toLowerCase().trim()
  const canonical = MIME_ALIASES[normalized] ?? normalized
  return EXT_BY_MIME[canonical] ?? DEFAULT_IMAGE_EXT
}
