interface EditorInstance {
  command: any
}

export function useEditorWatermark(options: { getEditorInstance: () => EditorInstance | null }) {
  const { getEditorInstance } = options
  function addWatermark(payload?: any) {
    const instance = getEditorInstance()
    if (!instance) return
    if (payload) {
      instance.command.executeAddWatermark({
        data: payload.data || payload.content || '',
        color: payload.color,
        opacity: payload.opacity,
        size: payload.size,
        font: payload.font,
        repeat: payload.repeat
      })
    }
  }

  function deleteWatermark() {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executeDeleteWatermark()
  }

  return { addWatermark, deleteWatermark }
}