/**
 * VerveDocs Schema —— formatElementTree
 *
 * 唯一的树归一入口：只做默认值补全、字段规范化，绝不扁平化。
 * 输入即输出（原地修改），返回同一引用。
 */

import type {
  IElement,
  IEditorOption,
  IListNumbering,
  IParagraphStyle,
  ITitleElement,
  IListElement,
  ITableElement,
  ITd,
  ITr
} from './types'
import { DEFAULT_EDITOR_OPTION } from './constants'

export interface FormatTreeContext {
  editorOptions: IEditorOption
  styles?: Record<string, IParagraphStyle>
  numbering?: Record<string, IListNumbering>
  /** 供 LaTeX / 公式等扩展使用的转换钩子 */
  laTexToSVG?: (latex: string) => string
}

/**
 * 归一化编辑器选项，填充默认值。
 */
export function mergeOption(options?: IEditorOption): IEditorOption {
  return { ...DEFAULT_EDITOR_OPTION, ...(options || {}) }
}

/**
 * 递归归一化元素树。
 * - 保证段落容器有 valueList
 * - 保证 table 有 colgroup / trList / tdList
 * - 保证 td 有 padding / borderStyle / verticalAlign
 * - 保证 image 有 width/height
 * - 补齐 text 的默认字体/字号
 */
export function formatElementTree(
  elements: IElement[],
  ctx: FormatTreeContext
): IElement[] {
  if (!Array.isArray(elements)) return elements
  for (let i = 0; i < elements.length; i++) {
    normalizeNode(elements[i], ctx)
  }
  return elements
}

function normalizeNode(node: IElement, ctx: FormatTreeContext): void {
  if (!node || typeof node !== 'object') return

  switch (node.type) {
    case 'text':
      normalizeText(node as IElement, ctx)
      break
    case 'title':
      normalizeTitle(node as ITitleElement, ctx)
      break
    case 'list':
      normalizeList(node as IListElement, ctx)
      break
    case 'table':
      normalizeTable(node as ITableElement, ctx)
      break
    case 'image':
      normalizeImage(node as IElement, ctx)
      break
    case 'pageBreak':
      normalizePageBreak(node as IElement, ctx)
      break
    default:
      // 兜底：拥有 valueList/tdList/value 数组的容器一律递归
      const anyNode = node as unknown as Record<string, unknown>
      if (Array.isArray(anyNode.valueList)) {
        formatElementTree(anyNode.valueList as IElement[], ctx)
      }
      break
  }
}

/* -------------------- text -------------------- */

function normalizeText(node: IElement, ctx: FormatTreeContext): void {
  const anyNode = node as unknown as Record<string, unknown>
  if (typeof anyNode.value !== 'string') anyNode.value = String(anyNode.value ?? '')
  if (anyNode.font == null) anyNode.font = ctx.editorOptions.defaultFont
  if (anyNode.size == null) anyNode.size = ctx.editorOptions.defaultSize
  applyParagraphStyleId(node, ctx)
}

/* -------------------- title -------------------- */

function normalizeTitle(node: ITitleElement, ctx: FormatTreeContext): void {
  if (!Array.isArray(node.valueList)) node.valueList = []
  if (!node.level) node.level = 'first'
  applyParagraphStyleId(node, ctx)
  formatElementTree(node.valueList, ctx)
  // 段落级属性下沉到 valueList 内每个 run 上（若 run 未指定则继承）
  inheritParagraphAttrsToChildren(node)
}

/* -------------------- list -------------------- */

function normalizeList(node: IListElement, ctx: FormatTreeContext): void {
  if (!Array.isArray(node.valueList)) node.valueList = []
  if (!node.listType) node.listType = 'ul'
  if (!node.listStyle) node.listStyle = node.listType === 'ol' ? 'decimal' : 'disc'
  if (typeof node.listLevel !== 'number') node.listLevel = 0
  // 若有 numbering 定义引用，补齐
  if (!node.listNumbering && ctx.numbering) {
    const numId = (node as unknown as { numId?: string }).numId
    if (numId && ctx.numbering[numId]) node.listNumbering = ctx.numbering[numId]
  }
  applyParagraphStyleId(node, ctx)
  formatElementTree(node.valueList, ctx)
  inheritParagraphAttrsToChildren(node)
}

