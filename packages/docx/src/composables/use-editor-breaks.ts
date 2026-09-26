import { message } from 'ant-design-vue'

/**
 * 编辑器实例接口
 */
interface EditorInstance {
  /** 编辑器命令对象 */
  command: any
}

/**
 * 分隔符与分页/分节 composable
 * @param options 配置项
 * @returns 分页、分节、分割线等方法
 */
export function useEditorBreaks(options: {
  /** 获取编辑器实例 */
  getEditorInstance: () => EditorInstance | null
}) {
  const { getEditorInstance } = options

  function insertSection(command: string) {
    const instance = getEditorInstance()
    if (!instance) return
    try {
      instance.command[command]()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '插入分节符失败')
    }
  }

  /** 插入分页符 */
  function pageBreak() {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executePageBreak()
  }

  /** 插入分栏符 */
  function columnBreak() {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executeColumnBreak()
  }

  /** 插入换行符 */
  function lineBreak() {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executeLineBreak()
  }

  /** 插入下一页分节符 */
  function sectionBreakNextPage() { insertSection('executeSectionBreakNextPage') }

  /** 插入连续分节符 */
  function sectionBreakContinuous() { insertSection('executeSectionBreakContinuous') }

  /** 插入偶数页分节符 */
  function sectionBreakEvenPage() { insertSection('executeSectionBreakEvenPage') }

  /** 插入奇数页分节符 */
  function sectionBreakOddPage() { insertSection('executeSectionBreakOddPage') }

  /**
   * 插入分隔线
   * @param payload 分隔线配置，支持数组或对象形式
   */
  function separator(payload: any) {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executeSeparator(payload)
  }

  return {
    pageBreak,
    columnBreak,
    lineBreak,
    sectionBreakNextPage,
    sectionBreakContinuous,
    sectionBreakEvenPage,
    sectionBreakOddPage,
    separator
  }
}