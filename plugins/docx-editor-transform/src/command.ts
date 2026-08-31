import type { ICatalogItem, ISearchResultItem } from '@vervedoc/docx-editor-schema'
import type { IBookmarkInfo } from './adapters/bookmark-adapter'
import { CommandAdapt } from './command-adapt'

type CommandFunction = (...args: any[]) => any

const DEFAULT_BOOKMARK_NAME = '书签'
const MAX_BOOKMARK_NAME_LENGTH = 12

const sanitizeBookmarkName = (text: string): string => {
  return text
    .replace(/\u200B/g, '')
    .replace(/\s+/g, '')
    .replace(/[^\w\u4e00-\u9fff]/g, '')
    .slice(0, MAX_BOOKMARK_NAME_LENGTH)
}

const ensureUniqueBookmarkName = (baseName: string, names: Set<string>): string => {
  const normalizedBase = baseName || DEFAULT_BOOKMARK_NAME
  if (!names.has(normalizedBase)) return normalizedBase
  let suffix = 1
  while (true) {
    const nextName = `${normalizedBase}${suffix}`
    if (!names.has(nextName)) return nextName
    suffix++
  }
}

export interface ICommandSearchApi {
  query(keyword: string | null): ISearchResultItem[]
  locate(result: ISearchResultItem | number | string): ISearchResultItem | null
  replaceOne(
    result: ISearchResultItem | null,
    replacement: string
  ): ISearchResultItem[]
  replaceAll(keyword: string, replacement: string): ISearchResultItem[]
  clear(): ISearchResultItem[]
}

export interface ICommandBookmarkState {
  list: IBookmarkInfo[]
  suggestedName: string
  selectionPreview: string
  hasSelectionRange: boolean
}

export interface ICommandBookmarkApi {
  getState(): ICommandBookmarkState
  add(name: string): void
  remove(name: string): void
  locate(name: string): void
}

export interface ICommandRevisionItem {
  id: string
  type: 'insert' | 'delete' | 'format'
  author: string
  date: string
  content: string
}

export interface ICommandRevisionState {
  list: ICommandRevisionItem[]
  activeId: string
}

export interface ICommandRevisionApi {
  getState(): ICommandRevisionState
  locate(id: string): void
  locatePrevious(): void
  locateNext(): void
  accept(id: string): void
  reject(id: string): void
  acceptCurrent(): void
  rejectCurrent(): void
  acceptAll(): void
  rejectAll(): void
}

export interface ICommandCatalogState {
  list: ICatalogItem[]
}

export interface ICommandCatalogApi {
  getState(): Promise<ICommandCatalogState>
  locate(id: string): void
}

export class Command {
  private _commandRegistry: Map<string, CommandFunction>
  private _activeRevisionId = ''

  public search: ICommandSearchApi
  public bookmark: ICommandBookmarkApi
  public revision: ICommandRevisionApi
  public catalog: ICommandCatalogApi

