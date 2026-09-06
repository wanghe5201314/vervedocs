import { computed, ref, type Ref } from 'vue'
import type { IAutoTocItem } from '@vervedoc/core'


/** 编辑器目录标签类型：catalog 表示目录，section 表示章节缩略图 */
export type EditorTocTab = 'toc' | 'section'
/** 编辑器侧边栏停靠位置类型：可为目录/章节、搜索、AI、修订，或空字符串表示无停靠 */
export type EditorTocDock = EditorTocTab | 'search' | 'ai' | 'revision' | ''

/** 编辑器目录状态快照接口 */
export interface IEditorTocNavState {
  /** 目录条目列表 */
  list: IAutoTocItem[]
  /** 章节缩略图地址列表 */
  thumbnails: string[]
  /** 当前选中的目录条目 ID */
  selectedId: string
  /** 当前激活的标签页 */
  activeTab: EditorTocTab
  /** 目录面板是否可见 */
  visible: boolean
}

/** 编辑器目录 API 接口 */
export interface IEditorTocNavApi {
  /** 目录条目列表（响应式引用） */
  tocList: Ref<IAutoTocItem[]>
  /** 章节缩略图列表（响应式引用） */
  thumbnails: Ref<string[]>
  /** 当前选中的目录条目 ID（响应式引用） */
  selectedId: Ref<string>
  /** 当前激活的标签页（响应式引用） */
  activeTab: Ref<EditorTocTab>
  /** 目录面板是否可见（只读响应式引用） */
  visible: Readonly<Ref<boolean>>
  /** 获取目录状态快照 */
  getState(): IEditorTocNavState
  /** 同步目录列表，可传入指定列表或从编辑器实例获取 */
  sync(list?: IAutoTocItem[] | null): Promise<IAutoTocItem[]>
  /** 设置章节缩略图列表 */
  setThumbnails(images: string[]): void
  /** 定位到指定 ID 的目录条目 */
  locate(id: string): void
  /** 跳转到指定页码 */
  pageJump(index: number): void
  /** 打开目录面板，可指定初始标签页 */
  open(tab?: EditorTocTab): void
  /** 关闭目录面板 */
  close(): void
  /** 切换目录面板可见状态 */
  toggle(desired?: boolean, tab?: EditorTocTab): void
  /** 切换标签页 */
  switchTab(tab: EditorTocTab): void
}

/**
 * 编辑器目录 composable
 * 封装目录列表、章节缩略图、标签页切换等逻辑
 * @param options 配置项
 * @returns 目录领域 API
 */
export function useEditorTocNav(options: {
  /** 获取编辑器实例的函数 */
  getEditorInstance: () => {
    command?: {
      executeLocationToc?: (id: string) => void

    }
  } | null
  /** 执行编辑器命令的函数 */
  executeCommand: (command: string, ...args: any[]) => unknown
  /** 当前激活的停靠位置（响应式引用） */
  activeDock: Ref<EditorTocDock>
}) {
  const { getEditorInstance, executeCommand, activeDock } = options
  /** 目录条目列表 */
  const tocList = ref<IAutoTocItem[]>([])
  /** 章节缩略图列表 */
  const thumbnails = ref<string[]>([])
  /** 当前选中的目录条目 ID */
  const selectedId = ref('')
  /** 当前激活的标签页，默认为 catalog */
  const activeTab = ref<EditorTocTab>('toc')
  /** 目录面板是否可见，由 activeDock 派生计算 */
  const visible = computed(
    () => activeDock.value === 'toc' || activeDock.value === 'section'
  )

  /**
   * 同步目录列表
   * @param list 指定的目录条目列表
   * @returns 更新后的目录条目列表
   */
  async function sync(list?: IAutoTocItem[] | null): Promise<IAutoTocItem[]> {
    if (Array.isArray(list)) {
      tocList.value = [...list]
    }
    return tocList.value
  }

  /**
   * 设置章节缩略图列表
   * @param images 缩略图地址数组
   */
  function setThumbnails(images: string[]): void {
    thumbnails.value = Array.isArray(images) ? [...images] : []
  }

  /**
   * 定位到指定 ID 的目录条目
   * @param id 目录条目 ID
   */
  function locate(id: string): void {
    if (!id) return
    selectedId.value = id
    const command = getEditorInstance()?.command

    command?.executeLocationToc?.(id)
  }

  /**
   * 跳转到指定页码
   * @param index 页码索引
   */
  function pageJump(index: number): void {
    executeCommand('pageJump', index)
  }

  /**
   * 切换标签页，并同步停靠位置（缩略图由核心 listener 自动推送，无需主动刷新）
   * @param tab 目标标签页
   */
  function switchTab(tab: EditorTocTab): void {
    activeTab.value = tab
    activeDock.value = tab
  }

  /**
   * 打开目录面板
   * @param tab 初始标签页，默认为 catalog
   */
  function open(tab: EditorTocTab = 'toc'): void {
    switchTab(tab)
  }

  /** 关闭目录面板 */
  function close(): void {
    activeDock.value = ''
  }

  /**
   * 切换目录面板可见状态
   * @param desired 期望的可见状态，为空时取反当前状态
   * @param tab 切换到指定标签页，默认为 catalog
   */
  function toggle(desired?: boolean, tab: EditorTocTab = 'toc'): void {
    const nextVisible = desired ?? !visible.value
    if (nextVisible) {
      open(tab)
    } else {
      close()
    }
  }

  /**
   * 获取目录状态快照
   * @returns 目录状态对象
   */
  function getState(): IEditorTocNavState {
    return {
      list: [...tocList.value],
      thumbnails: [...thumbnails.value],
      selectedId: selectedId.value,
      activeTab: activeTab.value,
      visible: visible.value
    }
  }

  /** 目录领域 API 对象 */
  const tocNavAPI: IEditorTocNavApi = {
    tocList,
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
    tocNavAPI
  }
}
