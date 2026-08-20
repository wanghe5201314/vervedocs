import { Ref, ComputedRef, ref, watch, nextTick } from 'vue'

export function useLoadingOverlay(options: {
  busy: ComputedRef<boolean>
  busyText: ComputedRef<string>
  editorAppRef: Ref<HTMLElement | null>
}) {
  const { busy, busyText, editorAppRef } = options
  const loadingOverlay = ref<HTMLElement | null>(null)

  const showLoading = (target: HTMLElement, text: string) => {
    const el = document.createElement('div')
    el.className = 'app-loading-overlay'
    el.innerHTML = `<div class="app-loading-spin"><div class="ant-spin ant-spin-spinning"><span class="ant-spin-dot ant-spin-dot-spin"><i class="ant-spin-dot-item"></i><i class="ant-spin-dot-item"></i><i class="ant-spin-dot-item"></i><i class="ant-spin-dot-item"></i></span></div><span class="app-loading-text">${text}</span></div>`
    el.style.cssText = 'position:absolute;inset:0;background:rgba(255,255,255,0.65);display:flex;align-items:center;justify-content:center;z-index:9999;'
    target.style.position = 'relative'
    target.appendChild(el)
    loadingOverlay.value = el
  }

  const closeLoadingOverlay = () => {
    loadingOverlay.value?.remove()
    loadingOverlay.value = null
  }

  watch([busy, busyText], async ([active, text]) => {
    if (!active) {
      closeLoadingOverlay()
      return
    }
    await nextTick()
    if (!editorAppRef.value) return
    closeLoadingOverlay()
    showLoading(editorAppRef.value, text)
  }, { immediate: true })

  return { showLoading, closeLoadingOverlay }
}