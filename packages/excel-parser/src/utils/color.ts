export function normalizeArgbToHex(argb: unknown): string | undefined {
  const text = String(argb || '').trim()
  if (!text) return
  const normalized = text.length === 8 ? text.slice(2) : text
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return
  return `#${normalized.toUpperCase()}`
}
