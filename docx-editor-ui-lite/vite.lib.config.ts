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

const name = 'docx-editor-lite'
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
        /^@wanghe1995\/docx-editor/,
        'jszip'
      ],
      output: {
        exports: 'named',
        globals: {
          vue: 'Vue',
          '@wanghe1995/docx-editor-core': 'DocxEditorCore',
          '@wanghe1995/docx-editor-schema': 'DocxEditorSchema',
          '@wanghe1995/docx-editor-state': 'DocxEditorState',
          '@wanghe1995/docx-editor-transform': 'DocxEditorTransform',
          '@wanghe1995/docx-editor-view': 'DocxEditorView',
          '@wanghe1995/docx-editor-history': 'DocxEditorHistory',
          '@wanghe1995/docx-editor-keymap': 'DocxEditorKeymap',
          '@wanghe1995/docx-editor-commands': 'DocxEditorCommands',
          '@wanghe1995/docx-editor-comment': 'DocxEditorComment',
          'jszip': 'JSZip'
        }
      }
    }
  }
})
