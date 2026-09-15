/**
 * 编辑器命令接口（媒体相关能力）
 */
interface EditorCommand {
  /** 插入图片 */
  executeInsertImage: (payload: any) => void
  /** 插入图片（对象参数） */
  executeImage: (payload: any) => void
}

/**
 * 编辑器实例接口
 */
interface EditorInstance {
  /** 编辑器命令对象 */
  command: EditorCommand
}

/**
 * 媒体（图片）composable
 * @param options 配置项
 * @returns 包含图片插入方法的对象
 */
export function useEditorMedia(options: {
  /** 获取编辑器实例 */
  getEditorInstance: () => EditorInstance | null
}) {
  const { getEditorInstance } = options

  /**
   * 插入图片，支持传入图片地址、配置对象或无参时弹出文件选择框
   * @param args 图片地址或配置对象，为空时从本地选择文件
   * @returns 无返回值
   */
  function image(args: any) {
    const instance = getEditorInstance()
    if (!instance) return
    if (args) {
      if (typeof args === 'string') {
        const img = new Image()
        img.onload = () => {
          instance.command.executeInsertImage({
            value: args,
            width: img.width,
            height: img.height
          })
        }
        img.src = args
      } else {
        instance.command.executeImage(args)
      }
    } else {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.onchange = (e: Event) => {
        const target = e.target as HTMLInputElement
        const file = target.files?.[0]
        if (file) {
          const reader = new FileReader()
          reader.onload = (evt) => {
            const dataUrl = evt.target?.result as string
            const img = new Image()
            img.onload = () => {
              instance.command.executeInsertImage({
                value: dataUrl,
                width: img.width,
                height: img.height
              })
            }
            img.src = dataUrl
          }
          reader.readAsDataURL(file)
        }
      }
      input.click()
    }
  }

  return { image }
}
