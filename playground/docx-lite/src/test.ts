import { WordEditor } from '@vervedoc/docx-lite'
import './demo.css'
import data from '../../../test-output.json'

new WordEditor({
  container: '#app',
  title: '测试文档',
  data: data as any,
  onReady: () => {
    console.info('[playground] WordEditor ready, data loaded from test-output.json')
  }
})
