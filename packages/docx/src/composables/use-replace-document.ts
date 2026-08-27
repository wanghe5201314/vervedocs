import { nextTick } from 'vue'
import type { DocxCommentMeta } from '@vervedoc/docx-editor-comment'

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
  comments?: DocxCommentMeta[] | Array<Record<string, unknown>>
}

export interface ReplaceDocumentDeps {
  getEditorInstance: () => any
  refreshCatalog?: () => Promise<unknown> | unknown
  syncRevisionList?: () => void
}

function isSerializedComment(item: unknown): boolean {
  return !!item && typeof item === 'object' && 'groupId' in (item as object)
}

/**
 * 整文档替换：正文 + 强制清空页眉页脚（可覆盖）+ 重置批注/修订 UI。
 * 供 docx 导入、JSON url 加载、content 初始加载共用，避免旧内容杂糅。
 */
export async function replaceDocument(
  deps: ReplaceDocumentDeps,
  payload: ReplaceDocumentPayload
): Promise<void> {
  const inst = deps.getEditorInstance()
  if (!inst?.command?.executeSetValue) {
    throw new Error('编辑器未就绪，无法替换文档')
  }

  const header = payload.header ?? []
  const footer = payload.footer ?? []
  const main = Array.isArray(payload.main) ? payload.main : []

  inst.command.executeSetValue({ header, main, footer })

  const commentComp = inst.comment
  const comments = payload.comments
  if (commentComp) {
    if (Array.isArray(comments) && comments.length > 0) {
      if (isSerializedComment(comments[0])) {
        commentComp.restoreComments(comments)
      } else {
        commentComp.buildCommentsFromMetas(comments as DocxCommentMeta[])
      }
    } else {
      commentComp.buildCommentsFromMetas([])
    }
  }

  await nextTick()
  requestAnimationFrame(() => {
    commentComp?.render?.()
    inst.revision?.update?.()
    deps.syncRevisionList?.()
  })

  await deps.refreshCatalog?.()
}
