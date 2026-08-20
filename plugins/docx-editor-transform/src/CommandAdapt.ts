import { IDrawContext } from './IDrawContext'
import {
  BaseAdapter,
  TextStyleAdapter,
  ParagraphAdapter,
  TableAdapter,
  PageAdapter,
  HyperlinkAdapter,
  BookmarkAdapter,
  MediaAdapter,
  SearchAdapter,
  ElementAdapter,
  ControlAdapter,
  StructureAdapter,
  ValueAdapter
} from './adapters'
import type { IAdapterContext } from './adapters'

export class CommandAdapt {
  private _base: BaseAdapter
  private _textStyle: TextStyleAdapter
  private _paragraph: ParagraphAdapter
  private _table: TableAdapter
  private _page: PageAdapter
  private _hyperlink: HyperlinkAdapter
  private _bookmark: BookmarkAdapter
  private _media: MediaAdapter
  private _search: SearchAdapter
  private _element: ElementAdapter
  private _control: ControlAdapter
  public _structure: StructureAdapter
  private _value: ValueAdapter

  constructor(draw: IDrawContext, externalFns?: { pasteByApi?: any; printImageBase64?: any }) {
    const ctx: IAdapterContext = {
      draw,
      range: draw.getRange(),
      position: draw.getPosition(),
      historyManager: draw.getHistoryManager(),
      canvasEvent: draw.getCanvasEvent(),
      options: draw.getOptions(),
      control: draw.getControl(),
      workerManager: draw.getWorkerManager(),
      searchManager: draw.getSearch(),
      i18n: draw.getI18n(),
      zone: draw.getZone(),
      tableOperate: draw.getTableOperate(),
      pasteByApi: externalFns?.pasteByApi,
      printImageBase64: externalFns?.printImageBase64
    }

    this._base = new BaseAdapter(ctx)
    this._textStyle = new TextStyleAdapter(ctx)
    this._paragraph = new ParagraphAdapter(ctx)
    this._table = new TableAdapter(ctx)
    this._page = new PageAdapter(ctx)
    this._hyperlink = new HyperlinkAdapter(ctx)
    this._bookmark = new BookmarkAdapter(ctx)
    this._media = new MediaAdapter(ctx)
    this._search = new SearchAdapter(ctx)
    this._element = new ElementAdapter(ctx)
    this._control = new ControlAdapter(ctx)
    this._structure = new StructureAdapter(ctx)
    this._value = new ValueAdapter(ctx)
  }

  // ---- BaseAdapter ----
  public mode = (...a: any[]) => this._base.mode(...a as [any])
  public cut = () => this._base.cut()
  public copy = (...a: any[]) => this._base.copy(...a as [any])
  public paste = (...a: any[]) => this._base.paste(...a as [any])
  public selectAll = () => this._base.selectAll()
  public backspace = () => this._base.backspace()
  public setRange = (...a: any[]) => this._base.setRange(...a as [any, any, any?, any?, any?, any?, any?])
  public replaceRange = (...a: any[]) => this._base.replaceRange(...a as [any])
  public setPositionContext = (...a: any[]) => this._base.setPositionContext(...a as [any])
  public forceUpdate = (...a: any[]) => this._base.forceUpdate(...a as [any])
  public blur = () => this._base.blur()
  public undo = () => this._base.undo()
  public redo = () => this._base.redo()
  public save = () => this._base.save()
  public painter = (...a: any[]) => this._base.painter(...a as [any])
  public applyPainterStyle = () => this._base.applyPainterStyle()
  public format = (...a: any[]) => this._base.format(...a as [any])
  public focus = (...a: any[]) => this._base.focus(...a as [any])
  public locationCatalog = (...a: any[]) => this._base.locationCatalog(...a as [any])
  public wordTool = () => this._base.wordTool()

  // ---- TextStyleAdapter ----
  public font = (...a: any[]) => this._textStyle.font(...a as [any, any?])
  public size = (...a: any[]) => this._textStyle.size(...a as [any, any?])
  public characterScale = (...a: any[]) => this._textStyle.characterScale(...a as [any, any?])
  public sizeAdd = (...a: any[]) => this._textStyle.sizeAdd(...a as [any])
  public sizeMinus = (...a: any[]) => this._textStyle.sizeMinus(...a as [any])
  public bold = (...a: any[]) => this._textStyle.bold(...a as [any])
  public italic = (...a: any[]) => this._textStyle.italic(...a as [any])
  public underline = (...a: any[]) => this._textStyle.underline(...a as [any, any?])
  public strikeout = (...a: any[]) => this._textStyle.strikeout(...a as [any])
  public superscript = (...a: any[]) => this._textStyle.superscript(...a as [any])
  public subscript = (...a: any[]) => this._textStyle.subscript(...a as [any])
  public color = (...a: any[]) => this._textStyle.color(...a as [any, any?])
  public highlight = (...a: any[]) => this._textStyle.highlight(...a as [any, any?])
  public paragraphColor = (...a: any[]) => this._textStyle.paragraphColor(...a as [any])

