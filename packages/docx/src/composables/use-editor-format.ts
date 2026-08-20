interface EditorInstance {
  command: any
}

export function useEditorFormat(options: {
  getEditorInstance: () => EditorInstance | null
}) {
  const { getEditorInstance } = options

  function undo() {
    const i = getEditorInstance()
    i?.command.executeUndo()
  }
  function redo() {
    const i = getEditorInstance()
    i?.command.executeRedo()
  }
  function cut() {
    const i = getEditorInstance()
    i?.command.executeCut?.()
  }
  function copy() {
    const i = getEditorInstance()
    i?.command.executeCopy?.()
  }
  function paste() {
    const i = getEditorInstance()
    i?.command.executePaste?.()
  }
  function pasteNoFormat() {
    const i = getEditorInstance()
    if (!i) return
    i.command.executePasteNoFormat ? i.command.executePasteNoFormat() : i.command.executePaste?.()
  }
  function selectAll() {
    const i = getEditorInstance()
    i?.command.executeSelectAll?.()
  }
  function deleteFn() {
    const i = getEditorInstance()
    i?.command.executeBackspace?.()
  }
  function painter(args: any) {
    const i = getEditorInstance()
    i?.command.executePainter(args)
  }
  function format() {
    const i = getEditorInstance()
    i?.command.executeFormat()
  }

  function font(family: string) {
    const i = getEditorInstance()
    i?.command.executeFont(family)
  }
  function size(size: number) {
    const i = getEditorInstance()
    i?.command.executeSize(size)
  }
  function characterScale(value: number) {
    const i = getEditorInstance()
    i?.command.executeCharacterScale(value)
  }
  function sizeAdd() {
    const i = getEditorInstance()
    i?.command.executeSizeAdd()
  }
  function sizeMinus() {
    const i = getEditorInstance()
    i?.command.executeSizeMinus()
  }

  function bold() {
    const i = getEditorInstance()
    i?.command.executeBold()
  }
  function italic() {
    const i = getEditorInstance()
    i?.command.executeItalic()
  }
  function underline(args?: any) {
    const i = getEditorInstance()
    i?.command.executeUnderline(args)
  }
  function strikeout() {
    const i = getEditorInstance()
    i?.command.executeStrikeout()
  }
  function superscript() {
    const i = getEditorInstance()
    i?.command.executeSuperscript()
  }
  function subscript() {
    const i = getEditorInstance()
    i?.command.executeSubscript()
  }
  function color(color: string) {
    const i = getEditorInstance()
    i?.command.executeColor(color)
  }
  function highlight(color: string) {
    const i = getEditorInstance()
    i?.command.executeHighlight(color)
  }

  function title(level: any) {
    const i = getEditorInstance()
    i?.command.executeTitle(level)
  }
  function rowFlex(flex: any) {
    const i = getEditorInstance()
    i?.command.executeRowFlex(flex)
  }
  function rowMargin(margin: any) {
    const i = getEditorInstance()
    if (!i) return
    const v = Number(margin)
    if (!Number.isFinite(v)) return
    i.command.executeRowMargin(v)
  }
  function indentStep(direction: any) {
    const i = getEditorInstance()
    i?.command.execute('indentStep', direction)
  }
  function list(type: any, style: any) {
    const i = getEditorInstance()
    i?.command.executeList(type, style)
  }
  function lineHeight(height: number) {
    const i = getEditorInstance()
    i?.command.executeLineHeight(height)
  }
  function firstLineIndent(indentPx: number) {
    const i = getEditorInstance()
    if (!i) return
    const v = typeof indentPx === 'number' && Number.isFinite(indentPx) ? indentPx : 0
    i.command.executeParagraphFirstLineIndent(v)
  }
  function getFirstLineIndent() {
    const i = getEditorInstance()
    return i?.command.execute('getFirstLineIndent')
  }

  return {
    undo, redo, cut, copy, paste, pasteNoFormat, selectAll, deleteFn, painter, format,
    font, size, characterScale, sizeAdd, sizeMinus,
    bold, italic, underline, strikeout, superscript, subscript, color, highlight,
    title, rowFlex, rowMargin, indentStep, list, lineHeight, firstLineIndent, getFirstLineIndent
  }
}