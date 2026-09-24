/**
 * BlockPainter —— 段落位图绘制纯函数
 *
 * 从 CanvasRenderer 抽出，无 this 依赖，用于把 paragraph block 绘制到目标 ctx。
 */

import type { ParagraphBlock, InlineBox } from './layout-types'
import type { IGroupColor } from '@vervedoc/docx-editor-schema'
import { getAuthorColor } from '@vervedoc/docx-editor-schema'

/** 单条文本绘制命令（分桶合并绘制以减少 ctx.font 切换开销） */
export interface DrawCommand {
  font: string
  color: string
  x: number
  y: number
  text: string
  letterSpacing?: number
}

/** 段落绘制选项 */
export interface PaintOptions {
  groupColors?: Record<string, IGroupColor>
  activeGroupId?: string | null
  activeRevision?: { id: string; color: string } | null
}

/** 绘制上下文类型（HTMLCanvasElement 或 OffscreenCanvas） */
export type PaintCtx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

/** 由 inline 生成 CSS font 简写 */
export function fontOf(inl: InlineBox): string {
  const w = inl.bold ? '700' : '400'
  const s = inl.italic ? 'italic ' : ''
  return `${s}${w} ${inl.size}px ${inl.font}`
}

/** 将绘制命令按 key 推入分桶 */
export function addBucket(buckets: Map<string, DrawCommand[]>, key: string, cmd: DrawCommand): void {
  let list = buckets.get(key)
  if (!list) { list = []; buckets.set(key, list) }
  list.push(cmd)
}

/** 将 hex 颜色转为半透明高亮色（批注/修订文本背景） */
export function groupHighlightColor(color: string, active = false): string {
  const m = color.match(/^#([0-9a-f]{6})$/i)
  if (m) {
    const r = parseInt(m[1].slice(0, 2), 16)
    const g = parseInt(m[1].slice(2, 4), 16)
    const b = parseInt(m[1].slice(4, 6), 16)
    return `rgba(${r},${g},${b},${active ? 0.14 : 0.18})`
  }
  return color
}

/**
 * 将段落块绘制到目标 ctx：项目符号/编号 + 分桶文本 + 背景色 + 下划线/删除线。
 * @param ctx 目标 2d 上下文
 * @param b 段落块
 * @param opts 绘制选项（groupColors / activeGroupId）
 */
export function paintParagraph(ctx: PaintCtx, b: ParagraphBlock, opts: PaintOptions): void {
  // 项目符号 / 编号
  if (b.bulletText) {
    const firstLine = b.lines[0]
    if (firstLine) {
      const size = b.bulletSize ?? 16
      const family = b.bulletFont ?? 'sans-serif'
      const bold = b.bulletBold ? '700' : '400'
      ctx.font = `${bold} ${size}px ${family}`
      ctx.fillStyle = b.bulletColor ?? '#000000'
      ctx.textBaseline = 'alphabetic'
      const bx = firstLine.x + (b.bulletX ?? -(b.bulletWidth ?? 0))
      const by = firstLine.y + firstLine.baseline
      ctx.fillText(b.bulletText, bx, by)
    }
  }
  // 分桶
  const buckets = new Map<string, DrawCommand[]>()
  const bgRects: { x: number; y: number; w: number; h: number; color: string }[] = []
  const strokes: { x1: number; y1: number; x2: number; y2: number; color: string; width: number }[] = []
  const groupColors = opts.groupColors
  const activeColor = opts.activeGroupId ? groupColors?.[opts.activeGroupId]?.color : undefined
  for (const line of b.lines) {
    for (const inl of line.inlines) {
      const hasGroupHighlight = !!(groupColors && inl.groupIds?.some(gid => groupColors[gid]))
      if (opts.activeRevision && inl.run && 'revisionId' in inl.run && inl.run.revisionId === opts.activeRevision.id) {
        bgRects.push({ x: inl.x, y: inl.y, w: inl.width, h: line.height, color: groupHighlightColor(opts.activeRevision.color, true) })
      } else if (activeColor && opts.activeGroupId && inl.groupIds?.includes(opts.activeGroupId)) {
        bgRects.push({ x: inl.x, y: inl.y, w: inl.width, h: line.height, color: groupHighlightColor(activeColor, true) })
      } else if (hasGroupHighlight) {
        for (const gid of inl.groupIds!) {
          const gc = groupColors![gid]
          if (gc) {
            bgRects.push({ x: inl.x, y: inl.y, w: inl.width, h: line.height, color: groupHighlightColor(gc.color, gid === opts.activeGroupId) })
          }
        }
      } else if (inl.bgColor) {
        bgRects.push({ x: inl.x, y: inl.y, w: inl.width, h: line.height, color: inl.bgColor })
      }
      const run = inl.run
      const revisionType = run && 'revisionId' in run && run.revisionId && 'revisionType' in run
        ? run.revisionType : undefined
      const inserted = revisionType === 'insert'
      const deleted = revisionType === 'delete'
      const revisionColor = inserted || deleted
        ? getAuthorColor(run && 'revisionAuthor' in run ? String(run.revisionAuthor ?? '') : '')
        : undefined
      const textColor = revisionColor ?? inl.color
      if (inl.text === '\t' && (run?.extension?.toc as { role?: string } | undefined)?.role === 'entry') {
        ctx.save()
        ctx.strokeStyle = textColor
        ctx.lineWidth = 1
        ctx.setLineDash([1, 3])
        ctx.beginPath()
        ctx.moveTo(inl.x + 3, inl.baseline)
        ctx.lineTo(inl.x + Math.max(3, inl.width - 3), inl.baseline)
        ctx.stroke()
        ctx.restore()
        continue
      }
      const font = fontOf(inl)
      const key = `${font}||${textColor}`
      addBucket(buckets, key, {
        font, color: textColor,
        x: inl.x, y: inl.baseline,
        text: inl.text,
        letterSpacing: inl.letterSpacing
      })
      // Review marks are visual overlays, never persisted as ordinary formatting.
      if (inserted || inl.underline) {
        strokes.push({
          x1: inl.x, y1: inl.baseline + 2, x2: inl.x + inl.width, y2: inl.baseline + 2,
          color: inserted ? revisionColor! : textColor, width: 1
        })
      }
      if (deleted || inl.strikeout) {
        const my = inl.baseline - inl.size * 0.3
        strokes.push({
          x1: inl.x, y1: my, x2: inl.x + inl.width, y2: my,
          color: deleted ? revisionColor! : textColor, width: 1
        })
      }
    }
  }
  for (const r of bgRects) {
    ctx.fillStyle = r.color
    ctx.fillRect(Math.round(r.x), Math.round(r.y), Math.round(r.w), Math.round(r.h))
  }
  ctx.textBaseline = 'alphabetic'
  for (const [key, list] of buckets) {
    const [font, color] = key.split('||')
    ctx.font = font
    ctx.fillStyle = color
    for (const c of list) {
      if (!c.letterSpacing) {
        ctx.fillText(c.text, c.x, c.y)
      } else {
        let cx = c.x
        for (let i = 0; i < c.text.length; i++) {
          const ch = c.text[i]
          ctx.fillText(ch, cx, c.y)
          cx += ctx.measureText(ch).width + c.letterSpacing
        }
      }
    }
  }
  for (const s of strokes) {
    ctx.strokeStyle = s.color
    ctx.lineWidth = s.width
    ctx.beginPath()
    ctx.moveTo(s.x1 + 0.5, s.y1 + 0.5)
    ctx.lineTo(s.x2 + 0.5, s.y2 + 0.5)
    ctx.stroke()
  }
}
