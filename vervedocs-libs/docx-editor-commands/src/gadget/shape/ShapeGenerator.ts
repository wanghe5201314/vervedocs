import { getShapeDefinition, generateShapeSvg as generateSvgFromDef, SHAPE_CATEGORIES, getPathForShape } from './ShapeDefinitions'

export interface ShapeDefinition {
  svg: string
  width: number
  height: number
  viewBox?: [number, number]
  path?: string
  pathFormula?: string
}

export function generateShapeSvg(type: string): ShapeDefinition {
  const def = getShapeDefinition(type)
  if (!def) {
    return {
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150"><rect x="0" y="0" width="200" height="150" fill="none" stroke="#000" stroke-width="2"/></svg>`,
      width: 200,
      height: 150
    }
  }
  
  const svg = generateSvgFromDef(type)
  return {
    svg,
    width: def.viewBox[0],
    height: def.viewBox[1],
    viewBox: def.viewBox,
    path: def.path,
    pathFormula: def.pathFormula
  }
}

export { getShapeDefinition, generateSvgFromDef as generateSvg, SHAPE_CATEGORIES, getPathForShape }

export function svgToDataUrl(svg: string): string {
  const encoded = encodeURIComponent(svg)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22')
  return `data:image/svg+xml;charset=utf-8,${encoded}`
}
