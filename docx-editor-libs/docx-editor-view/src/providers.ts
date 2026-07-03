export interface IParticleRegistry {
  registerParticle(name: string, particle: any): void
  getParticle(name: string): any
}

export interface IHistoryProvider {
  undo(): void
  redo(): void
  pushSnapshot(): void
  hasUndo(): boolean
  hasRedo(): boolean
  recovery(): void
  destroy(): void
}

export interface ISearchProvider {
  search(keyword: string): void
  navigate(index: number): void
  replace(replacement: string): void
  replaceAll(replacement: string): void
  close(): void
  getMatchResult(): any
}

export interface IControlProvider {
  activate(control: any): void
  deactivate(): void
  getActiveControl(): any
  nextControl(): void
  preControl(): void
  destroy(): void
}
