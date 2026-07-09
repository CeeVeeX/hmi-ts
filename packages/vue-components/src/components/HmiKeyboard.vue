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
     * hmi: HMI专用数字键盘（适合工业触摸屏）
     * custom: 自定义键盘
     */
    layout?: 'full' | 'number' | 'hmi' | 'custom'
    /**
     * 自定义键盘布局
     */
    customLayout?: KeyItem[][]
    /**
     * 按键的圆角大小，默认 8px
     */
    radius?: string
    /**
     * 按键宽度，默认 48px（HMI优化为触摸屏）
     */
    keyWidth?: string
    /**
     * 按键高度，默认 48px（HMI优化为触摸屏）
     */
    keyHeight?: string
    /**
     * 最大输入位数（用于限制输入长度）
     */
    maxLength?: number
    /**
     * 数值最小值（用于数字键盘验证）
     */
    min?: number
    /**
     * 数值最大值（用于数字键盘验证）
     */
    max?: number
    /**
     * 小数点位数（0表示不允许小数点）
     */
    decimalPlaces?: number
  }>(),
  {
    layout: 'full',
    radius: '8px',
    keyWidth: '48px',
    keyHeight: '48px',
    maxLength: 15,
    decimalPlaces: 2,
  },
)

const emit = defineEmits<{
  input: [key: string]
  backspace: []
  enter: []
  validate: [value: string, valid: boolean, reason?: string]
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

// HMI专用键盘布局（适合工业触摸屏）
const hmiLayout: KeyItem[][] = [
  [
    { label: '1', value: '1' },
    { label: '2', value: '2' },
    { label: '3', value: '3' },
    { label: 'DEL', value: 'backspace', type: 'function' },
  ],
  [
    { label: '4', value: '4' },
    { label: '5', value: '5' },
    { label: '6', value: '6' },
    { label: '+', value: '+' },
  ],
  [
    { label: '7', value: '7' },
    { label: '8', value: '8' },
    { label: '9', value: '9' },
    { label: '-', value: '-' },
  ],
  [
    { label: '0', value: '0' },
    { label: '.', value: '.' },
    { label: 'CLR', value: 'clear', type: 'function' },
    { label: 'OK', value: 'enter', type: 'function' },
  ],
]

const activeKey = ref<string | null>(null)
const pressedKeys = ref<Set<string>>(new Set())
let currentInputValue = ''

const currentLayout = computed<KeyItem[][]>(() => {
  if (props.layout === 'custom' && props.customLayout) {
    return props.customLayout
  }
  if (props.layout === 'hmi') {
    return hmiLayout
  }
  if (props.layout === 'number') {
    return numberLayout
  }
  return fullLayout
})

/**
 * 验证输入值是否符合约束条件
 */
const validateInput = (newValue: string, key: string): { valid: boolean; reason?: string } => {
  // 检查位数限制
  if (newValue.length > props.maxLength!) {
    return { valid: false, reason: '超过最大位数限制' }
  }

  // 对于数字键盘，进行额外验证
  if (props.layout === 'number' || props.layout === 'hmi') {
    // 检查小数点
    if (key === '.' && props.decimalPlaces === 0) {
      return { valid: false, reason: '不允许输入小数点' }
    }
    if (key === '.' && newValue.includes('.')) {
      return { valid: false, reason: '只允许一个小数点' }
    }

    // 如果设置了小数位数限制，检查小数位数
    if (props.decimalPlaces! > 0 && newValue.includes('.')) {
      const [, decimal] = newValue.split('.')
      if (decimal && decimal.length > props.decimalPlaces) {
        return { valid: false, reason: `最多允许${props.decimalPlaces}位小数` }
      }
    }

    // 检查数值范围
    if (props.min !== undefined || props.max !== undefined) {
      const numValue = parseFloat(newValue)
      if (!Number.isNaN(numValue)) {
        if (props.min !== undefined && numValue < props.min) {
          return { valid: false, reason: `最小值为${props.min}` }
        }
        if (props.max !== undefined && numValue > props.max) {
          return { valid: false, reason: `最大值为${props.max}` }
        }
      }
    }
  }

  return { valid: true }
}

const handleKeyDown = (key: KeyItem) => {
  pressedKeys.value.add(key.value)
  activeKey.value = key.value

  if (key.value === 'backspace') {
    currentInputValue = currentInputValue.slice(0, -1)
    emit('backspace')
    emit('validate', currentInputValue, true)
  } else if (key.value === 'enter') {
    emit('enter')
  } else if (key.value === 'clear') {
    currentInputValue = ''
    emit('input', '') // 发送清空信号
    emit('validate', '', true)
  } else {
    const newValue = currentInputValue + key.value
    const validation = validateInput(newValue, key.value)

    if (validation.valid) {
      currentInputValue = newValue
      emit('input', key.value)
      emit('validate', currentInputValue, true)
    } else {
      emit('validate', currentInputValue, false, validation.reason)
    }
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

/**
 * 暴露给父组件的方法
 */
const resetInput = () => {
  currentInputValue = ''
}

const setInputValue = (value: string) => {
  currentInputValue = value
}

const getInputValue = () => {
  return currentInputValue
}

defineExpose({
  resetInput,
  setInputValue,
  getInputValue,
})
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
  gap: var(--keyboard-gap);
  user-select: none;
  background: linear-gradient(135deg, #dfdfdf 0%, #acacac 100%);
  border-radius: 12px;
  flex-direction: column;
  padding: 16px;
  display: inline-flex;
  box-shadow:
    inset 0 2px 5px #00000080,
    0 10px 30px #000c,
    0 0 30px #fff3;
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
  background: linear-gradient(#565a60 0%, #2f343b 100%);
  color: #e0e0e0;
  font-size: 14px;
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
  -webkit-touch-callout: none;
  touch-action: manipulation;

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
      font-size: 13px;
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
