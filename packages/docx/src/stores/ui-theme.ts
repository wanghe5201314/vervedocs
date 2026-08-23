import { reactive, readonly } from 'vue'

/**
 * 主题数据（标签栏等区域的视觉配置）
 */
export interface ThemeData {
  /** 标签栏背景起始色 */
  tabBgColor: string
  /** 标签栏背景结束色（用于渐变） */
  tabBgColorEnd: string
  /** 是否使用渐变背景 */
  isGradient: boolean
  /** 渐变方向（如 'to right'） */
  gradientDirection: string
  /** 标签栏文字颜色 */
  tabTextColor: string
}

/**
 * 预设主题类型
 */
type PresetTheme = 'default' | 'classic' | 'midnight' | 'ocean' | 'mint' | 'sunset' | 'graphite'

/**
 * UI 主题状态
 */
interface UiThemeState {
  /** 当前主题来源：preset=预设，custom=自定义 */
  kind: 'preset' | 'custom'
  /** 当前预设主题 */
  preset: PresetTheme
  /** 自定义主题数据 */
  custom: ThemeData
}

/**
 * 根据预设主题名获取对应的主题数据
 * @param preset 预设主题名
 * @returns 主题数据
 */
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

/**
 * 将主题数据应用到根元素的 CSS 变量
 * @param theme 主题数据
 * @param kind 主题来源类型（preset 或 custom）
 */
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

/**
 * 创建 UI 主题状态存储
 * @returns UI 主题存储实例，包含只读 state 及主题切换/持久化方法
 */
function createUiThemeStore() {
  const state = reactive<UiThemeState>({ ...defaultState })

  /**
   * 获取当前生效的主题数据
   * @returns 当前主题数据
   */
  function getCurrentThemeData(): ThemeData {
    return state.kind === 'custom' ? state.custom : presetToThemeData(state.preset)
  }

  /**
   * 将当前主题应用到 CSS 变量
   */
  function applyCurrent() {
    applyCssVars(getCurrentThemeData(), state.kind)
  }

  /**
   * 切换到指定预设主题并持久化、应用
   * @param preset 预设主题名
   */
  function setPreset(preset: PresetTheme) {
    state.kind = 'preset'
    state.preset = preset
    persist()
    applyCurrent()
  }

  /**
   * 设置自定义主题并持久化、应用
   * @param theme 自定义主题数据
   */
  function setCustom(theme: ThemeData) {
    state.kind = 'custom'
    state.custom = { ...theme }
    persist()
    applyCurrent()
  }

  /**
   * 将当前主题状态持久化到 localStorage
   */
  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // ignore
    }
  }

  /**
   * 从 localStorage 加载主题状态并校验字段后写入 state
   */
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

  /**
   * 初始化主题：从本地存储加载并应用当前主题
   */
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

/**
 * UI 主题状态存储
 * 提供预设/自定义主题切换、CSS 变量应用与本地持久化
 */
export const uiThemeStore = createUiThemeStore()
/**
 * UI 主题存储类型
 */
export type UiThemeStore = ReturnType<typeof createUiThemeStore>
