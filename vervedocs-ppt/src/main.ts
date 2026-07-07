import { createApp, h, ref } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import PptEditor from './components/PptEditor.vue'
import './dev.css'
import './assets/iconfont/iconfont.css'
import './assets/iconfont/iconfont.js'

const App = {
  setup() {
    const content = ref<any>()
    const onChange = (payload: { format: string; data: any }) => {
      content.value = payload.data
    }
    return () => h('div', { class: 'dev-page' }, [
      h(PptEditor, {
        'initial-content': content.value,
        'document-name': '演示文稿',
        'onUpdate:initial-content': (val: any) => { content.value = val },
        onChange
      })
    ])
  },
}

const app = createApp(App)
app.use(createPinia())
app.use(ElementPlus, { locale: zhCn })
app.mount('#app')
