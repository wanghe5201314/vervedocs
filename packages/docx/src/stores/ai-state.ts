/**
 * AI 功能状态存储
 * 管理 AI 侧边栏面板的状态，包括当前操作、结果、加载状态等
 */
import { reactive, readonly } from 'vue'
import { AIAction, TranslateLanguage } from '@vervedoc/docx-editor-ai'

/** AI 面板活动标签 */
export type AITab = 'writing' | 'layout' | 'analysis' | 'media'

/** AI 操作状态 */
export interface IAIOperationState {
  /** 是否正在处理 */
  loading: boolean
  /** 当前操作类型 */
  action: AIAction | null
  /** 输入文本 */
  inputText: string
  /** AI 返回的结果 */
  result: string
  /** 流式响应的实时内容 */
  streamContent: string
  /** 错误信息 */
  error: string | null
  /** 自定义 prompt */
  customPrompt: string
  /** 翻译目标语言 */
  targetLanguage: TranslateLanguage
}

/** AI 状态接口 */
export interface IAIState {
  /** 侧边栏是否可见 */
  visible: boolean
  /** 当前活动标签 */
  activeTab: AITab
  /** 操作状态 */
  operation: IAIOperationState
  /** 结果抽屉是否打开 */
  drawerVisible: boolean
  /** 历史记录 */
  history: Array<{
    action: AIAction
    input: string
    output: string
    timestamp: number
  }>
}

const defaultOperationState: IAIOperationState = {
  loading: false,
  action: null,
  inputText: '',
  result: '',
  streamContent: '',
  error: null,
  customPrompt: '',
  targetLanguage: TranslateLanguage.ENGLISH
}

const defaultState: IAIState = {
  visible: false,
  activeTab: 'writing',
  operation: { ...defaultOperationState },
  drawerVisible: false,
  history: []
}

function createAIStateStore() {
  const state = reactive<IAIState>({
    ...defaultState,
    operation: { ...defaultOperationState },
    drawerVisible: false,
    history: []
  })

  function setVisible(visible: boolean) {
    state.visible = visible
  }

  function setActiveTab(tab: AITab) {
    state.activeTab = tab
  }

  function startOperation(action: AIAction, inputText: string) {
    state.operation.loading = true
    state.operation.action = action
    state.operation.inputText = inputText
    state.operation.result = ''
    state.operation.streamContent = ''
    state.operation.error = null
    state.drawerVisible = true
  }

  function appendStreamContent(chunk: string) {
    state.operation.streamContent += chunk
  }

  function completeOperation(result: string) {
    state.operation.loading = false
    state.operation.result = result
    state.operation.streamContent = ''

    // 添加到历史记录
    if (state.operation.action) {
      state.history.unshift({
        action: state.operation.action,
        input: state.operation.inputText,
        output: result,
        timestamp: Date.now()
      })
      // 最多保留 50 条
      if (state.history.length > 50) {
        state.history.length = 50
      }
    }
  }

  function failOperation(error: string) {
    state.operation.loading = false
    state.operation.error = error
    state.operation.streamContent = ''
  }

  function setDrawerVisible(visible: boolean) {
    state.drawerVisible = visible
  }

  function resetOperation() {
    Object.assign(state.operation, defaultOperationState)
    state.drawerVisible = false
  }

  function clearHistory() {
    state.history.length = 0
  }

  function reset() {
    state.visible = false
    state.activeTab = 'writing'
    state.drawerVisible = false
    Object.assign(state.operation, defaultOperationState)
    state.history.length = 0
  }

  return {
    state: readonly(state),
    setVisible,
    setActiveTab,
    startOperation,
    appendStreamContent,
    completeOperation,
    failOperation,
    resetOperation,
    setDrawerVisible,
    clearHistory,
    reset
  }
}

export const aiStateStore = createAIStateStore()
export type AIStateStore = ReturnType<typeof createAIStateStore>