  public executeMode: CommandAdapt['mode']
  public executeCut: CommandAdapt['cut']
  public executeCopy: CommandAdapt['copy']
  public executePaste: CommandAdapt['paste']
  public executeSelectAll: CommandAdapt['selectAll']
  public executeBackspace: CommandAdapt['backspace']
  public executeSetRange: CommandAdapt['setRange']
  public executeReplaceRange: CommandAdapt['replaceRange']
  public executeSetPositionContext: CommandAdapt['setPositionContext']
  public executeForceUpdate: CommandAdapt['forceUpdate']
  public executeBlur: CommandAdapt['blur']
  public executeFocus: CommandAdapt['focus']
  public executeUndo: CommandAdapt['undo']
  public executeRedo: CommandAdapt['redo']
  public executeSave: CommandAdapt['save']
  public executePainter: CommandAdapt['painter']
  public executeApplyPainterStyle: CommandAdapt['applyPainterStyle']
  public executeFormat: CommandAdapt['format']
  public executeFont: CommandAdapt['font']
  public executeSize: CommandAdapt['size']
  public executeCharacterScale: CommandAdapt['characterScale']
  public executeSizeAdd: CommandAdapt['sizeAdd']
  public executeSizeMinus: CommandAdapt['sizeMinus']
  public executeBold: CommandAdapt['bold']
  public executeItalic: CommandAdapt['italic']
  public executeUnderline: CommandAdapt['underline']
  public executeStrikeout: CommandAdapt['strikeout']
  public executeSuperscript: CommandAdapt['superscript']
  public executeSubscript: CommandAdapt['subscript']
  public executeColor: CommandAdapt['color']
  public executeHighlight: CommandAdapt['highlight']
  public executeParagraphColor: CommandAdapt['paragraphColor']
  public executeTitle: CommandAdapt['title']
  public executeList: CommandAdapt['list']
  public executeRowFlex: CommandAdapt['rowFlex']
  public executeRowMargin: CommandAdapt['rowMargin']
  public executeLineHeight: CommandAdapt['lineHeight']
  public executeParagraphFirstLineIndent: CommandAdapt['paragraphFirstLineIndent']
  public executeInsertTable: CommandAdapt['insertTable']
  public executeInsertTableTopRow: CommandAdapt['insertTableTopRow']
  public executeInsertTableBottomRow: CommandAdapt['insertTableBottomRow']
  public executeInsertTableLeftCol: CommandAdapt['insertTableLeftCol']
  public executeInsertTableRightCol: CommandAdapt['insertTableRightCol']
  public executeDeleteTableRow: CommandAdapt['deleteTableRow']
  public executeDeleteTableCol: CommandAdapt['deleteTableCol']
  public executeDeleteTable: CommandAdapt['deleteTable']
  public executeMergeTableCell: CommandAdapt['mergeTableCell']
  public executeCancelMergeTableCell: CommandAdapt['cancelMergeTableCell']
  public executeSplitVerticalTableCell: CommandAdapt['splitVerticalTableCell']
  public executeSplitHorizontalTableCell: CommandAdapt['splitHorizontalTableCell']
  public executeTableTdVerticalAlign: CommandAdapt['tableTdVerticalAlign']
  public executeTableBorderType: CommandAdapt['tableBorderType']
  public executeTableBorderColor: CommandAdapt['tableBorderColor']
  public executeTableBorderWidth: CommandAdapt['tableBorderWidth']
  public executeTableBorderExternalWidth: CommandAdapt['tableBorderExternalWidth']
  public executeTableTdBorderType: CommandAdapt['tableTdBorderType']
  public executeTableTdSlashType: CommandAdapt['tableTdSlashType']
  public executeTableTdBackgroundColor: CommandAdapt['tableTdBackgroundColor']
  public executeTableSelectAll: CommandAdapt['tableSelectAll']
  public executeImage: CommandAdapt['image']
  public executeInsertAudio: CommandAdapt['insertAudio']
  public executeInsertVideo: CommandAdapt['insertVideo']
  public executeInsertChart: CommandAdapt['insertChart']
  public executeUpdateChart: CommandAdapt['updateChart']
  public executeHyperlink: CommandAdapt['hyperlink']
  public executeDeleteHyperlink: CommandAdapt['deleteHyperlink']
  public executeCancelHyperlink: CommandAdapt['cancelHyperlink']
  public executeEditHyperlink: CommandAdapt['editHyperlink']
  public executeAddBookmark: CommandAdapt['addBookmark']
  public executeDeleteBookmark: CommandAdapt['deleteBookmark']
  public executeGotoBookmark: CommandAdapt['gotoBookmark']
  public executeSeparator: CommandAdapt['separator']
  public executePageBreak: CommandAdapt['pageBreak']
  public executeInsertColumn: CommandAdapt['insertColumn']
  public executeRemoveColumn: CommandAdapt['removeColumn']
  public executeColumnBreak: CommandAdapt['columnBreak']
  public executeAddWatermark: CommandAdapt['addWatermark']
  public executeDeleteWatermark: CommandAdapt['deleteWatermark']
  public executeSearch: CommandAdapt['search']
  public executeReplace: CommandAdapt['replace']
  public executeReplaceAll: CommandAdapt['replaceAll']
  public executeLocateSearchResult: CommandAdapt['locateSearchResult']
  public executePrint: CommandAdapt['print']
  public executeReplaceImageElement: CommandAdapt['replaceImageElement']
  public executeSaveAsImageElement: CommandAdapt['saveAsImageElement']
  public executeChangeImageDisplay: CommandAdapt['changeImageDisplay']
  public executePageMode: CommandAdapt['pageMode']
  public executePageScale: CommandAdapt['pageScale']
  public executePageScaleRecovery: CommandAdapt['pageScaleRecovery']
  public executePageScaleMinus: CommandAdapt['pageScaleMinus']
  public executePageScaleAdd: CommandAdapt['pageScaleAdd']
  public executePaperSize: CommandAdapt['paperSize']
  public executePaperDirection: CommandAdapt['paperDirection']
  public executeSetPaperMargin: CommandAdapt['setPaperMargin']
  public executeSetMainBadge: CommandAdapt['setMainBadge']
  public executeSetAreaBadge: CommandAdapt['setAreaBadge']
  public executeInsertElementList: CommandAdapt['insertElementList']
  public executeInsertArea: CommandAdapt['insertArea']
  public executeSetAreaProperties: CommandAdapt['setAreaProperties']
  public executeLocationArea: CommandAdapt['locationArea']
  public executeAppendElementList: CommandAdapt['appendElementList']
  public executeUpdateElementById: CommandAdapt['updateElementById']
  public executeDeleteElementById: CommandAdapt['deleteElementById']
  public executeSetValue: CommandAdapt['setValue']
  public executeRemoveControl: CommandAdapt['removeControl']
  public executeTranslate: CommandAdapt['translate']
  public executeSetLocale: CommandAdapt['setLocale']
  public executeLocationCatalog: CommandAdapt['locationCatalog']
  public executeWordTool: CommandAdapt['wordTool']
  public executeSetHTML: CommandAdapt['setHTML']
  public executeSetGroup: CommandAdapt['setGroup']
  public executeDeleteGroup: CommandAdapt['deleteGroup']
  public executeLocationGroup: CommandAdapt['locationGroup']
  public executeSetZone: CommandAdapt['setZone']
  public executeSetControlValue: CommandAdapt['setControlValue']
  public executeSetControlValueList: CommandAdapt['setControlValueList']
  public executeSetControlExtension: CommandAdapt['setControlExtension']
  public executeSetControlExtensionList: CommandAdapt['setControlExtensionList']
  public executeSetControlProperties: CommandAdapt['setControlProperties']
  public executeSetControlPropertiesList: CommandAdapt['setControlPropertiesList']
  public executeSetControlHighlight: CommandAdapt['setControlHighlight']
  public executeLocationControl: CommandAdapt['locationControl']
  public executeInsertControl: CommandAdapt['insertControl']
  public executeUpdateOptions: CommandAdapt['updateOptions']
  public executeInsertTitle: CommandAdapt['insertTitle']
  public executeInsertFootnote: CommandAdapt['insertFootnote']
  public executeDeleteFootnote: CommandAdapt['deleteFootnote']
  public executeAcceptRevision: CommandAdapt['acceptRevision']
  public executeRejectRevision: CommandAdapt['rejectRevision']
  public executeAcceptAllRevisions: CommandAdapt['acceptAllRevisions']
  public executeRejectAllRevisions: CommandAdapt['rejectAllRevisions']
  public getRevisions: CommandAdapt['getRevisions']
  public initRevisionOverlay: CommandAdapt['initRevisionOverlay']
  public destroyRevisionOverlay: CommandAdapt['destroyRevisionOverlay']
  public getFootnotes: CommandAdapt['getFootnotes']
  public getPaperWidth: CommandAdapt['getPaperWidth']
  public getPaperHeight: CommandAdapt['getPaperHeight']
  public getImage: CommandAdapt['getImage']
  public getOptions: CommandAdapt['getOptions']
  public getValue: CommandAdapt['getValue']
  public getValueAsync: CommandAdapt['getValueAsync']
  public getAreaValue: CommandAdapt['getAreaValue']
  public getHTML: CommandAdapt['getHTML']
  public getText: CommandAdapt['getText']
  public getWordCount: CommandAdapt['getWordCount']
  public getBookmarks: CommandAdapt['getBookmarks']
  public getIsReadonly: CommandAdapt['getIsReadonly']
  public getIsDisabled: CommandAdapt['getIsDisabled']
  public getIsCanInput: CommandAdapt['getIsCanInput']
  public getIsEditable: CommandAdapt['getIsEditable']
  public getCursorPosition: CommandAdapt['getCursorPosition']
  public getRange: CommandAdapt['getRange']
  public getRangeText: CommandAdapt['getRangeText']
  public getRangeContext: CommandAdapt['getRangeContext']
  public getRangeRow: CommandAdapt['getRangeRow']
  public getRangeParagraph: CommandAdapt['getRangeParagraph']
  public getPaperMargin: CommandAdapt['getPaperMargin']
  public getLocale: CommandAdapt['getLocale']
  public getGroupIds: CommandAdapt['getGroupIds']
  public getGroupContext: CommandAdapt['getGroupContext']
  public getPositionList: CommandAdapt['getPositionList']
  public getEventBus: CommandAdapt['getEventBus']
  public getControlValue: CommandAdapt['getControlValue']
  public getControlList: CommandAdapt['getControlList']
  public getContainer: CommandAdapt['getContainer']
  public getRevisionOverlay: CommandAdapt['getRevisionOverlay']
  public setRevisionOverlay: CommandAdapt['setRevisionOverlay']
  public setCommentOverlay: CommandAdapt['setCommentOverlay']
  public getTitleValue: CommandAdapt['getTitleValue']
  public getPositionContextByEvent: CommandAdapt['getPositionContextByEvent']
  public getElementById: CommandAdapt['getElementById']
  public getCatalog: CommandAdapt['getCatalog']
  public getElementList: CommandAdapt['getElementList']
  public spliceElementList: CommandAdapt['spliceElementList']
  public getPageGap: CommandAdapt['getPageGap']
  public getDrawWidth: CommandAdapt['getDrawWidth']
  public getDrawHeight: CommandAdapt['getDrawHeight']
  public renderDraw: CommandAdapt['renderDraw']

