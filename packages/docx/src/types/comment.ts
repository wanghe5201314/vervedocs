/**
 * 批注数据接口
 */
export interface IComment {
  /** 批注唯一标识 */
  id: string
  /** 批注分组标识（同一范围的多条批注共享 groupId） */
  groupId: string
  /** 批注正文内容 */
  content: string
  /** 批注作者显示名 */
  userName: string
  /** 作者头像颜色（HEX） */
  avatarColor?: string
  /** 创建时间（ISO 字符串） */
  createdDate: string
  /** 批注关联的选区文本 */
  rangeText: string
  /** 批注状态：0=已删除, 1=正常, 2=已解决 */
  status?: number
  /** 回复列表（嵌套批注） */
  replies?: IComment[]
  /** 批注气泡定位信息 */
  position?: {
    /** 距顶部偏移（px） */
    top: number
    /** 距左侧偏移（px） */
    left: number
    /** 指示线宽度（px） */
    lineWidth: number
    /** 原始位置，用于重叠检测 */
    originalTop?: number
  }
  /** 是否处于悬停态 */
  isHovered?: boolean
  /** 是否处于编辑状态 */
  isEditing?: boolean
  /** 是否正在回复 */
  isReplying?: boolean
}

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
