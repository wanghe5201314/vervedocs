export interface IGroupColor {
  color: string
  status: number
}

export interface IGroup {
  opacity?: number
  backgroundColor?: string
  activeOpacity?: number
  activeBackgroundColor?: string
  disabled?: boolean
  deletable?: boolean
  groupColors?: Record<string, IGroupColor>
  resolvedOpacity?: number
}
