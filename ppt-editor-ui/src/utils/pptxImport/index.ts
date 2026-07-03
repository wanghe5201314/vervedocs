import JSZip from 'jszip'
import { NS_P, NS_A, NS_R, MEDIA_MIME_MAP, REL_TYPE_SLIDE, REL_TYPE_SLIDE_LAYOUT, REL_TYPE_SLIDE_MASTER, REL_TYPE_THEME, REL_TYPE_CHART, REL_TYPE_NOTES_SLIDE, getViewportWidth } from './constants'
import { parseXml, getFirstChildByTag, getChildrenByTag, getAttr, getAttrNS, findFirstDescendant, forEachChild } from './xml.helper'
import { parseRelationships, resolveRelativePath, getRelsByType } from './rels.resolver'
import { parseTheme } from './theme.resolver'
import { parseSlide, parseLayoutElements } from './slide.parser'
import { parseMasterBackground } from './parsers/background.parser'
import type { PptxSlideContext, PptxThemeData, RelationshipEntry } from './types'
import type { Slide, SlideBackground, PPTElement } from '@/types/slides'

interface ImportPptxResult {
  slides: Slide[]
  viewportRatio: number
  viewportWidth: number
}

/**
 * Parse a PPTX file and convert it to the editor's data format.
 */
export async function parsePptxToEditorData(file: File): Promise<ImportPptxResult> {
  const arrayBuffer = await file.arrayBuffer()
  const zip = await JSZip.loadAsync(arrayBuffer)

  // 1. Extract core XML files in parallel
  const [presentationXml, presentationRelsXml] = await Promise.all([
    readZipEntry(zip, 'ppt/presentation.xml'),
    readZipEntry(zip, 'ppt/_rels/presentation.xml.rels'),
  ])

  if (!presentationXml) {
    throw new Error('Invalid PPTX: missing ppt/presentation.xml')
  }

  // 2. Parse presentation.xml to get slide size and slide references
  const presentationDoc = parseXml(presentationXml)
  const presentationRoot = presentationDoc.documentElement

  // Get slide size
  const sldSz = findFirstDescendant(presentationRoot, NS_P, 'sldSz')
  let slideWidthEmu = 12192000 // default 10 inches
  let slideHeightEmu = 6858000 // default 7.5 inches (16:9)

  if (sldSz) {
    slideWidthEmu = Number(getAttr(sldSz, 'cx') || slideWidthEmu)
    slideHeightEmu = Number(getAttr(sldSz, 'cy') || slideHeightEmu)
  }

  const viewportRatio = slideHeightEmu / slideWidthEmu
  const viewportWidth = getViewportWidth(slideWidthEmu)

  // 3. Parse presentation relationships to find slide paths
  const presentationRels = parseRelationships(presentationRelsXml || '')

  // Get ordered slide IDs from presentation.xml
  const sldIdLst = findFirstDescendant(presentationRoot, NS_P, 'sldIdLst')
  const orderedSlideRIds: string[] = []
  if (sldIdLst) {
    forEachChild(sldIdLst, (child) => {
      if (child.localName === 'sldId') {
        const rId = getAttrNS(child, NS_R, 'id')
        if (rId) orderedSlideRIds.push(rId)
      }
    })
  }

  // Map rId to slide file paths
  const slideEntries: { rId: string; path: string }[] = []
  for (const rId of orderedSlideRIds) {
    const relEntry = presentationRels.get(rId)
    if (relEntry && relEntry.type === REL_TYPE_SLIDE) {
      const slidePath = relEntry.target.startsWith('/') ? relEntry.target.slice(1) : 'ppt/' + relEntry.target
      slideEntries.push({ rId, path: slidePath })
    }
  }

  // 4. Find and parse theme
  const themeRels = getRelsByType(presentationRels, REL_TYPE_THEME)
  let themeXml = ''
  if (themeRels.length > 0) {
    const themePath = themeRels[0].target.startsWith('/') ? themeRels[0].target.slice(1) : 'ppt/' + themeRels[0].target
    themeXml = await readZipEntry(zip, themePath) || ''
  }
  if (!themeXml) {
    // Try common path
    themeXml = await readZipEntry(zip, 'ppt/theme/theme1.xml') || ''
  }

  const theme = parseTheme(themeXml)

  // 5. Extract all media files as base64 data URLs
  const mediaMap = await extractMediaFiles(zip)

  // 6. Extract all slide XMLs and their rels in parallel
  const slideDataPromises = slideEntries.map(async (entry) => {
    const [slideXml, slideRelsXml] = await Promise.all([
      readZipEntry(zip, entry.path),
      readZipEntry(zip, entry.path.replace(/([^/]+)\.xml$/, '_rels/$1.xml.rels')),
    ])
    return { path: entry.path, slideXml, slideRelsXml }
  })
  const slideDataList = await Promise.all(slideDataPromises)

  // 7. Extract chart XMLs
  const chartXmlMap = await extractChartXmls(zip)

  // 7.5. Extract diagram drawing XMLs (SmartArt pre-rendered shapes)
  const diagramDrawingMap = await extractDiagramDrawings(zip)

  // 8. Get slide master/layout backgrounds for fallback
  const masterBg = await getMasterBackground(zip, presentationRels, theme, slideWidthEmu, slideHeightEmu, mediaMap)

  // 8.5. Cache slide master data for parsing non-placeholder shapes
  const masterShapeData = await getMasterShapeData(zip, presentationRels)

  // 9. Parse each slide
  const slides: Slide[] = []

  for (const slideData of slideDataList) {
    if (!slideData.slideXml) continue

    const slideRels = parseRelationships(slideData.slideRelsXml || '')
    const slideBasePath = slideData.path.replace(/[^/]+$/, '')

    // Get layout background for this slide
    const layoutBg = await getLayoutBackground(zip, slideRels, theme, slideWidthEmu, slideHeightEmu, mediaMap)

    const context: PptxSlideContext = {
      theme,
      slideRels,
      mediaMap,
      slideWidthEmu,
      slideHeightEmu,
      slideMasterBg: masterBg,
      slideLayoutBg: layoutBg,
      chartXmlMap,
      diagramDrawingMap,
      slideBasePath,
    }

    const slide = parseSlide(slideData.slideXml, context)

    // Parse non-placeholder elements from slide master (decorative elements shared across all slides)
    if (masterShapeData) {
      const masterContext: PptxSlideContext = {
        theme,
        slideRels: masterShapeData.relsMap,
        mediaMap,
        slideWidthEmu,
        slideHeightEmu,
        chartXmlMap,
        slideBasePath: masterShapeData.basePath,
      }
      const masterElements = parseLayoutElements(masterShapeData.xml, masterContext)
      if (masterElements.length > 0) {
        slide.elements = [...masterElements, ...slide.elements]
      }
    }

    // Parse non-placeholder elements from slide layout (decorative shapes, logos, etc.)
    const layoutElements = await getLayoutElements(zip, slideRels, theme, slideWidthEmu, slideHeightEmu, mediaMap, chartXmlMap)
    if (layoutElements.length > 0) {
      slide.elements = [...layoutElements, ...slide.elements]
    }

    // Parse notes/remark
    const notesRId = findRelByType(slideRels, REL_TYPE_NOTES_SLIDE)
    if (notesRId) {
      const notesPath = resolveRelativePath(slideBasePath, notesRId)
      const notesXml = await readZipEntry(zip, notesPath)
      if (notesXml) {
        slide.remark = extractNotesText(notesXml)
      }
    }

    slides.push(slide)
  }

  return { slides, viewportRatio, viewportWidth }
}

