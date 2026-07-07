import { defaultBackground } from '../constants/Background'
import { defaultCheckboxOption } from '../constants/Checkbox'
import { LETTER_CLASS } from '../constants/Common'
import { defaultControlOption } from '../constants/Control'
import { defaultCursorOption } from '../constants/Cursor'
import { defaultFooterOption } from '../constants/Footer'
import { defaultGroupOption } from '../constants/Group'
import { defaultHeaderOption } from '../constants/Header'
import { defaultLineBreak } from '../constants/LineBreak'
import { defaultPageBreakOption } from '../constants/PageBreak'
import { defaultPageNumberOption } from '../constants/PageNumber'
import { defaultPlaceholderOption } from '../constants/Placeholder'
import { defaultRadioOption } from '../constants/Radio'
import { defaultSeparatorOption } from '../constants/Separator'
import { defaultTableOption } from '../constants/Table'
import { defaultTitleOption } from '../constants/Title'
import { defaultWatermarkOption } from '../constants/Watermark'
import { defaultZoneOption } from '../constants/Zone'
import { defaultLineNumberOption } from '../constants/LineNumber'
import { IBackgroundOption } from '../interface/Background'
import { ICheckboxOption } from '../interface/Checkbox'
import { DeepRequired } from '../interface/Common'
import { IControlOption } from '../interface/Control'
import { ICursorOption } from '../interface/Cursor'
import { IEditorOption, IFloatingBarOption, IModeRule } from '../interface/Editor'
import { IFooter } from '../interface/Footer'
import { IGroup } from '../interface/Group'
import { IHeader } from '../interface/Header'
import { ILineBreakOption } from '../interface/LineBreak'
import { IPageBreak } from '../interface/PageBreak'
import { IPageNumber } from '../interface/PageNumber'
import { IPlaceholder } from '../interface/Placeholder'
import { IRadioOption } from '../interface/Radio'
import { ISeparatorOption } from '../interface/Separator'
import { ITableOption } from '../interface/table/Table'
import { ITitleOption } from '../interface/Title'
import { IWatermark } from '../interface/Watermark'
import { IZoneOption } from '../interface/Zone'
import { ILineNumberOption } from '../interface/LineNumber'
import { IPageBorderOption } from '../interface/PageBorder'
import { defaultPageBorderOption } from '../constants/PageBorder'
import {
  EditorMode,
  PageMode,
  PaperDirection,
  RenderMode,
  WordBreak
} from '../enum/Editor'
import { defaultBadgeOption } from '../constants/Badge'
import { IBadgeOption } from '../interface/Badge'
import { defaultModeRuleOption } from '../constants/Editor'

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
