import { defineConfig } from 'vite'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'
import dts from 'vite-plugin-dts'
// @ts-ignore
import path from 'path'
import { fileURLToPath } from 'url'
// @ts-ignore
const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    cssInjectedByJsPlugin({
      styleId: 'docx-editor-core-style',
      topExecutionPriority: true
    }),
    dts({
      insertTypesEntry: true,
      rollupTypes: false
    })
  ],
  server: {
    port: 5173,
    open: '/test.html'
  },
  build: {
    sourcemap: true,
    lib: {
      name: 'DocxEditorCore',
      fileName: 'docx-editor-core',
      entry: path.resolve(__dirname, 'src/index.ts')
    },
    rollupOptions: {
      external: [/^@wanghe1995\/docx-editor-/, 'jszip'],
      output: {
        exports: 'named',
        globals: {
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
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  }
})