  // ---- ParagraphAdapter ----
  public title = (...a: any[]) => this._paragraph.title(...a as [any])
  public list = (...a: any[]) => this._paragraph.list(...a as [any, any?])
  public rowFlex = (...a: any[]) => this._paragraph.rowFlex(...a as [any])
  public rowMargin = (...a: any[]) => this._paragraph.rowMargin(...a as [any])
  public lineHeight = (...a: any[]) => this._paragraph.lineHeight(...a as [any])
  public paragraphFirstLineIndent = (...a: any[]) => this._paragraph.paragraphFirstLineIndent(...a as [any])
  public indentStep = (...a: any[]) => this._paragraph.indentStep(...a as [any])
  public getFirstLineIndentPx = () => this._paragraph.getFirstLineIndentPx()
  public getFirstLineIndent = () => this._paragraph.getFirstLineIndent()

  // ---- TableAdapter ----
  public insertTable = (...a: any[]) => this._table.insertTable(...a as [any, any])
  public insertTableTopRow = () => this._table.insertTableTopRow()
  public insertTableBottomRow = () => this._table.insertTableBottomRow()
  public insertTableLeftCol = () => this._table.insertTableLeftCol()
  public insertTableRightCol = () => this._table.insertTableRightCol()
  public deleteTableRow = () => this._table.deleteTableRow()
  public deleteTableCol = () => this._table.deleteTableCol()
  public deleteTable = () => this._table.deleteTable()
  public mergeTableCell = () => this._table.mergeTableCell()
  public cancelMergeTableCell = () => this._table.cancelMergeTableCell()
  public splitVerticalTableCell = () => this._table.splitVerticalTableCell()
  public splitHorizontalTableCell = () => this._table.splitHorizontalTableCell()
  public tableTdVerticalAlign = (...a: any[]) => this._table.tableTdVerticalAlign(...a as [any])
  public tableBorderType = (...a: any[]) => this._table.tableBorderType(...a as [any])
  public tableBorderColor = (...a: any[]) => this._table.tableBorderColor(...a as [any])
  public tableBorderWidth = (...a: any[]) => this._table.tableBorderWidth(...a as [any])
  public tableBorderExternalWidth = (...a: any[]) => this._table.tableBorderExternalWidth(...a as [any])
  public tableTdBorderType = (...a: any[]) => this._table.tableTdBorderType(...a as [any])
  public tableTdSlashType = (...a: any[]) => this._table.tableTdSlashType(...a as [any])
  public tableTdBackgroundColor = (...a: any[]) => this._table.tableTdBackgroundColor(...a as [any])
  public tableSelectAll = () => this._table.tableSelectAll()

  // ---- PageAdapter ----
  public pageMode = (...a: any[]) => this._page.pageMode(...a as [any])
  public pageScale = (...a: any[]) => this._page.pageScale(...a as [any])
  public pageScaleRecovery = () => this._page.pageScaleRecovery()
  public pageScaleMinus = () => this._page.pageScaleMinus()
  public pageScaleAdd = () => this._page.pageScaleAdd()
  public paperSize = (...a: any[]) => this._page.paperSize(...a as [any, any])
  public paperDirection = (...a: any[]) => this._page.paperDirection(...a as [any])
  public getPaperMargin = () => this._page.getPaperMargin()
  public setPaperMargin = (...a: any[]) => this._page.setPaperMargin(...a as [any])

  // ---- HyperlinkAdapter ----
  public hyperlink = (...a: any[]) => this._hyperlink.hyperlink(...a as [any])
  public deleteHyperlink = () => this._hyperlink.deleteHyperlink()
  public cancelHyperlink = () => this._hyperlink.cancelHyperlink()
  public editHyperlink = (...a: any[]) => this._hyperlink.editHyperlink(...a as [any])

