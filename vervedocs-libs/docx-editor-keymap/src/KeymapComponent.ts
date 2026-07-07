import { Shortcut } from './Shortcut'

type Draw = any
type Command = any

export class KeymapComponent {
  private _shortcut: Shortcut | null = null

  public install(draw: Draw, command: Command): this {
    this._shortcut = new Shortcut(draw, command)
    return this
  }

  public getShortcut(): Shortcut | null {
    return this._shortcut
  }
}
