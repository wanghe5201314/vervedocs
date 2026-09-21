<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch, type CSSProperties } from 'vue'
import { enterDialog, isTopDialog, leaveDialog } from './stack'
import VdButton from '../button/VdButton.vue'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<{
  title?: string
  width?: string | number
  zIndex?: number
  closable?: boolean
  maskClosable?: boolean
  keyboard?: boolean
  destroyOnClose?: boolean
  footer?: boolean | null
  okText?: string
  cancelText?: string
  closeText?: string
  confirmLoading?: boolean
  bodyStyle?: CSSProperties
}>(), {
  width: 520,
  zIndex: 1000,
  closable: true,
  maskClosable: true,
  keyboard: true,
  destroyOnClose: false,
  footer: true,
  okText: '\u786e\u5b9a',
  cancelText: '\u53d6\u6d88',
  closeText: '\u5173\u95ed',
  confirmLoading: false
})
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{
  cancel: [event: MouseEvent | KeyboardEvent]
  ok: [event: MouseEvent]
  afterOpenChange: [open: boolean]
}>()
const dialog = ref<HTMLElement>()
const rendered = ref(false)
const layer = ref(props.zIndex)
const titleId = `vd-dialog-title-${useId()}`
const id = Symbol('dialog')
const topmost = computed(() => isTopDialog(id))
let previousFocus: HTMLElement | null = null
let registered = false
let backdropPressed = false
const dialogStyle = computed(() => ({
  width: typeof props.width === 'number' ? `${props.width}px` : props.width
}))
const focusableSelector = [
  'button:not(:disabled)', 'input:not(:disabled):not([type="hidden"])',
  'select:not(:disabled)', 'textarea:not(:disabled)', 'a[href]',
  '[tabindex]:not([tabindex="-1"])', '[contenteditable="true"]'
].join(',')

