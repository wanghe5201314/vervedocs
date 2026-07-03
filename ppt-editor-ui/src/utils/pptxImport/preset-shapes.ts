export interface PresetShapeResult {
  viewBox: [number, number]
  path: string
  special?: boolean
}

type ShapeGenerator = (w: number, h: number) => PresetShapeResult

function simple(viewBox: [number, number], path: string, special?: boolean): ShapeGenerator {
  return () => ({ viewBox, path, special })
}

function dynamic(fn: (w: number, h: number) => PresetShapeResult): ShapeGenerator {
  return fn
}

const W = 200
const H = 200

export const PRESET_SHAPE_MAP: Record<string, ShapeGenerator> = {
  // Rectangles
  rect: simple([W, H], `M 0 0 L ${W} 0 L ${W} ${H} L 0 ${H} Z`),
  roundRect: dynamic((w, h) => {
    const r = Math.min(w, h) / 8
    return {
      viewBox: [w, h],
      path: `M ${r} 0 L ${w - r} 0 Q ${w} 0 ${w} ${r} L ${w} ${h - r} Q ${w} ${h} ${w - r} ${h} L ${r} ${h} Q 0 ${h} 0 ${h - r} L 0 ${r} Q 0 0 ${r} 0 Z`,
    }
  }),
  snip1Rect: dynamic((w, h) => {
    const c = Math.min(w, h) / 5
    return { viewBox: [w, h], path: `M 0 0 L ${w - c} 0 L ${w} ${c} L ${w} ${h} L 0 ${h} Z` }
  }),
  snip2SameRect: dynamic((w, h) => {
    const c = Math.min(w, h) / 5
    return { viewBox: [w, h], path: `M ${c} 0 L ${w - c} 0 L ${w} ${c} L ${w} ${h} L 0 ${h} L 0 ${c} Z` }
  }),
  snip2DiagRect: dynamic((w, h) => {
    const c = Math.min(w, h) / 5
    return { viewBox: [w, h], path: `M 0 0 L ${w - c} 0 L ${w} ${c} L ${w} ${h} L ${c} ${h} L 0 ${h - c} Z` }
  }),
  snipRoundRect: dynamic((w, h) => {
    const r = Math.min(w, h) / 8
    const c = Math.min(w, h) / 5
    return { viewBox: [w, h], path: `M ${r} 0 L ${w - c} 0 L ${w} ${c} L ${w} ${h} L 0 ${h} L 0 ${r} Q 0 0 ${r} 0 Z` }
  }),
  round1Rect: dynamic((w, h) => {
    const r = Math.min(w, h) / 8
    return { viewBox: [w, h], path: `M 0 0 L ${w - r} 0 Q ${w} 0 ${w} ${r} L ${w} ${h} L 0 ${h} Z` }
  }),
  round2SameRect: dynamic((w, h) => {
    const r = Math.min(w, h) / 8
    return { viewBox: [w, h], path: `M ${r} 0 L ${w - r} 0 Q ${w} 0 ${w} ${r} L ${w} ${h} L 0 ${h} L 0 ${r} Q 0 0 ${r} 0 Z` }
  }),
  round2DiagRect: dynamic((w, h) => {
    const r = Math.min(w, h) / 8
    return { viewBox: [w, h], path: `M 0 0 L ${w - r} 0 Q ${w} 0 ${w} ${r} L ${w} ${h} L ${r} ${h} Q 0 ${h} 0 ${h - r} Z` }
  }),

  // Ellipses & circles
  ellipse: dynamic((w, h) => {
    const rx = w / 2, ry = h / 2
    return {
      viewBox: [w, h],
      path: `M ${rx} 0 A ${rx} ${ry} 0 1 1 ${rx} ${h} A ${rx} ${ry} 0 1 1 ${rx} 0 Z`,
      special: true,
    }
  }),

  // Pie (sector shape, default 0-270 degrees)
  pie: dynamic((w, h) => {
    const cx = w / 2, cy = h / 2
    const rx = w / 2, ry = h / 2
    // Default pie: 270-degree arc from top (0°) clockwise
    const endX = cx
    const endY = cy + ry
    return {
      viewBox: [w, h],
      path: `M ${cx} ${cy} L ${cx} 0 A ${rx} ${ry} 0 1 1 ${endX} ${endY} Z`,
      special: true,
    }
  }),

  // Triangles
  triangle: simple([W, H], `M ${W / 2} 0 L ${W} ${H} L 0 ${H} Z`),
  rtTriangle: simple([W, H], `M 0 0 L ${W} ${H} L 0 ${H} Z`),

  // Diamond
  diamond: simple([W, H], `M ${W / 2} 0 L ${W} ${H / 2} L ${W / 2} ${H} L 0 ${H / 2} Z`),

  // Parallelogram & trapezoid
  parallelogram: dynamic((w, h) => {
    const off = w / 4
    return { viewBox: [w, h], path: `M ${off} 0 L ${w} 0 L ${w - off} ${h} L 0 ${h} Z` }
  }),
  trapezoid: dynamic((w, h) => {
    const off = w / 4
    return { viewBox: [w, h], path: `M ${off} 0 L ${w - off} 0 L ${w} ${h} L 0 ${h} Z` }
  }),

  // Pentagons, hexagons, etc
  pentagon: dynamic((w, h) => {
    const cx = w / 2, cy = h / 2
    const r = Math.min(cx, cy)
    const pts = Array.from({ length: 5 }, (_, i) => {
      const a = (i * 72 - 90) * Math.PI / 180
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
    })
    const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + ` ${p[0]} ${p[1]}`).join(' ') + ' Z'
    return { viewBox: [w, h], path }
  }),
  hexagon: dynamic((w, h) => {
    const cx = w / 2, cy = h / 2
    const r = Math.min(cx, cy)
    const pts = Array.from({ length: 6 }, (_, i) => {
      const a = (i * 60 - 90) * Math.PI / 180
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
    })
    const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + ` ${p[0]} ${p[1]}`).join(' ') + ' Z'
    return { viewBox: [w, h], path }
  }),
  heptagon: dynamic((w, h) => {
    const cx = w / 2, cy = h / 2
    const r = Math.min(cx, cy)
    const pts = Array.from({ length: 7 }, (_, i) => {
      const a = (i * (360 / 7) - 90) * Math.PI / 180
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
    })
    const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + ` ${p[0]} ${p[1]}`).join(' ') + ' Z'
    return { viewBox: [w, h], path }
  }),
  octagon: dynamic((w, h) => {
    const cx = w / 2, cy = h / 2
    const r = Math.min(cx, cy)
    const pts = Array.from({ length: 8 }, (_, i) => {
      const a = (i * 45 - 90) * Math.PI / 180
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
    })
    const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + ` ${p[0]} ${p[1]}`).join(' ') + ' Z'
    return { viewBox: [w, h], path }
  }),
  decagon: dynamic((w, h) => {
    const cx = w / 2, cy = h / 2
    const r = Math.min(cx, cy)
    const pts = Array.from({ length: 10 }, (_, i) => {
      const a = (i * 36 - 90) * Math.PI / 180
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
    })
    const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + ` ${p[0]} ${p[1]}`).join(' ') + ' Z'
    return { viewBox: [w, h], path }
  }),
  dodecagon: dynamic((w, h) => {
    const cx = w / 2, cy = h / 2
    const r = Math.min(cx, cy)
    const pts = Array.from({ length: 12 }, (_, i) => {
      const a = (i * 30 - 90) * Math.PI / 180
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
    })
    const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + ` ${p[0]} ${p[1]}`).join(' ') + ' Z'
    return { viewBox: [w, h], path }
  }),

  // Arrows
  rightArrow: dynamic((w, h) => {
    const aw = w * 0.4, ah = h * 0.25
    return {
      viewBox: [w, h],
      path: `M 0 ${ah} L ${w - aw} ${ah} L ${w - aw} 0 L ${w} ${h / 2} L ${w - aw} ${h} L ${w - aw} ${h - ah} L 0 ${h - ah} Z`,
    }
  }),
  leftArrow: dynamic((w, h) => {
    const aw = w * 0.4, ah = h * 0.25
    return {
      viewBox: [w, h],
      path: `M ${aw} 0 L ${aw} ${ah} L ${w} ${ah} L ${w} ${h - ah} L ${aw} ${h - ah} L ${aw} ${h} L 0 ${h / 2} Z`,
    }
  }),
  upArrow: dynamic((w, h) => {
    const aw = w * 0.25, ah = h * 0.4
    return {
      viewBox: [w, h],
      path: `M ${w / 2} 0 L ${w} ${ah} L ${w - aw} ${ah} L ${w - aw} ${h} L ${aw} ${h} L ${aw} ${ah} L 0 ${ah} Z`,
    }
  }),
  downArrow: dynamic((w, h) => {
    const aw = w * 0.25, ah = h * 0.4
    return {
      viewBox: [w, h],
      path: `M ${aw} 0 L ${w - aw} 0 L ${w - aw} ${h - ah} L ${w} ${h - ah} L ${w / 2} ${h} L 0 ${h - ah} L ${aw} ${h - ah} Z`,
    }
  }),
  leftRightArrow: dynamic((w, h) => {
    const aw = w * 0.2, ah = h * 0.25
    return {
      viewBox: [w, h],
      path: `M 0 ${h / 2} L ${aw} 0 L ${aw} ${ah} L ${w - aw} ${ah} L ${w - aw} 0 L ${w} ${h / 2} L ${w - aw} ${h} L ${w - aw} ${h - ah} L ${aw} ${h - ah} L ${aw} ${h} Z`,
    }
  }),
  upDownArrow: dynamic((w, h) => {
    const aw = w * 0.25, ah = h * 0.2
    return {
      viewBox: [w, h],
      path: `M ${w / 2} 0 L ${w} ${ah} L ${w - aw} ${ah} L ${w - aw} ${h - ah} L ${w} ${h - ah} L ${w / 2} ${h} L 0 ${h - ah} L ${aw} ${h - ah} L ${aw} ${ah} L 0 ${ah} Z`,
    }
  }),
  bentArrow: dynamic((w, h) => {
    const aw = w * 0.35, ah = h * 0.25, bw = w * 0.2
    return {
      viewBox: [w, h],
      path: `M ${w} ${ah} L ${w - aw} 0 L ${w - aw} ${ah * 0.7} L ${bw} ${ah * 0.7} L ${bw} ${h} L 0 ${h} L 0 ${ah * 0.7 + bw} L ${w - aw - bw} ${ah * 0.7 + bw} L ${w - aw} ${h * 0.5} L ${w} ${ah} Z`,
      special: true,
    }
  }),
  chevron: dynamic((w, h) => {
    const off = w * 0.2
    return { viewBox: [w, h], path: `M 0 0 L ${w - off} 0 L ${w} ${h / 2} L ${w - off} ${h} L 0 ${h} L ${off} ${h / 2} Z` }
  }),
  notchedRightArrow: dynamic((w, h) => {
    const aw = w * 0.35, ah = h * 0.25
    return {
      viewBox: [w, h],
      path: `M 0 ${ah} L ${w - aw} ${ah} L ${w - aw} 0 L ${w} ${h / 2} L ${w - aw} ${h} L ${w - aw} ${h - ah} L 0 ${h - ah} L ${aw * 0.3} ${h / 2} Z`,
    }
  }),
  homePlate: dynamic((w, h) => {
    const off = w * 0.2
    return { viewBox: [w, h], path: `M 0 0 L ${w - off} 0 L ${w} ${h / 2} L ${w - off} ${h} L 0 ${h} Z` }
  }),
  stripedRightArrow: dynamic((w, h) => {
    const aw = w * 0.35, ah = h * 0.25, sw = w * 0.05
    return {
      viewBox: [w, h],
      path: `M ${sw * 2} ${ah} L ${sw * 4} ${ah} L ${sw * 4} ${h - ah} L ${sw * 2} ${h - ah} Z M ${sw * 5} ${ah} L ${w - aw} ${ah} L ${w - aw} 0 L ${w} ${h / 2} L ${w - aw} ${h} L ${w - aw} ${h - ah} L ${sw * 5} ${h - ah} Z`,
      special: true,
    }
  }),

  // Stars
  star4: dynamic((w, h) => {
    const cx = w / 2, cy = h / 2
    const or_ = Math.min(cx, cy), ir = or_ * 0.4
    const pts: number[][] = []
    for (let i = 0; i < 4; i++) {
      const oa = (i * 90 - 90) * Math.PI / 180
      pts.push([cx + or_ * Math.cos(oa), cy + or_ * Math.sin(oa)])
      const ia = (i * 90 - 45) * Math.PI / 180
      pts.push([cx + ir * Math.cos(ia), cy + ir * Math.sin(ia)])
    }
    const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + ` ${p[0]} ${p[1]}`).join(' ') + ' Z'
    return { viewBox: [w, h], path }
  }),
  star5: dynamic((w, h) => {
    const cx = w / 2, cy = h / 2
    const or_ = Math.min(cx, cy), ir = or_ * 0.38
    const pts: number[][] = []
    for (let i = 0; i < 5; i++) {
      const oa = (i * 72 - 90) * Math.PI / 180
      pts.push([cx + or_ * Math.cos(oa), cy + or_ * Math.sin(oa)])
      const ia = (i * 72 + 36 - 90) * Math.PI / 180
      pts.push([cx + ir * Math.cos(ia), cy + ir * Math.sin(ia)])
    }
    const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + ` ${p[0]} ${p[1]}`).join(' ') + ' Z'
    return { viewBox: [w, h], path }
  }),
  star6: dynamic((w, h) => {
    const cx = w / 2, cy = h / 2
    const or_ = Math.min(cx, cy), ir = or_ * 0.5
    const pts: number[][] = []
    for (let i = 0; i < 6; i++) {
      const oa = (i * 60 - 90) * Math.PI / 180
      pts.push([cx + or_ * Math.cos(oa), cy + or_ * Math.sin(oa)])
      const ia = (i * 60 + 30 - 90) * Math.PI / 180
      pts.push([cx + ir * Math.cos(ia), cy + ir * Math.sin(ia)])
    }
    const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + ` ${p[0]} ${p[1]}`).join(' ') + ' Z'
    return { viewBox: [w, h], path }
  }),
  star8: dynamic((w, h) => {
    const cx = w / 2, cy = h / 2
    const or_ = Math.min(cx, cy), ir = or_ * 0.5
    const pts: number[][] = []
    for (let i = 0; i < 8; i++) {
      const oa = (i * 45 - 90) * Math.PI / 180
      pts.push([cx + or_ * Math.cos(oa), cy + or_ * Math.sin(oa)])
      const ia = (i * 45 + 22.5 - 90) * Math.PI / 180
      pts.push([cx + ir * Math.cos(ia), cy + ir * Math.sin(ia)])
    }
    const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + ` ${p[0]} ${p[1]}`).join(' ') + ' Z'
    return { viewBox: [w, h], path }
  }),
  star10: dynamic((w, h) => {
    const cx = w / 2, cy = h / 2
    const or_ = Math.min(cx, cy), ir = or_ * 0.5
    const pts: number[][] = []
    for (let i = 0; i < 10; i++) {
      const oa = (i * 36 - 90) * Math.PI / 180
      pts.push([cx + or_ * Math.cos(oa), cy + or_ * Math.sin(oa)])
      const ia = (i * 36 + 18 - 90) * Math.PI / 180
      pts.push([cx + ir * Math.cos(ia), cy + ir * Math.sin(ia)])
    }
    const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + ` ${p[0]} ${p[1]}`).join(' ') + ' Z'
    return { viewBox: [w, h], path }
  }),
  star12: dynamic((w, h) => {
    const cx = w / 2, cy = h / 2
    const or_ = Math.min(cx, cy), ir = or_ * 0.55
    const pts: number[][] = []
    for (let i = 0; i < 12; i++) {
      const oa = (i * 30 - 90) * Math.PI / 180
      pts.push([cx + or_ * Math.cos(oa), cy + or_ * Math.sin(oa)])
      const ia = (i * 30 + 15 - 90) * Math.PI / 180
      pts.push([cx + ir * Math.cos(ia), cy + ir * Math.sin(ia)])
    }
    const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + ` ${p[0]} ${p[1]}`).join(' ') + ' Z'
    return { viewBox: [w, h], path }
  }),

  // Plus / Cross
  plus: dynamic((w, h) => {
    const lw = Math.min(w, h) / 4
    const cx = w / 2, cy = h / 2
    return {
      viewBox: [w, h],
      path: `M ${cx - lw / 2} 0 L ${cx + lw / 2} 0 L ${cx + lw / 2} ${cy - lw / 2} L ${w} ${cy - lw / 2} L ${w} ${cy + lw / 2} L ${cx + lw / 2} ${cy + lw / 2} L ${cx + lw / 2} ${h} L ${cx - lw / 2} ${h} L ${cx - lw / 2} ${cy + lw / 2} L 0 ${cy + lw / 2} L 0 ${cy - lw / 2} L ${cx - lw / 2} ${cy - lw / 2} Z`,
    }
  }),
  mathPlus: dynamic((w, h) => {
    const t = Math.min(w, h) * 0.15
    const cx = w / 2, cy = h / 2
    return {
      viewBox: [w, h],
      path: `M ${cx - t} 0 L ${cx + t} 0 L ${cx + t} ${cy - t} L ${w} ${cy - t} L ${w} ${cy + t} L ${cx + t} ${cy + t} L ${cx + t} ${h} L ${cx - t} ${h} L ${cx - t} ${cy + t} L 0 ${cy + t} L 0 ${cy - t} L ${cx - t} ${cy - t} Z`,
    }
  }),
  mathMinus: dynamic((w, h) => {
    const t = h * 0.15
    const cy = h / 2
    return { viewBox: [w, h], path: `M 0 ${cy - t} L ${w} ${cy - t} L ${w} ${cy + t} L 0 ${cy + t} Z` }
  }),
  mathMultiply: simple([W, H], `M ${W * 0.15} 0 L ${W / 2} ${H * 0.35} L ${W * 0.85} 0 L ${W} ${H * 0.15} L ${W * 0.65} ${H / 2} L ${W} ${H * 0.85} L ${W * 0.85} ${H} L ${W / 2} ${H * 0.65} L ${W * 0.15} ${H} L 0 ${H * 0.85} L ${W * 0.35} ${H / 2} L 0 ${H * 0.15} Z`, true),
  mathEqual: dynamic((w, h) => {
    const t = h * 0.12, gap = h * 0.12
    const y1 = h / 2 - gap - t, y2 = h / 2 + gap
    return {
      viewBox: [w, h],
      path: `M 0 ${y1} L ${w} ${y1} L ${w} ${y1 + t} L 0 ${y1 + t} Z M 0 ${y2} L ${w} ${y2} L ${w} ${y2 + t} L 0 ${y2 + t} Z`,
      special: true,
    }
  }),

  // Misc shapes
  heart: simple([W, H],
    `M ${W / 2} ${H * 0.3} C ${W / 2} ${H * 0.1} ${W * 0.25} 0 ${W * 0.1} 0 C 0 0 0 ${H * 0.2} 0 ${H * 0.35} C 0 ${H * 0.55} ${W / 2} ${H * 0.8} ${W / 2} ${H} C ${W / 2} ${H * 0.8} ${W} ${H * 0.55} ${W} ${H * 0.35} C ${W} ${H * 0.2} ${W} 0 ${W * 0.9} 0 C ${W * 0.75} 0 ${W / 2} ${H * 0.1} ${W / 2} ${H * 0.3} Z`,
    true,
  ),
  lightningBolt: simple([W, H], `M ${W * 0.4} 0 L ${W * 0.7} 0 L ${W * 0.45} ${H * 0.4} L ${W * 0.7} ${H * 0.4} L ${W * 0.25} ${H} L ${W * 0.4} ${H * 0.55} L ${W * 0.15} ${H * 0.55} Z`, true),
  moon: dynamic((w, h) => {
    const cx = w * 0.6
    return {
      viewBox: [w, h],
      path: `M ${w} 0 C ${cx} ${h * 0.1} ${cx} ${h * 0.9} ${w} ${h} C ${w * 0.3} ${h * 0.85} 0 ${h * 0.65} 0 ${h / 2} C 0 ${h * 0.35} ${w * 0.3} ${h * 0.15} ${w} 0 Z`,
      special: true,
    }
  }),
  sun: dynamic((w, h) => {
    // Simplified sun: circle in center
    const cx = w / 2, cy = h / 2, r = Math.min(cx, cy) * 0.5
    return {
      viewBox: [w, h],
      path: `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r} Z`,
      special: true,
    }
  }),
  cloud: simple([W, H],
    `M ${W * 0.35} ${H * 0.8} C ${W * 0.15} ${H * 0.8} 0 ${H * 0.65} ${W * 0.05} ${H * 0.5} C 0 ${H * 0.3} ${W * 0.15} ${H * 0.15} ${W * 0.35} ${H * 0.2} C ${W * 0.4} ${H * 0.05} ${W * 0.55} 0 ${W * 0.65} ${H * 0.1} C ${W * 0.75} ${H * 0.05} ${W * 0.9} ${H * 0.15} ${W * 0.9} ${H * 0.35} C ${W} ${H * 0.4} ${W} ${H * 0.55} ${W * 0.9} ${H * 0.6} C ${W * 0.95} ${H * 0.75} ${W * 0.85} ${H * 0.85} ${W * 0.7} ${H * 0.8} Z`,
    true,
  ),
  frame: dynamic((w, h) => {
    const bw = Math.min(w, h) * 0.12
    return {
      viewBox: [w, h],
      path: `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z M ${bw} ${bw} L ${bw} ${h - bw} L ${w - bw} ${h - bw} L ${w - bw} ${bw} Z`,
      special: true,
    }
  }),

  // Callouts
  wedgeRectCallout: dynamic((w, h) => {
    const ah = h * 0.2, aw = w * 0.1
    return {
      viewBox: [w, h],
      path: `M 0 0 L ${w} 0 L ${w} ${h - ah} L ${w / 2 + aw} ${h - ah} L ${w / 2} ${h} L ${w / 2 - aw} ${h - ah} L 0 ${h - ah} Z`,
    }
  }),
  wedgeRoundRectCallout: dynamic((w, h) => {
    const ah = h * 0.2, aw = w * 0.1, r = Math.min(w, h) * 0.08
    return {
      viewBox: [w, h],
      path: `M ${r} 0 L ${w - r} 0 Q ${w} 0 ${w} ${r} L ${w} ${h - ah - r} Q ${w} ${h - ah} ${w - r} ${h - ah} L ${w / 2 + aw} ${h - ah} L ${w / 2} ${h} L ${w / 2 - aw} ${h - ah} L ${r} ${h - ah} Q 0 ${h - ah} 0 ${h - ah - r} L 0 ${r} Q 0 0 ${r} 0 Z`,
    }
  }),
  wedgeEllipseCallout: dynamic((w, h) => {
    const rx = w / 2, ry = (h - h * 0.2) / 2
    return {
      viewBox: [w, h],
      path: `M ${rx} 0 A ${rx} ${ry} 0 1 1 ${rx} ${ry * 2} L ${rx + w * 0.05} ${ry * 2} L ${rx} ${h} L ${rx - w * 0.05} ${ry * 2} A ${rx} ${ry} 0 1 1 ${rx} 0 Z`,
      special: true,
    }
  }),
  cloudCallout: simple([W, H],
    `M ${W * 0.35} ${H * 0.7} C ${W * 0.15} ${H * 0.7} 0 ${H * 0.55} ${W * 0.05} ${H * 0.4} C 0 ${H * 0.2} ${W * 0.15} ${H * 0.05} ${W * 0.35} ${H * 0.1} C ${W * 0.4} 0 ${W * 0.55} 0 ${W * 0.65} ${H * 0.05} C ${W * 0.75} 0 ${W * 0.9} ${H * 0.1} ${W * 0.9} ${H * 0.25} C ${W} ${H * 0.3} ${W} ${H * 0.45} ${W * 0.9} ${H * 0.5} C ${W * 0.95} ${H * 0.65} ${W * 0.85} ${H * 0.75} ${W * 0.7} ${H * 0.7} Z`,
    true,
  ),

  // Flowchart shapes
  flowChartProcess: simple([W, H], `M 0 0 L ${W} 0 L ${W} ${H} L 0 ${H} Z`),
  flowChartDecision: simple([W, H], `M ${W / 2} 0 L ${W} ${H / 2} L ${W / 2} ${H} L 0 ${H / 2} Z`),
  flowChartTerminator: dynamic((w, h) => {
    const r = h / 2
    return {
      viewBox: [w, h],
      path: `M ${r} 0 L ${w - r} 0 A ${r} ${r} 0 0 1 ${w - r} ${h} L ${r} ${h} A ${r} ${r} 0 0 1 ${r} 0 Z`,
      special: true,
    }
  }),
  flowChartDocument: dynamic((w, h) => {
    const wh = h * 0.85
    return {
      viewBox: [w, h],
      path: `M 0 0 L ${w} 0 L ${w} ${wh} C ${w * 0.75} ${h} ${w * 0.5} ${h * 0.7} ${w * 0.25} ${wh} C ${w * 0.1} ${wh * 1.05} 0 ${h * 0.95} 0 ${wh} Z`,
      special: true,
    }
  }),
  flowChartInputOutput: dynamic((w, h) => {
    const off = w * 0.2
    return { viewBox: [w, h], path: `M ${off} 0 L ${w} 0 L ${w - off} ${h} L 0 ${h} Z` }
  }),
  flowChartPredefinedProcess: dynamic((w, h) => {
    const bw = w * 0.1
    return {
      viewBox: [w, h],
      path: `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z M ${bw} 0 L ${bw} ${h} M ${w - bw} 0 L ${w - bw} ${h}`,
      special: true,
    }
  }),
  flowChartInternalStorage: dynamic((w, h) => {
    const bw = w * 0.12, bh = h * 0.12
    return {
      viewBox: [w, h],
      path: `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z M ${bw} 0 L ${bw} ${h} M 0 ${bh} L ${w} ${bh}`,
      special: true,
    }
  }),
  flowChartManualInput: dynamic((w, h) => {
    const off = h * 0.2
    return { viewBox: [w, h], path: `M 0 ${off} L ${w} 0 L ${w} ${h} L 0 ${h} Z` }
  }),
  flowChartManualOperation: dynamic((w, h) => {
    const off = w * 0.15
    return { viewBox: [w, h], path: `M 0 0 L ${w} 0 L ${w - off} ${h} L ${off} ${h} Z` }
  }),
  flowChartPreparation: dynamic((w, h) => {
    const off = w * 0.2
    return { viewBox: [w, h], path: `M ${off} 0 L ${w - off} 0 L ${w} ${h / 2} L ${w - off} ${h} L ${off} ${h} L 0 ${h / 2} Z` }
  }),
  flowChartPunchedTape: dynamic((w, h) => {
    const cy = h * 0.1
    return {
      viewBox: [w, h],
      path: `M 0 ${cy} C ${w * 0.25} 0 ${w * 0.75} ${cy * 2} ${w} ${cy} L ${w} ${h - cy} C ${w * 0.75} ${h} ${w * 0.25} ${h - cy * 2} 0 ${h - cy} Z`,
      special: true,
    }
  }),
  flowChartConnector: dynamic((w, h) => {
    const r = Math.min(w, h) / 2
    return {
      viewBox: [w, h],
      path: `M ${w / 2} 0 A ${r} ${r} 0 1 1 ${w / 2} ${h} A ${r} ${r} 0 1 1 ${w / 2} 0 Z`,
      special: true,
    }
  }),
  flowChartOffpageConnector: dynamic((w, h) => {
    const ah = h * 0.2
    return { viewBox: [w, h], path: `M 0 0 L ${w} 0 L ${w} ${h - ah} L ${w / 2} ${h} L 0 ${h - ah} Z` }
  }),
  flowChartSort: simple([W, H], `M ${W / 2} 0 L ${W} ${H / 2} L ${W / 2} ${H} L 0 ${H / 2} Z M 0 ${H / 2} L ${W} ${H / 2}`, true),
  flowChartExtract: simple([W, H], `M ${W / 2} 0 L ${W} ${H} L 0 ${H} Z`),
  flowChartMerge: simple([W, H], `M 0 0 L ${W} 0 L ${W / 2} ${H} Z`),
  flowChartDelay: dynamic((w, h) => {
    const r = h / 2
    return {
      viewBox: [w, h],
      path: `M 0 0 L ${w - r} 0 A ${r} ${r} 0 0 1 ${w - r} ${h} L 0 ${h} Z`,
      special: true,
    }
  }),
  flowChartAlternateProcess: dynamic((w, h) => {
    const r = Math.min(w, h) * 0.15
    return {
      viewBox: [w, h],
      path: `M ${r} 0 L ${w - r} 0 Q ${w} 0 ${w} ${r} L ${w} ${h - r} Q ${w} ${h} ${w - r} ${h} L ${r} ${h} Q 0 ${h} 0 ${h - r} L 0 ${r} Q 0 0 ${r} 0 Z`,
    }
  }),
  flowChartMultidocument: simple([W, H],
    `M 0 ${H * 0.15} L ${W * 0.85} ${H * 0.15} L ${W * 0.85} 0 L ${W} 0 L ${W} ${H * 0.85} L ${W * 0.15} ${H * 0.85} L ${W * 0.15} ${H} L 0 ${H} Z`,
    true,
  ),
  flowChartOnlineStorage: dynamic((w, h) => {
    const r = w * 0.15
    return {
      viewBox: [w, h],
      path: `M ${r} 0 L ${w} 0 C ${w - r} ${h * 0.3} ${w - r} ${h * 0.7} ${w} ${h} L ${r} ${h} C 0 ${h * 0.7} 0 ${h * 0.3} ${r} 0 Z`,
      special: true,
    }
  }),
  flowChartDisplay: dynamic((w, h) => {
    const r = w * 0.15
    return {
      viewBox: [w, h],
      path: `M ${r} 0 L ${w - r} 0 A ${r} ${h / 2} 0 0 1 ${w - r} ${h} L ${r} ${h} L 0 ${h / 2} Z`,
      special: true,
    }
  }),

  // Action buttons
  actionButtonBlank: simple([W, H], `M 0 0 L ${W} 0 L ${W} ${H} L 0 ${H} Z`),

  // Ribbons and banners
  ribbon2: dynamic((w, h) => {
    const rw = w * 0.1, rh = h * 0.2
    return {
      viewBox: [w, h],
      path: `M 0 ${rh} L ${rw} ${rh} L ${rw} 0 L ${w - rw} 0 L ${w - rw} ${rh} L ${w} ${rh} L ${w - rw / 2} ${rh + (h - rh) / 2} L ${w} ${h} L ${w - rw} ${h - rh} L ${rw} ${h - rh} L 0 ${h} L ${rw / 2} ${rh + (h - rh) / 2} Z`,
      special: true,
    }
  }),

  // Cubes and 3D-like
  cube: dynamic((w, h) => {
    const d = Math.min(w, h) * 0.2
    return {
      viewBox: [w, h],
      path: `M 0 ${d} L ${d} 0 L ${w} 0 L ${w} ${h - d} L ${w - d} ${h} L 0 ${h} Z M 0 ${d} L ${w - d} ${d} L ${w} 0 M ${w - d} ${d} L ${w - d} ${h}`,
      special: true,
    }
  }),

  // Block arcs / circular shapes
  blockArc: dynamic((w, h) => {
    const cx = w / 2, cy = h / 2, or_ = Math.min(cx, cy), ir = or_ * 0.6
    return {
      viewBox: [w, h],
      path: `M ${cx} ${cy - or_} A ${or_} ${or_} 0 1 1 ${cx - 0.01} ${cy - or_} M ${cx} ${cy - ir} A ${ir} ${ir} 0 1 0 ${cx - 0.01} ${cy - ir} Z`,
      special: true,
    }
  }),
  donut: dynamic((w, h) => {
    const cx = w / 2, cy = h / 2, or_ = Math.min(cx, cy), ir = or_ * 0.5
    return {
      viewBox: [w, h],
      path: `M ${cx} ${cy - or_} A ${or_} ${or_} 0 1 1 ${cx - 0.01} ${cy - or_} Z M ${cx} ${cy - ir} A ${ir} ${ir} 0 1 0 ${cx - 0.01} ${cy - ir} Z`,
      special: true,
    }
  }),

  // Bracket / Brace
  leftBracket: dynamic((w, h) => {
    const r = Math.min(w * 0.5, h * 0.1)
    return {
      viewBox: [w, h],
      path: `M ${w} 0 L ${r} 0 Q 0 0 0 ${r} L 0 ${h - r} Q 0 ${h} ${r} ${h} L ${w} ${h}`,
      special: true,
    }
  }),
  rightBracket: dynamic((w, h) => {
    const r = Math.min(w * 0.5, h * 0.1)
    return {
      viewBox: [w, h],
      path: `M 0 0 L ${w - r} 0 Q ${w} 0 ${w} ${r} L ${w} ${h - r} Q ${w} ${h} ${w - r} ${h} L 0 ${h}`,
      special: true,
    }
  }),
  leftBrace: dynamic((w, h) => {
    const r = Math.min(w * 0.3, h * 0.05)
    const cy = h / 2
    return {
      viewBox: [w, h],
      path: `M ${w} 0 Q ${w - r} 0 ${w - r} ${r} L ${w - r} ${cy - r} Q ${w - r} ${cy} ${w - r * 2} ${cy} Q ${w - r} ${cy} ${w - r} ${cy + r} L ${w - r} ${h - r} Q ${w - r} ${h} ${w} ${h}`,
      special: true,
    }
  }),
  rightBrace: dynamic((w, h) => {
    const r = Math.min(w * 0.3, h * 0.05)
    const cy = h / 2
    return {
      viewBox: [w, h],
      path: `M 0 0 Q ${r} 0 ${r} ${r} L ${r} ${cy - r} Q ${r} ${cy} ${r * 2} ${cy} Q ${r} ${cy} ${r} ${cy + r} L ${r} ${h - r} Q ${r} ${h} 0 ${h}`,
      special: true,
    }
  }),

  // Tab and scroll shapes  
  plaque: dynamic((w, h) => {
    const r = Math.min(w, h) * 0.15
    return {
      viewBox: [w, h],
      path: `M 0 ${r} Q 0 0 ${r} 0 L ${w - r} 0 Q ${w} 0 ${w} ${r} L ${w} ${h - r} Q ${w} ${h} ${w - r} ${h} L ${r} ${h} Q 0 ${h} 0 ${h - r} Z`,
    }
  }),

  // line
  line: dynamic((w, h) => {
    return { viewBox: [w, h], path: `M 0 0 L ${w} ${h}`, special: true }
  }),

  // No geometry / unknown fallback
  noSmoking: dynamic((w, h) => {
    const cx = w / 2, cy = h / 2, r = Math.min(cx, cy)
    return {
      viewBox: [w, h],
      path: `M ${cx} 0 A ${r} ${r} 0 1 1 ${cx} ${h} A ${r} ${r} 0 1 1 ${cx} 0 Z`,
      special: true,
    }
  }),

  // Text-only shape (no visible geometry, transparent container)
  textNoShape: simple([W, H], `M 0 0 L ${W} 0 L ${W} ${H} L 0 ${H} Z`),
}

/**
 * Get a preset shape SVG path by its OOXML preset geometry name.
 * Uses a default viewBox of 200x200 for most shapes.
 */
export function getPresetShape(prst: string, w?: number, h?: number): PresetShapeResult {
  const generator = PRESET_SHAPE_MAP[prst]
  if (!generator) {
    // Fallback: simple rectangle
    const vw = w || W
    const vh = h || H
    return { viewBox: [vw, vh], path: `M 0 0 L ${vw} 0 L ${vw} ${vh} L 0 ${vh} Z`, special: true }
  }
  return generator(w || W, h || H)
}
