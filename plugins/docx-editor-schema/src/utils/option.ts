import { defaultBackground } from '../constants/background'
import { defaultCheckboxOption } from '../constants/checkbox'
import { LETTER_CLASS } from '../constants/common'
import { defaultControlOption } from '../constants/control'
import { defaultCursorOption } from '../constants/cursor'
import { defaultFooterOption } from '../constants/footer'
import { defaultGroupOption } from '../constants/group'
import { defaultHeaderOption } from '../constants/header'
import { defaultLineBreak } from '../constants/line-break'
import { defaultPageBreakOption } from '../constants/page-break'
import { defaultPageNumberOption } from '../constants/page-number'
import { defaultPlaceholderOption } from '../constants/placeholder'
import { defaultRadioOption } from '../constants/radio'
import { defaultSeparatorOption } from '../constants/separator'
import { defaultTableOption } from '../constants/table'
import { defaultTitleOption } from '../constants/title'
import { defaultWatermarkOption } from '../constants/watermark'
import { defaultZoneOption } from '../constants/zone'
import { defaultLineNumberOption } from '../constants/line-number'
import { IBackgroundOption } from '../interface/background'
import { ICheckboxOption } from '../interface/checkbox'
import { DeepRequired } from '../interface/common'
import { IControlOption } from '../interface/control'
import { ICursorOption } from '../interface/cursor'
import { IEditorOption, IFloatingBarOption, IModeRule } from '../interface/editor'
import { IFooter } from '../interface/footer'
import { IGroup } from '../interface/group'
import { IHeader } from '../interface/header'
import { ILineBreakOption } from '../interface/line-break'
import { IPageBreak } from '../interface/page-break'
import { IPageNumber } from '../interface/page-number'
import { IPlaceholder } from '../interface/placeholder'
import { IRadioOption } from '../interface/radio'
import { ISeparatorOption } from '../interface/separator'
import { ITableOption } from '../interface/table/table'
import { ITitleOption } from '../interface/title'
import { IWatermark } from '../interface/watermark'
import { IZoneOption } from '../interface/zone'
import { ILineNumberOption } from '../interface/line-number'
import { IPageBorderOption } from '../interface/page-border'
import { defaultPageBorderOption } from '../constants/page-border'
import {
  EditorMode,
  PageMode,
  PaperDirection,
  RenderMode,
  WordBreak
} from '../enum/editor'
import { defaultBadgeOption } from '../constants/badge'
import { IBadgeOption } from '../interface/badge'
import { defaultModeRuleOption } from '../constants/editor'

