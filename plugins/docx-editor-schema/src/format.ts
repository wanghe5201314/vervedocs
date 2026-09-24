/**
 * VerveDocs Schema —— formatElementTree
 *
 * 唯一的树归一入口：只做默认值补全、字段规范化，绝不扁平化。
 * 输入即输出（原地修改），返回同一引用。
 */

import type {
  IElement,
  IImageElement,
  IImageGeometry,
  IDocxDocumentMeta,
  IEditorOption,
  IListNumbering,
  IParagraphStyle,
  IBookmark,
  ITitleElement,
  IListElement,
  ITableElement,
  ITd,
  ITr,
  Path,
  PathSegment
} from './types'
import { DEFAULT_EDITOR_OPTION } from './constants'
import { isParagraphContainer, isTable, walkTree } from './walk'

/** 按节引用选择页眉页脚；未定义的引用按 OOXML 继承前节同类引用。 */
export function resolveHeaderFooterPart(doc: IDocxDocumentMeta, zone: 'header' | 'footer', sectionIndex: number, pageIndex: number, firstPage: boolean): string | undefined {
  const section = doc.sections?.[sectionIndex]
  const kind = firstPage && section?.titlePage ? 'first' : doc.evenAndOddHeaders && (pageIndex + 1) % 2 === 0 ? 'even' : 'default'
  for (let index = sectionIndex; index >= 0; index--) {
    const refs = zone === 'header' ? doc.sections?.[index]?.headers : doc.sections?.[index]?.footers
    if (refs?.[kind] !== undefined) return refs[kind]
  }
  return undefined
}

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
  /** 书签标记收集器（遍历时填充，调用方配对 start/end 构建 bookmarks） */
  bookmarkMarkers?: { name: string; position: string; path: Path }[]
  /** 内部路径栈（递归时 push/pop，不暴露给外部） */
  _pathStack?: PathSegment[]
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
  const stack = ctx._pathStack ??= []
  for (let i = 0; i < elements.length; i++) {
    stack.push(i)
    const ext = (elements[i] as unknown as { extension?: { bookmarkMarker?: { name: string; position: string } } }).extension
    if (ext?.bookmarkMarker && ctx.bookmarkMarkers) {
      ctx.bookmarkMarkers.push({
        name: ext.bookmarkMarker.name,
        position: ext.bookmarkMarker.position,
        path: [...stack]
      })
    }
    normalizeNode(elements[i], ctx)
    stack.pop()
  }
  return elements
}

/**
 * 调整浮动图片坐标：为非 inline/block 的浮动图片叠加页边距和行内 ascent 偏移。
 * 仅在导入时调用一次，不随 formatElementTree 自动触发（避免 undo/redo 二次偏移）。
 * @param elements 顶层元素数组（原地修改）
 * @param editorOptions 编辑器选项（提供 margins/paperDirection/defaultSize）
 */
export function adjustFloatImagePositions(
  elements: IElement[],
  editorOptions: IEditorOption
): void {
  // 坐标由 Java imageLayout 提供；保留旧 API，但禁止二次估算偏移。
  void elements
  void editorOptions
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
        ctx._pathStack?.push('valueList')
        formatElementTree(anyNode.valueList as IElement[], ctx)
        ctx._pathStack?.pop()
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
  ctx._pathStack?.push('valueList')
  formatElementTree(node.valueList, ctx)
  ctx._pathStack?.pop()
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
  ctx._pathStack?.push('valueList')
  formatElementTree(node.valueList, ctx)
  ctx._pathStack?.pop()
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

  for (let ri = 0; ri < node.trList.length; ri++) {
    ctx._pathStack?.push('trList', ri)
    normalizeTr(node.trList[ri], ctx)
    ctx._pathStack?.splice(-2, 2)
  }

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
  for (let ci = 0; ci < tr.tdList.length; ci++) {
    ctx._pathStack?.push('tdList', ci)
    normalizeTd(tr.tdList[ci], ctx)
    ctx._pathStack?.splice(-2, 2)
  }
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
  if (!td.verticalAlign) td.verticalAlign = 'middle'
  if (!Array.isArray(td.padding) || td.padding.length !== 4) {
    td.padding = [2, 2, 2, 2]
  }
  if (!Array.isArray(td.value)) td.value = []
  ctx._pathStack?.push('value')
  formatElementTree(td.value, ctx)
  ctx._pathStack?.pop()
}

/**
 * 归一化 image 节点：补全 width、height、rotate 默认值并应用段落样式。
 * @param node image 节点
 * @param ctx 格式化上下文
 */
function normalizeImage(node: IElement, ctx: FormatTreeContext): void {
  applyImageLayout(node as IImageElement)
  applyParagraphStyleId(node, ctx)
}

/** OOXML 的长度单位为 EMU，旋转单位为 1/60000 度。 */
export function applyImageLayout(image: IImageElement): void {
  const layout = image.imageLayout
  if (!layout) return
  const ext = layout.transform?.children.find(child => child.name === 'ext')
  if (ext?.attributes.cx !== undefined) image.width = Number(ext.attributes.cx) / 9525
  if (ext?.attributes.cy !== undefined) image.height = Number(ext.attributes.cy) / 9525
  image.rotate = Number(layout.transform?.attributes.rot ?? 0) / 60000
  if (layout.anchored === false) image.imgDisplay = 'inline'
  else if (layout.anchored === true) {
    const wrap = layout.positioning?.find(node => node.name.startsWith('wrap'))
    image.imgDisplay = wrap?.name === 'wrapNone'
      ? (layout.anchorAttributes?.behindDoc === '1' || layout.anchorAttributes?.behindDoc === 'true' ? 'float-bottom' : 'float-top')
      : 'surround'
  }
}

