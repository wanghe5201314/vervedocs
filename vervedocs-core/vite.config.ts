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
      name: 'VerveDocCore',
      fileName: 'core',
      entry: path.resolve(__dirname, 'src/index.ts')
    },
    rollupOptions: {
      external: [/^@vervedoc\/docx-editor-/, 'jszip'],
      output: {
        exports: 'named',
        globals: {
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
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  }
})
