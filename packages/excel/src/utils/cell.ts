/** 单元格行列索引 → "row:col" 存储 key */
export function cellKey(row: number, col: number): string {
  return `${row}:${col}`
}

/** 0 起始列索引 → Excel 列标（A、B、…、AA） */
export function columnLabel(index: number): string {
  let n = index + 1
  let label = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    label = String.fromCharCode(65 + rem) + label
    n = Math.floor((n - 1) / 26)
  }
  return label
}
