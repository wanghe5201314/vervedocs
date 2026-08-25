import { createApp } from 'vue'
import 'ant-design-vue/dist/reset.css'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import { ConfigProvider } from 'ant-design-vue'
import WordEditor from '../app/WordEditorApp.vue'

const app = createApp(WordEditor)
app.use(ConfigProvider, { locale: zhCN })
app.mount('#app')
