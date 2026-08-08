
interface EditorInstance {
  command: any
}

export function useEditorPage(options: { getEditorInstance: () => EditorInstance | null
  getEditorContainer: () => HTMLDivElement | null
  applyOptionsPatch: (patch: any) => void }) {
  const { getEditorInstance, getEditorContainer, applyOptionsPatch } = options

  function pageJump(index: number) {
    const instance = getEditorInstance()
    if (!instance) return
    const pageHeight = instance.command.getPaperHeight()
    const opts = instance.command.getOptions()
    const pageGap = opts.pageGap * (opts.scale || 1)
    const container = getEditorContainer()?.parentElement
    if (container) {
      const containerPadding = 40
      container.scrollTop = index * (pageHeight + pageGap) + containerPadding
    }
  }

  function pageMode(mode: string) {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executePageMode(mode)
  }

  function pageScale(scale: number) {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executePageScale(scale)
  }
  function pageScaleRecovery() {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executePageScaleRecovery()
  }
  function pageScaleAdd() {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executePageScaleAdd()
  }
  function pageScaleMinus() {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executePageScaleMinus()
  }

  function paperSize(width: number, height: number) {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executePaperSize(width, height)
  }
  function paperDirection(direction: string) {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executePaperDirection(direction)
  }
  function setPaperMargin(margin: number[]) {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executeSetPaperMargin(margin)
  }
  function setPaperBackground(color: string) {
    applyOptionsPatch({ background: { color } })
  }

  function columns(value: any) {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executeColumns?.(value)
  }

  return {
    pageJump, pageMode,
    pageScale, pageScaleRecovery, pageScaleAdd, pageScaleMinus,
    paperSize, paperDirection, setPaperMargin, setPaperBackground,
    columns
  }
}