import JSZip from 'jszip'
import type {
  IDocxParseResult, IDocxParseOptions, IWorkerRequest, IChartRenderer,
  DocNode, ParagraphNode, ImageChunk
} from './types'
import { DEFAULT_OPTIONS } from './types'
import type { PageMargins } from './worker/parsers/image.parser'
import { NS } from './constants'
import { parseXml, forEachChild, getFirstChildByTag } from './worker/xml.helper'
import { parseTheme, type ThemeData } from './worker/theme.resolver'
import { StyleResolver } from './worker/style.resolver'
import { NumberingResolver } from './worker/numbering.resolver'
import { parseRelationships, type RelationshipEntry } from './worker/relationship.resolver'
import { parseParagraph } from './worker/parsers/paragraph.parser'
import { parseTable } from './worker/parsers/table.parser'
import { isTocSdt, parseTocContent } from './worker/parsers/toc.parser'
import { parseSectionProperties, buildColumnNode } from './worker/parsers/section.parser'
import { parseChart } from './worker/parsers/chart.parser'
import { parseOoxmlChartToOption } from './worker/parsers/ooxml.chart.parser'
import { parseComments } from './worker/parsers/comment.parser'
import { buildElements } from './worker/builder/element.builder'
import { footnoteCounter } from './worker/parsers/run.parser'

export class DocxParser {
  private options: IDocxParseOptions

  constructor(options?: IDocxParseOptions) {
    this.options = { ...options }
  }

  async parse(arrayBuffer: ArrayBuffer): Promise<IDocxParseResult> {
    try {
      const zip = await JSZip.loadAsync(arrayBuffer)

      const [
        documentXml,
        stylesXml,
        numberingXml,
        themeXml,
        documentRels,
        commentsXml
      ] = await Promise.all([
        this.readZipEntry(zip, 'word/document.xml'),
        this.readZipEntry(zip, 'word/styles.xml'),
        this.readZipEntry(zip, 'word/numbering.xml'),
        this.readZipEntry(zip, 'word/theme/theme1.xml'),
        this.readZipEntry(zip, 'word/_rels/document.xml.rels'),
        this.readZipEntry(zip, 'word/comments.xml')
      ])

      if (!documentXml) {
        return { success: false, elements: [], error: 'Missing word/document.xml' }
      }

      const mediaMap = await this.extractMediaFiles(zip)
      const chartRelsMap = await this.extractChartRelFiles(zip)
      const chartXmlMap = await this.extractChartXmlFiles(zip)

      const workerRequest: IWorkerRequest = {
        documentXml,
        stylesXml,
        numberingXml,
        themeXml,
        documentRels,
        commentsXml,
        chartRelsMap,
        chartXmlMap,
        mediaMap,
        options: this.getMergedOptions()
      }

      return this.parseDocumentSync(workerRequest)
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      return { success: false, elements: [], error: msg }
    }
  }

  async parseFromFile(file: File): Promise<IDocxParseResult> {
    const arrayBuffer = await file.arrayBuffer()
    return this.parse(arrayBuffer)
  }

