import { VIEWPORT_SIZE } from '@/configs/canvas'

// OpenXML namespaces
export const NS_P = 'http://schemas.openxmlformats.org/presentationml/2006/main'
export const NS_A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
export const NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
export const NS_REL = 'http://schemas.openxmlformats.org/package/2006/relationships'
export const NS_C = 'http://schemas.openxmlformats.org/drawingml/2006/chart'
export const NS_PIC = 'http://schemas.openxmlformats.org/drawingml/2006/picture'
export const NS_MC = 'http://schemas.openxmlformats.org/markup-compatibility/2006'
export const NS_DSP = 'http://schemas.microsoft.com/office/drawing/2008/diagram'
export const NS_DGM = 'http://schemas.openxmlformats.org/drawingml/2006/diagram'

// Relationship types
export const REL_TYPE_SLIDE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide'
export const REL_TYPE_SLIDE_LAYOUT = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout'
export const REL_TYPE_SLIDE_MASTER = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster'
export const REL_TYPE_THEME = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme'
export const REL_TYPE_IMAGE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image'
export const REL_TYPE_CHART = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart'
export const REL_TYPE_VIDEO = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/video'
export const REL_TYPE_AUDIO = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/audio'
export const REL_TYPE_HYPERLINK = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink'
export const REL_TYPE_NOTES_SLIDE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide'

// Unit conversions

// 根据 PPTX 的 slideWidthEmu 计算对应的画布宽度（标准 96 DPI，仅用于信息展示）
export function getViewportWidth(slideWidthEmu: number): number {
  return Math.round(slideWidthEmu / 914400 * 96)
}

/**
 * 将 EMU 坐标转换为画布坐标。
 * 使用 VIEWPORT_SIZE 作为目标宽度，确保元素坐标映射到画布坐标系 (0 ~ VIEWPORT_SIZE)。
 */
export function emuToCanvas(emu: number, slideWidthEmu: number): number {
  return (emu / slideWidthEmu) * VIEWPORT_SIZE
}

export function emuToPt(emu: number): number {
  return emu / 12700
}

export function emuToPx(emu: number): number {
  return emu / 914400 * 96
}

/**
 * 将字体大小 pt 转换为画布 px。
 * 使用 VIEWPORT_SIZE 作为参考宽度，确保字体大小与画布坐标系一致。
 */
export function ptToCanvasPx(pt: number, slideWidthEmu: number): number {
  return pt * 12700 * VIEWPORT_SIZE / slideWidthEmu
}

export function angleToDeg(angle: string | number): number {
  return Number(angle) / 60000
}

export function stToPercent(st: string | number): number {
  return Number(st) / 1000
}

export function hundredthPtToPx(val: number): number {
  return val / 100
}

// MIME type mapping for media
export const MEDIA_MIME_MAP: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
  tiff: 'image/tiff',
  tif: 'image/tiff',
  emf: 'image/x-emf',
  wmf: 'image/x-wmf',
  mp4: 'video/mp4',
  avi: 'video/x-msvideo',
  mov: 'video/quicktime',
  webm: 'video/webm',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
}

// Preset color names
export const PRESET_COLORS: Record<string, string> = {
  black: '#000000',
  white: '#FFFFFF',
  red: '#FF0000',
  green: '#008000',
  blue: '#0000FF',
  yellow: '#FFFF00',
  cyan: '#00FFFF',
  magenta: '#FF00FF',
  silver: '#C0C0C0',
  gray: '#808080',
  grey: '#808080',
  maroon: '#800000',
  olive: '#808000',
  purple: '#800080',
  teal: '#008080',
  navy: '#000080',
  darkRed: '#8B0000',
  darkGreen: '#006400',
  darkBlue: '#00008B',
  darkCyan: '#008B8B',
  darkMagenta: '#8B008B',
  darkYellow: '#808000',
  lightGray: '#D3D3D3',
  lightGrey: '#D3D3D3',
  darkGray: '#A9A9A9',
  darkGrey: '#A9A9A9',
  dkRed: '#8B0000',
  dkGreen: '#006400',
  dkBlue: '#00008B',
  ltGray: '#D3D3D3',
  dkGray: '#A9A9A9',
  orange: '#FFA500',
  pink: '#FFC0CB',
}
