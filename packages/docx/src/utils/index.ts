/**
 * 防抖函数
 * @param {T} fn 需要防抖的原始函数
 * @param {number} delay 防抖延迟毫秒数，默认 200
 * @returns {(...args: Parameters<T>) => void} 防抖后的函数
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay = 200
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  return function (this: any, ...args: Parameters<T>) {
    if (timer) {
      clearTimeout(timer)
    }
    timer = setTimeout(() => {
      fn.apply(this, args)
      timer = null
    }, delay)
  }
}

/**
 * 从文件路径或文件名提取文档显示名（去掉扩展名）
 * @param {string} pathOrFileName 文件路径或文件名
 * @returns {string} 去除扩展名后的文档显示名，空输入返回空字符串
 */
export function deriveDocumentNameFromPath(pathOrFileName: string): string {
  const raw = String(pathOrFileName || '').trim()
  if (!raw) return ''
  const segment = raw.split(/[/\\]/).pop()?.split('?')[0]?.split('#')[0] || ''
  return segment.replace(/\.[^.]+$/, '') || segment
}

/**
 * 获取用户头像文字
 * @param {string} name 用户显示名
 * @returns {string} 头像文字：中文取末两位，英文取首字母组合，空输入返回 '?'
 */
export function getAvatarText(name: string): string {
  const s = String(name || '').trim()
  if (!s) return '?'
  if (/[\u4e00-\u9fa5]/.test(s)) return s.slice(-2)
  const parts = s.split(/[\s_-]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return s.slice(0, 2).toUpperCase()
}
