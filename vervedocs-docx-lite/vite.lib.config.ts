import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'
// @ts-ignore
import path from 'path'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'url'
// @ts-ignore
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const name = 'docx-lite'
const pkg = JSON.parse(
  readFileSync(path.resolve(__dirname, 'package.json'), 'utf8')
) as { version?: string }

export default defineConfig({
  plugins: [
    vue(),
    cssInjectedByJsPlugin(),
    dts({
      include: ['src/**/*.ts', 'src/**/*.vue'],
      outDir: 'dist',
      rollupTypes: false
    })
  ],
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, 'src') }
    ]
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version || '')
  },
  build: {
    sourcemap: false,
    lib: {
      name,
      fileName: name,
      entry: path.resolve(__dirname, 'src/editor/index.ts')
    },
    rollupOptions: {
      external: [
        'vue',
        '@vervedoc/core',
        /^@vervedoc\/docx-editor-/,
        'jszip'
      ],
      output: {
        exports: 'named',
        globals: {
          vue: 'Vue',
          '@vervedoc/core': 'VerveDocCore',
          '@vervedoc/docx-editor-schema': 'DocxEditorSchema',
          '@vervedoc/docx-editor-state': 'DocxEditorState',
          '@vervedoc/docx-editor-transform': 'DocxEditorTransform',
          '@vervedoc/docx-editor-view': 'DocxEditorView',
          '@vervedoc/docx-editor-history': 'DocxEditorHistory',
          '@vervedoc/docx-editor-keymap': 'DocxEditorKeymap',
          '@vervedoc/docx-editor-commands': 'DocxEditorCommands',
          '@vervedoc/docx-editor-comment': 'DocxEditorComment',
          'jszip': 'JSZip'
        }
      }
    }
  }
})
