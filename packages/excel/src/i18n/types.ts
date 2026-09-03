export type ExcelLocale = 'zhCN' | 'enUS'

export interface ExcelI18nMessages {
  common: {
    autoSaved: string
    recentSaved: string
    readOnlyMode: string
    confirm: string
    cancel: string
  }
  sheet: {
    defaultTitle: string
    newSheet: string
    sheet: string
    defaultSheetName: string
    duplicateSuffix: string
    defaultWorkbookName: string
  }
  menu: {
    file: string
    edit: string
    view: string
    insert: string
    format: string
    data: string
    help: string
  }
  dialog: {
    renameSheetTitle: string
    renameSheetInputPlaceholder: string
    deleteSheetTitle: string
    deleteSheetContent: string
    deleteButton: string
  }
  message: {
    importSuccess: string
    importFailed: string
    importCallbackMissing: string
    exportSuccess: string
    exportFailed: string
    exportCallbackMissing: string
    createSuccess: string
    createFailed: string
  }
}
