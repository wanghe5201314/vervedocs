import { message } from 'ant-design-vue'
import { executeAIRequest } from '@/composables/use-ai'
import { aiStateStore } from '@/stores/ai-state'
import { AIAction } from '@vervedoc/docx-editor-ai'

/**
 * 编辑器实例接口（AI 操作所需的最小能力）
 */
interface EditorInstance {
  command?: {
    getRangeText?: () => string
    getValue?: () => { data?: { main?: any[] } }
    executeInsertElementList?: (elementList: any[]) => void
  }
}

/**
 * AI 操作集合 composable
 * @param options 配置项
 * @returns AI 操作处理函数集合
 */
export function useAIActions(options: {
  /** 获取编辑器实例 */
  getEditorInstance: () => EditorInstance | null
}) {
  const { getEditorInstance } = options

  /**
   * 处理 AI 操作分发
   * @param action 操作类型
   * @param payload 操作参数
   */
  function handleAIAction(action: string, payload?: any) {
    const instance = getEditorInstance()
    if (!instance) return

    /** 获取当前选中的文本内容 */
    const getText = (): string => {
      try {
        return instance.command!.getRangeText?.() || ''
      } catch {
        return ''
      }
    }

    /** 获取文档全文内容 */
    const getFullText = (): string => {
      try {
        const result = instance.command!.getValue?.()
        const main = result?.data?.main
        if (!Array.isArray(main)) return ''
        return main.map((el: any) => el.value || '').join('')
      } catch {
        return ''
      }
    }

    if (action === 'quickAction') {
      const text = getText().trim()
      if (!text) {
        message.warning('请先选中文本')
        return
      }
      void executeAIRequest({ action: payload.action, text })
      return
    }

    if (action === 'translate') {
      const text = getText().trim()
      if (!text) {
        message.warning('请先选中文本')
        return
      }
      void executeAIRequest({ action: AIAction.TRANSLATE, text, targetLanguage: payload?.targetLanguage })
      return
    }

    if (action === 'custom') {
      const text = getText().trim()
      if (!text) {
        message.warning('请先选中文本')
        return
      }
      void executeAIRequest({ action: AIAction.CUSTOM, text, customPrompt: payload?.prompt })
      return
    }

    if (action === 'continue') {
      const text = getText().trim() || getFullText().trim()
      if (!text) {
        message.warning('文档为空，无法续写')
        return
      }
      void executeAIRequest({ action: AIAction.CONTINUE, text: text.slice(-500) })
      return
    }

    if (action === 'layoutSuggestion' || action === 'docAnalysis' || action === 'docSummarize') {
      const text = getFullText().trim()
      if (!text) {
        message.warning('文档为空')
        return
      }
      const aiAction = action === 'docSummarize' ? AIAction.SUMMARIZE : AIAction.CUSTOM
      const customPrompt = action === 'layoutSuggestion'
        ? '请分析以下文档内容，提供排版优化建议，包括段落结构、标题层级、分栏建议等。'
        : action === 'docAnalysis'
          ? '请对以下文档进行综合分析，包括内容质量评估、结构建议、语言风格分析。'
          : undefined
      void executeAIRequest({
        action: aiAction,
        text: text.slice(0, 3000),
        customPrompt
      })
      return
    }

    if (action === 'applyResult') {
      const result = payload?.result
      if (result && instance) {
        const elementList = result.split('').map((char: string) => ({ value: char }))
        instance.command?.executeInsertElementList?.(elementList)
        aiStateStore.resetOperation()
      }
      return
    }

    if (action === 'regenerate') {
      const opState = aiStateStore.state.operation
      if (opState.action && opState.inputText) {
        void executeAIRequest({
          action: opState.action,
          text: opState.inputText
        })
      }
      return
    }

    if (action === 'imageAlt') {
      message.info('图片描述生成功能即将推出')
      return
    }
  }

  /**
   * 将 AI 结果插入编辑器
   * @param result AI 返回的文本结果
   */
  function handleAIApplyResult(result: string) {
    const instance = getEditorInstance()
    if (result && instance) {
      const elementList = result.split('').map((char: string) => ({ value: char }))
      instance.command?.executeInsertElementList?.(elementList)
      aiStateStore.resetOperation()
    }
  }

  /** 重新生成上一次 AI 操作的结果 */
  function handleAIRegenerate() {
    const opState = aiStateStore.state.operation
    if (opState.action && opState.inputText) {
      void executeAIRequest({
        action: opState.action,
        text: opState.inputText
      })
    }
  }

  /** 关闭 AI 结果抽屉 */
  function handleAIResultClose() {
    aiStateStore.setDrawerVisible(false)
  }

  return {
    handleAIAction,
    handleAIApplyResult,
    handleAIRegenerate,
    handleAIResultClose,
  }
}