import type { App } from 'vue'
import IconPlugin from './icon'
import ComponentPlugin from './component'
import DirectivePlugin from './directive'

export default {
  install(app: App) {
    app.use(IconPlugin)
    app.use(ComponentPlugin)
    app.use(DirectivePlugin)
  },
}
