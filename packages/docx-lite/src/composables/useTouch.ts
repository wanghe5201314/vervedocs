import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

interface TouchState {
  scale: number
  isPinching: boolean
}

interface UseTouchOptions {
  minScale?: number
  maxScale?: number
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
}

export function useTouch(
  containerRef: Ref<HTMLElement | null>,
  options: UseTouchOptions = {}
) {
  const { minScale = 0.5, maxScale = 3, onSwipeLeft, onSwipeRight } = options

  const touchState = ref<TouchState>({
    scale: 1,
    isPinching: false
  })

  let initialDistance = 0
  let initialScale = 1
  let touchStartX = 0
  let touchStartY = 0
  let touchStartTime = 0

  const getDistance = (t1: Touch, t2: Touch) => {
    const dx = t1.clientX - t2.clientX
    const dy = t1.clientY - t2.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      initialDistance = getDistance(e.touches[0], e.touches[1])
      initialScale = touchState.value.scale
      touchState.value.isPinching = true
    } else if (e.touches.length === 1) {
      touchStartX = e.touches[0].clientX
      touchStartY = e.touches[0].clientY
      touchStartTime = Date.now()
    }
  }

  const onTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 2 && touchState.value.isPinching) {
      e.preventDefault()
      const currentDistance = getDistance(e.touches[0], e.touches[1])
      const scale = initialScale * (currentDistance / initialDistance)
      touchState.value.scale = Math.max(minScale, Math.min(maxScale, scale))
    }
  }

  const onTouchEnd = (e: TouchEvent) => {
    if (touchState.value.isPinching && e.touches.length < 2) {
      touchState.value.isPinching = false
    }
    if (e.changedTouches.length === 1 && !touchState.value.isPinching) {
      const dx = e.changedTouches[0].clientX - touchStartX
      const dy = e.changedTouches[0].clientY - touchStartY
      const dt = Date.now() - touchStartTime
      const absDx = Math.abs(dx)
      const absDy = Math.abs(dy)
      if (dt < 300 && absDx > 50 && absDx > absDy * 1.5) {
        if (dx > 0) onSwipeRight?.()
        else onSwipeLeft?.()
      }
    }
  }

  onMounted(() => {
    const el = containerRef.value
    if (!el) return
    el.addEventListener('touchstart', onTouchStart, { passive: false })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
  })

  onBeforeUnmount(() => {
    const el = containerRef.value
    if (!el) return
    el.removeEventListener('touchstart', onTouchStart)
    el.removeEventListener('touchmove', onTouchMove)
    el.removeEventListener('touchend', onTouchEnd)
  })

}