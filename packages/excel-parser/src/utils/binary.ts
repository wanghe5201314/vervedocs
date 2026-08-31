export function toUint8Array(buffer: unknown): Uint8Array | null {
  if (buffer instanceof Uint8Array) return buffer
  if (buffer instanceof ArrayBuffer) return new Uint8Array(buffer)
  if (buffer && typeof buffer === 'object' && (buffer as { buffer?: ArrayBuffer }).buffer instanceof ArrayBuffer) {
    const view = buffer as ArrayBufferView
    return new Uint8Array(view.buffer, view.byteOffset, view.byteLength)
  }
  return null
}

export function dataUrlToBuffer(dataUrl: string): Uint8Array | null {
  const text = String(dataUrl || '').trim()
  const match = text.match(/^data:[^;]+;base64,(.+)$/i)
  if (!match?.[1]) return null
  try {
    const binary = atob(match[1])
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes.length ? bytes : null
  } catch {
    return null
  }
}

export function bufferToDataUrl(buffer: unknown, mimeType: string): string | null {
  const bytes = toUint8Array(buffer)
  if (!bytes || bytes.length === 0) return null
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk)
    binary += String.fromCharCode(...slice)
  }
  return `data:${mimeType};base64,${btoa(binary)}`
}
