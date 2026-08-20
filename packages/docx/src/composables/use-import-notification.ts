import { ref, h } from 'vue'
import { notification } from 'ant-design-vue'
import ImportNotification from '@/components/common/ImportNotification.vue'

export function useImportNotification(options: {
  setSuppressSaveOnce: (value: boolean) => void
}) {
  const { setSuppressSaveOnce } = options

  const importFileName = ref('')
  const importFileSize = ref('')
  const importParseProgress = ref<number | undefined>(undefined)

  let importModeResolver: ((value: string) => void) | null = null
  let importNotificationInstance: any = null

  const showImportNotification = () => {
    if (importNotificationInstance) return

    const content = h(ImportNotification, {
      fileName: importFileName,
      fileSize: importFileSize,
      parseProgress: importParseProgress,
      onOverwrite: () => handleImportAction('overwrite'),
      onAppend: () => handleImportAction('append')
    })

    notification.open({
      key: 'import-notification',
      class: 'import-notification',
      placement: 'topRight',
      duration: 0,

      onClose: () => {
        if (importModeResolver) {
          const resolver = importModeResolver
          importModeResolver = null
          resolver('cancel')
        }
        importNotificationInstance = null
      },
      message: null,
      description: content,
      style: {
        width: '450px',
        padding: '16px'
      }
    })
    importNotificationInstance = 'import-notification'
  }

  const closeImportNotification = () => {
    if (importNotificationInstance) {
      notification.close('import-notification')
      importNotificationInstance = null
    }
  }

  const handleImportAction = (mode: 'overwrite' | 'append' | 'cancel') => {
    const resolver = importModeResolver
    importModeResolver = null
    if (!resolver) {
      return
    }

    closeImportNotification()

    if (mode === 'cancel') {
      resolver('cancel')
      return
    }
    setSuppressSaveOnce(true)
    resolver(mode)
  }

  const setImportModeResolver = (resolver: ((value: string) => void) | null) => {
    importModeResolver = resolver
  }

  return {
    importFileName,
    importFileSize,
    importParseProgress,
    showImportNotification,
    closeImportNotification,
    handleImportAction,
    setImportModeResolver
  }
}