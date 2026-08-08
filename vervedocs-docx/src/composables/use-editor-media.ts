interface EditorCommand {
  executeImage: (payload: any) => void
  executeInsertAudio: (src: string, options: any) => void
  executeInsertVideo: (src: string, options?: any) => void
}

interface EditorInstance {
  command: EditorCommand
}

export function useEditorMedia(options: {
  getEditorInstance: () => EditorInstance | null
}) {
  const { getEditorInstance } = options

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