import type { InjectionKey, Ref } from 'vue'

export type RibbonTabMode = 'panel' | 'dropdown'

export interface RibbonTabContext {
  activeKey: Ref<string | undefined>
  setActiveKey: (key: string) => void
  navSelector: Ref<string>
  previewTab: (key: string) => void
}

export interface RibbonTabItemContext {
  itemKey: string
  disabled: Ref<boolean>
  mode: Ref<RibbonTabMode>
  isActive: Ref<boolean>
  activate: () => void
}

export const RIBBON_TAB_CONTEXT_KEY: InjectionKey<RibbonTabContext> = Symbol('vd-ribbon-tab')

export const RIBBON_TAB_ITEM_CONTEXT_KEY: InjectionKey<RibbonTabItemContext> =
  Symbol('vd-ribbon-tab-item')
