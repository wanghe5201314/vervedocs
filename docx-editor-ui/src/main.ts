import { createApp } from 'vue'
import 'element-plus/dist/index.css'

import './assets/fonts/material-icons/material-icons.css'
import './assets/iconfont/iconfont.js'

import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import './style.css'
import 'prismjs/themes/prism.css'
import { uiThemeStore } from './stores/ui-theme'
import { applyUiConstants } from './config/ui-constants'
import { resolveAppFromLocation } from '@/utils/resolve-app'

applyUiConstants()
uiThemeStore.init()
const resolved = resolveAppFromLocation(window.location)
const app = createApp(resolved.app)
if (resolved.initDocument) app.provide('docx-editor-ui:initDocument', resolved.initDocument)

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.mount('#app')