/* -------------------- table -------------------- */

function normalizeTable(node: ITableElement, ctx: FormatTreeContext): void {
  if (!Array.isArray(node.colgroup)) node.colgroup = []
  if (!Array.isArray(node.trList)) node.trList = []

  for (const tr of node.trList) normalizeTr(tr, ctx)

  // 若 colgroup 为空则用第一行宽度推导
  if (node.colgroup.length === 0 && node.trList[0]) {
    node.colgroup = node.trList[0].tdList.map(td => ({ width: td.width || 100 }))
  }
}

function normalizeTr(tr: ITr, ctx: FormatTreeContext): void {
  if (typeof tr.height !== 'number' || tr.height <= 0) tr.height = 32
  if (!Array.isArray(tr.tdList)) tr.tdList = []
  for (const td of tr.tdList) normalizeTd(td, ctx)
}

function normalizeTd(td: ITd, ctx: FormatTreeContext): void {
  if (typeof td.width !== 'number' || td.width <= 0) td.width = 100
  if (typeof td.colspan !== 'number' || td.colspan <= 0) td.colspan = 1
  if (typeof td.rowspan !== 'number' || td.rowspan <= 0) td.rowspan = 1
  if (!td.verticalAlign) td.verticalAlign = 'top'
  if (!Array.isArray(td.padding) || td.padding.length !== 4) {
    td.padding = [5, 5, 5, 5]
  }
  if (!td.borderStyle) {
    td.borderStyle = {
      top:    { width: 1, color: '#000000', style: 'solid' },
      right:  { width: 1, color: '#000000', style: 'solid' },
      bottom: { width: 1, color: '#000000', style: 'solid' },
      left:   { width: 1, color: '#000000', style: 'solid' }
    }
  }
  if (!Array.isArray(td.value)) td.value = []
  formatElementTree(td.value, ctx)
}

/* -------------------- image -------------------- */

function normalizeImage(node: IElement, ctx: FormatTreeContext): void {
  const anyNode = node as unknown as Record<string, unknown>
  if (typeof anyNode.width !== 'number' || (anyNode.width as number) <= 0) anyNode.width = 200
  if (typeof anyNode.height !== 'number' || (anyNode.height as number) <= 0) anyNode.height = 150
  applyParagraphStyleId(node, ctx)
}

/* -------------------- pageBreak -------------------- */

function normalizePageBreak(node: IElement, ctx: FormatTreeContext): void {
  const anyNode = node as unknown as Record<string, unknown>
  if (anyNode.value !== 'manual' && anyNode.value !== 'auto') anyNode.value = 'manual'
  applyParagraphStyleId(node, ctx)
}

/* -------------------- 样式表应用 -------------------- */

function applyParagraphStyleId(node: IElement, ctx: FormatTreeContext): void {
  if (!ctx.styles) return
  const styleId = (node as unknown as { paragraphStyleId?: string }).paragraphStyleId
  if (!styleId) return
  const style = ctx.styles[styleId]
  if (!style) return
  const anyNode = node as unknown as Record<string, unknown>
  // 只在字段未显式设置时应用
  for (const key of Object.keys(style)) {
    if (key === 'id' || key === 'name' || key === 'basedOn') continue
    if (anyNode[key] == null) anyNode[key] = (style as unknown as Record<string, unknown>)[key]
  }
}

/**
 * 将容器上定义的段落级属性下沉到子 runs（子未显式指定时）。
 * 只处理段落级字段，不动 font/size/bold 等 run 级属性。
 */
function inheritParagraphAttrsToChildren(container: ITitleElement | IListElement): void {
  const PARA_KEYS = [
    'rowFlex',
    'paragraphStyleId',
    'paragraphFirstLineIndent',
    'paragraphIndentLeft',
    'paragraphSpacingBefore',
    'paragraphSpacingAfter',
    'lineHeight',
    'lineHeightRule'
  ] as const
  const containerAny = container as unknown as Record<string, unknown>
  for (const child of container.valueList) {
    const childAny = child as unknown as Record<string, unknown>
    for (const key of PARA_KEYS) {
      if (containerAny[key] != null && childAny[key] == null) {
        childAny[key] = containerAny[key]
      }
    }
  }
}
