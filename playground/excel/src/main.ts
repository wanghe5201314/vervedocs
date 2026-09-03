import { ExcelEditor } from '@vervedoc/excel'
import {
  createExcelExportCallback,
  createExcelImportCallback,
} from '@vervedoc/excel-parser'
import './demo.css'

const applyExcelTheme = () => {
  const root = document.documentElement
  root.style.setProperty('--tabs-bg-color', '#217346')
  root.style.setProperty('--tabs-text-color', '#ffffff')
}

applyExcelTheme()

const params = new URLSearchParams(window.location.search)
const userName = params.get('user') || `用户${Math.floor(Math.random() * 1000)}`
const userId = `local-${userName}-${Math.random().toString(36).slice(2, 8)}`

const COLORS = ['#958DF1', '#F98181', '#FBBC88', '#FAF594', '#70CFF8', '#94FADB', '#B9F18D', '#E8A0BF']
const color = COLORS[Math.floor(Math.random() * COLORS.length)]

new ExcelEditor({
  container: '#app',
  importCallback: createExcelImportCallback(),
  exportCallback: createExcelExportCallback(),
  collaboration: {
    serverUrl: 'ws://127.0.0.1:1234',
    docId: 'test-excel-collab',
    user: { userId, userName, color },
  },
})
