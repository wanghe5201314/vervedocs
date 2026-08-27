import { NS, emuToPx } from '../../constants'
import type { ImageChunk } from '../../types'
import { RelationshipEntry, parseRelationships } from '../relationship.resolver'
import { getFirstChildByTag } from '../xml.helper'

/**
 * 从 <w:drawing> 中提取图表预览图
 *
 * 策略：
 * 1. 检测 <c:chart r:id="rIdX"/>
 * 2. 查找图表 .rels 文件中的预览图
 * 3. 回退到 <a:blipFill> 缓存图片
 * 4. 无预览图则返回 null
 */
export function parseChart(
  drawingEl: Element,
  documentRels: Map<string, RelationshipEntry>,
  chartRelsMap: Record<string, string>,
  mediaMap: Record<string, string>
): ImageChunk | null {
  // 查找 <c:chart>
  const chartElements = drawingEl.getElementsByTagNameNS(NS.c, 'chart')
  if (chartElements.length === 0) return null

  const chartEl = chartElements[0]
  const rId =
    chartEl.getAttributeNS(NS.r, 'id') || chartEl.getAttribute('r:id') || ''
  if (!rId) {
    return null
  }

  // 获取图表路径
  const rel = documentRels.get(rId)
  if (!rel) {
    return null
  }

  const chartPath = rel.target.startsWith('word/')
    ? rel.target
    : `word/${rel.target.replace(/^\.\.\//, '')}`


  // 获取尺寸
  let width = 400
  let height = 300
  const container =
    getFirstChildByTag(drawingEl, NS.wp, 'inline') ||
    getFirstChildByTag(drawingEl, NS.wp, 'anchor')
  if (container) {
    const extent = getFirstChildByTag(container, NS.wp, 'extent')
    if (extent) {
      const cx = extent.getAttribute('cx')
      const cy = extent.getAttribute('cy')
      if (cx) width = emuToPx(parseInt(cx, 10))
      if (cy) height = emuToPx(parseInt(cy, 10))
    }
  }

  // 查找图表的 .rels 文件
  const chartRelsPath = chartPath.replace(
    /\/([^/]+)$/,
    '/_rels/$1.rels'
  )
  const chartRelsXml = chartRelsMap[chartRelsPath]

  if (chartRelsXml) {
    const chartRels = parseRelationships(chartRelsXml)
    // 查找 image relationship
    for (const entry of chartRels.values()) {
      if (entry.type.includes('image') || entry.target.match(/\.(png|jpg|jpeg|gif|bmp|tiff)$/i)) {
        const imagePath = resolveRelativePath(chartPath, entry.target)
        const src = mediaMap[imagePath] || mediaMap[entry.target]
        if (src) {
          return {
            type: 'image',
            src,
            width: Math.round(width),
            height: Math.round(height)
          }
        }
      }
    }
  }

  // 回退：检查 <a:blipFill> 中的缓存图片
  const blips = drawingEl.getElementsByTagNameNS(NS.a, 'blip')
  for (let i = 0; i < blips.length; i++) {
    const blip = blips[i]
    const embedId =
      blip.getAttributeNS(NS.r, 'embed') || blip.getAttribute('r:embed') || ''
    if (embedId) {
      const imgRel = documentRels.get(embedId)
      if (imgRel) {
        const target = imgRel.target.replace(/^\.\.\//, '')
        const mediaPath = target.startsWith('word/') ? target : `word/${target}`
        const src = mediaMap[mediaPath] || mediaMap[target]
        if (src) {
          return {
            type: 'image',
            src,
            width: Math.round(width),
            height: Math.round(height)
          }
        }
      }
    }
  }

  return null
}

/**
 * 检测 drawing 中是否包含图表
 */
export function isChartDrawing(drawingEl: Element): boolean {
  return drawingEl.getElementsByTagNameNS(NS.c, 'chart').length > 0
}

function resolveRelativePath(basePath: string, relativePath: string): string {
  const baseDir = basePath.substring(0, basePath.lastIndexOf('/'))
  const parts = relativePath.split('/')
  const baseParts = baseDir.split('/')

  for (const part of parts) {
    if (part === '..') {
      baseParts.pop()
    } else if (part !== '.') {
      baseParts.push(part)
    }
  }

  return baseParts.join('/')
}
