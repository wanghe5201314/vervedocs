interface EditorInstance {
  command: any
}

export function useEditorLatex(options: {
  getEditorInstance: () => EditorInstance | null
}) {
  const { getEditorInstance } = options

  function insertLatex(latex: string) {
    const instance = getEditorInstance()
    if (!instance) return
    if (latex) {
      instance.command.executeInsertElementList([{
        type: 'latex',
        value: latex
      }])
    }
  }

  return { insertLatex }
}