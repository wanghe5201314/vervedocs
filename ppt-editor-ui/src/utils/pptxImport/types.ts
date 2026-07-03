import type { PPTElementOutline, PPTElementShadow, SlideBackground, ShapeGradient } from '@/types/slides'

export interface PptxThemeColors {
  dk1: string
  lt1: string
  dk2: string
  lt2: string
  accent1: string
  accent2: string
  accent3: string
  accent4: string
  accent5: string
  accent6: string
  hlink: string
  folHlink: string
  [key: string]: string
}

export interface PptxThemeData {
  colors: PptxThemeColors
  majorFont: string
  minorFont: string
}

export interface RelationshipEntry {
  target: string
  type: string
}

export interface PptxSlideContext {
  theme: PptxThemeData
  slideRels: Map<string, RelationshipEntry>
  mediaMap: Map<string, string> // normalized path -> base64 data URL
  slideWidthEmu: number
  slideHeightEmu: number
  slideMasterBg?: SlideBackground
  slideLayoutBg?: SlideBackground
  chartXmlMap?: Map<string, string> // chart path -> chart XML string
  diagramDrawingMap?: Map<string, string> // diagram drawing path -> XML string
  slideBasePath: string // e.g. "ppt/slides/"
  groupFill?: string // inherited fill from parent grpSp
  groupOutline?: PPTElementOutline // inherited outline from parent grpSp
}

export interface ParsedTransform {
  left: number
  top: number
  width: number
  height: number
  rotate: number
  flipH: boolean
  flipV: boolean
}

export interface ParsedOutline {
  outline?: PPTElementOutline
}

export interface ParsedShadow {
  shadow?: PPTElementShadow
}

export interface ParsedFill {
  fill?: string
  gradient?: ShapeGradient
}
