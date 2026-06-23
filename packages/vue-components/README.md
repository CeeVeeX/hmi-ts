# @hmi-ts/vue-components

Vue 3 组件库包，提供可安装插件与按需组件导出。

## 开发命令

```bash
pnpm --filter @hmi-ts/vue-components dev
pnpm --filter @hmi-ts/vue-components build
pnpm --filter @hmi-ts/vue-components test
```

## 导出结构

- 主入口: `@hmi-ts/vue-components`
- 组件子入口: `@hmi-ts/vue-components/components`

## 使用方式

全量安装:

```ts
import { createApp } from 'vue'
import App from './App.vue'
import HmiComponents from '@hmi-ts/vue-components'

createApp(App).use(HmiComponents).mount('#app')
```

按需引入:

```ts
import { HmiButton } from '@hmi-ts/vue-components/components'
```
