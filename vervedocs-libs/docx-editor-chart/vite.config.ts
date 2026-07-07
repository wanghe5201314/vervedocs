import { defineConfig } from 'vite'
import * as path from 'path'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      rollupTypes: true
    })
  ],
  build: {
    sourcemap: true,
    lib: {
      name: 'DocxEditorChart',
      fileName: 'docx-editor-chart',
      entry: path.resolve(__dirname, 'src/index.ts')
    },
    rollupOptions: {
      external: [
        'echarts',
        /^echarts\//,
        /^@vervedoc\/docx-editor/
      ],
      output: {
        exports: 'named',
        globals: {
          echarts: 'echarts',
          'echarts/core': 'echarts',
          'echarts/charts': 'echarts',
          'echarts/components': 'echarts',
          'echarts/renderers': 'echarts',

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
    }
  }
})
