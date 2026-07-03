import { TableContextMenu } from './TableContextMenu'

type Draw = any

export class TableContextMenuComponent {
  private _contextMenu: any

  public install(draw: Draw): this {
    this._contextMenu = new TableContextMenu(draw)
    ;(draw as any).__tableContextMenu = this._contextMenu
    return this
  }

  public getContextMenu() {
    return this._contextMenu
  }
}
