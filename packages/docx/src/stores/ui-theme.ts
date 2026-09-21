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
 * @param {PresetTheme} preset 预设主题名
 * @returns {ThemeData} 主题数据
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

/**
 * 默认 UI 主题状态
 */
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

/**
 * 主题状态在 localStorage 中的存储键名
 */
const STORAGE_KEY = 'docx-editor:uiTheme'

/**
 * RGB 颜色三元组
 */
type RgbColor = { r: number, g: number, b: number }

/**
 * 将数值钳制到 0-255 整数范围
 * @param {number} value 输入数值
 * @returns {number} 钳制后的整数
 */
const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)))

/**
 * 将十六进制颜色字符串解析为 RGB 三元组
 * @param {string} hex 十六进制颜色字符串（支持 #RGB / #RRGGBB）
 * @returns {RgbColor | null} 解析成功返回 RGB 对象，否则返回 null
 */
const parseHexToRgb = (hex: string): RgbColor | null => {
  const normalized = hex.trim()
  if (!/^#([\da-f]{3}|[\da-f]{6})$/i.test(normalized)) return null
  const full = normalized.length === 4
    ? `#${normalized[1]}${normalized[1]}${normalized[2]}${normalized[2]}${normalized[3]}${normalized[3]}`
    : normalized

  return {
    r: parseInt(full.slice(1, 3), 16),
    g: parseInt(full.slice(3, 5), 16),
    b: parseInt(full.slice(5, 7), 16)
  }
}

/**
 * 将单个颜色通道值转换为两位十六进制字符串
 * @param {number} value 通道数值
 * @returns {string} 两位十六进制字符串
 */
const toHex = (value: number) => clamp(value).toString(16).padStart(2, '0')

/**
 * 将 RGB 三元组转换为十六进制颜色字符串
 * @param {RgbColor} param0 RGB 三元组
 * @returns {string} 形如 #rrggbb 的十六进制颜色字符串
 */
const rgbToHex = ({ r, g, b }: RgbColor) => `#${toHex(r)}${toHex(g)}${toHex(b)}`

/**
 * 按权重在两个十六进制颜色之间线性插值
 * @param {string} source 源颜色（HEX）
 * @param {string} target 目标颜色（HEX）
 * @param {number} weight 插值权重（0-1）
 * @returns {string} 混合后的十六进制颜色字符串，输入非法时返回 source
 */
const mixHexColor = (source: string, target: string, weight: number) => {
  const sourceRgb = parseHexToRgb(source)
  const targetRgb = parseHexToRgb(target)
  if (!sourceRgb || !targetRgb) return source

  const ratio = Math.max(0, Math.min(1, weight))
  return rgbToHex({
    r: sourceRgb.r + (targetRgb.r - sourceRgb.r) * ratio,
    g: sourceRgb.g + (targetRgb.g - sourceRgb.g) * ratio,
    b: sourceRgb.b + (targetRgb.b - sourceRgb.b) * ratio
  })
}

/**
 * 计算颜色的相对亮度（0-1）
 * @param {string} color 十六进制颜色字符串
 * @returns {number} 相对亮度值，输入非法时返回 0
 */
const getLuminance = (color: string) => {
  const rgb = parseHexToRgb(color)
  if (!rgb) return 0
  return (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255
}

/**
 * 将主题数据应用到根元素的 CSS 变量
 * @param {ThemeData} theme 主题数据
 * @param {'preset' | 'custom'} kind 主题来源类型（preset 或 custom）
 * @returns {void} 无返回值
 */
function applyCssVars(theme: ThemeData, kind: 'preset' | 'custom') {
  const bg = theme.isGradient
    ? `linear-gradient(${theme.gradientDirection}, ${theme.tabBgColor}, ${theme.tabBgColorEnd})`
    : theme.tabBgColor

  const isLightTheme = getLuminance(theme.tabBgColor) > 0.75
  const ribbonSurface = '#ffffff'
  const ribbonBorder = mixHexColor(theme.tabBgColor, ribbonSurface, 0.82)
  const ribbonBorderSoft = mixHexColor(theme.tabBgColor, ribbonSurface, 0.88)
  const ribbonShadow = mixHexColor(theme.tabBgColor, ribbonSurface, 0.9)
  const ribbonHoverBg = mixHexColor(theme.tabBgColor, ribbonSurface, 0.9)
  const ribbonActiveBg = mixHexColor(theme.tabBgColor, ribbonSurface, 0.82)
  const ribbonActiveText = isLightTheme ? mixHexColor(theme.tabBgColor, '#000000', 0.45) : theme.tabBgColor
  const ribbonText = isLightTheme ? '#243247' : '#3c4043'
  const ribbonTextMuted = isLightTheme ? '#5e6b80' : '#7a8191'
  const topbarHover = isLightTheme ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.14)'
  const topbarTextMuted = isLightTheme ? 'rgba(31, 45, 61, 0.72)' : 'rgba(255, 255, 255, 0.86)'
  const fileTabBg = isLightTheme ? 'rgba(0, 0, 0, 0.1)' : 'rgba(0, 0, 0, 0.16)'
  const fileTabHover = isLightTheme ? 'rgba(0, 0, 0, 0.16)' : 'rgba(0, 0, 0, 0.22)'

  const root = document.documentElement
  root.style.setProperty('--tabs-bg-color', bg)
  root.style.setProperty('--tabs-text-color', theme.tabTextColor)
  root.style.setProperty('--vd-ribbon-brand', theme.tabBgColor)
  root.style.setProperty('--vd-ribbon-brand-strong', theme.tabBgColorEnd)
  root.style.setProperty('--vd-ribbon-topbar-bg', bg)
  root.style.setProperty('--vd-ribbon-topbar-text', theme.tabTextColor)
  root.style.setProperty('--vd-ribbon-topbar-text-muted', topbarTextMuted)
  root.style.setProperty('--vd-ribbon-topbar-hover', topbarHover)
  root.style.setProperty('--vd-ribbon-file-tab-bg', fileTabBg)
  root.style.setProperty('--vd-ribbon-file-tab-hover', fileTabHover)
  root.style.setProperty('--vd-ribbon-surface', ribbonSurface)
  root.style.setProperty('--vd-ribbon-border', ribbonBorder)
  root.style.setProperty('--vd-ribbon-border-soft', ribbonBorderSoft)
  root.style.setProperty('--vd-ribbon-shadow', ribbonShadow)
  root.style.setProperty('--vd-ribbon-text', ribbonText)
  root.style.setProperty('--vd-ribbon-text-muted', ribbonTextMuted)
  root.style.setProperty('--vd-ribbon-hover-bg', ribbonHoverBg)
  root.style.setProperty('--vd-ribbon-active-bg', ribbonActiveBg)
  root.style.setProperty('--vd-ribbon-active-text', ribbonActiveText)

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
 * @returns {UiThemeStore} UI 主题存储实例，包含只读 state 及主题切换/持久化方法
 */
function createUiThemeStore() {
  const state = reactive<UiThemeState>({ ...defaultState })

  /**
   * 获取当前生效的主题数据
   * @returns {ThemeData} 当前主题数据
   */
  function getCurrentThemeData(): ThemeData {
    return state.kind === 'custom' ? state.custom : presetToThemeData(state.preset)
  }

  /**
   * 将当前主题应用到 CSS 变量
   * @returns {void} 无返回值
   */
  function applyCurrent() {
    applyCssVars(getCurrentThemeData(), state.kind)
  }

  /**
   * 切换到指定预设主题并持久化、应用
   * @param {PresetTheme} preset 预设主题名
   * @returns {void} 无返回值
   */
  function setPreset(preset: PresetTheme) {
    state.kind = 'preset'
    state.preset = preset
    persist()
    applyCurrent()
  }

  /**
   * 设置自定义主题并持久化、应用
   * @param {ThemeData} theme 自定义主题数据
   * @returns {void} 无返回值
   */
  function setCustom(theme: ThemeData) {
    state.kind = 'custom'
    state.custom = { ...theme }
    persist()
    applyCurrent()
  }

  /**
   * 将当前主题状态持久化到 localStorage
   * @returns {void} 无返回值
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
   * @returns {void} 无返回值
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
   * @returns {void} 无返回值
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
