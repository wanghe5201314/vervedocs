interface EditorInstance {
  command: any
}

export function useEditorBreaks(options: {
  getEditorInstance: () => EditorInstance | null
}) {
  const { getEditorInstance } = options

  function pageBreak() {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executePageBreak()
  }

  function columnBreak() {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executeInsertElementList([{ value: '\n' }])
  }

  function lineBreak() {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executeInsertElementList([{ value: '\n' }])
  }

  function sectionBreakNextPage() {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executePageBreak()
  }

  function sectionBreakContinuous() {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executeSeparator([0, 0])
  }

  function sectionBreakEvenPage() {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executePageBreak()
  }

  function sectionBreakOddPage() {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executePageBreak()
  }

  function separator(payload: any) {
    const instance = getEditorInstance()
    if (!instance) return
    let separatorOptions: any = {
      lineType: 'solid',
      lineWidth: 1,
      dashArray: [0, 0]
    }
    if (Array.isArray(payload)) {
      if (payload.length === 3) {
        separatorOptions.lineType = payload[0]
        separatorOptions.lineWidth = payload[1]
        separatorOptions.dashArray = payload[2]
      } else {
        separatorOptions.dashArray = payload
      }
    } else if (typeof payload === 'object' && payload !== null) {
      separatorOptions.lineType = payload.type || 'solid'
      separatorOptions.lineWidth = payload.width || 1
      separatorOptions.dashArray = payload.dashArray || [0, 0]
    }
    instance.command.executeSeparator(separatorOptions)
  }

  return {
    pageBreak,
    columnBreak,
    lineBreak,
    sectionBreakNextPage,
    sectionBreakContinuous,
    sectionBreakEvenPage,
    sectionBreakOddPage,
    separator
  }
}