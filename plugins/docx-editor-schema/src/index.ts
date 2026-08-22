// 枚举
export { AreaMode } from './enum/area'
export { BackgroundRepeat, BackgroundSize } from './enum/background'
export { BlockType } from './enum/block'
export {
  MaxHeightRatio,
  NumberType,
  ImageDisplay,
  LocationPosition,
  FlexDirection
} from './enum/common'
export {
  ControlType,
  ControlComponent,
  ControlIndentation,
  ControlState
} from './enum/control'
export {
  EditorComponent,
  EditorContext,
  EditorMode,
  EditorZone,
  PageMode,
  PaperDirection,
  WordBreak,
  RenderMode
} from './enum/editor'
export { ElementType } from './enum/element'
export { ElementStyleKey } from './enum/element-style'
export { MouseEventButton } from './enum/event'
export { KeyMap } from './enum/key-map'
export { LineNumberType } from './enum/line-number'
export { ListType, UlStyle, OlStyle, ListStyle } from './enum/list'
export { MoveDirection } from './enum/observer'
export { RowFlex } from './enum/row'
export { TextDecorationStyle, DashType } from './enum/text'
export { TitleLevel } from './enum/title'
export { VerticalAlign } from './enum/vertical-align'
export { WatermarkType } from './enum/watermark'
export { TableBorder, TdBorder, TdSlash } from './enum/table/table'
export { TableOrder } from './enum/table/table-tool'
export { DOCX_EDITOR_DATA_VERSION, DOCX_EDITOR_SCHEMA_VERSION } from './constants/version'

