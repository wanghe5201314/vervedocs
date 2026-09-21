/**
 * 版本记录
 */
export interface IVersion {
  /** 版本唯一标识 */
  id: number
  /** 所属文档 ID */
  documentId: number
  /** 版本号 */
  versionNumber: number
  /** 版本名称 */
  name?: string
  /** 创建者显示名 */
  creatorName?: string
  /** 变更摘要 */
  changeSummary?: string
  /** 是否为自动保存产生 */
  isAutoSave?: boolean
  /** 创建时间（ISO 字符串） */
  createdAt: string
}
