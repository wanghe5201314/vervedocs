/*
 * @Author: wuyifan wuyifan@udschina.com
 * @Date: 2026-08-20 09:48:21
 * @LastEditors: wuyifan wuyifan@udschina.com
 * @LastEditTime: 2026-08-20 11:47:40
 * @FilePath: \vervedocs\packages\ppt\src\object\PptEditor.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { createApp, defineComponent, h, reactive } from 'vue'
import { createPinia } from 'pinia'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import PptEditorComponent from '@/components/PptEditor.vue'
import PptPlugins from '@/plugins'
import type { PptLocale, PptI18nMessages } from '@/i18n'

export interface Options {
  container: string | HTMLElement
  initialContent?: any
  documentName?: string
  readOnly?: boolean
  locale?: PptLocale
  i18n?: Partial<PptI18nMessages>
  onChange?: (content: { format: string; data: any }) => void
}

const resolveTarget = (target: string | HTMLElement): HTMLElement => {
  if (typeof target === 'string') {
    const el = document.querySelector<HTMLElement>(target)
    if (!el) throw new Error(`Mount target not found: ${target}`)
    return el
  }
  if (!target) throw new Error('Mount target is required')
  return target
}

export class PptEditor {
  private app: any
  private state: {
    initialContent?: any
    documentName?: string
    readOnly: boolean
    locale?: PptLocale
    i18n?: Partial<PptI18nMessages>
  }

  constructor(private options: Options) {
    const host = resolveTarget(options.container)
    this.state = reactive({
      initialContent: options.initialContent,
      documentName: options.documentName,
      readOnly: !!options.readOnly,
      locale: options.locale,
      i18n: options.i18n
    })
    const root = defineComponent(() => () => h(PptEditorComponent as any, {
      initialContent: this.state.initialContent,
      documentName: this.state.documentName,
      readOnly: this.state.readOnly,
      locale: this.state.locale,
      i18n: this.state.i18n,
      onChange: (content: { format: string; data: any }) => this.options.onChange?.(content)
    }))
    this.app = createApp(root)
    this.app.use(createPinia())
    this.app.use(Antd, { locale: zhCN })
    this.app.use(PptPlugins)
    this.app.mount(host)
  }

  setContent(content: any) {
    this.state.initialContent = content
  }

  setDocumentName(name: string) {
    this.state.documentName = name
  }

  setReadOnly(readOnly: boolean) {
    this.state.readOnly = !!readOnly
  }

  destroy() {
    if (!this.app) return
    this.app.unmount()
    this.app = null
  }
}
