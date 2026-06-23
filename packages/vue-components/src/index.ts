import type { App, Plugin } from 'vue'
import * as components from './components'

export * from './components'

export const install: Plugin['install'] = (app: App) => {
  for (const component of Object.values(components)) {
    if (component.name) {
      app.component(component.name, component)
    }
  }
}

export default {
  install,
}
