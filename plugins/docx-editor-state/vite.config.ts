import { defineConfig } from 'vite'
import { resolve } from 'path'
import { fileURLToPath, URL } from 'node:url'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      rollupTypes: true
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'DocxEditorState',
      formats: ['es', 'umd'],
      fileName: 'docx-editor-state'
    },
    rollupOptions: {
      external: [/^@wanghe1995\/docx-editor-/],
      output: {
        globals: {
          '@vervedoc/docx-editor-schema': 'DocxEditorSchema'
        }
      }
    },
    sourcemap: true
  }
})
