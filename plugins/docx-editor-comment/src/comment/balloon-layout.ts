/**
 * 气泡布局工具：批注/修订气泡共用的布局计算函数。
 * 提取自 CommentComponent 与 RevisionComponent 的重复逻辑。
 */

/** 垂直占用范围 */
export interface VerticalRange {
  top: number
  bottom: number
}

/** 从容器中收集指定选择器元素的垂直占用范围（top + height） */
export function collectOccupiedRanges(container: HTMLElement | null, selector: string): VerticalRange[] {
  if (!container) return []
  const ranges: VerticalRange[] = []
  const elements = container.querySelectorAll(selector)
  elements.forEach((el: Element) => {
    const node = el as HTMLElement
    const top = Number.parseFloat(node.style.top || '')
    const height = node.offsetHeight || node.getBoundingClientRect().height || 0
    if (Number.isFinite(top) && height > 0) {
      ranges.push({ top, bottom: top + height })
    }
  })
  ranges.sort((a, b) => a.top - b.top)
  return ranges
}

/**
 * 解决垂直重叠：将 items 中的元素逐个向下推移以避免与 occupied 范围重叠。
 * @param items 待排布的元素列表
 * @param occupied 已占用的垂直范围（会被就地追加新范围）
 * @param getHeight 获取元素高度
 * @param getTop 获取元素当前 top
 * @param setTop 设置元素 top
 * @param gap 元素间的最小间距，默认 12
 */
export function resolveVerticalOverlaps<T>(
  items: T[],
  occupied: VerticalRange[],
  getHeight: (item: T) => number,
  getTop: (item: T) => number,
  setTop: (item: T, top: number) => void,
  gap = 12
): void {
  for (const item of items) {
    const height = getHeight(item)
    let top = getTop(item)
    let changed = true
    while (changed) {
      changed = false
      for (const range of occupied) {
        if (top < range.bottom + gap && top + height > range.top - gap) {
          top = range.bottom + gap
          changed = true
        }
      }
    }
    setTop(item, top)
    occupied.push({ top, bottom: top + height })
    occupied.sort((a, b) => a.top - b.top)
  }
}

/**
 * 应用容器宽度：根据批注/修订所需的额外宽度调整容器尺寸。
 * 新架构下容器宽度由 Draw 管理，overlay 通过 overflow: visible 自然溢出。
 */
export function applyContainerWidth(container: HTMLDivElement, pageWidth: number): void {
  if ((container as any).__vervedocsNewLayout) return
  const commentWidth = (container as any).__commentNeededWidth || 0
  const revisionWidth = (container as any).__revisionNeededWidth || 0
  const neededWidth = Math.max(commentWidth, revisionWidth)
  if (neededWidth > pageWidth) {
    container.style.width = `${neededWidth}px`
    container.style.minWidth = `${neededWidth}px`
  } else {
    container.style.width = `${pageWidth}px`
    container.style.minWidth = ''
  }
}