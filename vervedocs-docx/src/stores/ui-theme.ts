import { reactive, readonly } from 'vue'

export interface ThemeData {
  tabBgColor: string
  tabBgColorEnd: string
  isGradient: boolean
  gradientDirection: string
  tabTextColor: string
}

type PresetTheme = 'default' | 'classic' | 'midnight' | 'ocean' | 'mint' | 'sunset' | 'graphite'

interface UiThemeState {
  kind: 'preset' | 'custom'
  preset: PresetTheme
  custom: ThemeData
}

const presetToThemeData = (preset: PresetTheme): ThemeData => {
  if (preset === 'classic') {
    return {
      tabBgColor: '#445799',
      tabBgColorEnd: '#445799',
      isGradient: false,
      gradientDirection: 'to right',
      tabTextColor: '#ffffff'
    }
  }
  if (preset === 'midnight') {
    return {
      tabBgColor: '#0B1220',
      tabBgColorEnd: '#0B1220',
      isGradient: false,
      gradientDirection: 'to right',
      tabTextColor: '#E6EAF2'
    }
  }
  if (preset === 'ocean') {
    return {
      tabBgColor: '#0B2A3A',
      tabBgColorEnd: '#0B2A3A',
      isGradient: false,
      gradientDirection: 'to right',
      tabTextColor: '#E6F6FF'
    }
  }
  if (preset === 'mint') {
    return {
      tabBgColor: '#DFF7EE',
      tabBgColorEnd: '#DFF7EE',
      isGradient: false,
      gradientDirection: 'to right',
      tabTextColor: '#1F2D3D'
    }
  }
  if (preset === 'sunset') {
    return {
      tabBgColor: '#FF6B6B',
      tabBgColorEnd: '#FFB86B',
      isGradient: true,
      gradientDirection: 'to right',
      tabTextColor: '#ffffff'
    }
  }
  if (preset === 'graphite') {
    return {
      tabBgColor: '#111827',
      tabBgColorEnd: '#374151',
      isGradient: true,
      gradientDirection: 'to right',
      tabTextColor: '#F9FAFB'
    }
  }
  return {
    tabBgColor: '#2B579A',
    tabBgColorEnd: '#2B579A',
    isGradient: false,
    gradientDirection: 'to right',
    tabTextColor: '#ffffff'
  }
}

const defaultState: UiThemeState = {
  kind: 'preset',
  preset: 'default',
  custom: {
    tabBgColor: '#2B579A',
    tabBgColorEnd: '#2B579A',
    isGradient: false,
    gradientDirection: 'to right',
    tabTextColor: '#ffffff'
  }
}

const STORAGE_KEY = 'docx-editor:uiTheme'

function applyCssVars(theme: ThemeData, kind: 'preset' | 'custom') {
  const bg = theme.isGradient
    ? `linear-gradient(${theme.gradientDirection}, ${theme.tabBgColor}, ${theme.tabBgColorEnd})`
    : theme.tabBgColor

  const root = document.documentElement
  root.style.setProperty('--tabs-bg-color', bg)
  root.style.setProperty('--tabs-text-color', theme.tabTextColor)


if (kind === 'preset' && theme.tabBgColor.toLowerCase() === '#f2f4f7') {
    root.style.setProperty('--tabs-text-active-color', '#1890ff')
    root.style.setProperty('--tabs-text-hover-color', '#1890ff')
  } else {
    root.style.setProperty('--tabs-text-active-color', theme.tabTextColor)
    root.style.setProperty('--tabs-text-hover-color', theme.tabTextColor)
  }
}

function createUiThemeStore() {
  const state = reactive<UiThemeState>({ ...defaultState })

  function getCurrentThemeData(): ThemeData {
    return state.kind === 'custom' ? state.custom : presetToThemeData(state.preset)
  }

  function applyCurrent() {
    applyCssVars(getCurrentThemeData(), state.kind)
  }

  function setPreset(preset: PresetTheme) {
    state.kind = 'preset'
    state.preset = preset
    persist()
    applyCurrent()
  }

  function setCustom(theme: ThemeData) {
    state.kind = 'custom'
    state.custom = { ...theme }
    persist()
    applyCurrent()
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // ignore
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as Partial<UiThemeState>
      if (parsed && (parsed.kind === 'preset' || parsed.kind === 'custom')) {
        state.kind = parsed.kind
      }
      if (parsed && (parsed.preset === 'default' || parsed.preset === 'classic' || parsed.preset === 'midnight' || parsed.preset === 'ocean' || parsed.preset === 'mint' || parsed.preset === 'sunset' || parsed.preset === 'graphite')) {
        state.preset = parsed.preset
      }
      if (parsed && parsed.custom && typeof parsed.custom === 'object') {
        const c = parsed.custom as ThemeData
        if (typeof c.tabBgColor === 'string') state.custom.tabBgColor = c.tabBgColor
        if (typeof c.tabBgColorEnd === 'string') state.custom.tabBgColorEnd = c.tabBgColorEnd
        if (typeof c.isGradient === 'boolean') state.custom.isGradient = c.isGradient
        if (typeof c.gradientDirection === 'string') state.custom.gradientDirection = c.gradientDirection
        if (typeof c.tabTextColor === 'string') state.custom.tabTextColor = c.tabTextColor
      }
    } catch {
      // ignore
    }
  }

  function init() {
    load()
    applyCurrent()
  }

  return {
    state: readonly(state),
    init,
    applyCurrent,
    getCurrentThemeData,
    setPreset,
    setCustom
  }
}

export const uiThemeStore = createUiThemeStore()
export type UiThemeStore = ReturnType<typeof createUiThemeStore>
