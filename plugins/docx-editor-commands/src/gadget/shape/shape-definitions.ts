export interface ShapePathDefinition {
  viewBox: [number, number]
  path?: string
  pathFormula?: string
}

export const SHAPE_CATEGORIES: Record<string, string[]> = {}

export function getShapeDefinition(type: string): ShapePathDefinition | undefined {
  void type
  return undefined
}

export function generateShapeSvg(type: string): string {
  void type
  return '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150"><rect x="0" y="0" width="200" height="150" fill="none" stroke="#000" stroke-width="2"/></svg>'
}

export function getPathForShape(type: string): string | undefined {
  void type
  return undefined
}
