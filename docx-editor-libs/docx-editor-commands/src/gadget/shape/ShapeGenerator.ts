export interface ShapeDefinition {
  svg: string
  width: number
  height: number
}

const SHAPE_MAP: Record<string, () => ShapeDefinition> = {
  rectangle: () => ({
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="180"><rect x="10" y="10" width="240" height="160" fill="none" stroke="#000" stroke-width="2"/></svg>`,
    width: 260,
    height: 180
  }),
  roundedRectangle: () => ({
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="180"><rect x="10" y="10" width="240" height="160" rx="20" ry="20" fill="none" stroke="#000" stroke-width="2"/></svg>`,
    width: 260,
    height: 180
  }),
  ellipse: () => ({
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="180"><ellipse cx="130" cy="90" rx="120" ry="80" fill="none" stroke="#000" stroke-width="2"/></svg>`,
    width: 260,
    height: 180
  }),
  triangle: () => ({
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="220"><polygon points="130,10 250,210 10,210" fill="none" stroke="#000" stroke-width="2"/></svg>`,
    width: 260,
    height: 220
  }),
  diamond: () => ({
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="260"><polygon points="130,10 250,130 130,250 10,130" fill="none" stroke="#000" stroke-width="2"/></svg>`,
    width: 260,
    height: 260
  }),
  pentagon: () => ({
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="240"><polygon points="130,10 248,90 204,230 56,230 12,90" fill="none" stroke="#000" stroke-width="2"/></svg>`,
    width: 260,
    height: 240
  }),
  hexagon: () => ({
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="220"><polygon points="65,10 195,10 260,110 195,210 65,210 0,110" fill="none" stroke="#000" stroke-width="2"/></svg>`,
    width: 260,
    height: 220
  }),
  star5: () => {
    const cx = 130, cy = 130, outerR = 120, innerR = 48
    const pts: string[] = []
    for (let i = 0; i < 5; i++) {
      const outerAngle = (Math.PI / 2) + (2 * Math.PI * i / 5)
      pts.push(`${cx + outerR * Math.cos(outerAngle)},${cy - outerR * Math.sin(outerAngle)}`)
      const innerAngle = outerAngle + Math.PI / 5
      pts.push(`${cx + innerR * Math.cos(innerAngle)},${cy - innerR * Math.sin(innerAngle)}`)
    }
    return {
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="260"><polygon points="${pts.join(' ')}" fill="none" stroke="#000" stroke-width="2"/></svg>`,
      width: 260,
      height: 260
    }
  },
  arrowRight: () => ({
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="160"><polygon points="10,60 180,60 180,10 250,80 180,150 180,100 10,100" fill="none" stroke="#000" stroke-width="2"/></svg>`,
    width: 260,
    height: 160
  }),
  arrowLeft: () => ({
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="160"><polygon points="250,60 80,60 80,10 10,80 80,150 80,100 250,100" fill="none" stroke="#000" stroke-width="2"/></svg>`,
    width: 260,
    height: 160
  }),
  parallelogram: () => ({
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="180"><polygon points="50,10 250,10 210,170 10,170" fill="none" stroke="#000" stroke-width="2"/></svg>`,
    width: 260,
    height: 180
  }),
  trapezoid: () => ({
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="180"><polygon points="60,10 200,10 250,170 10,170" fill="none" stroke="#000" stroke-width="2"/></svg>`,
    width: 260,
    height: 180
  }),
  heart: () => ({
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="240" viewBox="0 0 260 240"><path d="M130,220 C130,220 10,140 10,80 C10,30 50,10 80,10 C105,10 125,30 130,60 C135,30 155,10 180,10 C210,10 250,30 250,80 C250,140 130,220 130,220 Z" fill="none" stroke="#000" stroke-width="2"/></svg>`,
    width: 260,
    height: 240
  }),
  cloud: () => ({
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="180"><path d="M60,150 C20,150 10,120 30,100 C10,80 30,50 60,50 C70,20 110,10 140,30 C160,10 200,20 210,50 C240,40 260,70 240,100 C260,120 240,150 210,150 Z" fill="none" stroke="#000" stroke-width="2"/></svg>`,
    width: 260,
    height: 180
  })
}

export function generateShapeSvg(type: string): ShapeDefinition {
  const factory = SHAPE_MAP[type]
  if (factory) return factory()
  return SHAPE_MAP.rectangle()
}

export function svgToDataUrl(svg: string): string {
  const encoded = encodeURIComponent(svg)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22')
  return `data:image/svg+xml;charset=utf-8,${encoded}`
}
