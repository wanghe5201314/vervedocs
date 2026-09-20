const AUTHOR_COLORS = [
  '#409EFF', '#67C23A', '#E6A23C', '#F56C6C',
  '#909399', '#00BCD4', '#9C27B0', '#3F51B5',
  '#FF9800', '#4CAF50', '#009688', '#795548',
  '#FF5722', '#C2185B', '#FFC107', '#607D8B'
]

/** Stable author colors shared by review text, balloons and connectors. */
export function getAuthorColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AUTHOR_COLORS[Math.abs(hash) % AUTHOR_COLORS.length]
}
