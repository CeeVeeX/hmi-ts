<script lang="ts" setup>
import { ref, computed } from 'vue'
import type { KeyItem } from '../types'

defineOptions({
  name: 'HmiKeyboard',
})

const props = withDefaults(
  defineProps<{
    /**
     * 键盘类型
     * full: 完整键盘（QWERTY + 数字）
     * number: 数字键盘
     * custom: 自定义键盘
     */
    layout?: 'full' | 'number' | 'custom'
    /**
     * 自定义键盘布局
     */
    customLayout?: KeyItem[][]
    /**
     * 按键的圆角大小，默认 6px
     */
    radius?: string
    /**
     * 按键宽度，默认 36px
     */
    keyWidth?: string
    /**
     * 按键高度，默认 36px
     */
    keyHeight?: string
  }>(),
  {
    layout: 'full',
    radius: '6px',
    keyWidth: '36px',
    keyHeight: '36px',
  },
)

const emit = defineEmits<{
  input: [key: string]
  backspace: []
  enter: []
}>()

// 完整键盘布局
const fullLayout: KeyItem[][] = [
  [
    { label: '1', value: '1' },
    { label: '2', value: '2' },
    { label: '3', value: '3' },
    { label: '4', value: '4' },
    { label: '5', value: '5' },
    { label: '6', value: '6' },
    { label: '7', value: '7' },
    { label: '8', value: '8' },
    { label: '9', value: '9' },
    { label: '0', value: '0' },
    { label: 'DEL', value: 'backspace', type: 'function', width: 2 },
  ],
  [
    { label: 'Q', value: 'q' },
    { label: 'W', value: 'w' },
    { label: 'E', value: 'e' },
    { label: 'R', value: 'r' },
    { label: 'T', value: 't' },
    { label: 'Y', value: 'y' },
    { label: 'U', value: 'u' },
    { label: 'I', value: 'i' },
    { label: 'O', value: 'o' },
    { label: 'P', value: 'p' },
  ],
  [
    { label: 'A', value: 'a' },
    { label: 'S', value: 's' },
    { label: 'D', value: 'd' },
    { label: 'F', value: 'f' },
    { label: 'G', value: 'g' },
    { label: 'H', value: 'h' },
    { label: 'J', value: 'j' },
    { label: 'K', value: 'k' },
    { label: 'L', value: 'l' },
  ],
  [
    { label: 'Z', value: 'z' },
    { label: 'X', value: 'x' },
    { label: 'C', value: 'c' },
    { label: 'V', value: 'v' },
    { label: 'B', value: 'b' },
    { label: 'N', value: 'n' },
    { label: 'M', value: 'm' },
    { label: '.', value: '.' },
  ],
  [
    { label: 'SPACE', value: ' ', type: 'space', width: 5 },
    { label: 'ENTER', value: 'enter', type: 'function', width: 2 },
  ],
]

// 数字键盘布局
const numberLayout: KeyItem[][] = [
  [
    { label: '7', value: '7' },
    { label: '8', value: '8' },
    { label: '9', value: '9' },
  ],
  [
    { label: '4', value: '4' },
    { label: '5', value: '5' },
    { label: '6', value: '6' },
  ],
  [
    { label: '1', value: '1' },
    { label: '2', value: '2' },
    { label: '3', value: '3' },
  ],
  [
    { label: '0', value: '0', width: 2 },
    { label: '.', value: '.' },
  ],
]

const activeKey = ref<string | null>(null)
const pressedKeys = ref<Set<string>>(new Set())

const currentLayout = computed<KeyItem[][]>(() => {
  if (props.layout === 'custom' && props.customLayout) {
    return props.customLayout
  }
  if (props.layout === 'number') {
    return numberLayout
  }
  return fullLayout
})

const handleKeyDown = (key: KeyItem) => {
  pressedKeys.value.add(key.value)
  activeKey.value = key.value

  if (key.value === 'backspace') {
    emit('backspace')
  } else if (key.value === 'enter') {
    emit('enter')
  } else {
    emit('input', key.value)
  }
}

const handleKeyUp = (key: KeyItem) => {
  pressedKeys.value.delete(key.value)
  if (activeKey.value === key.value) {
    activeKey.value = null
  }
}

const getKeyStyle = (key: KeyItem) => {
  const baseWidth = parseInt(props.keyWidth || '36')
  const width = key.width ? baseWidth * key.width + (key.width - 1) * 4 : baseWidth
  return {
    '--key-width': `${width}px`,
    '--key-height': props.keyHeight,
    '--key-radius': props.radius,
  }
}

const isKeyActive = (keyValue: string) => {
  return pressedKeys.value.has(keyValue)
}
</script>