  private async parseDocumentSync(request: IWorkerRequest): Promise<IDocxParseResult> {
    try {
      footnoteCounter.value = 0

      let renderChartToDataUrl: ((option: unknown, w: number, h: number, pixelRatio?: number) => string) | null = null
      if (request.options.chartRenderer && Object.keys(request.chartXmlMap).length > 0) {
        const renderer: IChartRenderer = request.options.chartRenderer
        renderChartToDataUrl = (option, w, h, pr) => renderer.renderToDataUrl(option, w, h, pr)
      }

      const theme = parseTheme(request.themeXml)
      const styleResolver = new StyleResolver(request.stylesXml, theme)
      const numberingResolver = new NumberingResolver(request.numberingXml)
      const commentMetasMap = parseComments(request.commentsXml)
      const documentRels: Map<string, RelationshipEntry> = request.documentRels
        ? parseRelationships(request.documentRels)
        : new Map()

      const doc = parseXml(request.documentXml)
      const bodyElements = doc.documentElement.getElementsByTagNameNS(NS.w, 'body')
      if (bodyElements.length === 0) {
        return { success: false, elements: [], error: 'No <w:body> found' }
      }

      const body = bodyElements[0]
      const pageMargins = extractPageMargins(body, NS.w, getFirstChildByTag)
      const defaultSize = request.options.defaultSize ?? 12

      const docNodes: DocNode[] = []
      let pendingSectionParagraphs: ParagraphNode[] = []
      const pendingBodyCommentMarkers: Array<{
        type: 'commentMarker'; markType: 'start' | 'end'; commentId: string
      }> = []

      const flushSectionParagraphs = () => {
        for (const p of pendingSectionParagraphs) docNodes.push(p)
        pendingSectionParagraphs = []
      }

      const injectPendingCommentMarkers = (para: ParagraphNode) => {
        if (pendingBodyCommentMarkers.length > 0) {
          para.chunks.unshift(...pendingBodyCommentMarkers)
          pendingBodyCommentMarkers.length = 0
        }
      }

      forEachChild(body, (child) => {
        const tag = child.localName
        const childNs = child.namespaceURI

        if (tag === 'p' && childNs === NS.w) {
          const para = parseParagraph(
            child, styleResolver, theme, numberingResolver,
            documentRels, request.mediaMap, pageMargins, defaultSize
          )
          injectPendingCommentMarkers(para)

          injectChartChunks(
            child, para, documentRels, request.chartRelsMap,
            request.chartXmlMap, request.mediaMap,
            renderChartToDataUrl,
            { c: NS.c, r: NS.r, wp: NS.wp, w: NS.w }, getFirstChildByTag
          )

          const pPrEl = getFirstChildByTag(child, NS.w, 'pPr')
          const sectPrEl = pPrEl ? getFirstChildByTag(pPrEl, NS.w, 'sectPr') : null

          if (sectPrEl) {
            const sectionProps = parseSectionProperties(sectPrEl)
            if (sectionProps.columns > 1) {
              pendingSectionParagraphs.push(para)
              const targetWidth = request.options.targetInnerWidth ?? 600
              docNodes.push(buildColumnNode(pendingSectionParagraphs, sectionProps, targetWidth))
              pendingSectionParagraphs = []
            } else {
              flushSectionParagraphs()
              docNodes.push(para)
            }
            const bt = sectionProps.breakType
            if (bt !== 'continuous' && bt !== 'nextColumn') {
              docNodes.push({
                type: 'paragraph',
                chunks: [{ type: 'break', breakType: 'page' }],
                style: {}
              })
            }
          } else {
            pendingSectionParagraphs.push(para)
          }

        } else if (tag === 'tbl' && childNs === NS.w) {
          flushSectionParagraphs()
          docNodes.push(
            parseTable(child, styleResolver, theme, numberingResolver, documentRels, request.mediaMap, pageMargins)
          )

        } else if (tag === 'sdt' && childNs === NS.w) {
          processSdtElement(
            child, pendingSectionParagraphs, docNodes, flushSectionParagraphs,
            styleResolver, theme, numberingResolver, documentRels,
            request.mediaMap, pageMargins, defaultSize,
            NS.w, getFirstChildByTag, forEachChild
          )

        } else if (tag === 'customXml' && childNs === NS.w) {
          forEachChild(child, (xmlChild) => {
            if (xmlChild.localName === 'p' && xmlChild.namespaceURI === NS.w) {
              pendingSectionParagraphs.push(
                parseParagraph(xmlChild, styleResolver, theme, numberingResolver, documentRels, request.mediaMap, pageMargins, defaultSize)
              )
            } else if (xmlChild.localName === 'tbl' && xmlChild.namespaceURI === NS.w) {
              flushSectionParagraphs()
              docNodes.push(
                parseTable(xmlChild, styleResolver, theme, numberingResolver, documentRels, request.mediaMap, pageMargins)
              )
            }
          })

        } else if (tag === 'sectPr' && childNs === NS.w) {
          const sectionProps = parseSectionProperties(child)
          if (sectionProps.columns > 1 && pendingSectionParagraphs.length > 0) {
            const targetWidth = request.options.targetInnerWidth ?? 600
            docNodes.push(buildColumnNode(pendingSectionParagraphs, sectionProps, targetWidth))
            pendingSectionParagraphs = []
          }

        } else if (tag === 'commentRangeStart' && childNs === NS.w) {
          const commentId = child.getAttributeNS(NS.w, 'id') ?? child.getAttribute('w:id') ?? ''
          if (commentId) {
            pendingBodyCommentMarkers.push({ type: 'commentMarker', markType: 'start', commentId })
          }
        } else if (tag === 'commentRangeEnd' && childNs === NS.w) {
          const commentId = child.getAttributeNS(NS.w, 'id') ?? child.getAttribute('w:id') ?? ''
          if (commentId) {
            pendingBodyCommentMarkers.push({ type: 'commentMarker', markType: 'end', commentId })
          }
        }
      })

      flushSectionParagraphs()

      const elements = buildElements(docNodes, request.options, commentMetasMap)
      const comments = commentMetasMap.size > 0 ? [...commentMetasMap.values()] : undefined

      return { success: true, elements, comments }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      return { success: false, elements: [], error: `Parse failed: ${msg}` }
    }
  }

