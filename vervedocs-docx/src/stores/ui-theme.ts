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

  const parseColorToRgb = (input: string): { r: number; g: number; b: number } | null => {
    const s = (input || '').trim()
    if (!s) return null
    const hex = s.startsWith('#') ? s.slice(1) : ''
    if (hex) {
      const h = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex
      const h6 = h.length >= 6 ? h.slice(0, 6) : ''
      if (h6.length === 6) {
        const r = parseInt(h6.slice(0, 2), 16)
        const g = parseInt(h6.slice(2, 4), 16)
        const b = parseInt(h6.slice(4, 6), 16)
        if ([r, g, b].every(n => Number.isFinite(n))) return { r, g, b }
      }
    }
    const m = s.match(/^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+))?\s*\)$/i)
    if (m) {
      const r = Math.max(0, Math.min(255, Math.round(Number(m[1]))))
      const g = Math.max(0, Math.min(255, Math.round(Number(m[2]))))
      const b = Math.max(0, Math.min(255, Math.round(Number(m[3]))))
      return { r, g, b }
    }
    return null
  }

  const mix = (a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }, amount: number) => {
    const t = Math.max(0, Math.min(1, amount))
    return {
      r: Math.round(a.r + (b.r - a.r) * t),
      g: Math.round(a.g + (b.g - a.g) * t),
      b: Math.round(a.b + (b.b - a.b) * t)
    }
  }

  const toRgbString = (c: { r: number; g: number; b: number }) => `rgb(${c.r}, ${c.g}, ${c.b})`

  const isDefaultLike = kind === 'preset' && theme.tabBgColor.toLowerCase() === '#f2f4f7'
  const primaryBase = isDefaultLike ? '#409eff' : theme.tabBgColor
  const primaryRgb = parseColorToRgb(primaryBase) || { r: 64, g: 158, b: 255 }

  const white = { r: 255, g: 255, b: 255 }
  const black = { r: 0, g: 0, b: 0 }

  root.style.setProperty('--el-color-primary', toRgbString(primaryRgb))
  root.style.setProperty('--el-color-primary-light-3', toRgbString(mix(primaryRgb, white, 0.3)))
  root.style.setProperty('--el-color-primary-light-5', toRgbString(mix(primaryRgb, white, 0.5)))
  root.style.setProperty('--el-color-primary-light-7', toRgbString(mix(primaryRgb, white, 0.7)))
  root.style.setProperty('--el-color-primary-light-8', toRgbString(mix(primaryRgb, white, 0.8)))
  root.style.setProperty('--el-color-primary-dark-2', toRgbString(mix(primaryRgb, black, 0.2)))

  if (kind === 'preset' && theme.tabBgColor.toLowerCase() === '#f2f4f7') {
    root.style.setProperty('--tabs-text-active-color', '#409eff')
    root.style.setProperty('--tabs-text-hover-color', '#409eff')
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