  constructor(adapt: CommandAdapt) {
    this.executeMode = adapt.mode.bind(adapt)
    this.executeCut = adapt.cut.bind(adapt)
    this.executeCopy = adapt.copy.bind(adapt)
    this.executePaste = adapt.paste.bind(adapt)
    this.executeSelectAll = adapt.selectAll.bind(adapt)
    this.executeBackspace = adapt.backspace.bind(adapt)
    this.executeSetRange = adapt.setRange.bind(adapt)
    this.executeReplaceRange = adapt.replaceRange.bind(adapt)
    this.executeSetPositionContext = adapt.setPositionContext.bind(adapt)
    this.executeForceUpdate = adapt.forceUpdate.bind(adapt)
    this.executeBlur = adapt.blur.bind(adapt)
    this.executeFocus = adapt.focus.bind(adapt)
    this.executeUndo = adapt.undo.bind(adapt)
    this.executeRedo = adapt.redo.bind(adapt)
    this.executeSave = adapt.save.bind(adapt)
    this.executePainter = adapt.painter.bind(adapt)
    this.executeApplyPainterStyle = adapt.applyPainterStyle.bind(adapt)
    this.executeFormat = adapt.format.bind(adapt)
    this.executeFont = adapt.font.bind(adapt)
    this.executeSize = adapt.size.bind(adapt)
    this.executeCharacterScale = adapt.characterScale.bind(adapt)
    this.executeSizeAdd = adapt.sizeAdd.bind(adapt)
    this.executeSizeMinus = adapt.sizeMinus.bind(adapt)
    this.executeBold = adapt.bold.bind(adapt)
    this.executeItalic = adapt.italic.bind(adapt)
    this.executeUnderline = adapt.underline.bind(adapt)
    this.executeStrikeout = adapt.strikeout.bind(adapt)
    this.executeSuperscript = adapt.superscript.bind(adapt)
    this.executeSubscript = adapt.subscript.bind(adapt)
    this.executeColor = adapt.color.bind(adapt)
    this.executeHighlight = adapt.highlight.bind(adapt)
    this.executeParagraphColor = adapt.paragraphColor.bind(adapt)
    this.executeTitle = adapt.title.bind(adapt)
    this.executeList = adapt.list.bind(adapt)
    this.executeRowFlex = adapt.rowFlex.bind(adapt)
    this.executeRowMargin = adapt.rowMargin.bind(adapt)
    this.executeLineHeight = adapt.lineHeight.bind(adapt)
    this.executeParagraphFirstLineIndent = adapt.paragraphFirstLineIndent.bind(adapt)
    this.executeInsertTable = adapt.insertTable.bind(adapt)
    this.executeInsertTableTopRow = adapt.insertTableTopRow.bind(adapt)
    this.executeInsertTableBottomRow = adapt.insertTableBottomRow.bind(adapt)
    this.executeInsertTableLeftCol = adapt.insertTableLeftCol.bind(adapt)
    this.executeInsertTableRightCol = adapt.insertTableRightCol.bind(adapt)
    this.executeDeleteTableRow = adapt.deleteTableRow.bind(adapt)
    this.executeDeleteTableCol = adapt.deleteTableCol.bind(adapt)
    this.executeDeleteTable = adapt.deleteTable.bind(adapt)
    this.executeMergeTableCell = adapt.mergeTableCell.bind(adapt)
    this.executeCancelMergeTableCell = adapt.cancelMergeTableCell.bind(adapt)
    this.executeSplitVerticalTableCell =
      adapt.splitVerticalTableCell.bind(adapt)
    this.executeSplitHorizontalTableCell =
      adapt.splitHorizontalTableCell.bind(adapt)
    this.executeTableTdVerticalAlign = adapt.tableTdVerticalAlign.bind(adapt)
    this.executeTableBorderType = adapt.tableBorderType.bind(adapt)
    this.executeTableBorderColor = adapt.tableBorderColor.bind(adapt)
    this.executeTableBorderWidth = adapt.tableBorderWidth.bind(adapt)
    this.executeTableBorderExternalWidth =
      adapt.tableBorderExternalWidth.bind(adapt)
    this.executeTableTdBorderType = adapt.tableTdBorderType.bind(adapt)
    this.executeTableTdSlashType = adapt.tableTdSlashType.bind(adapt)
    this.executeTableTdBackgroundColor =
      adapt.tableTdBackgroundColor.bind(adapt)
    this.executeTableSelectAll = adapt.tableSelectAll.bind(adapt)
    this.executeImage = adapt.image.bind(adapt)
    this.executeInsertAudio = adapt.insertAudio.bind(adapt)
    this.executeInsertVideo = adapt.insertVideo.bind(adapt)
    this.executeInsertChart = adapt.insertChart.bind(adapt)
    this.executeUpdateChart = adapt.updateChart.bind(adapt)
    this.executeHyperlink = adapt.hyperlink.bind(adapt)
    this.executeDeleteHyperlink = adapt.deleteHyperlink.bind(adapt)
    this.executeCancelHyperlink = adapt.cancelHyperlink.bind(adapt)
    this.executeEditHyperlink = adapt.editHyperlink.bind(adapt)
    this.executeAddBookmark = adapt.addBookmark.bind(adapt)
    this.executeDeleteBookmark = adapt.deleteBookmark.bind(adapt)
    this.executeGotoBookmark = adapt.gotoBookmark.bind(adapt)
    this.executeSeparator = adapt.separator.bind(adapt)
    this.executePageBreak = adapt.pageBreak.bind(adapt)
    this.executeInsertColumn = adapt.insertColumn.bind(adapt)
    this.executeRemoveColumn = adapt.removeColumn.bind(adapt)
    this.executeColumnBreak = adapt.columnBreak.bind(adapt)
    this.executeAddWatermark = adapt.addWatermark.bind(adapt)
    this.executeDeleteWatermark = adapt.deleteWatermark.bind(adapt)
    this.executeSearch = adapt.search.bind(adapt)
    this.executeReplace = adapt.replace.bind(adapt)
    this.executeReplaceAll = adapt.replaceAll.bind(adapt)
    this.executeLocateSearchResult = adapt.locateSearchResult.bind(adapt)
    this.executePrint = adapt.print.bind(adapt)
    this.executeReplaceImageElement = adapt.replaceImageElement.bind(adapt)
    this.executeSaveAsImageElement = adapt.saveAsImageElement.bind(adapt)
    this.executeChangeImageDisplay = adapt.changeImageDisplay.bind(adapt)
    this.executePageMode = adapt.pageMode.bind(adapt)
    this.executePageScale = adapt.pageScale.bind(adapt)
    this.executePageScaleRecovery = adapt.pageScaleRecovery.bind(adapt)
    this.executePageScaleMinus = adapt.pageScaleMinus.bind(adapt)
    this.executePageScaleAdd = adapt.pageScaleAdd.bind(adapt)
    this.executePaperSize = adapt.paperSize.bind(adapt)
    this.executePaperDirection = adapt.paperDirection.bind(adapt)
    this.executeSetPaperMargin = adapt.setPaperMargin.bind(adapt)
    this.executeSetMainBadge = adapt.setMainBadge.bind(adapt)
    this.executeSetAreaBadge = adapt.setAreaBadge.bind(adapt)
    this.getAreaValue = adapt.getAreaValue.bind(adapt)
    this.executeInsertArea = adapt.insertArea.bind(adapt)
    this.executeSetAreaProperties = adapt.setAreaProperties.bind(adapt)
    this.executeLocationArea = adapt.locationArea.bind(adapt)
    this.executeInsertElementList = adapt.insertElementList.bind(adapt)
    this.executeAppendElementList = adapt.appendElementList.bind(adapt)
    this.executeUpdateElementById = adapt.updateElementById.bind(adapt)
    this.executeDeleteElementById = adapt.deleteElementById.bind(adapt)
    this.executeSetValue = adapt.setValue.bind(adapt)
    this.executeRemoveControl = adapt.removeControl.bind(adapt)
    this.executeTranslate = adapt.translate.bind(adapt)
    this.executeSetLocale = adapt.setLocale.bind(adapt)
    this.executeLocationCatalog = adapt.locationCatalog.bind(adapt)
    this.executeWordTool = adapt.wordTool.bind(adapt)
    this.executeSetHTML = adapt.setHTML.bind(adapt)
    this.executeSetGroup = adapt.setGroup.bind(adapt)
    this.executeDeleteGroup = adapt.deleteGroup.bind(adapt)
    this.executeLocationGroup = adapt.locationGroup.bind(adapt)
    this.executeSetZone = adapt.setZone.bind(adapt)
    this.executeUpdateOptions = adapt.updateOptions.bind(adapt)
    this.executeInsertTitle = adapt.insertTitle.bind(adapt)
    this.executeInsertFootnote = adapt.insertFootnote.bind(adapt)
    this.executeDeleteFootnote = adapt.deleteFootnote.bind(adapt)
    this.executeAcceptRevision = adapt.acceptRevision.bind(adapt)
    this.executeRejectRevision = adapt.rejectRevision.bind(adapt)
    this.executeAcceptAllRevisions = adapt.acceptAllRevisions.bind(adapt)
    this.executeRejectAllRevisions = adapt.rejectAllRevisions.bind(adapt)
    this.getRevisions = adapt.getRevisions.bind(adapt)
    this.initRevisionOverlay = adapt.initRevisionOverlay.bind(adapt)
    this.destroyRevisionOverlay = adapt.destroyRevisionOverlay.bind(adapt)
    this.getFootnotes = adapt.getFootnotes.bind(adapt)
    this.getValue = adapt.getValue.bind(adapt)
    this.getValueAsync = adapt.getValueAsync.bind(adapt)
    this.getHTML = adapt.getHTML.bind(adapt)
    this.getText = adapt.getText.bind(adapt)
    this.getWordCount = adapt.getWordCount.bind(adapt)
    this.getBookmarks = adapt.getBookmarks.bind(adapt)
    this.getIsReadonly = adapt.getIsReadonly.bind(adapt)
    this.getIsDisabled = adapt.getIsDisabled.bind(adapt)
    this.getIsCanInput = adapt.getIsCanInput.bind(adapt)
    this.getIsEditable = adapt.getIsEditable.bind(adapt)
    this.getCursorPosition = adapt.getCursorPosition.bind(adapt)
    this.getRange = adapt.getRange.bind(adapt)
    this.getRangeText = adapt.getRangeText.bind(adapt)
    this.getRangeContext = adapt.getRangeContext.bind(adapt)
    this.getRangeRow = adapt.getRangeRow.bind(adapt)
    this.getRangeParagraph = adapt.getRangeParagraph.bind(adapt)
    this.getCatalog = adapt.getCatalog.bind(adapt)
    this.getElementList = adapt.getElementList.bind(adapt)
    this.spliceElementList = adapt.spliceElementList.bind(adapt)
    this.getPageGap = adapt.getPageGap.bind(adapt)
    this.getDrawWidth = adapt.getDrawWidth.bind(adapt)
    this.getDrawHeight = adapt.getDrawHeight.bind(adapt)
    this.renderDraw = adapt.renderDraw.bind(adapt)
    this.getPaperWidth = adapt.getPaperWidth.bind(adapt)
    this.getPaperHeight = adapt.getPaperHeight.bind(adapt)
    this.getPaperMargin = adapt.getPaperMargin.bind(adapt)
    this.getLocale = adapt.getLocale.bind(adapt)
    this.getOptions = adapt.getOptions.bind(adapt)
    this.getGroupIds = adapt.getGroupIds.bind(adapt)
    this.getGroupContext = adapt.getGroupContext.bind(adapt)
    this.getPositionList = adapt.getPositionList.bind(adapt)
    this.getImage = adapt.getImage.bind(adapt)
    this.getEventBus = adapt.getEventBus.bind(adapt)
    this.getContainer = adapt.getContainer.bind(adapt)
    this.getRevisionOverlay = adapt.getRevisionOverlay.bind(adapt)
    this.setRevisionOverlay = adapt.setRevisionOverlay.bind(adapt)
    this.setCommentOverlay = adapt.setCommentOverlay.bind(adapt)
    this.getTitleValue = adapt.getTitleValue.bind(adapt)
    this.getPositionContextByEvent = adapt.getPositionContextByEvent.bind(adapt)
    this.getElementById = adapt.getElementById.bind(adapt)
    this.executeSetControlValue = adapt.setControlValue.bind(adapt)
    this.executeSetControlValueList = adapt.setControlValueList.bind(adapt)
    this.executeSetControlExtension = adapt.setControlExtension.bind(adapt)
    this.executeSetControlExtensionList =
      adapt.setControlExtensionList.bind(adapt)
    this.executeSetControlProperties = adapt.setControlProperties.bind(adapt)
    this.executeSetControlPropertiesList =
      adapt.setControlPropertiesList.bind(adapt)
    this.executeSetControlHighlight = adapt.setControlHighlight.bind(adapt)
    this.getControlValue = adapt.getControlValue.bind(adapt)
    this.getControlList = adapt.getControlList.bind(adapt)
    this.executeLocationControl = adapt.locationControl.bind(adapt)
    this.executeInsertControl = adapt.insertControl.bind(adapt)

    this._commandRegistry = new Map<string, CommandFunction>()
    this._registerCommands(adapt)
    this.search = {
      query: keyword => this.executeSearch(keyword) || [],
      locate: result => this.executeLocateSearchResult(result) || null,
      replaceOne: (result, replacement) => {
        if (!result || !replacement) return []
        this.executeReplace(replacement, {
          index: result.resultIndex
        })
        return this.executeSearch(result.keyword) || []
      },
      replaceAll: (keyword, replacement) =>
        this.executeReplaceAll(keyword, replacement) || [],
      clear: () => this.executeSearch(null) || []
    }
    this.bookmark = {
      getState: () => {
        const list = this.getBookmarks() || []
        const rangeContext = this.getRangeContext?.()
        const selectionText = String(rangeContext?.selectionText || '')
          .replace(/\u200B/g, '')
          .trim()
        const hasSelectionRange = !!selectionText && !rangeContext?.isCollapsed
        const existingNames = new Set(
          list
            .map(item => (typeof item?.name === 'string' ? item.name : ''))
            .filter(Boolean)
        )
        const baseName =
          sanitizeBookmarkName(selectionText) || DEFAULT_BOOKMARK_NAME
        return {
          list,
          suggestedName: ensureUniqueBookmarkName(baseName, existingNames),
          selectionPreview: selectionText,
          hasSelectionRange
        }
      },
      add: name => {
        if (!name) return
        this.executeAddBookmark({ name })
      },
      remove: name => {
        if (!name) return
        this.executeDeleteBookmark({ name })
      },
      locate: name => {
        if (!name) return
        this.executeGotoBookmark({ name })
      }
    }
    this.revision = {
      getState: () => {
        const list = (this.getRevisions?.() || []).map(item => ({
          id: item.id,
          type: item.type,
          author: item.author,
          date: item.date,
          content: item.content
        }))
        if (!list.some(item => item.id === this._activeRevisionId)) {
          this._activeRevisionId = ''
        }
        return {
          list,
          activeId: this._activeRevisionId
        }
      },
      locate: id => {
        if (!id) return
        const elementList = this.getElementList?.() || []
        const firstIndex = elementList.findIndex(
          (element: any) => element.revisionId === id
        )
        if (firstIndex < 0) return
        this._activeRevisionId = id
        this.executeSetRange(firstIndex, firstIndex)
      },
      locatePrevious: () => {
        const { list, activeId } = this.revision.getState()
        if (!list.length) return
        const currentIndex = list.findIndex(item => item.id === activeId)
        const targetIndex = currentIndex <= 0 ? list.length - 1 : currentIndex - 1
        this.revision.locate(list[targetIndex].id)
      },
      locateNext: () => {
        const { list, activeId } = this.revision.getState()
        if (!list.length) return
        const currentIndex = list.findIndex(item => item.id === activeId)
        const targetIndex =
          currentIndex < 0 || currentIndex >= list.length - 1
            ? 0
            : currentIndex + 1
        this.revision.locate(list[targetIndex].id)
      },
      accept: id => {
        if (!id) return
        const { list } = this.revision.getState()
        const currentIndex = list.findIndex(item => item.id === id)
        const nextActiveId =
          currentIndex < 0
            ? ''
            : list[currentIndex + 1]?.id || list[currentIndex - 1]?.id || ''
        this.executeAcceptRevision(id)
        this._activeRevisionId = nextActiveId
      },
      reject: id => {
        if (!id) return
        const { list } = this.revision.getState()
        const currentIndex = list.findIndex(item => item.id === id)
        const nextActiveId =
          currentIndex < 0
            ? ''
            : list[currentIndex + 1]?.id || list[currentIndex - 1]?.id || ''
        this.executeRejectRevision(id)
        this._activeRevisionId = nextActiveId
      },
      acceptCurrent: () => {
        const { list, activeId } = this.revision.getState()
        if (!list.length) return
        const currentIndex = list.findIndex(item => item.id === activeId)
        const currentRevision = list[currentIndex >= 0 ? currentIndex : 0]
        if (!currentRevision) return
        this.revision.accept(currentRevision.id)
      },
      rejectCurrent: () => {
        const { list, activeId } = this.revision.getState()
        if (!list.length) return
        const currentIndex = list.findIndex(item => item.id === activeId)
        const currentRevision = list[currentIndex >= 0 ? currentIndex : 0]
        if (!currentRevision) return
        this.revision.reject(currentRevision.id)
      },
      acceptAll: () => {
        this.executeAcceptAllRevisions()
        this._activeRevisionId = ''
      },
      rejectAll: () => {
        this.executeRejectAllRevisions()
        this._activeRevisionId = ''
      }
    }
    this.catalog = {
      getState: async () => ({
        list: (await this.getCatalog?.()) || []
      }),
      locate: id => {
        if (!id) return
        this.executeLocationCatalog(id)
      }
    }
  }

