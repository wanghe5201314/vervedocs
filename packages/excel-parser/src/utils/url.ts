export function normalizeHyperlink(url: string): string {
  const text = String(url || '').trim()
  if (!text) return ''
  if (/^(https?:\/\/|mailto:|tel:)/i.test(text)) return text
  return `https://${text}`
}
