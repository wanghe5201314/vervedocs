import { ExcelEditor } from './object/ExcelEditor'

const applyExcelTheme = () => {
  const root = document.documentElement
  root.style.setProperty('--tabs-bg-color', '#217346')
  root.style.setProperty('--tabs-text-color', '#ffffff')
}

applyExcelTheme()

new ExcelEditor({
  container: '#app',
  documentName: '新建文档'
})
