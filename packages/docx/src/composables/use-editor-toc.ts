interface EditorInstance {
  command: any
}

export function useEditorToc(options: { getEditorInstance: () => EditorInstance | null }) {
  const { getEditorInstance } = options

  async function tocInsert(payload: any) {
    const instance = getEditorInstance()
    if (!instance) return
    await instance.command.execute('tocInsert', payload)
  }

  function tocRemove() {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.execute('tocRemove')
  }

  function locationCatalog(id: string) {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executeLocationCatalog(id)
  }

  return { tocInsert, tocRemove, locationCatalog }
}