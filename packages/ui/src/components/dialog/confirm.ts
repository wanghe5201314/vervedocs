import { defineComponent, getCurrentInstance, h, nextTick, onBeforeUnmount, ref, render, type VNodeChild } from 'vue'
import VdDialog from './VdDialog.vue'

export interface DialogConfirmOptions {
  title: string
  content: string | (() => VNodeChild)
  okText?: string
  cancelText?: string
  width?: string | number
  onOk?: () => unknown | Promise<unknown>
}

/** Create confirmations owned by the calling component's lifecycle and app context. */
export function useDialogConfirm() {
  const appContext = getCurrentInstance()?.appContext
  const dismissals = new Set<() => void>()
  onBeforeUnmount(() => {
    for (const dismiss of dismissals) dismiss()
  })

  return (options: DialogConfirmOptions): Promise<boolean> => new Promise(resolve => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    let finished = false
    const dismiss = () => finish(false)
    function finish(accepted: boolean) {
      if (finished) return
      finished = true
      dismissals.delete(dismiss)
      // Unmount outside the event/render stack; VdDialog restores scroll and focus.
      void nextTick(() => {
        render(null, container)
        container.remove()
        resolve(accepted)
      })
    }
    dismissals.add(dismiss)
    const Confirmation = defineComponent({
      setup() {
        const pending = ref(false)
        const error = ref('')
        async function confirm() {
          if (pending.value || finished) return
          pending.value = true
          error.value = ''
          try {
            if (await options.onOk?.() !== false) finish(true)
          } catch (reason) {
            error.value = reason instanceof Error ? reason.message : String(reason)
          } finally {
            pending.value = false
          }
        }
        return () => h(VdDialog, {
          open: true,
          title: options.title,
          width: options.width,
          okText: options.okText,
          cancelText: options.cancelText,
          maskClosable: false,
          confirmLoading: pending.value,
          onOk: confirm,
          onCancel: dismiss
        }, {
          default: () => [
            typeof options.content === 'function' ? options.content() : options.content,
            error.value ? h('p', { role: 'alert', style: { color: '#c62828', marginTop: '8px' } }, error.value) : null
          ]
        })
      }
    })
    const vnode = h(Confirmation)
    if (appContext) vnode.appContext = appContext
    render(vnode, container)
  })
}