  private async readZipEntry(zip: JSZip, path: string): Promise<string | null> {
    const file = zip.file(path)
    return file ? file.async('string') : null
  }

  private async extractMediaFiles(zip: JSZip): Promise<Record<string, string>> {
    const mediaMap: Record<string, string> = {}
    const MIME_MAP: Record<string, string> = {
      png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
      gif: 'image/gif', bmp: 'image/bmp', tiff: 'image/tiff',
      tif: 'image/tiff', svg: 'image/svg+xml', emf: 'image/x-emf', wmf: 'image/x-wmf'
    }

    const promises: Promise<void>[] = []
    zip.forEach((relativePath, zipEntry) => {
      if (relativePath.startsWith('word/media/') && !zipEntry.dir) {
        promises.push(
          zipEntry.async('base64').then((base64) => {
            const ext = relativePath.split('.').pop()?.toLowerCase() ?? 'png'
            const mime = MIME_MAP[ext] ?? 'image/png'
            const dataUrl = `data:${mime};base64,${base64}`
            mediaMap[relativePath] = dataUrl
            mediaMap[relativePath.replace('word/', '')] = dataUrl
          })
        )
      }
    })

    await Promise.all(promises)
    return mediaMap
  }

  private async extractChartRelFiles(zip: JSZip): Promise<Record<string, string>> {
    const chartRelsMap: Record<string, string> = {}
    const promises: Promise<void>[] = []

    zip.forEach((relativePath, zipEntry) => {
      if (relativePath.includes('charts/_rels/') && relativePath.endsWith('.rels') && !zipEntry.dir) {
        promises.push(
          zipEntry.async('string').then((content) => {
            chartRelsMap[relativePath] = content
          })
        )
      }
    })

    await Promise.all(promises)
    return chartRelsMap
  }

  private async extractChartXmlFiles(zip: JSZip): Promise<Record<string, string>> {
    const chartXmlMap: Record<string, string> = {}
    const promises: Promise<void>[] = []

    zip.forEach((relativePath, zipEntry) => {
      if (relativePath.match(/^word\/charts\/chart\d+\.xml$/) && !zipEntry.dir) {
        promises.push(
          zipEntry.async('string').then((content) => {
            chartXmlMap[relativePath] = content
          })
        )
      }
    })

    await Promise.all(promises)
    return chartXmlMap
  }

  private getMergedOptions(): IDocxParseOptions {
    return { ...DEFAULT_OPTIONS, ...this.options }
  }
}

function processSdtElement(
  sdtEl: Element,
  pendingSectionParagraphs: ParagraphNode[],
  docNodes: DocNode[],
  flushSectionParagraphs: () => void,
  styleResolver: StyleResolver,
  theme: ThemeData,
  numberingResolver: NumberingResolver,
  documentRels: Map<string, RelationshipEntry>,
  mediaMap: Record<string, string>,
  pageMargins: PageMargins | undefined,
  defaultSize: number,
  wNs: string,
  getFirstChildByTag: (el: Element, ns: string, tag: string) => Element | null,
  forEachChild: (el: Element, cb: (child: Element) => void) => void
): void {
  if (isTocSdt(sdtEl)) {
    const tocParagraphs = parseTocContent(
      sdtEl, styleResolver, theme, numberingResolver, documentRels, mediaMap
    )
    for (const p of tocParagraphs) pendingSectionParagraphs.push(p)
    return
  }

  const sdtContentEl = getFirstChildByTag(sdtEl, wNs, 'sdtContent')
  if (!sdtContentEl) return

  forEachChild(sdtContentEl, (child: Element) => {
    if (child.localName === 'p' && child.namespaceURI === wNs) {
      pendingSectionParagraphs.push(
        parseParagraph(child, styleResolver, theme, numberingResolver, documentRels, mediaMap, pageMargins, defaultSize)
      )
    } else if (child.localName === 'tbl' && child.namespaceURI === wNs) {
      flushSectionParagraphs()
      docNodes.push(
        parseTable(child, styleResolver, theme, numberingResolver, documentRels, mediaMap, pageMargins)
      )
    } else if (child.localName === 'sdt' && child.namespaceURI === wNs) {
      processSdtElement(
        child, pendingSectionParagraphs, docNodes, flushSectionParagraphs,
        styleResolver, theme, numberingResolver, documentRels, mediaMap, pageMargins, defaultSize,
        wNs, getFirstChildByTag, forEachChild
      )
    }
  })
}