// 接口
export type { IArea, IAreaInfo } from './interface/area'
export type { IInsertAreaOption, ISetAreaPropertiesOption, IGetAreaValueOption, IGetAreaValueResult, ILocationAreaOption } from './interface/area'
export type { IBackgroundOption } from './interface/background'
export type { IBadge, IBadgeOption, IAreaBadge } from './interface/badge'
export type {
  IIFrameBlock,
  IVideoBlock,
  IAudioBlock,
  IChartBlock,
  IBlock
} from './interface/block'
export type { ICatalogItem, ICatalog } from './interface/catalog'
export type {
  IChartRenderer,
  IChartTableData,
  IChartDataRange,
  IChartConfig
} from './interface/chart-renderer'
export type { ICheckboxOption } from './interface/checkbox'
export type { IRichtextOption } from './interface/command'
export type { DeepRequired, DeepPartial, IPadding } from './interface/common'
export type {
  IControl,
  IControlOption,
  IControlStyle,
  IControlSelect,
  IControlContext,
  IControlHighlight,
  IControlHighlightRule,
  IControlInitOption,
  IControlInstance,
  IControlRuleOption,
  IControlChangeOption,
  INextControlContext,
  IInitNextControlOption,
  ISetControlRowFlexOption,
  IControlChangeResult,
  IControlContentChangeResult,
  IDestroyControlOption,
  IRepaintControlOption,
  IGetControlValueOption,
  IGetControlValueResult,
  ISetControlValueOption,
  ISetControlExtensionOption,
  ISetControlHighlightOption,
  ISetControlProperties,
  IRemoveControlOption,
  ILocationControlOption
} from './interface/control'
export type { ICursorOption } from './interface/cursor'
export type { IEditorData, IFloatingBarOption, IEditorOption, IEditorResult, IEditorHTML, IEditorText, IUpdateOption, ISetValueOption, IFocusOption, IModeRule } from './interface/editor'
export type {
  IElementBasic,
  IElementStyle,
  IElementGroup,
  ITitleElement,
  IListElement,
  ITableAttr,
  ITableRule,
  ITableElement,
  ITable,
  IHyperlinkElement,
  ISuperscriptSubscript,
  ISeparator,
  IControlElement,
  ICheckboxElement,
  IRadioElement,
  ILaTexElement,
  IDateElement,
  IImageRule,
  IImageBasic,
  IImageElement,
  IBlockElement,
  IAreaElement,
  IFootnoteElement,
  IColumnElement,
  IRevisionElement,
  IElement,
  IElementMetrics,
  IElementPosition,
  IElementFillRect,
  IUpdateElementByIdOption,
  IDeleteElementByIdOption,
  IGetElementByIdOption,
  IInsertElementListOption,
  ISpliceElementListOption
} from './interface/element'
export type { IPasteOption, ICopyOption, ITableInfoByEvent, IPositionContextByEventOption, IPositionContextByEventResult } from './interface/event'
export type { ICommentCreate, ICommentDelete, IHyperlinkMenuClick, EventBusMap } from './interface/event-bus'
export type { IComment } from './interface/comment'
export type { IFooter } from './interface/footer'
export type { IGroup } from './interface/group'
export type { IHeader } from './interface/header'
export type { ILineBreakOption } from './interface/line-break'
export type { ILineNumberOption } from './interface/line-number'
export type { IMargin } from './interface/margin'
export type { IPageBorderOption } from './interface/page-border'
export type { IPageBreak } from './interface/page-break'
export type { IPageNumber } from './interface/page-number'
export type { IPlaceholder } from './interface/placeholder'
export type { PluginFunction, UsePlugin } from './interface/plugin'
export type {
  ICurrentPosition,
  IGetPositionByXYPayload,
  IGetFloatPositionByXYPayload,
  IPositionContext,
  IComputeRowPositionPayload,
  IComputePageRowPositionPayload,
  IComputePageRowPositionResult,
  IFloatPosition,
  ILocationPosition,
  ISetSurroundPositionPayload
} from './interface/position'
export type { IPreviewerCreateResult, IPreviewerDrawOption } from './interface/previewer'
export type { IRadioOption } from './interface/radio'
export type { ISearchResultBasic, ISearchResultRestArgs, ISearchResult, ISearchResultContext, IReplaceOption } from './interface/search'
export type { ISeparatorOption, ISeparatorPayload, SeparatorType } from './interface/separator'
export type { ITextMetrics, ITextDecoration } from './interface/text'
export type { ITitleOption, ITitleSizeOption, IGetTitleValueOption, IGetTitleValueResult } from './interface/title'
export type { IWatermark } from './interface/watermark'
export type { IZoneOption } from './interface/zone'
export type { IRowElement, IRow } from './interface/row'
export type {
  IDrawOption,
  IForceUpdateOption,
  IDrawImagePayload,
  IDrawFloatPayload,
  IDrawPagePayload,
  IDrawRowPayload,
  IComputeRowListPayload,
  IPainterOption,
  IGetValueOption,
  IGetOriginValueOption,
  IAppendElementListOption,
  IGetImageOption
} from './interface/draw'
export type { IRange, RangeRowArray, RangeRowMap, RangeRect, RangeContext, IRangeParagraphInfo, IRangeElementStyle } from './interface/range'
export type {
  IRangeStyle,
  IRangeStyleChange,
  IVisiblePageNoListChange,
  IIntersectionPageNoChange,
  IPageSizeChange,
  IPageScaleChange,
  ISaved,
  IContentChange,
  IControlChange,
  IControlContentChange,
  IPageModeChange,
  IZoneChange,
  IMouseEventChange,
  IInputEventChange,
  IPositionContextChangePayload,
  IPositionContextChange,
  IImageSizeChange,
  IImageMousedown,
  ICatalogChange
} from './interface/listener'
export type { ILang } from './interface/i18n/i18n'
export type { IRegisterShortcut } from './interface/shortcut/shortcut'
export type { IColgroup } from './interface/table/colgroup'
export type { ITableOption } from './interface/table/table'
export type { ITd } from './interface/table/td'
export type { ITr } from './interface/table/tr'