  // ---- BookmarkAdapter ----
  public addBookmark = (...a: any[]) => this._bookmark.addBookmark(...a as [any])
  public deleteBookmark = (...a: any[]) => this._bookmark.deleteBookmark(...a as [any])
  public gotoBookmark = (...a: any[]) => this._bookmark.gotoBookmark(...a as [any])
  public getBookmarks = () => this._bookmark.getBookmarks()

  // ---- MediaAdapter ----
  public image = (...a: any[]) => this._media.image(...a as [any])
  public insertAudio = (...a: any[]) => this._media.insertAudio(...a as [any, any?])
  public insertVideo = (...a: any[]) => this._media.insertVideo(...a as [any, any?])
  public insertChart = (...a: any[]) => this._media.insertChart(...a as [any])
  public updateChart = (...a: any[]) => this._media.updateChart(...a as [any, any])
  public replaceImageElement = (...a: any[]) => this._media.replaceImageElement(...a as [any])
  public saveAsImageElement = () => this._media.saveAsImageElement()
  public changeImageDisplay = (...a: any[]) => this._media.changeImageDisplay(...a as [any, any])

  // ---- SearchAdapter ----
  public search = (...a: any[]) => this._search.search(...a as [any])
  public getSearchKeyword = () => this._search.getSearchKeyword()
  public searchNavigatePre = () => this._search.searchNavigatePre()
  public searchNavigateNext = () => this._search.searchNavigateNext()
  public getSearchNavigateInfo = () => this._search.getSearchNavigateInfo()
  public replace = (...a: any[]) => this._search.replace(...a as [any, any?])
  public getKeywordRangeList = (...a: any[]) => this._search.getKeywordRangeList(...a as [any])
  public getKeywordContext = (...a: any[]) => this._search.getKeywordContext(...a as [any])

  // ---- ElementAdapter ----
  public insertElementList = (...a: any[]) => this._element.insertElementList(...a as [any, any?])
  public appendElementList = (...a: any[]) => this._element.appendElementList(...a as [any, any?])
  public updateElementById = (...a: any[]) => this._element.updateElementById(...a as [any])
  public deleteElementById = (...a: any[]) => this._element.deleteElementById(...a as [any])
  public getElementById = (...a: any[]) => this._element.getElementById(...a as [any])
  public setValue = (...a: any[]) => this._element.setValue(...a as [any, any?])
  public setHTML = (...a: any[]) => this._element.setHTML(...a as [any])
  public insertControl = (...a: any[]) => this._element.insertControl(...a as [any])
  public insertTitle = (...a: any[]) => this._element.insertTitle(...a as [any])

  // ---- ControlAdapter ----
  public setControlValue = (...a: any[]) => this._control.setControlValue(...a as [any])
  public setControlValueList = (...a: any[]) => this._control.setControlValueList(...a as [any])
  public setControlExtension = (...a: any[]) => this._control.setControlExtension(...a as [any])
  public setControlExtensionList = (...a: any[]) => this._control.setControlExtensionList(...a as [any])
  public setControlProperties = (...a: any[]) => this._control.setControlProperties(...a as [any])
  public setControlPropertiesList = (...a: any[]) => this._control.setControlPropertiesList(...a as [any])
  public setControlHighlight = (...a: any[]) => this._control.setControlHighlight(...a as [any])
  public getControlValue = (...a: any[]) => this._control.getControlValue(...a as [any])
  public getControlList = () => this._control.getControlList()
  public removeControl = (...a: any[]) => this._control.removeControl(...a as [any])
  public locationControl = (...a: any[]) => this._control.locationControl(...a as [any, any?])

