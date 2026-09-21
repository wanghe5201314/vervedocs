import { computed, inject, provide, type InjectionKey, type Ref } from 'vue'

export interface RibbonButtonAppearance {
  size?: 'small' | 'large' | 'compact'
  variant?: 'default' | 'flat'
  width?: string | number
  height?: string | number
  iconSize?: string | number
  iconWeight?: number
  iconOpticalSize?: number
  textSize?: string | number
}

export const RIBBON_BUTTON_DEFAULTS_KEY: InjectionKey<Readonly<Ref<RibbonButtonAppearance>>> =
  Symbol('vd-ribbon-button-defaults')

export function provideRibbonButtonDefaults(getDefaults: () => RibbonButtonAppearance | undefined): void {
  const parent = inject(RIBBON_BUTTON_DEFAULTS_KEY, undefined)
  provide(RIBBON_BUTTON_DEFAULTS_KEY, computed(() => {
    const defaults = { ...parent?.value }
    for (const [key, value] of Object.entries(getDefaults() ?? {})) {
      if (value !== undefined) Object.assign(defaults, { [key]: value })
    }
    return defaults
  }))
}