async function readZipEntry(zip: JSZip, path: string): Promise<string | null> {
  // Try exact path first
  let file = zip.file(path)
  if (!file) {
    // Try with normalized path (forward slashes)
    const normalized = path.replace(/\\/g, '/')
    file = zip.file(normalized)
  }
  if (!file) return null
  return file.async('string')
}

async function extractMediaFiles(zip: JSZip): Promise<Map<string, string>> {
  const mediaMap = new Map<string, string>()
  const mediaFolder = zip.folder('ppt/media')
  if (!mediaFolder) return mediaMap

  const promises: Promise<void>[] = []

  mediaFolder.forEach((relativePath, zipEntry) => {
    if (zipEntry.dir) return

    const promise = (async () => {
      try {
        const ext = relativePath.split('.').pop()?.toLowerCase() || ''
        const mimeType = MEDIA_MIME_MAP[ext] || 'application/octet-stream'
        const base64 = await zipEntry.async('base64')
        const dataUrl = `data:${mimeType};base64,${base64}`
        
        // Store with multiple path keys for resolution
        const fullPath = 'ppt/media/' + relativePath
        mediaMap.set(fullPath, dataUrl)
        mediaMap.set('../media/' + relativePath, dataUrl)
        mediaMap.set(relativePath, dataUrl)
      } catch (e) {
        console.warn('[PPTX Import] Failed to extract media:', relativePath, e)
      }
    })()

    promises.push(promise)
  })

  await Promise.all(promises)
  return mediaMap
}

