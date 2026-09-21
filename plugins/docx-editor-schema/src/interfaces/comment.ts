/**
 * VerveDocs Schema —— Comment 层跨包共享接口
 *
 * 从 docx-editor-comment 包迁移的跨包共享类型。
 */

import type { IComment } from '../types'

/** 导入、保存、导出共用的批注协议。 */
export type { IDocxCommentMeta as DocxCommentMeta } from '../types'

/** 批注回调接口 */
export interface CommentCallbacks {
  /** 删除批注回调 */
  onDelete?: (id: string) => void
  /** 定位批注回调 */
  onLocate?: (id: string) => void
  /** 保存批注回调 */
  onSave?: (comment: IComment) => void
  /** 取消批注回调 */
  onCancel?: (id: string) => void
  /** 回复批注回调 */
  onReply?: (id: string, content: string) => void
  /** 解决批注回调 */
  onResolve?: (id: string, resolved: boolean) => void
  /** 请求保存回调 */
  onRequestSave?: () => void
}

/** 修订回调接口 */
export interface RevisionCallbacks {
  /** 接受修订回调 */
  onAccept?: (revisionId: string) => void
  /** 拒绝修订回调 */
  onReject?: (revisionId: string) => void
}