export function mergeOption(
  options: IEditorOption = {}
): DeepRequired<IEditorOption> {
  const tableOptions: Required<ITableOption> = {
    ...defaultTableOption,
    ...options.table
  }
  const headerOptions: Required<IHeader> = {
    ...defaultHeaderOption,
    ...options.header
  }
  const footerOptions: Required<IFooter> = {
    ...defaultFooterOption,
    ...options.footer
  }
  const pageNumberOptions: Required<IPageNumber> = {
    ...defaultPageNumberOption,
    ...options.pageNumber
  }
  const waterMarkOptions: Required<IWatermark> = {
    ...defaultWatermarkOption,
    ...options.watermark
  }
  const controlOptions: Required<IControlOption> = {
    ...defaultControlOption,
    ...options.control
  }
  const checkboxOptions: Required<ICheckboxOption> = {
    ...defaultCheckboxOption,
    ...options.checkbox
  }
  const radioOptions: Required<IRadioOption> = {
    ...defaultRadioOption,
    ...options.radio
  }
  const cursorOptions: Required<ICursorOption> = {
    ...defaultCursorOption,
    ...options.cursor
  }
  const titleOptions: Required<ITitleOption> = {
    ...defaultTitleOption,
    ...options.title
  }
  const placeholderOptions: Required<IPlaceholder> = {
    ...defaultPlaceholderOption,
    ...options.placeholder
  }
  const groupOptions: Required<IGroup> = {
    ...defaultGroupOption,
    ...options.group
  }
  const pageBreakOptions: Required<IPageBreak> = {
    ...defaultPageBreakOption,
    ...options.pageBreak
  }
  const zoneOptions: Required<IZoneOption> = {
    ...defaultZoneOption,
    ...options.zone
  }
  const backgroundOptions: Required<IBackgroundOption> = {
    ...defaultBackground,
    ...options.background
  }
  const lineBreakOptions: Required<ILineBreakOption> = {
    ...defaultLineBreak,
    ...options.lineBreak
  }
  const separatorOptions: Required<ISeparatorOption> = {
    ...defaultSeparatorOption,
    ...options.separator
  }
  const lineNumberOptions: Required<ILineNumberOption> = {
    ...defaultLineNumberOption,
    ...options.lineNumber
  }
  const pageBorderOptions: Required<IPageBorderOption> = {
    ...defaultPageBorderOption,
    ...options.pageBorder
  }
  const badgeOptions: Required<IBadgeOption> = {
    ...defaultBadgeOption,
    ...options.badge
  }
  const modeRuleOption: DeepRequired<IModeRule> = {
    print: {
      ...defaultModeRuleOption.print,
      ...options.modeRule?.print
    },
    readonly: {
      ...defaultModeRuleOption.readonly,
      ...options.modeRule?.readonly
    },
    form: {
      ...defaultModeRuleOption.form,
      ...options.modeRule?.form
    }
  }
  const floatingBarOptions: Required<IFloatingBarOption> = {
    enabled: true,
    ...options.floatingBar
  }

  return {
    mode: EditorMode.EDIT,
    locale: 'zhCN',
    defaultType: 'TEXT',
    defaultColor: '#000000',
    defaultFont: 'SimSun, serif',
    defaultSize: 14,
    minSize: 5,
    maxSize: 72,
    defaultRowMargin: 1,
    defaultLineHeight: 1,
    defaultBasicRowMarginHeight: 8,
    defaultTabWidth: 32,
    width: 794,
    height: 1123,
    scale: 1,
    pageGap: 20,
    underlineColor: '#000000',
    strikeoutColor: '#FF0000',
    rangeAlpha: 0.6,
    rangeColor: '#AECBFA',
    rangeMinWidth: 5,
    searchMatchAlpha: 0.6,
    searchMatchColor: '#FFFF00',
    searchNavigateMatchColor: '#AAD280',
    highlightAlpha: 0.6,
    highlightMarginHeight: 8,
    resizerColor: '#4182D9',
    resizerSize: 5,
    marginIndicatorSize: 35,
    marginIndicatorColor: '#BABABA',
    marginIndicatorDisabled: false,
    margins: [96, 120, 96, 120],
    pageMode: PageMode.PAGING,
    renderMode: RenderMode.SPEED,
    defaultHyperlinkColor: '#0000FF',
    paperDirection: PaperDirection.VERTICAL,
    inactiveAlpha: 0.6,
    historyMaxRecordCount: 100,
    wordBreak: WordBreak.BREAK_WORD,
    printPixelRatio: 3,
    maskMargin: [0, 0, 0, 0],
    letterClass: [LETTER_CLASS.ENGLISH],
    shortcutDisableKeys: [],
    scrollContainerSelector: '',
    pageOuterSelectionDisable: false,
    ...options,
    table: tableOptions,
    header: headerOptions,
    footer: footerOptions,
    pageNumber: pageNumberOptions,
    watermark: waterMarkOptions,
    control: controlOptions,
    checkbox: checkboxOptions,
    radio: radioOptions,
    cursor: cursorOptions,
    title: titleOptions,
    placeholder: placeholderOptions,
    group: groupOptions,
    pageBreak: pageBreakOptions,
    zone: zoneOptions,
    background: backgroundOptions,
    lineBreak: lineBreakOptions,
    separator: separatorOptions,
    lineNumber: lineNumberOptions,
    pageBorder: pageBorderOptions,
    badge: badgeOptions,
    modeRule: modeRuleOption,
    floatingBar: floatingBarOptions,
    trackChanges: options.trackChanges ?? false,
    revisionInsertColor: options.revisionInsertColor ?? '#1a73e8',
    revisionDeleteColor: options.revisionDeleteColor ?? '#f56c6c',
    annotationColor: options.annotationColor ?? '#409eff',
    revisionColor: options.revisionColor ?? '#e60000',
    revisionDisplayMode: options.revisionDisplayMode ?? 'all',
    showCommentBalloons: options.showCommentBalloons ?? true,
    showRevisionBalloons: options.showRevisionBalloons ?? true
  }
}