// 常量
export { EDITOR_COMPONENT, EDITOR_PREFIX, EDITOR_CLIPBOARD, defaultModeRuleOption } from './constants/editor'
export { ZERO, WRAP, HORIZON_TAB, NBSP, NON_BREAKING_SPACE, LETTER_CLASS, PUNCTUATION_LIST, maxHeightRadioMapping, METRICS_BASIS_TEXT } from './constants/common'
export { TEXTLIKE_ELEMENT_TYPE, IMAGE_ELEMENT_TYPE, BLOCK_ELEMENT_TYPE, VIRTUAL_ELEMENT_TYPE, INLINE_NODE_NAME, EDITOR_ELEMENT_STYLE_ATTR, EDITOR_ELEMENT_COPY_ATTR, EDITOR_ELEMENT_ZIP_ATTR, EDITOR_ROW_ATTR, TABLE_TD_ZIP_ATTR, TABLE_CONTEXT_ATTR, LIST_CONTEXT_ATTR, AREA_CONTEXT_ATTR, TITLE_CONTEXT_ATTR, CONTROL_CONTEXT_ATTR, CONTROL_STYLE_ATTR, EDITOR_ELEMENT_CONTEXT_ATTR } from './constants/element'
export { CURSOR_AGENT_OFFSET_HEIGHT } from './constants/cursor'
export { INTERNAL_SHORTCUT_KEY } from './constants/shortcut'
export { PAGE_NUMBER_STYLES, FORMAT_PLACEHOLDER } from './constants/page-number'
export { EDITOR_FONT_OPTIONS } from './constants/font'
export { EDITOR_SIZE_OPTIONS } from './constants/size'
export { NUMBER_LIKE_REG, PUNCTUATION_REG, UNICODE_SYMBOL_REG, START_LINE_BREAK_REG } from './constants/regular'
export { defaultWatermarkOption } from './constants/watermark'
export { titleSizeMapping, titleOrderNumberMapping, titleNodeNameMapping, defaultTitleOption } from './constants/title'
export { ulStyleMapping, listStyleCSSMapping, listTypeElementMapping } from './constants/list'
export { defaultPlaceholderOption } from './constants/placeholder'
export { defaultBackground } from './constants/background'
export { defaultBadgeOption } from './constants/badge'
export { defaultCheckboxOption } from './constants/checkbox'
export { defaultControlOption } from './constants/control'
export { defaultCursorOption } from './constants/cursor'
export { defaultFooterOption } from './constants/footer'
export { defaultGroupOption } from './constants/group'
export { defaultHeaderOption } from './constants/header'
export { defaultLineBreak } from './constants/line-break'
export { defaultPageBorderOption } from './constants/page-border'
export { defaultPageBreakOption } from './constants/page-break'
export { defaultPageNumberOption } from './constants/page-number'
export { defaultRadioOption } from './constants/radio'
export { defaultSeparatorOption } from './constants/separator'
export { defaultTableOption } from './constants/table'
export { defaultLineNumberOption } from './constants/line-number'
export { defaultZoneOption } from './constants/zone'

// 工具函数
export {
  deepClone,
  deepCloneOmitKeys,
  getUUID,
  splitText,
  downloadFile,
  isArrayEqual,
  isObjectEqual,
  isObject,
  isArray,
  isNumber,
  isString,
  mergeObject,
  nextTick,
  cloneProperty,
  pickObject,
  omitObject,
  debounce,
  throttle,
  convertNumberToChinese,
  convertStringToBase64,
  findScrollContainer,
  isRectIntersect,
  isNonValue,
  normalizeLineBreak,
  isElement,
  isElementList,
  findParent,
  isApple,
  isMobile,
  isIOS,
  isMod,
  writeElementList,
  handleTripleClick
} from './utils/index'
export {
  buildCatalogFromElementList,
  formatElementList,
  createDomFromElementList,
  getOrCreateTitleId,
  getElementListByHTML,
  getTextFromElementList,
  getAnchorElement,
  isParagraphSeparator,
  formatElementContext,
  isTextLikeElement,
  pickElementAttr,
  zipElementList,
  isTableElement,
  isFirstElementOfParagraph,
  getSlimCloneElementList,
  getIsBlockElement,
  pickSurroundElementList,
  deleteSurroundElementList,
  isImageElement,
  getNonHideElementIndex
} from './utils/element'
export type { IGetElementListByHTMLOption } from './utils/element'
export { mergeOption } from './utils/option'
