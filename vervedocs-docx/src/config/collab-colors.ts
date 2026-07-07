export const COLLAB_USER_COLORS = [
  '#4f87ff',
  '#f56040',
  '#22c55e',
  '#f59e0b',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#14b8a6',
  '#ef4444',
  '#6366f1'
] as const

export const getCollabColor = (index: number): string => {
  return COLLAB_USER_COLORS[index % COLLAB_USER_COLORS.length]
}