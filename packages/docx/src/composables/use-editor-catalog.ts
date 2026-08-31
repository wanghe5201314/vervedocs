import { computed, ref, type Ref } from 'vue'
import type { ICatalogItem } from '@vervedoc/core'

export type EditorCatalogTab = 'catalog' | 'section'
export type EditorCatalogDock = EditorCatalogTab | 'search' | 'ai' | 'revision' | ''

export interface IEditorCatalogState {
  list: ICatalogItem[]
  thumbnails: string[]
  selectedId: string
  activeTab: EditorCatalogTab
  visible: boolean
}

export interface IEditorCatalogApi {
  catalogList: Ref<ICatalogItem[]>
  thumbnails: Ref<string[]>
  selectedId: Ref<string>
  activeTab: Ref<EditorCatalogTab>
  visible: Readonly<Ref<boolean>>
  getState(): IEditorCatalogState
  sync(list?: ICatalogItem[] | null): Promise<ICatalogItem[]>
  setThumbnails(images: string[]): void
  locate(id: string): void
  pageJump(index: number): void
  open(tab?: EditorCatalogTab): void
  close(): void
  toggle(desired?: boolean, tab?: EditorCatalogTab): void
  switchTab(tab: EditorCatalogTab): void
}

export function useEditorCatalog(options: {
  getEditorInstance: () => {
    command?: {
      catalog?: {
        getState?: () => Promise<{ list: ICatalogItem[] }>
        locate?: (id: string) => void
      }
      getCatalog?: () => Promise<ICatalogItem[] | null>
    }
  } | null
  executeCommand: (command: string, ...args: any[]) => unknown
  activeDock: Ref<EditorCatalogDock>
}) {
  const { getEditorInstance, executeCommand, activeDock } = options
  const catalogList = ref<ICatalogItem[]>([])
  const thumbnails = ref<string[]>([])
  const selectedId = ref('')
  const activeTab = ref<EditorCatalogTab>('catalog')
  const visible = computed(
    () => activeDock.value === 'catalog' || activeDock.value === 'section'
  )

  async function sync(list?: ICatalogItem[] | null): Promise<ICatalogItem[]> {
    if (Array.isArray(list)) {
      catalogList.value = [...list]
      return catalogList.value
    }
    const instance = getEditorInstance()
    const state =
      (await instance?.command?.catalog?.getState?.())
      ?? { list: (await instance?.command?.getCatalog?.()) ?? [] }
    catalogList.value = Array.isArray(state.list) ? [...state.list] : []
    return catalogList.value
  }

  function setThumbnails(images: string[]): void {
    thumbnails.value = Array.isArray(images) ? [...images] : []
  }

  function locate(id: string): void {
    if (!id) return
    selectedId.value = id
    const command = getEditorInstance()?.command
    command?.catalog?.locate?.(id)
  }

  function pageJump(index: number): void {
    executeCommand('pageJump', index)
  }

  function switchTab(tab: EditorCatalogTab): void {
    activeTab.value = tab
    activeDock.value = tab
    if (tab === 'section') {
      executeCommand('refreshThumbnails')
    }
  }

  function open(tab: EditorCatalogTab = 'catalog'): void {
    switchTab(tab)
  }

  function close(): void {
    activeDock.value = ''
  }

  function toggle(desired?: boolean, tab: EditorCatalogTab = 'catalog'): void {
    const nextVisible = desired ?? !visible.value
    if (nextVisible) {
      open(tab)
    } else {
      close()
    }
  }

  function getState(): IEditorCatalogState {
    return {
      list: [...catalogList.value],
      thumbnails: [...thumbnails.value],
      selectedId: selectedId.value,
      activeTab: activeTab.value,
      visible: visible.value
    }
  }

  const catalogAPI: IEditorCatalogApi = {
    catalogList,
    thumbnails,
    selectedId,
    activeTab,
    visible,
    getState,
    sync,
    setThumbnails,
    locate,
    pageJump,
    open,
    close,
    toggle,
    switchTab
  }

  return {
    catalogAPI
  }
}
