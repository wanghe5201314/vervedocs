import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

type Breakpoint = 'mobile' | 'tablet' | 'desktop'

const BREAKPOINTS: Record<Breakpoint, number> = {
  mobile: 768,
  tablet: 1024,
  desktop: Infinity
}

export function useResponsive() {
  const width = ref(typeof window !== 'undefined' ? window.innerWidth : 1024)
  const height = ref(typeof window !== 'undefined' ? window.innerHeight : 768)

  const breakpoint = computed<Breakpoint>(() => {
    const w = width.value
    if (w < BREAKPOINTS.mobile) return 'mobile'
    if (w < BREAKPOINTS.tablet) return 'tablet'
    return 'desktop'
  })

  const isMobile = computed(() => breakpoint.value === 'mobile')
  const isTablet = computed(() => breakpoint.value === 'tablet')
  const isDesktop = computed(() => breakpoint.value === 'desktop')
  const isMobileOrTablet = computed(() => isMobile.value || isTablet.value)

  const isTouchDevice = ref(false)

  const detectTouch = () => {
    isTouchDevice.value =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      ((navigator as any)?.msMaxTouchPoints ?? 0) > 0
  }

  let resizeTimer: number | null = null
  const handleResize = () => {
    if (resizeTimer) clearTimeout(resizeTimer)
    resizeTimer = window.setTimeout(() => {
      width.value = window.innerWidth
      height.value = window.innerHeight
    }, 100)
  }

  onMounted(() => {
    detectTouch()
    window.addEventListener('resize', handleResize, { passive: true })
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize)
    if (resizeTimer) clearTimeout(resizeTimer)
  })

  return {
    width,
    height,
    breakpoint,
    isMobile,
    isTablet,
    isDesktop,
    isMobileOrTablet,
    isTouchDevice
  }
}