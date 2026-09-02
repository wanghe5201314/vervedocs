/**
 * VerveDocs Transform —— Command 门面
 */

import type { CommandAdapt } from './command-adapt'

export class Command {
  constructor(public adapt: CommandAdapt) {}

  executeInsertText(text: string): void { this.adapt.insertText(text) }
  executeDeleteBackward(): void { this.adapt.deleteBackward() }
  executeSetRowFlex(f: Parameters<CommandAdapt['setRowFlex']>[0]): void { this.adapt.setRowFlex(f) }
  executeBold(b: boolean): void { this.adapt.setBold(b) }
  executeColor(c: string): void { this.adapt.setColor(c) }
  executeFont(f: string): void { this.adapt.setFont(f) }
  executeSize(s: number): void { this.adapt.setSize(s) }
  executeHighlight(c: string): void { this.adapt.setHighlight(c) }
  executeStrikeout(v: boolean): void { this.adapt.setStrikeout(v) }
  executeUnderline(v: boolean): void { this.adapt.setUnderline(v) }
  executeTitle(l: 'first' | 'second' | 'third' | 'fourth' | 'fifth' | 'sixth'): void { this.adapt.setTitle(l) }
  executeInsertTable(rows: number, cols: number, availableWidth?: number): void { this.adapt.insertTable(rows, cols, availableWidth) }
  executeInsertImage(src: string, w: number, h: number): void { this.adapt.insertImage(src, w, h) }
  executeInsertPageBreak(): void { this.adapt.insertPageBreak() }
  executeUndo(): void { this.adapt.undo() }
  executeRedo(): void { this.adapt.redo() }
}
