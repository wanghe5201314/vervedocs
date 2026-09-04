import { WordEditor } from '@vervedoc/docx-lite'
import {
  createDocxImportCallback,
  createDocxExportCallback
} from '@vervedoc/docx-parser'
import './demo.css'

new WordEditor({
  container: '#app',
  title: '新建文档',
  importCallback: createDocxImportCallback(),
  exportCallback: createDocxExportCallback(),
  onReady: () => {
    console.info('[playground] WordEditor ready')
  }
})
