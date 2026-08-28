import type { Plugin } from 'vite'

/**
 * Univer 的 React UI 依赖（Radix UI、sonner 等）文件顶部含 RSC 指令 `use client`。
 * 在 Vite 客户端打包中该指令无意义，Rollup 会报 MODULE_LEVEL_DIRECTIVE；构建前剔除即可。
 */
export function stripUseClientDirective(): Plugin {
  return {
    name: 'strip-use-client-directive',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('node_modules')) return
      if (!/\buse client\b/.test(code)) return
      const next = code.replace(/^\s*['"]use client['"];?\s*\r?\n/gm, '')
      if (next === code) return
      return { code: next, map: null }
    },
  }
}