  // ---- StructureAdapter ----
  public setGroup = () => this._structure.setGroup()
  public deleteGroup = (...a: any[]) => this._structure.deleteGroup(...a as [any])
  public locationGroup = (...a: any[]) => this._structure.locationGroup(...a as [any])
  public insertArea = (...a: any[]) => this._structure.insertArea(...a as [any])
  public setAreaProperties = (...a: any[]) => this._structure.setAreaProperties(...a as [any])
  public locationArea = (...a: any[]) => this._structure.locationArea(...a as [any, any?])
  public insertColumn = (...a: any[]) => this._structure.insertColumn(...a as [any, any?, any?])
  public removeColumn = () => this._structure.removeColumn()
  public columnBreak = () => this._structure.columnBreak()
  public addWatermark = (...a: any[]) => this._structure.addWatermark(...a as [any])
  public deleteWatermark = () => this._structure.deleteWatermark()
  public setMainBadge = (...a: any[]) => this._structure.setMainBadge(...a as [any])
  public setAreaBadge = (...a: any[]) => this._structure.setAreaBadge(...a as [any])
  public setZone = (...a: any[]) => this._structure.setZone(...a as [any])
  public separator = (...a: any[]) => this._structure.separator(...a as [any])
  public pageBreak = () => this._structure.pageBreak()
  public insertFootnote = (...a: any[]) => this._structure.insertFootnote(...a as [any?])
  public deleteFootnote = (...a: any[]) => this._structure.deleteFootnote(...a as [any?])
  public getFootnotes = () => this._structure.getFootnotes()
  public print = () => this._structure.print()
  public translate = (...a: any[]) => this._structure.translate(...a as [any])
  public setLocale = (...a: any[]) => this._structure.setLocale(...a as [any])
  public updateOptions = (...a: any[]) => this._structure.updateOptions(...a as [any])
  public tocInsert = (...a: any[]) => this._structure.tocInsert(...a as [any])
  public tocRemove = () => this._structure.tocRemove()
  public insertShape = (...a: any[]) => this._structure.insertShape(...a as [any])
  public qrcode = (...a: any[]) => this._structure.qrcode(...a as [any])
  public barcode = (...a: any[]) => this._structure.barcode(...a as [any])
  public exportDocx = (...a: any[]) => this._structure.exportDocx(...a as [any])
  public previewHtml = (...a: any[]) => this._structure.previewHtml(...a as [any])

  // ---- Revision Commands ----
  public acceptRevision = (...a: any[]) => this._element.acceptRevision(...a as [any?])
  public rejectRevision = (...a: any[]) => this._element.rejectRevision(...a as [any?])
  public acceptAllRevisions = () => this._element.acceptAllRevisions()
  public rejectAllRevisions = () => this._element.rejectAllRevisions()
  public getRevisions = () => this._value.getRevisions()
  public initRevisionOverlay = (...a: any[]) => this._value.initRevisionOverlay(...a as [any?])
  public destroyRevisionOverlay = () => this._value.destroyRevisionOverlay()

  // ---- ValueAdapter ----
  public getPaperWidth = () => this._value.getPaperWidth()
  public getPaperHeight = () => this._value.getPaperHeight()
  public getImage = (...a: any[]) => this._value.getImage(...a as [any?])
  public getOptions = () => this._value.getOptions()
  public getValue = (...a: any[]) => this._value.getValue(...a as [any?])
  public getValueAsync = (...a: any[]) => this._value.getValueAsync(...a as [any?])
  public getAreaValue = (...a: any[]) => this._value.getAreaValue(...a as [any?])
  public getHTML = () => this._value.getHTML()
  public getText = () => this._value.getText()
  public getWordCount = () => this._value.getWordCount()
  public getIsReadonly = () => this._value.getIsReadonly()
  public getIsDisabled = () => this._value.getIsDisabled()
  public getIsCanInput = () => this._value.canInput()
  public getIsEditable = () => this._value.getIsEditable()
  public getCursorPosition = () => this._value.getCursorPosition()
  public getRange = () => this._value.getRange()
  public getRangeText = () => this._value.getRangeText()
  public getRangeContext = () => this._value.getRangeContext()
  public getRangeRow = () => this._value.getRangeRow()
  public getRangeParagraph = () => this._value.getRangeParagraph()
  public getLocale = () => this._value.getLocale()
  public getGroupIds = () => this._value.getGroupIds()
  public getGroupContext = (...a: any[]) => this._value.getGroupContext(...a as [any])
  public getPositionList = () => this._value.getPositionList()
  public getEventBus = () => this._value.getEventBus()
  public getContainer = () => this._value.getContainer()
  public getRevisionOverlay = () => this._value.getRevisionOverlay()
  public setRevisionOverlay = (...a: any[]) => this._value.setRevisionOverlay(...a as [any])
  public setCommentOverlay = (...a: any[]) => this._value.setCommentOverlay(...a as [any])
  public getTitleValue = (...a: any[]) => this._value.getTitleValue(...a as [any])
  public getPositionContextByEvent = (...a: any[]) => this._value.getPositionContextByEvent(...a as [any, any?])
  public getCatalog = () => this._value.getCatalog()
  public getElementList = () => this._value.getElementList()
  public spliceElementList = (...a: any[]) => this._value.spliceElementList(...a as [any, any, any?, any?, any?])
  public getPageGap = () => this._value.getPageGap()
  public getDrawWidth = () => this._value.getDrawWidth()
  public getDrawHeight = () => this._value.getDrawHeight()
  public renderDraw = (...a: any[]) => this._value.renderDraw(...a as [any?])
}
