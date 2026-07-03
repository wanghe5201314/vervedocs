// 枚举
export { AreaMode } from './enum/Area'
export { BackgroundRepeat, BackgroundSize } from './enum/Background'
export { BlockType } from './enum/Block'
export {
  MaxHeightRatio,
  NumberType,
  ImageDisplay,
  LocationPosition,
  FlexDirection
} from './enum/Common'
export {
  ControlType,
  ControlComponent,
  ControlIndentation,
  ControlState
} from './enum/Control'
export {
  EditorComponent,
  EditorContext,
  EditorMode,
  EditorZone,
  PageMode,
  PaperDirection,
  WordBreak,
  RenderMode
} from './enum/Editor'
export { ElementType } from './enum/Element'
export { ElementStyleKey } from './enum/ElementStyle'
export { MouseEventButton } from './enum/Event'
export { KeyMap } from './enum/KeyMap'
export { LineNumberType } from './enum/LineNumber'
export { ListType, UlStyle, OlStyle, ListStyle } from './enum/List'
export { MoveDirection } from './enum/Observer'
export { RowFlex } from './enum/Row'
export { TextDecorationStyle, DashType } from './enum/Text'
export { TitleLevel } from './enum/Title'
export { VerticalAlign } from './enum/VerticalAlign'
export { WatermarkType } from './enum/Watermark'
export { TableBorder, TdBorder, TdSlash } from './enum/table/Table'
export { TableOrder } from './enum/table/TableTool'
export { DOCX_EDITOR_DATA_VERSION, DOCX_EDITOR_SCHEMA_VERSION } from './constants/version'

// 接口
export type { IArea, IAreaInfo } from './interface/Area'
export type { IInsertAreaOption, ISetAreaPropertiesOption, IGetAreaValueOption, IGetAreaValueResult, ILocationAreaOption } from './interface/Area'
export type { IBackgroundOption } from './interface/Background'
export type { IBadge, IBadgeOption, IAreaBadge } from './interface/Badge'
export type {
  IIFrameBlock,
  IVideoBlock,
  IAudioBlock,
  IChartBlock,
  IBlock
} from './interface/Block'
export type { ICatalogItem, ICatalog } from './interface/Catalog'
export type {
  IChartRenderer,
  IChartTableData,
  IChartDataRange,
  IChartConfig
} from './interface/ChartRenderer'
export type { ICheckboxOption } from './interface/Checkbox'
export type { IRichtextOption } from './interface/Command'
export type { DeepRequired, DeepPartial, IPadding } from './interface/Common'
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
} from './interface/Control'
export type { ICursorOption } from './interface/Cursor'
export type { IEditorData, IFloatingBarOption, IEditorOption, IEditorResult, IEditorHTML, IEditorText, IUpdateOption, ISetValueOption, IFocusOption, IModeRule } from './interface/Editor'
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
} from './interface/Element'
export type { IPasteOption, ICopyOption, ITableInfoByEvent, IPositionContextByEventOption, IPositionContextByEventResult } from './interface/Event'
export type { ICommentCreate, ICommentDelete, IHyperlinkMenuClick, EventBusMap } from './interface/EventBus'
export type { IComment } from './interface/Comment'
export type { IFooter } from './interface/Footer'
export type { IGroup } from './interface/Group'
export type { IHeader } from './interface/Header'
export type { ILineBreakOption } from './interface/LineBreak'
export type { ILineNumberOption } from './interface/LineNumber'
export type { IMargin } from './interface/Margin'
export type { IPageBorderOption } from './interface/PageBorder'
export type { IPageBreak } from './interface/PageBreak'
export type { IPageNumber } from './interface/PageNumber'
export type { IPlaceholder } from './interface/Placeholder'
export type { PluginFunction, UsePlugin } from './interface/Plugin'
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
} from './interface/Position'
export type { IPreviewerCreateResult, IPreviewerDrawOption } from './interface/Previewer'
export type { IRadioOption } from './interface/Radio'
export type { ISearchResultBasic, ISearchResultRestArgs, ISearchResult, ISearchResultContext, IReplaceOption } from './interface/Search'
export type { ISeparatorOption, ISeparatorPayload, SeparatorType } from './interface/Separator'
export type { ITextMetrics, ITextDecoration } from './interface/Text'
export type { ITitleOption, ITitleSizeOption, IGetTitleValueOption, IGetTitleValueResult } from './interface/Title'
export type { IWatermark } from './interface/Watermark'
export type { IZoneOption } from './interface/Zone'
export type { IRowElement, IRow } from './interface/Row'
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
} from './interface/Draw'
export type { IRange, RangeRowArray, RangeRowMap, RangeRect, RangeContext, IRangeParagraphInfo, IRangeElementStyle } from './interface/Range'
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
} from './interface/Listener'
export type { ILang } from './interface/i18n/I18n'
export type { IRegisterShortcut } from './interface/shortcut/Shortcut'
export type { IColgroup } from './interface/table/Colgroup'
export type { ITableOption } from './interface/table/Table'
export type { ITd } from './interface/table/Td'
export type { ITr } from './interface/table/Tr'

