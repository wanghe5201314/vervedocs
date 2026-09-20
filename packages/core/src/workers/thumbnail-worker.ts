/// <reference lib="webworker" />
export {}

type Request = { id: number; color: string; sources?: string[] }
let sources: string[] = []
let pending: (Request & { sources: string[] }) | null = null
let running = false
const bitmaps = new Map<number, { source: string; bitmap: ImageBitmap }>()
const reader = new FileReaderSync()

self.onmessage = (event: MessageEvent<Request>) => {
  const request = event.data
  if (request.sources) sources = request.sources
  pending = { ...request, sources }
  void drain()
}

async function drain(): Promise<void> {
  if (running) return
  running = true
  try {
    while (pending) {
      const request = pending
      pending = null
      const images: string[] = []
      try {
        const snapshot = request.sources
        for (const [index, entry] of bitmaps) {
          if (snapshot[index] !== entry.source) {
            entry.bitmap.close()
            bitmaps.delete(index)
          }
        }
        for (let index = 0; index < snapshot.length; index++) {
          if (pending) break
          const source = snapshot[index]
          if (!source) { images.push(''); continue }
          let entry = bitmaps.get(index)
          if (!entry) {
            const blob = await (await fetch(source)).blob()
            let bitmap = await createImageBitmap(blob)
            if (bitmap.width > 360) {
              const height = Math.max(1, Math.round(bitmap.height * 360 / bitmap.width))
              const resized = new OffscreenCanvas(360, height)
              resized.getContext('2d')!.drawImage(bitmap, 0, 0, 360, height)
              bitmap.close()
              bitmap = resized.transferToImageBitmap()
            }
            entry = { source, bitmap }
            bitmaps.set(index, entry)
          }
          if (pending) break
          const { bitmap } = entry
          const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
          const ctx = canvas.getContext('2d')!
          ctx.fillStyle = request.color
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(bitmap, 0, 0)
          const blob = await canvas.convertToBlob({ type: 'image/png' })
          if (pending) break
          images.push(reader.readAsDataURL(blob))
        }
        if (!pending) self.postMessage({ id: request.id, images })
      } catch (error) {
        self.postMessage({ id: request.id, error: String(error) })
      }
    }
  } finally {
    running = false
  }
}