async function extractChartXmls(zip: JSZip): Promise<Map<string, string>> {
  const chartMap = new Map<string, string>()
  const chartFolder = zip.folder('ppt/charts')
  if (!chartFolder) return chartMap

  const promises: Promise<void>[] = []

  chartFolder.forEach((relativePath, zipEntry) => {
    if (zipEntry.dir || !relativePath.endsWith('.xml')) return

    const promise = (async () => {
      try {
        const xml = await zipEntry.async('string')
        const fullPath = 'ppt/charts/' + relativePath
        chartMap.set(fullPath, xml)
      } catch (e) {
        console.warn('[PPTX Import] Failed to extract chart:', relativePath, e)
      }
    })()

    promises.push(promise)
  })

  await Promise.all(promises)
  return chartMap
}

async function getMasterBackground(
  zip: JSZip,
  presentationRels: Map<string, RelationshipEntry>,
  theme: PptxThemeData,
  slideWidthEmu: number,
  slideHeightEmu: number,
  mediaMap: Map<string, string>,
): Promise<SlideBackground | undefined> {
  const masterRels = getRelsByType(presentationRels, REL_TYPE_SLIDE_MASTER)
  if (masterRels.length === 0) return undefined

  const masterPath = masterRels[0].target.startsWith('/') ? masterRels[0].target.slice(1) : 'ppt/' + masterRels[0].target
  const masterXml = await readZipEntry(zip, masterPath)
  if (!masterXml) return undefined

  const context: PptxSlideContext = {
    theme,
    slideRels: new Map(),
    mediaMap,
    slideWidthEmu,
    slideHeightEmu,
    slideBasePath: masterPath.replace(/[^/]+$/, ''),
  }

  // Parse master rels for media
  const masterRelsPath = masterPath.replace(/([^/]+)\.xml$/, '_rels/$1.xml.rels')
  const masterRelsXml = await readZipEntry(zip, masterRelsPath)
  if (masterRelsXml) {
    context.slideRels = parseRelationships(masterRelsXml)
  }

  return parseMasterBackground(masterXml, context)
}