  private _registerCommands(adapt: CommandAdapt): void {
    const entries: Array<[string, CommandFunction]> = [
      ['mode', adapt.mode.bind(adapt)],
      ['cut', adapt.cut.bind(adapt)],
      ['copy', adapt.copy.bind(adapt)],
      ['paste', adapt.paste.bind(adapt)],
      ['selectAll', adapt.selectAll.bind(adapt)],
      ['backspace', adapt.backspace.bind(adapt)],
      ['setRange', adapt.setRange.bind(adapt)],
      ['replaceRange', adapt.replaceRange.bind(adapt)],
      ['setPositionContext', adapt.setPositionContext.bind(adapt)],
      ['forceUpdate', adapt.forceUpdate.bind(adapt)],
      ['blur', adapt.blur.bind(adapt)],
      ['focus', adapt.focus.bind(adapt)],
      ['undo', adapt.undo.bind(adapt)],
      ['redo', adapt.redo.bind(adapt)],
      ['save', adapt.save.bind(adapt)],
      ['painter', adapt.painter.bind(adapt)],
      ['applyPainterStyle', adapt.applyPainterStyle.bind(adapt)],
      ['format', adapt.format.bind(adapt)],
      ['font', adapt.font.bind(adapt)],
      ['size', adapt.size.bind(adapt)],
      ['characterScale', adapt.characterScale.bind(adapt)],
      ['sizeAdd', adapt.sizeAdd.bind(adapt)],
      ['sizeMinus', adapt.sizeMinus.bind(adapt)],
      ['bold', adapt.bold.bind(adapt)],
      ['italic', adapt.italic.bind(adapt)],
      ['underline', adapt.underline.bind(adapt)],
      ['strikeout', adapt.strikeout.bind(adapt)],
      ['superscript', adapt.superscript.bind(adapt)],
      ['subscript', adapt.subscript.bind(adapt)],
      ['color', adapt.color.bind(adapt)],
      ['highlight', adapt.highlight.bind(adapt)],
      ['paragraphColor', adapt.paragraphColor.bind(adapt)],
      ['title', adapt.title.bind(adapt)],
      ['list', adapt.list.bind(adapt)],
      ['rowFlex', adapt.rowFlex.bind(adapt)],
      ['rowMargin', adapt.rowMargin.bind(adapt)],
      ['lineHeight', adapt.lineHeight.bind(adapt)],
      ['paragraphFirstLineIndent', adapt.paragraphFirstLineIndent.bind(adapt)],
      ['indentStep', adapt.indentStep.bind(adapt)],
      ['getFirstLineIndent', adapt.getFirstLineIndent.bind(adapt)],
      ['insertTable', adapt.insertTable.bind(adapt)],
      ['insertTableTopRow', adapt.insertTableTopRow.bind(adapt)],
      ['insertTableBottomRow', adapt.insertTableBottomRow.bind(adapt)],
      ['insertTableLeftCol', adapt.insertTableLeftCol.bind(adapt)],
      ['insertTableRightCol', adapt.insertTableRightCol.bind(adapt)],
      ['deleteTableRow', adapt.deleteTableRow.bind(adapt)],
      ['deleteTableCol', adapt.deleteTableCol.bind(adapt)],
      ['deleteTable', adapt.deleteTable.bind(adapt)],
      ['mergeTableCell', adapt.mergeTableCell.bind(adapt)],
      ['cancelMergeTableCell', adapt.cancelMergeTableCell.bind(adapt)],
      ['splitVerticalTableCell', adapt.splitVerticalTableCell.bind(adapt)],
      ['splitHorizontalTableCell', adapt.splitHorizontalTableCell.bind(adapt)],
      ['tableTdVerticalAlign', adapt.tableTdVerticalAlign.bind(adapt)],
      ['tableBorderType', adapt.tableBorderType.bind(adapt)],
      ['tableBorderColor', adapt.tableBorderColor.bind(adapt)],
      ['tableBorderWidth', adapt.tableBorderWidth.bind(adapt)],
      ['tableBorderExternalWidth', adapt.tableBorderExternalWidth.bind(adapt)],
      ['tableTdBorderType', adapt.tableTdBorderType.bind(adapt)],
      ['tableTdSlashType', adapt.tableTdSlashType.bind(adapt)],
      ['tableTdBackgroundColor', adapt.tableTdBackgroundColor.bind(adapt)],
      ['tableSelectAll', adapt.tableSelectAll.bind(adapt)],
      ['image', adapt.image.bind(adapt)],
      ['insertAudio', adapt.insertAudio.bind(adapt)],
      ['insertVideo', adapt.insertVideo.bind(adapt)],
      ['insertChart', adapt.insertChart.bind(adapt)],
      ['updateChart', adapt.updateChart.bind(adapt)],
      ['hyperlink', adapt.hyperlink.bind(adapt)],
      ['deleteHyperlink', adapt.deleteHyperlink.bind(adapt)],
      ['cancelHyperlink', adapt.cancelHyperlink.bind(adapt)],
      ['editHyperlink', adapt.editHyperlink.bind(adapt)],
      ['addBookmark', adapt.addBookmark.bind(adapt)],
      ['deleteBookmark', adapt.deleteBookmark.bind(adapt)],
      ['gotoBookmark', adapt.gotoBookmark.bind(adapt)],
      ['separator', adapt.separator.bind(adapt)],
      ['pageBreak', adapt.pageBreak.bind(adapt)],
      ['insertColumn', adapt.insertColumn.bind(adapt)],
      ['removeColumn', adapt.removeColumn.bind(adapt)],
      ['columnBreak', adapt.columnBreak.bind(adapt)],
      ['addWatermark', adapt.addWatermark.bind(adapt)],
      ['deleteWatermark', adapt.deleteWatermark.bind(adapt)],
      ['search', adapt.search.bind(adapt)],
      ['replace', adapt.replace.bind(adapt)],
      ['replaceAll', adapt.replaceAll.bind(adapt)],
      ['locateSearchResult', adapt.locateSearchResult.bind(adapt)],
      ['print', adapt.print.bind(adapt)],
      ['replaceImageElement', adapt.replaceImageElement.bind(adapt)],
      ['saveAsImageElement', adapt.saveAsImageElement.bind(adapt)],
      ['changeImageDisplay', adapt.changeImageDisplay.bind(adapt)],
      ['pageMode', adapt.pageMode.bind(adapt)],
      ['pageScale', adapt.pageScale.bind(adapt)],
      ['pageScaleRecovery', adapt.pageScaleRecovery.bind(adapt)],
      ['pageScaleMinus', adapt.pageScaleMinus.bind(adapt)],
      ['pageScaleAdd', adapt.pageScaleAdd.bind(adapt)],
      ['paperSize', adapt.paperSize.bind(adapt)],
      ['paperDirection', adapt.paperDirection.bind(adapt)],
      ['setPaperMargin', adapt.setPaperMargin.bind(adapt)],
      ['setMainBadge', adapt.setMainBadge.bind(adapt)],
      ['setAreaBadge', adapt.setAreaBadge.bind(adapt)],
      ['insertElementList', adapt.insertElementList.bind(adapt)],
      ['insertArea', adapt.insertArea.bind(adapt)],
      ['setAreaProperties', adapt.setAreaProperties.bind(adapt)],
      ['locationArea', adapt.locationArea.bind(adapt)],
      ['appendElementList', adapt.appendElementList.bind(adapt)],
      ['updateElementById', adapt.updateElementById.bind(adapt)],
      ['deleteElementById', adapt.deleteElementById.bind(adapt)],
      ['setValue', adapt.setValue.bind(adapt)],
      ['removeControl', adapt.removeControl.bind(adapt)],
      ['translate', adapt.translate.bind(adapt)],
      ['setLocale', adapt.setLocale.bind(adapt)],
      ['locationCatalog', adapt.locationCatalog.bind(adapt)],
      ['wordTool', adapt.wordTool.bind(adapt)],
      ['setHTML', adapt.setHTML.bind(adapt)],
      ['setGroup', adapt.setGroup.bind(adapt)],
      ['deleteGroup', adapt.deleteGroup.bind(adapt)],
      ['locationGroup', adapt.locationGroup.bind(adapt)],
      ['setZone', adapt.setZone.bind(adapt)],
      ['setControlValue', adapt.setControlValue.bind(adapt)],
      ['setControlValueList', adapt.setControlValueList.bind(adapt)],
      ['setControlExtension', adapt.setControlExtension.bind(adapt)],
      ['setControlExtensionList', adapt.setControlExtensionList.bind(adapt)],
      ['setControlProperties', adapt.setControlProperties.bind(adapt)],
      ['setControlPropertiesList', adapt.setControlPropertiesList.bind(adapt)],
      ['setControlHighlight', adapt.setControlHighlight.bind(adapt)],
      ['locationControl', adapt.locationControl.bind(adapt)],
      ['insertControl', adapt.insertControl.bind(adapt)],
      ['updateOptions', adapt.updateOptions.bind(adapt)],
      ['insertTitle', adapt.insertTitle.bind(adapt)],
      ['insertFootnote', adapt.insertFootnote.bind(adapt)],
      ['deleteFootnote', adapt.deleteFootnote.bind(adapt)],
      ['acceptRevision', adapt.acceptRevision.bind(adapt)],
      ['rejectRevision', adapt.rejectRevision.bind(adapt)],
      ['acceptAllRevisions', adapt.acceptAllRevisions.bind(adapt)],
      ['rejectAllRevisions', adapt.rejectAllRevisions.bind(adapt)],
      ['getRevisions', adapt.getRevisions.bind(adapt)],
      ['initRevisionOverlay', adapt.initRevisionOverlay.bind(adapt)],
      ['setRevisionOverlay', adapt.setRevisionOverlay.bind(adapt)],
      ['destroyRevisionOverlay', adapt.destroyRevisionOverlay.bind(adapt)],
      ['tocInsert', adapt.tocInsert.bind(adapt)],
      ['tocRemove', adapt.tocRemove.bind(adapt)],
      ['insertShape', adapt.insertShape.bind(adapt)],
      ['qrcode', adapt.qrcode.bind(adapt)],
      ['barcode', adapt.barcode.bind(adapt)],
      ['exportDocx', adapt.exportDocx.bind(adapt)],
      ['previewHtml', adapt.previewHtml.bind(adapt)]
    ]
    for (const [name, fn] of entries) {
      this._commandRegistry.set(name, fn)
    }
  }

  public registerCommand(name: string, fn: CommandFunction): void {
    this._commandRegistry.set(name, fn)
  }

  public execute(name: string, ...args: any[]): any {
    const fn = this._commandRegistry.get(name)
    if (!fn) {
      console.warn(`[Command] Unknown command: "${name}"`)
      return
    }
    return fn(...args)
  }

  public getCommandNames(): string[] {
    return Array.from(this._commandRegistry.keys())
  }
}
