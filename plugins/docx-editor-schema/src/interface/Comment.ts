export interface IComment {
  id: string
  groupId: string
  content: string
  userName: string
  avatarColor?: string
  createdDate: string
  rangeText: string
  status?: number
  replies?: IComment[]
  position?: {
    top: number
    left: number
    lineWidth: number
    originalTop?: number
  }
  anchor?: {
    startX: number
    startY: number
    endX: number
    endY: number
    lineHeight?: number
  }
  isHovered?: boolean
  isEditing?: boolean
  isReplying?: boolean
}
