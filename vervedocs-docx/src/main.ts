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

const params = new URLSearchParams(window.location.search)
const collabUser = params.get('user')
if (collabUser) {
  const userId = `local-${collabUser}-${Math.random().toString(36).slice(2, 8)}`
  const COLORS = ['#958DF1', '#F98181', '#FBBC88', '#FAF594', '#70CFF8', '#94FADB', '#B9F18D', '#E8A0BF']
  const color = COLORS[Math.floor(Math.random() * COLORS.length)]
  app.provide('docx-editor-ui:collaboration', {
    serverUrl: 'ws://127.0.0.1:1234',
    docId: 'test-docx-collab',
    user: { userId, userName: collabUser, color },
  })
}

app.mount('#app')
