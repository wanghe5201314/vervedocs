// 批注数据接口
export interface IComment {
  id: string
  groupId: string
  content: string
  userName: string
  avatarColor?: string
  createdDate: string
  rangeText: string
  status?: number // 0=已删除, 1=正常, 2=已解决
  replies?: IComment[]
  position?: {
    top: number
    left: number
    lineWidth: number
    originalTop?: number // 原始位置,用于重叠检测
  }
  isHovered?: boolean
  isEditing?: boolean // 是否处于编辑状态
  isReplying?: boolean // 是否正在回复
}

// 权限级别
export type PermissionLevel = 'VIEWER' | 'COMMENTER' | 'EDITOR' | 'OWNER'

// 版本记录
export interface IVersion {
  id: number
  documentId: number
  versionNumber: number
  name?: string
  creatorName?: string
  changeSummary?: string
  isAutoSave?: boolean
  createdAt: string
}