function focusableElements(): HTMLElement[] {
  return Array.from(dialog.value?.querySelectorAll<HTMLElement>(focusableSelector) ?? [])
    .filter(element => element.tabIndex >= 0 && !element.closest('[inert]') &&
      element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden')
}

function release() {
  if (!registered) return
  registered = false
  const wasTop = leaveDialog(id)
  const target = previousFocus
  if (wasTop && target) {
    void nextTick(() => {
      if (target.isConnected && !target.closest('[inert]') && target.getClientRects().length) {
        target.focus({ preventScroll: true })
      }
    })
  }
  previousFocus = null
}

watch(open, async (value, oldValue, onCleanup) => {
  if (typeof document === 'undefined') return
  let cancelled = false
  onCleanup(() => { cancelled = true })
  if (value) {
    rendered.value = true
    if (!registered) {
      previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
      layer.value = enterDialog(id, props.zIndex)
      registered = true
    }
  } else {
    release()
  }
  await nextTick()
  if (cancelled) return
  if (value) {
    const autofocus = dialog.value?.querySelector<HTMLElement>('[autofocus]')
    ;(autofocus ?? dialog.value)?.focus({ preventScroll: true })
  }
  // The body is mounted and laid out before consumers initialize canvases.
  if (value || oldValue) emit('afterOpenChange', value)
}, { immediate: true, flush: 'post' })

onBeforeUnmount(release)

function cancel(event: MouseEvent | KeyboardEvent) {
  if (!topmost.value || props.confirmLoading) return
  open.value = false
  emit('cancel', event)
}

function onBackdropMouseDown(event: MouseEvent) {
  backdropPressed = event.target === event.currentTarget
  if (backdropPressed) event.preventDefault()
}

function onBackdropClick(event: MouseEvent) {
  if (backdropPressed && event.target === event.currentTarget && props.maskClosable) cancel(event)
  backdropPressed = false
}

function onKeydown(event: KeyboardEvent) {
  if (!topmost.value || event.isComposing) return
  if (event.key === 'Escape' && props.keyboard && !event.defaultPrevented) {
    event.preventDefault()
    cancel(event)
  }
  if (event.key !== 'Tab') return
  const elements = focusableElements()
  const first = elements[0]
  const last = elements[elements.length - 1]
  const current = document.activeElement
  if (!first) {
    event.preventDefault()
    dialog.value?.focus()
  } else if (!elements.includes(current as HTMLElement) || (event.shiftKey ? current === first : current === last)) {
    event.preventDefault()
    ;(event.shiftKey ? last : first).focus()
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="rendered && (!destroyOnClose || open)"
      v-show="open"
      class="vd-dialog-backdrop"
      :style="{ zIndex: layer }"
      :aria-hidden="!topmost || !open ? true : undefined"
      :inert="!topmost || !open ? true : undefined"
      @mousedown="onBackdropMouseDown"
      @click="onBackdropClick"
      @keydown.stop="onKeydown"
    >
      <section
        ref="dialog"
        v-bind="$attrs"
        class="vd-dialog"
        :style="dialogStyle"
        role="dialog"
        :aria-modal="topmost ? true : undefined"
        :aria-labelledby="title || $slots.title ? titleId : undefined"
        tabindex="-1"
      >
        <header v-if="title || $slots.title || closable" class="vd-dialog__header">
          <div :id="titleId" class="vd-dialog__title"><slot name="title">{{ title }}</slot></div>
          <button v-if="closable" class="vd-dialog__close" type="button" :aria-label="closeText" :disabled="confirmLoading" @click="cancel">
            <slot name="closeIcon">
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" /></svg>
            </slot>
          </button>
        </header>
        <div class="vd-dialog__body" :style="bodyStyle"><slot /></div>
        <footer v-if="footer !== false && footer !== null" class="vd-dialog__footer">
          <slot name="footer">
            <VdButton class="vd-dialog__button" :disabled="confirmLoading" @click="cancel">{{ cancelText }}</VdButton>
            <VdButton class="vd-dialog__button vd-dialog__button--primary" type="primary" :loading="confirmLoading" @click="emit('ok', $event)">
              {{ okText }}
            </VdButton>
          </slot>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.vd-dialog-backdrop {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
  background: rgb(0 0 0 / 32%);
  overscroll-behavior: contain;
}
.vd-dialog {
  display: flex;
  flex-direction: column;
  max-width: 100%;
  max-height: 100%;
  min-width: 0;
  box-sizing: border-box;
  border: 1px solid #bcbcbc;
  border-radius: 0;
  background: #fff;
  box-shadow: 0 8px 32px rgb(0 0 0 / 22%);
  color: #303133;
  font-family: var(--vd-font-family, sans-serif);
  font-size: 13px;
  line-height: 1.5;
  outline: none;
}
.vd-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  gap: 16px;
  min-height: 42px;
  padding: var(--vd-dialog-header-padding, 8px 12px 8px 16px);
  box-sizing: border-box;
  border-bottom: 1px solid #d9d9d9;
  background: #fff;
}
.vd-dialog__title {
  min-width: 0;
  font-size: 14px;
  font-weight: 600;
}
.vd-dialog__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: #555;
  cursor: pointer;
}
.vd-dialog__close svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
}
.vd-dialog__close:hover {
  background: #e81123;
  color: #fff;
}
.vd-dialog__body {
  min-height: 0;
  padding: var(--vd-dialog-body-padding, 16px);
  overflow: auto;
  overscroll-behavior: contain;
}
.vd-dialog__footer {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  padding: var(--vd-dialog-footer-padding, 10px 16px);
  border-top: 1px solid #e0e0e0;
  background: #fff;
}
.vd-dialog__button {
  min-width: 72px;
}
.vd-dialog__close:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.vd-dialog__close:focus-visible {
  outline: 2px solid #527bb5;
  outline-offset: 2px;
}
@media (max-width: 600px) {
  .vd-dialog-backdrop { padding: 12px; }
}
</style>
