/**
 * 终端表格渲染工具
 *
 * 使用 box drawing 字符绘制带边框的表格，正确处理 CJK 字符宽度。
 */

/** 计算字符串的显示宽度（CJK 及全角字符占 2 列） */
function displayWidth(s: string): number {
    let w = 0
    for (const ch of s) {
      const code = ch.codePointAt(0)!
      if (
        (code >= 0x1100 && code <= 0x115f) ||
        (code >= 0x2e80 && code <= 0xa4cf && code !== 0x303f) ||
        (code >= 0xac00 && code <= 0xd7a3) ||
        (code >= 0xf900 && code <= 0xfaff) ||
        (code >= 0xfe30 && code <= 0xfe4f) ||
        (code >= 0xff00 && code <= 0xff60) ||
        (code >= 0xffe0 && code <= 0xffe6)
      ) {
        w += 2
      } else {
        w += 1
      }
    }
    return w
  }
  
  /**
   * 用空格右填充字符串到指定显示宽度。
   *
   * @param s 原始字符串
   * @param width 目标显示宽度
   * @returns 填充后的字符串
   */
  function padCell(s: string, width: number): string {
    return s + ' '.repeat(Math.max(0, width - displayWidth(s)))
  }
  
  /**
   * 渲染带边框的表格，支持单元格内多行文本（用 \n 分隔）。
   *
   * @param columns 表头
   * @param rows 数据行（每个单元格可以是多行字符串）
   * @returns 多行字符串（不含首尾换行）
   */
  export function renderTable(columns: string[], rows: string[][]): string {
    const cols = columns.length
    const widths: number[] = columns.map((h) => displayWidth(h))
    for (const row of rows) {
      for (let i = 0; i < cols; i++) {
        for (const line of String(row[i] ?? '').split('\n')) {
          const w = displayWidth(line)
          if (w > widths[i]) widths[i] = w
        }
      }
    }
  
    const sep = (left: string, mid: string, right: string) =>
      left + widths.map((w) => '─'.repeat(w + 2)).join(mid) + right
  
    const formatRow = (cells: string[]): string[] => {
      const cellLines = cells.map((c) => String(c ?? '').split('\n'))
      const maxLines = Math.max(...cellLines.map((cl) => cl.length))
      const lines: string[] = []
      for (let li = 0; li < maxLines; li++) {
        lines.push(
          '│ ' + cellLines.map((cl, i) => padCell(cl[li] ?? '', widths[i])).join(' │ ') + ' │',
        )
      }
      return lines
    }
  
    const out: string[] = []
    out.push(sep('┌', '┬', '┐'))
    out.push(...formatRow(columns))
    for (const row of rows) {
      out.push(sep('├', '┼', '┤'))
      out.push(...formatRow(row))
    }
    out.push(sep('└', '┴', '┘'))
    return out.join('\n')
  }