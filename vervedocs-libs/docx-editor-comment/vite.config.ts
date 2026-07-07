import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [dts({ rollupTypes: true })],
  build: {
    lib: {
      entry: './src/index.ts',
      name: 'DocxEditorComment',
      formats: ['es', 'umd'],
      fileName: (format) => `docx-editor-comment.${format === 'es' ? 'js' : 'umd.cjs'}`
    },
    rollupOptions: {
      external: [/^@wanghe1995\//],
      output: {
        globals: {
          '@vervedoc/docx-editor-schema': 'DocxEditorSchema',
          '@vervedoc/docx-editor-state': 'DocxEditorState',
          '@vervedoc/docx-editor-transform': 'DocxEditorTransform'
        }
      }
    }
  }
})