/** 用户调整图片时同时更新 Java 写回使用的几何结构。 */
export function updateImageLayout(image: IImageElement, changes: {
  width?: number; height?: number; rotate?: number; wrap?: IImageElement['imgDisplay']
}): void {
  const layout = image.imageLayout
  if (!layout) return
  const geometry = (name: string, namespace: string): IImageGeometry => ({ name, namespace, attributes: {}, children: [] })
  const drawing = 'http://schemas.openxmlformats.org/drawingml/2006/main'
  if (changes.width !== undefined || changes.height !== undefined || changes.rotate !== undefined) {
    const transform = layout.transform ??= geometry('xfrm', drawing)
    if (changes.rotate !== undefined) transform.attributes.rot = String(Math.round(changes.rotate * 60000))
    if (changes.width !== undefined || changes.height !== undefined) {
      let ext = transform.children.find(child => child.name === 'ext')
      if (!ext) { ext = geometry('ext', drawing); transform.children.push(ext) }
      if (changes.width !== undefined) ext.attributes.cx = String(Math.round(changes.width * 9525))
      if (changes.height !== undefined) ext.attributes.cy = String(Math.round(changes.height * 9525))
    }
  }
  if (changes.wrap !== undefined) {
    layout.anchored = changes.wrap !== 'inline' && changes.wrap !== 'block'
    layout.anchorAttributes ??= {}
    layout.anchorAttributes.behindDoc = changes.wrap === 'float-bottom' ? '1' : '0'
    layout.positioning = (layout.positioning ?? []).filter(node => !node.name.startsWith('wrap'))
    if (layout.anchored) {
      const wrap = geometry(changes.wrap === 'surround' ? 'wrapSquare' : 'wrapNone', 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing')
      if (changes.wrap === 'surround') wrap.attributes.wrapText = 'bothSides'
      layout.positioning.push(wrap)
    }
  }
  applyImageLayout(image)
}

/**
 * 归一化 pageBreak 节点：补全 value 默认值为 'manual' 并应用段落样式。
 * @param node pageBreak 节点
 * @param ctx 格式化上下文
 */
function normalizePageBreak(node: IElement, ctx: FormatTreeContext): void {
  const anyNode = node as unknown as Record<string, unknown>
  if (anyNode.value == null) throw new TypeError('pageBreak.value 缺失，必须由解析来源提供')
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
  const indentationBaseline = anyNode.paragraphIndentationBaseline as Record<string, number | null> | undefined
  // 只在字段未显式设置时应用
  for (const key of Object.keys(style)) {
    if (key === 'id' || key === 'name' || key === 'basedOn') continue
    const axis = key === 'paragraphIndentLeft' ? 'left'
      : key === 'paragraphIndentRight' ? 'right'
      : key === 'paragraphFirstLineIndent' ? 'firstLine' : undefined
    // 后端基线已解析过样式继承；null 也是结果，不能再从原始样式回填。
    if (axis && indentationBaseline && Object.prototype.hasOwnProperty.call(indentationBaseline, axis)) continue
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

/**
 * 将收集到的 bookmarkMarker 列表配对为 IBookmark[]。
 * 同名 start/end 配对，范围落在实际内容上，不把零宽标记作为选区文字。
 */
export function pairBookmarkMarkers(
  markers: { name: string; position: string; path: Path }[],
  elements: IElement[]
): IBookmark[] {
  const leaves: { node: IElement; path: Path }[] = []
  const indices = new Map<string, number>()
  walkTree(elements, (node, { path }) => {
    if (isParagraphContainer(node) || isTable(node)) return
    indices.set(JSON.stringify(path), leaves.length)
    leaves.push({ node, path })
  })
  const isContent = (node: IElement): boolean =>
    !node.extension?.bookmarkMarker && !node.extension?.fieldMarker &&
    (node.type !== 'text' || (!!node.value && !/^[\u200B\uFEFF]+$/.test(node.value)))
  const startMap = new Map<string, Path>()
  const bookmarks: IBookmark[] = []
  for (const m of markers) {
    if (m.position === 'start') {
      startMap.set(m.name, m.path)
    } else if (m.position === 'end') {
      const startPath = startMap.get(m.name)
      if (startPath) {
        const start = indices.get(JSON.stringify(startPath))
        const end = indices.get(JSON.stringify(m.path))
        let first: typeof leaves[number] | undefined
        let last: typeof leaves[number] | undefined
        if (start !== undefined && end !== undefined) {
          for (let index = start + 1; index < end; index++) {
            if (!isContent(leaves[index].node)) continue
            first ??= leaves[index]
            last = leaves[index]
          }
        }
        const anchor = { path: first?.path ?? startPath, offset: 0 }
        bookmarks.push({
          name: m.name,
          range: {
            anchor,
            focus: last
              ? { path: last.path, offset: last.node.type === 'text' ? last.node.value.length : 1 }
              : { ...anchor }
          },
          collapsed: !first,
          hidden: m.name.startsWith('_')
        })
        startMap.delete(m.name)
      }
    }
  }
  return bookmarks
}
