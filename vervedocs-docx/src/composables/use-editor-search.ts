interface EditorInstance {
  command: any
}

export function useEditorSearch(options: { getEditorInstance: () => EditorInstance | null }) {
  const { getEditorInstance } = options

  function search(text: string | null) {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executeSearch(text)
  }

  function searchNavigatePre() {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executeSearchNavigatePre()
  }

  function searchNavigateNext() {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executeSearchNavigateNext()
  }

  function replace(text: string) {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executeReplace(text)
  }

  function replaceAll(searchText: string, replaceText: string) {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executeReplaceAll?.(searchText, replaceText)
  }

  return {
    search,
    searchNavigatePre,
    searchNavigateNext,
    replace,
    replaceAll
  }
}