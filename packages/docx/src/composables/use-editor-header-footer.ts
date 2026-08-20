interface EditorInstance {
  command: any
}

export function useEditorHeaderFooter(options: {
  getEditorInstance: () => EditorInstance | null
}) {
  const { getEditorInstance } = options

  function header() {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executeSetZone('header')
  }

  function footer() {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executeSetZone('footer')
  }

  function mainZone() {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executeSetZone('main')
  }

  function clearHeader() {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executeSetZone('header')
    instance.command.executeSelectAll()
    instance.command.executeBackspace()
    instance.command.executeSetZone('main')
  }

  function clearFooter() {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executeSetZone('footer')
    instance.command.executeSelectAll()
    instance.command.executeBackspace()
    instance.command.executeSetZone('main')
  }

  function setPageNumber(payload: any) {
    const instance = getEditorInstance()
    if (!instance) return
    const currentOptions = instance.command.getOptions?.() || {}
    instance.command.executeUpdateOptions({
      ...currentOptions,
      pageNumber: {
        ...(currentOptions.pageNumber || {}),
        ...payload
      }
    })
  }

  return {
    header,
    footer,
    mainZone,
    clearHeader,
    clearFooter,
    setPageNumber
  }
}