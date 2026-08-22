import {
  EditorMode,
  PageMode,
  PaperDirection,
  RenderMode,
  WordBreak
} from '../enum/editor'
import { IBackgroundOption } from './background'
import { ICheckboxOption } from './checkbox'
import { IRadioOption } from './radio'
import { IControlOption } from './control'
import { ICursorOption } from './cursor'
import { IFooter } from './footer'
import { IGroup } from './group'
import { IHeader } from './header'
import { ILineBreakOption } from './line-break'
import { IMargin } from './margin'
import { IPageBreak } from './page-break'
import { IPageNumber } from './page-number'
import { IPlaceholder } from './placeholder'
import { ITitleOption } from './title'
import { IWatermark } from './watermark'
import { IZoneOption } from './zone'
import { ISeparatorOption } from './separator'
import { ITableOption } from './table/table'
import { ILineNumberOption } from './line-number'
import { IPageBorderOption } from './page-border'
import { IBadgeOption } from './badge'
import { IElement } from './element'
import { LocationPosition } from '../enum/common'
import { IRange } from './range'

export interface IEditorData {
  header?: IElement[]
  main: IElement[]
  footer?: IElement[]
}

export interface IFloatingBarOption {
  enabled?: boolean
}

export interface IEditorOption {
  mode?: EditorMode
  locale?: string
  defaultType?: string
  defaultColor?: string
  defaultFont?: string
  defaultSize?: number
  minSize?: number
  maxSize?: number
  defaultBasicRowMarginHeight?: number
  defaultRowMargin?: number
  defaultLineHeight?: number
  defaultTabWidth?: number
  width?: number
  height?: number
  scale?: number
  pageGap?: number
  underlineColor?: string
  strikeoutColor?: string
  rangeColor?: string
  rangeAlpha?: number
  rangeMinWidth?: number
  searchMatchColor?: string
  searchNavigateMatchColor?: string
  searchMatchAlpha?: number
  highlightAlpha?: number
  highlightMarginHeight?: number
  resizerColor?: string
  resizerSize?: number
  marginIndicatorSize?: number
  marginIndicatorColor?: string
  marginIndicatorDisabled?: boolean
  margins?: IMargin
  pageMode?: PageMode
  renderMode?: RenderMode
  defaultHyperlinkColor?: string
  paperDirection?: PaperDirection
  inactiveAlpha?: number
  historyMaxRecordCount?: number
  printPixelRatio?: number
  maskMargin?: IMargin
  letterClass?: string[]
  shortcutDisableKeys?: string[]
  scrollContainerSelector?: string
  pageOuterSelectionDisable?: boolean
  wordBreak?: WordBreak
  table?: ITableOption
  header?: IHeader
  footer?: IFooter
  pageNumber?: IPageNumber
  watermark?: IWatermark
  control?: IControlOption
  checkbox?: ICheckboxOption
  radio?: IRadioOption
  cursor?: ICursorOption
  title?: ITitleOption
  placeholder?: IPlaceholder
  group?: IGroup
  pageBreak?: IPageBreak
  zone?: IZoneOption
  background?: IBackgroundOption
  lineBreak?: ILineBreakOption
  separator?: ISeparatorOption
  lineNumber?: ILineNumberOption
  pageBorder?: IPageBorderOption
  badge?: IBadgeOption
  modeRule?: IModeRule
  floatingBar?: IFloatingBarOption
  trackChanges?: boolean
  revisionInsertColor?: string
  revisionDeleteColor?: string
  annotationColor?: string
  revisionColor?: string
  revisionDisplayMode?: 'all' | 'comments' | 'revisions' | 'none'
  showCommentBalloons?: boolean
  showRevisionBalloons?: boolean
}

export interface IEditorResult {
  dataVersion: string
  schemaVersion: string
  data: IEditorData
  options: IEditorOption
}

export interface IEditorHTML {
  header: string
  main: string
  footer: string
}

export type IEditorText = IEditorHTML

export type IUpdateOption = Omit<
  IEditorOption,
  | 'mode'
  | 'width'
  | 'height'
  | 'scale'
  | 'pageGap'
  | 'pageMode'
  | 'paperDirection'
  | 'historyMaxRecordCount'
  | 'scrollContainerSelector'
>

export interface ISetValueOption {
  isSetCursor?: boolean
}

export interface IFocusOption {
  rowNo?: number
  range?: IRange
  position?: LocationPosition
  isMoveCursorToVisible?: boolean
}

export interface IPrintModeRule {
  imagePreviewerDisabled?: boolean
}

export interface IReadonlyModeRule {
  imagePreviewerDisabled?: boolean
}

export interface IFormModeRule {
  controlDeletableDisabled?: boolean
}

export interface IModeRule {
  [EditorMode.PRINT]?: IPrintModeRule
  [EditorMode.READONLY]?: IReadonlyModeRule
  [EditorMode.FORM]?: IFormModeRule
}
