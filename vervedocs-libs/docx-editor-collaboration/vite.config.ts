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
        /^@vervedoc\/docx-editor/
      ],
      output: {
        globals: {
          'yjs': 'Y',
          '@hocuspocus/provider': 'HocuspocusProvider',

          '@vervedoc/docx-editor-schema': 'DocxEditorSchema',
          '@vervedoc/docx-editor-state': 'DocxEditorState',
          '@vervedoc/docx-editor-transform': 'DocxEditorTransform',
          '@vervedoc/docx-editor-view': 'DocxEditorView',
          '@vervedoc/docx-editor-history': 'DocxEditorHistory',
          '@vervedoc/docx-editor-keymap': 'DocxEditorKeymap',
          '@vervedoc/docx-editor-commands': 'DocxEditorCommands',
          '@vervedoc/docx-editor-comment': 'DocxEditorComment'
        }
      }
    },
    sourcemap: true
  }
})
