import { defineConfig } from 'vite'
import { resolve } from 'path'
import { fileURLToPath, URL } from 'node:url'
import dts from 'vite-plugin-dts'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      rollupTypes: true
    }),
    cssInjectedByJsPlugin()
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'DocxEditorView',
      formats: ['es', 'umd'],
      fileName: 'docx-editor-view'
    },
    rollupOptions: {
      external: [/^@wanghe1995\/docx-editor-/],
      output: {
        globals: {
          '@wanghe1995/docx-editor-schema': 'DocxEditorSchema',
          '@wanghe1995/docx-editor-state': 'DocxEditorState',
          '@wanghe1995/docx-editor-transform': 'DocxEditorTransform',
          '@wanghe1995/docx-editor-keymap': 'DocxEditorKeymap'
        }
      }
    },
    sourcemap: true
  }
})
