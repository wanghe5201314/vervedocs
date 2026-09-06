import { nextTick } from 'vue'
import type { IParagraphStyle, IListNumbering, IDocxTheme } from '@vervedoc/docx-editor-schema'

/** 整文档替换载荷接口 */
export interface ReplaceDocumentPayload {
  /** 正文元素（必填） */
  main: any[]
  /** 页眉；缺省一律清空为 [] */
  header?: any[]
  /** 页脚；缺省一律清空为 [] */
  footer?: any[]
  /**
   * 批注：
   * - DocxCommentMeta[]（含 author）→ buildCommentsFromMetas
   * - 序列化批注（含 groupId）→ restoreComments
   * - 缺省 / 空数组 → 清空批注
   */
  comments?: unknown[]
  /** 段落样式表 */
  styles?: Record<string, IParagraphStyle>
  /** 列表编号定义表 */
  numbering?: Record<string, IListNumbering>
  /** 文档主题 */
  theme?: IDocxTheme
}

/** 整文档替换依赖接口 */
export interface ReplaceDocumentDeps {
  /** 获取编辑器实例的函数 */
  getEditorInstance: () => any
  /** 刷新目录的函数 */
  refreshCatalog?: () => Promise<unknown> | unknown
  /** 同步修订列表的函数 */
  syncRevisionList?: () => void
}

/**
 * 整文档替换：正文 + 页眉页脚 + 批注。
 * 核心 executeSetValue 内部处理 zone 重置、IDocxDocumentMeta 构造、sections 清空、批注渲染。
 * @param deps 依赖对象，提供编辑器实例及刷新回调
 * @param payload 载荷对象，包含正文、页眉、页脚、批注
 * @returns 无返回值
 */
export async function replaceDocument(
  deps: ReplaceDocumentDeps,
  payload: ReplaceDocumentPayload
): Promise<void> {
  const inst = deps.getEditorInstance()
  if (!inst?.command?.executeSetValue) {
    throw new Error('编辑器未就绪，无法替换文档')
  }

  inst.command.executeSetValue({
    main: Array.isArray(payload.main) ? payload.main : [],
    header: payload.header ?? [],
    footer: payload.footer ?? [],
    comments: payload.comments,
    styles: payload.styles,
    numbering: payload.numbering,
    theme: payload.theme
  })

  await nextTick()
  requestAnimationFrame(() => {
    inst.comment?.render?.()
    inst.revision?.update?.()
    deps.syncRevisionList?.()
  })

  await deps.refreshCatalog?.()
}
