import { PptEditor } from '@vervedoc/ppt'
import './dev.css'

let content: any

new PptEditor({
  container: '#app',
  documentName: '演示文稿',
  onChange: (payload) => {
    content = payload.data
  },
})

export { content }
