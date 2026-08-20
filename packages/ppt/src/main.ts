import { createApp, h, ref } from 'vue'
import { createPinia } from 'pinia'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import PptEditor from './components/PptEditor.vue'
import PptPlugins from './plugins'
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
app.use(Antd)
app.use(PptPlugins)
app.mount('#app')