<template>
  <div class="hmi-keyboard" :style="{ '--keyboard-gap': '4px' }">
    <div v-for="(row, rowIndex) in currentLayout" :key="rowIndex" class="keyboard-row">
      <button
        v-for="key in row"
        :key="`${rowIndex}-${key.value}`"
        class="keyboard-key"
        :class="{
          'keyboard-key-function': key.type === 'function',
          'keyboard-key-space': key.type === 'space',
          'keyboard-key-active': isKeyActive(key.value),
        }"
        :style="getKeyStyle(key)"
        @mousedown="handleKeyDown(key)"
        @mouseup="handleKeyUp(key)"
        @mouseleave="handleKeyUp(key)"
        @touchstart.prevent="handleKeyDown(key)"
        @touchend.prevent="handleKeyUp(key)"
      >
        <div class="key-shine"></div>
        <div class="key-label">{{ key.label }}</div>
      </button>
    </div>
  </div>
</template>

<style scoped>
.hmi-keyboard {
  display: inline-flex;
  flex-direction: column;
  gap: var(--keyboard-gap);
  padding: 12px;
  background: linear-gradient(135deg, #3a3a3a 0%, #2a2a2a 100%);
  border-radius: 12px;
  box-shadow:
    inset 0 2px 5px rgba(0, 0, 0, 0.5),
    0 10px 30px rgba(0, 0, 0, 0.8),
    0 0 30px rgba(0, 195, 255, 0.2);
  user-select: none;
}

.keyboard-row {
  display: flex;
  gap: var(--keyboard-gap);
  justify-content: flex-start;
}

.keyboard-key {
  flex: 0 0 var(--key-width);
  height: var(--key-height);
  border: none;
  border-radius: var(--key-radius);
  background: linear-gradient(180deg, #4a4a4a 0%, #2a2a2a 100%);
  color: #e0e0e0;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.08s ease-out;
  box-shadow:
    inset 0 -2px 4px rgba(0, 0, 0, 0.8),
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    0 4px 8px rgba(0, 0, 0, 0.6),
    0 0 10px rgba(0, 195, 255, 0.1);
  text-transform: uppercase;
  letter-spacing: 0.5px;

  &:hover:not(.keyboard-key-active) {
    background: linear-gradient(180deg, #555555 0%, #303030 100%);
    box-shadow:
      inset 0 -2px 4px rgba(0, 0, 0, 0.8),
      inset 0 1px 0 rgba(255, 255, 255, 0.15),
      0 4px 10px rgba(0, 0, 0, 0.7),
      0 0 15px rgba(0, 195, 255, 0.15);
  }

  &.keyboard-key-active {
    background: linear-gradient(180deg, #1a1a1a 0%, #3a3a3a 100%);
    box-shadow:
      inset 0 2px 4px rgba(0, 0, 0, 0.9),
      inset 0 -1px 0 rgba(255, 255, 255, 0.05),
      0 2px 4px rgba(0, 0, 0, 0.8),
      0 0 8px rgba(0, 195, 255, 0.3);
    transform: translateY(2px);

    .key-shine {
      opacity: 0.3;
    }
  }

  &.keyboard-key-function {
    background: linear-gradient(180deg, #3a5a6a 0%, #1a3a4a 100%);
    box-shadow:
      inset 0 -2px 4px rgba(0, 0, 0, 0.8),
      inset 0 1px 0 rgba(0, 195, 255, 0.1),
      0 4px 8px rgba(0, 0, 0, 0.6),
      0 0 10px rgba(0, 195, 255, 0.2);

    &:hover:not(.keyboard-key-active) {
      background: linear-gradient(180deg, #4a6a7a 0%, #2a4a5a 100%);
      box-shadow:
        inset 0 -2px 4px rgba(0, 0, 0, 0.8),
        inset 0 1px 0 rgba(0, 195, 255, 0.15),
        0 4px 10px rgba(0, 0, 0, 0.7),
        0 0 15px rgba(0, 195, 255, 0.25);
    }

    &.keyboard-key-active {
      background: linear-gradient(180deg, #0a1a2a 0%, #2a3a4a 100%);
      box-shadow:
        inset 0 2px 4px rgba(0, 0, 0, 0.9),
        inset 0 -1px 0 rgba(0, 195, 255, 0.05),
        0 2px 4px rgba(0, 0, 0, 0.8),
        0 0 8px rgba(0, 195, 255, 0.4);
    }

    .key-label {
      color: #00c3ff;
      font-size: 11px;
    }
  }

  &.keyboard-key-space {
    flex: 0 0 var(--key-width);
  }

  &:active {
    outline: none;
  }

  &:focus {
    outline: none;
  }
}

.key-shine {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 40%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0) 100%);
  border-radius: var(--key-radius) var(--key-radius) 0 0;
  opacity: 0.4;
  pointer-events: none;
  transition: opacity 0.08s ease-out;
}

.key-label {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  transition: all 0.08s ease-out;
}
</style>
