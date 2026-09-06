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

/** 格式化树上下文：携带编辑器选项、样式表、编号定义等归一化所需依赖 */
export interface FormatTreeContext {
  /** 编辑器选项 */
  editorOptions: IEditorOption
  /** 段落样式表 */
  styles?: Record<string, IParagraphStyle>
  /** 列表编号定义表 */
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
  // 空文档兜底：若 elements 为空数组，插入一个携带默认字体/字号的空 text run，
  // 以保证 layout 能产出一个段落 block（空段兜底会为其生成零宽 caret 承载 inline），
  // 光标可以定位、用户可以直接输入。新字符会拼入该 run 并继承其属性（默认无 bold/highlight）。
  if (elements.length === 0) {
    elements.push({
      type: 'text',
      value: '',
      font: ctx.editorOptions.defaultFont,
      size: ctx.editorOptions.defaultSize
    } as unknown as IElement)
  }
  for (let i = 0; i < elements.length; i++) {
    normalizeNode(elements[i], ctx)
  }
  return elements
}

/**
 * 单节点归一化分发：按节点类型调用对应的归一化函数。
 * @param node 当前节点
 * @param ctx 格式化上下文
 */
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

/**
 * 归一化 text 节点：补全 value、font、size 默认值并应用段落样式。
 * @param node text 节点
 * @param ctx 格式化上下文
 */
function normalizeText(node: IElement, ctx: FormatTreeContext): void {
  const anyNode = node as unknown as Record<string, unknown>
  if (typeof anyNode.value !== 'string') anyNode.value = String(anyNode.value ?? '')
  if (anyNode.font == null) anyNode.font = ctx.editorOptions.defaultFont
  if (anyNode.size == null) anyNode.size = ctx.editorOptions.defaultSize
  applyParagraphStyleId(node, ctx)
}

/**
 * 归一化 title 节点：补全 valueList、level 默认值，递归归一化子节点并下沉段落属性。
 * @param node title 节点
 * @param ctx 格式化上下文
 */
function normalizeTitle(node: ITitleElement, ctx: FormatTreeContext): void {
  if (!Array.isArray(node.valueList)) node.valueList = []
  if (!node.level) node.level = 'first'
  applyParagraphStyleId(node, ctx)
  formatElementTree(node.valueList, ctx)
  // 段落级属性下沉到 valueList 内每个 run 上（若 run 未指定则继承）
  inheritParagraphAttrsToChildren(node)
}

/**
 * 归一化 list 节点：补全 valueList、listType、listStyle、listLevel 等默认值，
 * 关联 numbering 定义，递归归一化子节点并下沉段落属性。
 * @param node list 节点
 * @param ctx 格式化上下文
 */
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

/**
 * 归一化 table 节点：补全 colgroup、trList，递归归一化各行；
 * 若 colgroup 为空则用第一行宽度推导。
 * @param node table 节点
 * @param ctx 格式化上下文
 */
function normalizeTable(node: ITableElement, ctx: FormatTreeContext): void {
  if (!Array.isArray(node.colgroup)) node.colgroup = []
  if (!Array.isArray(node.trList)) node.trList = []

  for (const tr of node.trList) normalizeTr(tr, ctx)

  // 若 colgroup 为空则用第一行宽度推导
  if (node.colgroup.length === 0 && node.trList[0]) {
    node.colgroup = node.trList[0].tdList.map(td => ({ width: td.width || 100 }))
  }
}

/**
 * 归一化表格行：补全 height、tdList 默认值，递归归一化各单元格。
 * @param tr 表格行
 * @param ctx 格式化上下文
 */
function normalizeTr(tr: ITr, ctx: FormatTreeContext): void {
  if (typeof tr.height !== 'number' || tr.height <= 0) tr.height = 32
  if (!Array.isArray(tr.tdList)) tr.tdList = []
  for (const td of tr.tdList) normalizeTd(td, ctx)
}

/**
 * 归一化单元格：补全 width、colspan、rowspan、verticalAlign、padding、borderStyle 默认值，
 * 递归归一化单元格内容。
 * @param td 表格单元格
 * @param ctx 格式化上下文
 */
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

/**
 * 归一化 image 节点：补全 width、height、rotate 默认值并应用段落样式。
 * @param node image 节点
 * @param ctx 格式化上下文
 */
function normalizeImage(node: IElement, ctx: FormatTreeContext): void {
  const anyNode = node as unknown as Record<string, unknown>
  if (typeof anyNode.width !== 'number' || (anyNode.width as number) <= 0) anyNode.width = 200
  if (typeof anyNode.height !== 'number' || (anyNode.height as number) <= 0) anyNode.height = 150
  if (typeof anyNode.rotate !== 'number') anyNode.rotate = 0
  applyParagraphStyleId(node, ctx)
}

/**
 * 归一化 pageBreak 节点：补全 value 默认值为 'manual' 并应用段落样式。
 * @param node pageBreak 节点
 * @param ctx 格式化上下文
 */
function normalizePageBreak(node: IElement, ctx: FormatTreeContext): void {
  const anyNode = node as unknown as Record<string, unknown>
  if (anyNode.value !== 'manual' && anyNode.value !== 'auto') anyNode.value = 'manual'
  applyParagraphStyleId(node, ctx)
}

/**
 * 应用段落样式表：当节点引用了 paragraphStyleId 时，将样式字段填入节点未显式设置的字段。
 * @param node 当前节点
 * @param ctx 格式化上下文
 */
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
