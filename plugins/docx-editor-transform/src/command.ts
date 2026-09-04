/**
 * VerveDocs Transform —— Command 门面
 */

import type { CommandAdapt } from './command-adapt'
import type { IElement, Path, IAutoCatalogResult } from '@vervedoc/docx-editor-schema'

export class Command {
  constructor(public adapt: CommandAdapt) {}

  executeInsertText(text: string): void { this.adapt.insertText(text) }
  executeDeleteBackward(): void { this.adapt.deleteBackward() }
  executeDeleteForward(): void { this.adapt.deleteForward() }
  executeSplitParagraph(): void { this.adapt.splitParagraph() }
  executeDeleteSelection(): boolean { return this.adapt.deleteSelection() }
  executeExtractSelectionText(): string { return this.adapt.extractSelectionText() }
  executeMoveCaretLeft(): void { this.adapt.moveCaretLeft() }
  executeMoveCaretRight(): void { this.adapt.moveCaretRight() }
  executeRowFlex(f: Parameters<CommandAdapt['setRowFlex']>[0]): void { this.adapt.setRowFlex(f) }
  executeBold(b?: boolean): void { this.adapt.setBold(b) }
  executeItalic(b?: boolean): void { this.adapt.setItalic(b) }
  executeColor(c: string): void { this.adapt.setColor(c) }
  executeFont(f: string): void { this.adapt.setFont(f) }
  executeSize(s: number): void { this.adapt.setSize(s) }
  executeSizeAdd(): void { this.adapt.setSizeAdd() }
  executeSizeMinus(): void { this.adapt.setSizeMinus() }
  executeHighlight(c: string): void { this.adapt.setHighlight(c) }
  executeStrikeout(v?: boolean): void { this.adapt.setStrikeout(v) }
  executeUnderline(v?: boolean): void { this.adapt.setUnderline(v) }
  executeFormat(): void { this.adapt.clearFormat() }
  executePainter(): void { this.adapt.paintFormat() }
  executeLineHeight(lh: number, rule?: 'auto' | 'exact' | 'atLeast'): void { this.adapt.setLineHeight(lh, rule) }
  executeRowMargin(m: number): void { this.adapt.setRowMargin(m) }
  executeTitle(l: 'first' | 'second' | 'third' | 'fourth' | 'fifth' | 'sixth' | null): void { this.adapt.setTitle(l) }
  executeList(type: Parameters<CommandAdapt['setList']>[0], style: Parameters<CommandAdapt['setList']>[1]): void { this.adapt.setList(type, style) }
  executeInsertTable(rows: number, cols: number, availableWidth?: number): void { this.adapt.insertTable(rows, cols, availableWidth) }
  executeInsertTableRow(position: 'above' | 'below', count?: number): void { this.adapt.insertTableRow(position, count) }
  executeInsertTableCol(position: 'left' | 'right', count?: number): void { this.adapt.insertTableCol(position, count) }
  executeDeleteTableRow(): void { this.adapt.deleteTableRow() }
  executeDeleteTableCol(): void { this.adapt.deleteTableCol() }
  executeSplitTableCell(): void { this.adapt.splitTableCell() }
  executeMergeTableCells(): void { this.adapt.mergeTableCells() }
  executeDeleteTable(): void { this.adapt.deleteTable() }
  executeSetCellVerticalAlign(align: 'top' | 'middle' | 'bottom'): void { this.adapt.setCellVerticalAlign(align) }
  executeSetCellBackground(color: string): void { this.adapt.setCellBackground(color) }
  executeToggleRepeatHeader(): void { this.adapt.toggleRepeatHeader() }
  executeSetTableColWidth(tableIndex: number, colIndex: number, width: number): void { this.adapt.setTableColWidth(tableIndex, colIndex, width) }
  executeSetTableRowHeight(tableIndex: number, rowIndex: number, height: number): void { this.adapt.setTableRowHeight(tableIndex, rowIndex, height) }
  executeSelectTable(): void { this.adapt.selectTable() }
  executeImage(src: string | { value: string; width: number; height: number }, w?: number, h?: number): void { this.adapt.insertImage(src, w, h) }
  executeUpdateImageSize(path: Path, width: number, height: number): void { this.adapt.updateImageSize(path, width, height) }
  executeDeleteImage(path: Path): void { this.adapt.deleteImage(path) }
  executeResetImageSize(path: Path): void { this.adapt.resetImageSize(path) }
  executeImageAlign(path: Path, align: 'left' | 'center' | 'right'): void { this.adapt.imageAlign(path, align) }
  executeReplaceImage(path: Path): void { this.adapt.replaceImage(path) }
  executeRotateImage(path: Path): void { this.adapt.rotateImage(path) }
  executeSaveImage(path: Path): void { this.adapt.saveImage(path) }
  executeImageWrap(path: Path, mode: 'block' | 'surround' | 'floatTop' | 'floatBottom'): void { this.adapt.imageWrap(path, mode) }
  executePageBreak(): void { this.adapt.insertPageBreak() }
  executeHyperlink(payload: { value: string; url: string }): void { this.adapt.insertHyperlink(payload) }
  executeSeparator(): void { this.adapt.insertSeparator() }
  executeSearch(keyword: string): { count: number } { return this.adapt.search(keyword) }
  executeReplace(text: string): boolean { return this.adapt.replace(text) }
  executePaperSize(w: number, h: number): void { this.adapt.setPaperSize(w, h) }
  executePaperDirection(d: 'vertical' | 'horizontal'): void { this.adapt.setPaperDirection(d) }
  executePageScaleAdd(): void { this.adapt.pageScaleAdd() }
  executePageScaleMinus(): void { this.adapt.pageScaleMinus() }
  executeSetRulerVisible(visible: boolean): void { this.adapt.setRulerVisible(visible) }
  executeSetPaperMargin(margins: number[]): void { this.adapt.setPaperMargin(margins) }
  executePrint(): void { this.adapt.print() }
  getValue(): IElement[] { return this.adapt.getValue() }
  executeSetValue(payload: { elements: IElement[] }): void { this.adapt.setValue(payload) }
  getWordCount(): number { return this.adapt.getWordCount() }
  getCatalog(): { id: string; level: number; name: string }[] { return this.adapt.getCatalog() }
  executeLocationCatalog(id: string): void { this.adapt.locationCatalog(id) }
  getAutoCatalog(): IAutoCatalogResult { return this.adapt.getAutoCatalog() }
  executeInsertAutoCatalog(type: 1 | 2 | 3): void { this.adapt.insertAutoCatalog(type) }
  executeUndo(): void { this.adapt.undo() }
  executeRedo(): void { this.adapt.redo() }
}
