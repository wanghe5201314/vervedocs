import { TableBorder, TdBorder, TdSlash } from '@wanghe1995/docx-editor-schema'
import { VerticalAlign } from '@wanghe1995/docx-editor-schema'
import { BaseCommandAdapter, IAdapterContext } from './types'

export class TableAdapter extends BaseCommandAdapter {
  constructor(context: IAdapterContext) {
    super(context)
  }

  public insertTable(row: number, col: number): void {
    if (this.isDisabled()) return
    const activeControl = this.draw.getControl().getActiveControl()
    if (activeControl) return
    this.tableOperate.insertTable(row, col)
  }

  public insertTableTopRow(): void {
    if (this.isDisabled()) return
    this.tableOperate.insertTableTopRow()
  }

  public insertTableBottomRow(): void {
    if (this.isDisabled()) return
    this.tableOperate.insertTableBottomRow()
  }

  public insertTableLeftCol(): void {
    if (this.isDisabled()) return
    this.tableOperate.insertTableLeftCol()
  }

  public insertTableRightCol(): void {
    if (this.isDisabled()) return
    this.tableOperate.insertTableRightCol()
  }

  public deleteTableRow(): void {
    if (this.isDisabled()) return
    this.tableOperate.deleteTableRow()
  }

  public deleteTableCol(): void {
    if (this.isDisabled()) return
    this.tableOperate.deleteTableCol()
  }

  public deleteTable(): void {
    if (this.isDisabled()) return
    this.tableOperate.deleteTable()
  }

  public mergeTableCell(): void {
    if (this.isDisabled()) return
    this.tableOperate.mergeTableCell()
  }

  public cancelMergeTableCell(): void {
    if (this.isDisabled()) return
    this.tableOperate.cancelMergeTableCell()
  }

  public splitVerticalTableCell(): void {
    if (this.isDisabled()) return
    this.tableOperate.splitVerticalTableCell()
  }

  public splitHorizontalTableCell(): void {
    if (this.isDisabled()) return
    this.tableOperate.splitHorizontalTableCell()
  }

  public tableTdVerticalAlign(payload: VerticalAlign): void {
    if (this.isDisabled()) return
    this.tableOperate.tableTdVerticalAlign(payload)
  }

  public tableBorderType(payload: TableBorder): void {
    if (this.isReadonly()) return
    this.tableOperate.tableBorderType(payload)
  }

  public tableBorderColor(payload: string): void {
    if (this.isReadonly()) return
    this.tableOperate.tableBorderColor(payload)
  }

  public tableBorderWidth(payload: number): void {
    if (this.isReadonly()) return
    this.tableOperate.tableBorderWidth(payload)
  }

  public tableBorderExternalWidth(payload: number): void {
    if (this.isReadonly()) return
    this.tableOperate.tableBorderExternalWidth(payload)
  }

  public tableTdBorderType(payload: TdBorder): void {
    if (this.isReadonly()) return
    this.tableOperate.tableTdBorderType(payload)
  }

  public tableTdSlashType(payload: TdSlash): void {
    if (this.isReadonly()) return
    this.tableOperate.tableTdSlashType(payload)
  }

  public tableTdBackgroundColor(payload: string): void {
    if (this.isReadonly()) return
    this.tableOperate.tableTdBackgroundColor(payload)
  }

  public tableSelectAll(): void {
    this.tableOperate.tableSelectAll()
  }
}
