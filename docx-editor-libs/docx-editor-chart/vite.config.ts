import { defineConfig } from 'vite'
import * as path from 'path'

export default defineConfig({
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
        /^@wanghe1995\/docx-editor/
      ],
      output: {
        exports: 'named',
        globals: {
          echarts: 'echarts',
          'echarts/core': 'echarts',
          'echarts/charts': 'echarts',
          'echarts/components': 'echarts',
          'echarts/renderers': 'echarts',
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
    }
  }
})