function injectChartChunks(
  paragraphEl: Element,
  para: ParagraphNode,
  documentRels: Map<string, RelationshipEntry>,
  chartRelsMap: Record<string, string>,
  chartXmlMap: Record<string, string>,
  mediaMap: Record<string, string>,
  renderChartToDataUrl: ((option: unknown, w: number, h: number, pr?: number) => string) | null,
  NS: { c: string; r: string; wp: string; w: string },
  getFirstChildByTag: (el: Element, ns: string, tag: string) => Element | null
): void {
  const drawings = paragraphEl.getElementsByTagNameNS(NS.w, 'drawing')

  for (let i = 0; i < drawings.length; i++) {
    const drawing = drawings[i]
    if (!drawing.getElementsByTagNameNS(NS.c, 'chart').length) continue

    let chartImage = parseChart(drawing, documentRels, chartRelsMap, mediaMap)

    if (!chartImage && renderChartToDataUrl) {
      chartImage = renderChartFromXml(
        drawing, documentRels, chartXmlMap,
        renderChartToDataUrl, NS, getFirstChildByTag
      )
    }

    if (chartImage) para.chunks.push(chartImage)
  }
}

function renderChartFromXml(
  drawingEl: Element,
  documentRels: Map<string, RelationshipEntry>,
  chartXmlMap: Record<string, string>,
  renderFn: (option: unknown, w: number, h: number, pr?: number) => string,
  NS: { c: string; r: string; wp: string; w: string },
  getFirstChildByTag: (el: Element, ns: string, tag: string) => Element | null
): ImageChunk | null {
  const chartEls = drawingEl.getElementsByTagNameNS(NS.c, 'chart')
  if (chartEls.length === 0) return null

  const rId = chartEls[0].getAttributeNS(NS.r, 'id') ?? chartEls[0].getAttribute('r:id') ?? ''
  if (!rId) return null

  const rel = documentRels.get(rId)
  if (!rel) return null

  const chartPath = rel.target.startsWith('word/')
    ? rel.target
    : `word/${rel.target.replace(/^\.\.\//, '')}`

  const chartXml = chartXmlMap[chartPath]
  if (!chartXml) return null

  let width = 400
  let height = 300
  const container = getFirstChildByTag(drawingEl, NS.wp, 'inline')
    ?? getFirstChildByTag(drawingEl, NS.wp, 'anchor')
  if (container) {
    const extent = getFirstChildByTag(container, NS.wp, 'extent')
    if (extent) {
      const cx = extent.getAttribute('cx')
      const cy = extent.getAttribute('cy')
      if (cx) width = Math.round(parseInt(cx, 10) / 9525)
      if (cy) height = Math.round(parseInt(cy, 10) / 9525)
    }
  }

  const option = parseOoxmlChartToOption(chartXml)
  if (!option) return null

  try {
    const src = renderFn(option, width, height, 2)
    return { type: 'image', src, width, height }
  } catch {
    return null
  }
}

function extractPageMargins(
  body: Element,
  wNs: string,
  getFirstChildByTag: (el: Element, ns: string, tag: string) => Element | null
): PageMargins {
  const defaults: PageMargins = { top: 72, bottom: 72, left: 90, right: 90 }

  const sectPrEl = getFirstChildByTag(body, wNs, 'sectPr')
  if (!sectPrEl) return defaults

  const pgMarEl = getFirstChildByTag(sectPrEl, wNs, 'pgMar')
  if (!pgMarEl) return defaults

  const toNum = (attr: string | null) => (attr ? parseInt(attr, 10) : null)
  const toPx = (twip: number) => (twip / 1440) * 96

  const top = toNum(pgMarEl.getAttributeNS(wNs, 'top') ?? pgMarEl.getAttribute('w:top'))
  const bottom = toNum(pgMarEl.getAttributeNS(wNs, 'bottom') ?? pgMarEl.getAttribute('w:bottom'))
  const left = toNum(pgMarEl.getAttributeNS(wNs, 'left') ?? pgMarEl.getAttribute('w:left'))
  const right = toNum(pgMarEl.getAttributeNS(wNs, 'right') ?? pgMarEl.getAttribute('w:right'))

  return {
    top: top !== null ? toPx(top) : defaults.top,
    bottom: bottom !== null ? toPx(bottom) : defaults.bottom,
    left: left !== null ? toPx(left) : defaults.left,
    right: right !== null ? toPx(right) : defaults.right
  }
}
