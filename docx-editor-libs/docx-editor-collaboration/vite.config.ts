import { defineConfig } from 'vite'
import { resolve } from 'path'
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
      '@': resolve(__dirname, 'src')
    }
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'DocxEditorCollaboration',
      formats: ['es', 'umd'],
      fileName: 'docx-editor-collaboration'
    },
    rollupOptions: {
      external: [
        'yjs',
        '@hocuspocus/provider',
        /^@wanghe1995\/docx-editor/
      ],
      output: {
        globals: {
          'yjs': 'Y',
          '@hocuspocus/provider': 'HocuspocusProvider',
          '@wanghe1995/docx-editor-core': 'DocxEditorCore',
          '@wanghe1995/docx-editor-schema': 'DocxEditorSchema',
          '@wanghe1995/docx-editor-state': 'DocxEditorState',
          '@wanghe1995/docx-editor-transform': 'DocxEditorTransform',
          '@wanghe1995/docx-editor-view': 'DocxEditorView',
          '@wanghe1995/docx-editor-history': 'DocxEditorHistory',
          '@wanghe1995/docx-editor-keymap': 'DocxEditorKeymap',
          '@wanghe1995/docx-editor-commands': 'DocxEditorCommands',
          '@wanghe1995/docx-editor-comment': 'DocxEditorComment'
        }
      }
    },
    sourcemap: true
  }
})
