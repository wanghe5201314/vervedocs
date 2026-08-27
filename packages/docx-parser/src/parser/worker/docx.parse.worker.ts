import { NS } from '../constants'
import type {
  IWorkerRequest, IWorkerResponse, DocNode, ParagraphNode
} from '../types'
import { parseXml, forEachChild, getFirstChildByTag } from './xml.helper'
import { parseRelationships, RelationshipEntry } from './relationship.resolver'
import { parseTheme } from './theme.resolver'
import { StyleResolver } from './style.resolver'
import { NumberingResolver } from './numbering.resolver'
import { parseParagraph } from './parsers/paragraph.parser'
import { parseTable } from './parsers/table.parser'
import { isTocSdt, parseTocContent } from './parsers/toc.parser'
import { parseSectionProperties, buildColumnNode } from './parsers/section.parser'
import { isChartDrawing, parseChart } from './parsers/chart.parser'
import { buildElements } from './builder/element.builder'

/**
 * Worker 入口：接收消息，执行解析，返回结果
 */
self.onmessage = function (e: MessageEvent<IWorkerRequest>) {
  try {
    const result = processDocx(e.data)
    const worker = self as unknown as { postMessage: (msg: unknown) => void }
    worker.postMessage(result)
  } catch (error: any) {
    const worker = self as unknown as { postMessage: (msg: unknown) => void }
    worker.postMessage({
      success: false,
      elements: [],
      error: error.message || String(error)
    } satisfies IWorkerResponse)
  }
}

function processDocx(request: IWorkerRequest): IWorkerResponse {
  const {
    documentXml, stylesXml, numberingXml, themeXml,
    documentRels: documentRelsXml, chartRelsMap,
    mediaMap, options
  } = request

  // 1. 初始化 resolvers
  const theme = parseTheme(themeXml)
  const styleResolver = new StyleResolver(stylesXml, theme)
  const numberingResolver = new NumberingResolver(numberingXml)
  const documentRels = documentRelsXml
    ? parseRelationships(documentRelsXml)
    : new Map<string, RelationshipEntry>()

  // 2. 解析 document.xml
  const doc = parseXml(documentXml)
  const root = doc.documentElement
  const bodyElements = root.getElementsByTagNameNS(NS.w, 'body')
  if (bodyElements.length === 0) {
    return { success: false, elements: [], error: 'No <w:body> found' }
  }
  const body = bodyElements[0]

  // 3. 遍历 <w:body> 子节点
  const docNodes: DocNode[] = []
  let currentSectionParagraphs: ParagraphNode[] = []

  forEachChild(body, (child) => {
    const tag = child.localName
    const childNs = child.namespaceURI

    if (tag === 'p' && childNs === NS.w) {
      // <w:p>
      const para = parseParagraph(
        child, styleResolver, theme, numberingResolver, documentRels, mediaMap
      )

      // 检查段落内是否有图表 drawing
      processChartDrawings(child, para, documentRels, chartRelsMap, mediaMap)

      // 检查段落末尾的 sectPr（分节属性）
      const pPr = getFirstChildByTag(child, NS.w, 'pPr')
      const sectPr = pPr ? getFirstChildByTag(pPr, NS.w, 'sectPr') : null

      if (sectPr) {
        const sectionProps = parseSectionProperties(sectPr)
        if (sectionProps.columns > 1) {
          // 收集分栏段落
          currentSectionParagraphs.push(para)
          // 构建原生分栏节点
          const targetWidth = options.targetInnerWidth || 600
          const columnNode = buildColumnNode(
            currentSectionParagraphs, sectionProps, targetWidth
          )
          docNodes.push(columnNode)
          currentSectionParagraphs = []
        } else {
          // 非分栏节
          if (currentSectionParagraphs.length > 0) {
            for (const p of currentSectionParagraphs) {
              docNodes.push(p)
            }
            currentSectionParagraphs = []
          }
          docNodes.push(para)
        }
        // 分节符产生分页（continuous / nextColumn 不分页）
        const bt = sectionProps.breakType
        if (bt !== 'continuous' && bt !== 'nextColumn') {
          docNodes.push({
            type: 'paragraph',
            chunks: [{ type: 'break', breakType: 'page' }],
            style: {}
          } as ParagraphNode)
        }
      } else {
        currentSectionParagraphs.push(para)
      }
    } else if (tag === 'tbl' && childNs === NS.w) {
      // <w:tbl>
      // 先 flush 累积的段落
      flushParagraphs(currentSectionParagraphs, docNodes)
      currentSectionParagraphs = []

      const table = parseTable(
        child, styleResolver, theme, numberingResolver, documentRels, mediaMap
      )
      docNodes.push(table)
    } else if (tag === 'sdt' && childNs === NS.w) {
      // <w:sdt> - 结构化文档标签
      if (isTocSdt(child)) {
        // TOC
        const tocParagraphs = parseTocContent(
          child, styleResolver, theme, numberingResolver, documentRels, mediaMap
        )
        for (const p of tocParagraphs) {
          currentSectionParagraphs.push(p)
        }
      } else {
        // 其他 SDT：解析内部内容
        const sdtContent = getFirstChildByTag(child, NS.w, 'sdtContent')
        if (sdtContent) {
          forEachChild(sdtContent, (sdtChild) => {
            if (sdtChild.localName === 'p' && sdtChild.namespaceURI === NS.w) {
              const para = parseParagraph(
                sdtChild, styleResolver, theme, numberingResolver, documentRels, mediaMap
              )
              currentSectionParagraphs.push(para)
            } else if (sdtChild.localName === 'tbl' && sdtChild.namespaceURI === NS.w) {
              flushParagraphs(currentSectionParagraphs, docNodes)
              currentSectionParagraphs = []
              const table = parseTable(
                sdtChild, styleResolver, theme, numberingResolver, documentRels, mediaMap
              )
              docNodes.push(table)
            }
          })
        }
      }
    } else if (tag === 'sectPr' && childNs === NS.w) {
      // 文档末尾的节属性
      const sectionProps = parseSectionProperties(child)
      if (sectionProps.columns > 1 && currentSectionParagraphs.length > 0) {
        const targetWidth = options.targetInnerWidth || 600
        const columnNode = buildColumnNode(
          currentSectionParagraphs, sectionProps, targetWidth
        )
        docNodes.push(columnNode)
        currentSectionParagraphs = []
      }
    }
  })

  // Flush 剩余段落
  flushParagraphs(currentSectionParagraphs, docNodes)

  // 4. 转换为 IElement[]
  const elements = buildElements(docNodes, options)

  return {
    success: true,
    elements
  }
}

function flushParagraphs(paragraphs: ParagraphNode[], docNodes: DocNode[]): void {
  for (const p of paragraphs) {
    docNodes.push(p)
  }
  paragraphs.length = 0
}

/**
 * 处理段落中的图表 drawing（替换为预览图）
 */
function processChartDrawings(
  pEl: Element,
  para: ParagraphNode,
  documentRels: Map<string, RelationshipEntry>,
  chartRelsMap: Record<string, string>,
  mediaMap: Record<string, string>
): void {
  const drawings = pEl.getElementsByTagNameNS(NS.w, 'drawing')
  for (let i = 0; i < drawings.length; i++) {
    const drawing = drawings[i]
    if (isChartDrawing(drawing)) {
      const chartImage = parseChart(drawing, documentRels, chartRelsMap, mediaMap)
      if (chartImage) {
        // 添加图表预览图到段落
        para.chunks.push(chartImage)
      }
    }
  }
}
