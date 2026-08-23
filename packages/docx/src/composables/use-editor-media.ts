/**
 * 编辑器命令接口（媒体相关能力）
 */
interface EditorCommand {
  /** 插入图片 */
  executeImage: (payload: any) => void
  /** 插入音频 */
  executeInsertAudio: (src: string, options: any) => void
  /** 插入视频 */
  executeInsertVideo: (src: string, options?: any) => void
}

/**
 * 编辑器实例接口
 */
interface EditorInstance {
  /** 编辑器命令对象 */
  command: EditorCommand
}

/**
 * 媒体（图片/音频/视频）composable
 * @param options 配置项
 * @returns 图片、音频、视频插入方法
 */
export function useEditorMedia(options: {
  /** 获取编辑器实例 */
  getEditorInstance: () => EditorInstance | null
}) {
  const { getEditorInstance } = options

  /**
   * 插入图片，支持传入图片地址、配置对象或无参时弹出文件选择框
   * @param args 图片地址或配置对象，为空时从本地选择文件
   */
  function image(args: any) {
    const instance = getEditorInstance()
    if (!instance) return
    if (args) {
      if (typeof args === 'string') {
        const img = new Image()
        img.onload = () => {
          instance.command.executeImage({
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
              instance.command.executeImage({
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

  /**
   * 插入音频，支持传入音频地址、配置对象或无参时弹出文件选择框
   * @param args 音频地址或配置对象，为空时从本地选择文件
   */
  function audio(args?: any) {
    const instance = getEditorInstance()
    if (!instance) return
    if (args && typeof args === 'string') {
      instance.command.executeInsertAudio(args, { name: '音频文件' })
    } else if (args && args.src) {
      instance.command.executeInsertAudio(args.src, {
        name: args.name,
        width: args.width,
        height: args.height,
        poster: args.poster
      })
    } else {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'audio/*'
      input.onchange = (e: Event) => {
        const target = e.target as HTMLInputElement
        const file = target.files?.[0]
        if (file) {
          const reader = new FileReader()
          reader.onload = (evt) => {
            const dataUrl = evt.target?.result as string
            instance.command.executeInsertAudio(dataUrl, { name: file.name })
          }
          reader.readAsDataURL(file)
        }
      }
      input.click()
    }
  }

  /**
   * 插入视频，支持传入视频地址、配置对象或无参时弹出文件选择框
   * @param args 视频地址或配置对象，为空时从本地选择文件
   */
  function video(args?: any) {
    const instance = getEditorInstance()
    if (!instance) return
    if (args && typeof args === 'string') {
      instance.command.executeInsertVideo(args)
    } else if (args && args.src) {
      instance.command.executeInsertVideo(args.src, {
        width: args.width,
        height: args.height,
        poster: args.poster
      })
    } else {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'video/*'
      input.onchange = (e: Event) => {
        const target = e.target as HTMLInputElement
        const file = target.files?.[0]
        if (file) {
          const reader = new FileReader()
          reader.onload = (evt) => {
            const dataUrl = evt.target?.result as string
            instance.command.executeInsertVideo(dataUrl)
          }
          reader.readAsDataURL(file)
        }
      }
      input.click()
    }
  }

  return { image, audio, video }
}