import { WordEditor } from '@vervedoc/docx-lite'
import './demo.css'

new WordEditor({
  container: '#app',
  title: '新建文档',
  onReady: () => {
    console.info('[playground] WordEditor ready')
  }
})