async function getLayoutBackground(
  zip: JSZip,
  slideRels: Map<string, RelationshipEntry>,
  theme: PptxThemeData,
  slideWidthEmu: number,
  slideHeightEmu: number,
  mediaMap: Map<string, string>,
): Promise<SlideBackground | undefined> {
  const layoutRels = getRelsByType(slideRels, REL_TYPE_SLIDE_LAYOUT)
  if (layoutRels.length === 0) return undefined

  const relTarget = layoutRels[0].target
  // Layout paths are relative to the slide
  const layoutPath = relTarget.startsWith('/') ? relTarget.slice(1) : 'ppt/slideLayouts/' + relTarget.replace(/^\.\.\/slideLayouts\//, '')
  const layoutXml = await readZipEntry(zip, layoutPath)
  if (!layoutXml) return undefined

  const context: PptxSlideContext = {
    theme,
    slideRels: new Map(),
    mediaMap,
    slideWidthEmu,
    slideHeightEmu,
    slideBasePath: layoutPath.replace(/[^/]+$/, ''),
  }

  // Parse layout rels
  const layoutRelsPath = layoutPath.replace(/([^/]+)\.xml$/, '_rels/$1.xml.rels')
  const layoutRelsXml = await readZipEntry(zip, layoutRelsPath)
  if (layoutRelsXml) {
    context.slideRels = parseRelationships(layoutRelsXml)
  }

  return parseMasterBackground(layoutXml, context)
}

function findRelByType(rels: Map<string, RelationshipEntry>, type: string): string | null {
  for (const [, entry] of rels) {
    if (entry.type === type) return entry.target
  }
  return null
}

function extractNotesText(notesXml: string): string {
  try {
    const doc = parseXml(notesXml)
    const root = doc.documentElement
    const cSld = findFirstDescendant(root, NS_P, 'cSld')
    if (!cSld) return ''

    const spTree = getFirstChildByTag(cSld, NS_P, 'spTree')
    if (!spTree) return ''

    const texts: string[] = []

    // Find shapes with text (notes are typically in placeholder shapes)
    const shapes = spTree.getElementsByTagNameNS(NS_P, 'sp')
    for (let i = 0; i < shapes.length; i++) {
      const sp = shapes[i]
      // Check if it's a notes placeholder (type="body")
      const nvSpPr = getFirstChildByTag(sp, NS_P, 'nvSpPr')
      if (nvSpPr) {
        const nvPr = getFirstChildByTag(nvSpPr, NS_P, 'nvPr')
        if (nvPr) {
          const ph = getFirstChildByTag(nvPr, NS_P, 'ph')
          if (ph) {
            const phType = getAttr(ph, 'type')
            if (phType === 'body' || phType === 'notes' || (!phType && getAttr(ph, 'idx') === '1')) {
              const txBody = getFirstChildByTag(sp, NS_P, 'txBody')
              if (txBody) {
                const paragraphs = txBody.getElementsByTagNameNS(NS_A, 'p')
                for (let j = 0; j < paragraphs.length; j++) {
                  const p = paragraphs[j]
                  const runs = p.getElementsByTagNameNS(NS_A, 'r')
                  let lineText = ''
                  for (let k = 0; k < runs.length; k++) {
                    const t = runs[k].getElementsByTagNameNS(NS_A, 't')
                    if (t.length > 0) lineText += t[0].textContent || ''
                  }
                  if (lineText) texts.push(lineText)
                }
              }
            }
          }
        }
      }
    }

    return texts.join('\n')
  } catch {
    return ''
  }
}

async function getLayoutElements(
  zip: JSZip,
  slideRels: Map<string, RelationshipEntry>,
  theme: PptxThemeData,
  slideWidthEmu: number,
  slideHeightEmu: number,
  mediaMap: Map<string, string>,
  chartXmlMap: Map<string, string>,
): Promise<PPTElement[]> {
  const layoutRels = getRelsByType(slideRels, REL_TYPE_SLIDE_LAYOUT)
  if (layoutRels.length === 0) return []

  const relTarget = layoutRels[0].target
  const layoutPath = relTarget.startsWith('/')
    ? relTarget.slice(1)
    : 'ppt/slideLayouts/' + relTarget.replace(/^\.\.\/slideLayouts\//, '')
  const layoutXml = await readZipEntry(zip, layoutPath)
  if (!layoutXml) return []

  const layoutBasePath = layoutPath.replace(/[^/]+$/, '')

  // Parse layout relationships (for image/media references in layout shapes)
  const layoutRelsPath = layoutPath.replace(/([^/]+)\.xml$/, '_rels/$1.xml.rels')
  const layoutRelsXml = await readZipEntry(zip, layoutRelsPath)
  const layoutRelsMap = layoutRelsXml
    ? parseRelationships(layoutRelsXml)
    : new Map<string, RelationshipEntry>()

  const context: PptxSlideContext = {
    theme,
    slideRels: layoutRelsMap,
    mediaMap,
    slideWidthEmu,
    slideHeightEmu,
    chartXmlMap,
    slideBasePath: layoutBasePath,
  }

  return parseLayoutElements(layoutXml, context)
}

async function getMasterShapeData(
  zip: JSZip,
  presentationRels: Map<string, RelationshipEntry>,
): Promise<{ xml: string; relsMap: Map<string, RelationshipEntry>; basePath: string } | null> {
  const masterRels = getRelsByType(presentationRels, REL_TYPE_SLIDE_MASTER)
  if (masterRels.length === 0) return null

  const masterPath = masterRels[0].target.startsWith('/')
    ? masterRels[0].target.slice(1)
    : 'ppt/' + masterRels[0].target
  const masterXml = await readZipEntry(zip, masterPath)
  if (!masterXml) return null

  const masterBasePath = masterPath.replace(/[^/]+$/, '')

  // Parse master relationships (for image/media references in master shapes)
  const masterRelsPath = masterPath.replace(/([^/]+)\.xml$/, '_rels/$1.xml.rels')
  const masterRelsXml = await readZipEntry(zip, masterRelsPath)
  const masterRelsMap = masterRelsXml
    ? parseRelationships(masterRelsXml)
    : new Map<string, RelationshipEntry>()

  return { xml: masterXml, relsMap: masterRelsMap, basePath: masterBasePath }
}

async function extractDiagramDrawings(zip: JSZip): Promise<Map<string, string>> {
  const drawingMap = new Map<string, string>()

  // SmartArt diagram drawings are stored in ppt/diagrams/ folder
  const diagramsFolder = zip.folder('ppt/diagrams')
  if (!diagramsFolder) return drawingMap

  const promises: Promise<void>[] = []

  diagramsFolder.forEach((relativePath, zipEntry) => {
    if (zipEntry.dir) return
    // Only drawing XML files (drawingN.xml)
    if (!relativePath.match(/^drawing\d+\.xml$/i)) return

    const promise = (async () => {
      try {
        const xml = await zipEntry.async('string')
        const fullPath = 'ppt/diagrams/' + relativePath
        drawingMap.set(fullPath, xml)
        drawingMap.set('../diagrams/' + relativePath, xml)
      } catch (e) {
        console.warn('[PPTX Import] Failed to extract diagram drawing:', relativePath, e)
      }
    })()

    promises.push(promise)
  })

  await Promise.all(promises)
  return drawingMap
}