// 常量
export { EDITOR_COMPONENT, EDITOR_PREFIX, EDITOR_CLIPBOARD, defaultModeRuleOption } from './constants/Editor'
export { ZERO, WRAP, HORIZON_TAB, NBSP, NON_BREAKING_SPACE, LETTER_CLASS, PUNCTUATION_LIST, maxHeightRadioMapping, METRICS_BASIS_TEXT } from './constants/Common'
export { TEXTLIKE_ELEMENT_TYPE, IMAGE_ELEMENT_TYPE, BLOCK_ELEMENT_TYPE, VIRTUAL_ELEMENT_TYPE, INLINE_NODE_NAME, EDITOR_ELEMENT_STYLE_ATTR, EDITOR_ELEMENT_COPY_ATTR, EDITOR_ELEMENT_ZIP_ATTR, EDITOR_ROW_ATTR, TABLE_TD_ZIP_ATTR, TABLE_CONTEXT_ATTR, LIST_CONTEXT_ATTR, AREA_CONTEXT_ATTR, TITLE_CONTEXT_ATTR, CONTROL_CONTEXT_ATTR, CONTROL_STYLE_ATTR, EDITOR_ELEMENT_CONTEXT_ATTR } from './constants/Element'
export { CURSOR_AGENT_OFFSET_HEIGHT } from './constants/Cursor'
export { INTERNAL_SHORTCUT_KEY } from './constants/Shortcut'
export { PAGE_NUMBER_STYLES, FORMAT_PLACEHOLDER } from './constants/PageNumber'
export { EDITOR_FONT_OPTIONS } from './constants/Font'
export { EDITOR_SIZE_OPTIONS } from './constants/Size'
export { NUMBER_LIKE_REG, PUNCTUATION_REG, UNICODE_SYMBOL_REG, START_LINE_BREAK_REG } from './constants/Regular'
export { defaultWatermarkOption } from './constants/Watermark'
export { titleSizeMapping, titleOrderNumberMapping, titleNodeNameMapping, defaultTitleOption } from './constants/Title'
export { ulStyleMapping, listStyleCSSMapping, listTypeElementMapping } from './constants/List'
export { defaultPlaceholderOption } from './constants/Placeholder'
export { defaultBackground } from './constants/Background'
export { defaultBadgeOption } from './constants/Badge'
export { defaultCheckboxOption } from './constants/Checkbox'
export { defaultControlOption } from './constants/Control'
export { defaultCursorOption } from './constants/Cursor'
export { defaultFooterOption } from './constants/Footer'
export { defaultGroupOption } from './constants/Group'
export { defaultHeaderOption } from './constants/Header'
export { defaultLineBreak } from './constants/LineBreak'
export { defaultPageBorderOption } from './constants/PageBorder'
export { defaultPageBreakOption } from './constants/PageBreak'
export { defaultPageNumberOption } from './constants/PageNumber'
export { defaultRadioOption } from './constants/Radio'
export { defaultSeparatorOption } from './constants/Separator'
export { defaultTableOption } from './constants/Table'
export { defaultLineNumberOption } from './constants/LineNumber'
export { defaultZoneOption } from './constants/Zone'

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
