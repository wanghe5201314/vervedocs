import { createApp } from 'vue'
import 'ant-design-vue/dist/reset.css'

import './assets/fonts/material-icons/material-icons.css'
import './assets/iconfont/iconfont.js'

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

app.mount('#app')
