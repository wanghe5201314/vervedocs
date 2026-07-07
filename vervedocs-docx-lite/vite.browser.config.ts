import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'
import path from 'path'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'url'

// @ts-ignore
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(
  readFileSync(path.resolve(__dirname, 'package.json'), 'utf8')
) as { version?: string }

export default defineConfig({
  plugins: [
    vue(),
    cssInjectedByJsPlugin()
  ],
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, 'src') },
      { find: /^vue$/, replacement: path.resolve(__dirname, 'node_modules/vue/dist/vue.esm-browser.prod.js') },
      { find: /^@vue\/runtime-dom$/, replacement: path.resolve(__dirname, 'node_modules/@vue/runtime-dom/dist/runtime-dom.esm-browser.prod.js') },
      { find: /^@vue\/runtime-core$/, replacement: path.resolve(__dirname, 'node_modules/@vue/runtime-core/dist/runtime-core.esm-browser.prod.js') },
      { find: /^@vue\/reactivity$/, replacement: path.resolve(__dirname, 'node_modules/@vue/reactivity/dist/reactivity.esm-browser.prod.js') },
      { find: /^@vue\/shared$/, replacement: path.resolve(__dirname, 'node_modules/@vue/shared/dist/shared.esm-bundler.js') },
      { find: /^@vervedoc\/core$/, replacement: path.resolve(__dirname, '../vervedocs-core/dist/core.js') }
    ]
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version || ''),
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env': JSON.stringify({ NODE_ENV: 'production' }),
    process: JSON.stringify({
      env: { NODE_ENV: 'production' },
      versions: {}
    })
  },
  build: {
    emptyOutDir: false,
    sourcemap: false,
    minify: 'esbuild',
    cssCodeSplit: false,
    lib: {
      name: 'VerveDocDocxLite',
      entry: path.resolve(__dirname, 'src/browser/index.ts'),
      formats: ['iife'],
      fileName: () => 'docx-lite.browser.js'
    }
  }
})
