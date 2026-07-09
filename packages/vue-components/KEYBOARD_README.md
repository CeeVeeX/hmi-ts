# HmiKeyboard 拟物键盘组件

一个高度可定制的 Vue 3 拟物虚拟键盘组件，具有真实的 3D 按钮效果和流畅的交互动画。

## 特性

- ✨ **拟物设计** - 逼真的 3D 按钮效果，包括阴影、高光和凹陷感
- ⌨️ **多种布局** - 支持完整键盘、数字键盘和自定义布局
- 📱 **响应式** - 支持鼠标和触摸事件
- 🎨 **高度可定制** - 支持自定义按键大小、圆角、样式等
- ⚡ **流畅动画** - 按键按下/释放动画和视觉反馈
- 🎯 **类型安全** - 完整的 TypeScript 支持

## 安装

```bash
pnpm add @hmi-ts/vue-components
```

## 基本使用

### 完整键盘（包含数字和字母）

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { HmiKeyboard } from '@hmi-ts/vue-components'

const inputValue = ref('')

const handleInput = (key: string) => {
  inputValue.value += key
}

const handleBackspace = () => {
  inputValue.value = inputValue.value.slice(0, -1)
}

const handleEnter = () => {
  console.log('Submitted:', inputValue.value)
}
</script>

<template>
  <div>
    <input v-model="inputValue" type="text" />
    <HmiKeyboard
      layout="full"
      @input="handleInput"
      @backspace="handleBackspace"
      @enter="handleEnter"
    />
  </div>
</template>
```

### 数字键盘

```vue
<template>
  <HmiKeyboard layout="number" @input="handleInput" @backspace="handleBackspace" />
</template>
```

### 自定义键盘布局

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { HmiKeyboard, type KeyItem } from '@hmi-ts/vue-components'

const customLayout: KeyItem[][] = [
  [
    { label: '+', value: '+' },
    { label: '-', value: '-' },
    { label: '*', value: '*' },
    { label: '/', value: '/' },
  ],
  [
    { label: '7', value: '7' },
    { label: '8', value: '8' },
    { label: '9', value: '9' },
    { label: 'C', value: 'clear', type: 'function' },
  ],
]
</script>

<template>
  <HmiKeyboard layout="custom" :custom-layout="customLayout" @input="handleInput" />
</template>
```

## Props

| 属性           | 类型                             | 默认值   | 说明                                           |
| -------------- | -------------------------------- | -------- | ---------------------------------------------- |
| `layout`       | `'full' \| 'number' \| 'custom'` | `'full'` | 键盘布局类型                                   |
| `customLayout` | `KeyItem[][]`                    | -        | 自定义键盘布局（当 layout 为 'custom' 时必需） |
| `radius`       | `string`                         | `'6px'`  | 按键的圆角大小                                 |
| `keyWidth`     | `string`                         | `'36px'` | 按键宽度                                       |
| `keyHeight`    | `string`                         | `'36px'` | 按键高度                                       |

## Events

| 事件        | 参数          | 说明                           |
| ----------- | ------------- | ------------------------------ |
| `input`     | `key: string` | 按下普通键时触发               |
| `backspace` | -             | 按下 DELETE/BACKSPACE 键时触发 |
| `enter`     | -             | 按下 ENTER 键时触发            |

## KeyItem 接口

```typescript
interface KeyItem {
  label: string // 按键显示的文本
  value: string // 按键的值
  width?: number // 按键宽度倍数（默认为 1）
  type?: 'normal' | 'function' | 'space' // 按键类型
}
```

### 按键类型说明

- `normal` - 普通按键（默认）
- `function` - 功能按键（DEL、ENTER 等），使用蓝色主题
- `space` - 空格键（宽按键），使用正常样式

## 样式自定义

### 使用 CSS 变量

```vue
<template>
  <HmiKeyboard radius="8px" keyWidth="44px" keyHeight="44px" layout="number" />
</template>
```

### 深度样式定制

组件使用 scoped styles，如需覆盖样式，可以使用 `:deep()` 选择器：

```vue
<style scoped>
:deep(.hmi-keyboard) {
  background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%);
}

:deep(.keyboard-key) {
  font-size: 14px;
}
</style>
```

## 完整示例

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { HmiKeyboard, type KeyItem } from '@hmi-ts/vue-components'

const displayValue = ref('')
const layout = ref<'full' | 'number' | 'custom'>('full')

const customLayout: KeyItem[][] = [
  [
    { label: '1', value: '1' },
    { label: '2', value: '2' },
    { label: '3', value: '3' },
  ],
  [{ label: 'Clear', value: 'clear', type: 'function', width: 3 }],
]

const handleInput = (key: string) => {
  if (key !== 'clear') {
    displayValue.value += key
  }
}

const handleBackspace = () => {
  displayValue.value = displayValue.value.slice(0, -1)
}

const handleEnter = () => {
  console.log('Submit:', displayValue.value)
  displayValue.value = ''
}
</script>

<template>
  <div class="container">
    <div class="display">
      <input v-model="displayValue" type="text" placeholder="Input value" />
    </div>

    <div class="controls">
      <button
        v-for="l in ['full', 'number', 'custom']"
        :key="l"
        @click="layout = l as any"
        :class="{ active: layout === l }"
      >
        {{ l }}
      </button>
    </div>

    <HmiKeyboard
      :layout="layout"
      :custom-layout="layout === 'custom' ? customLayout : undefined"
      @input="handleInput"
      @backspace="handleBackspace"
      @enter="handleEnter"
    />
  </div>
</template>

<style scoped>
.container {
  padding: 20px;
  background: #0a0a0a;
}

.display {
  margin-bottom: 20px;
}

.display input {
  width: 100%;
  padding: 10px;
  font-size: 16px;
}

.controls {
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
}

.controls button {
  padding: 8px 16px;
  cursor: pointer;
}

.controls button.active {
  background: #00c3ff;
  color: #000;
}
</style>
```

## 浏览器兼容性

- Chrome/Edge: ✅ 完全支持
- Firefox: ✅ 完全支持
- Safari: ✅ 完全支持
- 移动浏览器: ✅ 完全支持（包括触摸事件）

## 许可证

MIT
