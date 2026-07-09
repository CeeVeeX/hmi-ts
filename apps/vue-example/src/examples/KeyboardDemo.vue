<script setup lang="ts">
import { ref } from 'vue'
import { HmiCardPanel, HmiKeyboard, type KeyItem } from '@hmi-ts/vue-components'

const inputValue = ref('')
const keyboardLayout = ref<'full' | 'number' | 'custom'>('full')

// 自定义键盘布局示例
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
  [
    { label: '4', value: '4' },
    { label: '5', value: '5' },
    { label: '6', value: '6' },
    { label: '=', value: '=' },
  ],
  [
    { label: '1', value: '1' },
    { label: '2', value: '2' },
    { label: '3', value: '3' },
    { label: 'Back', value: 'backspace', type: 'function' },
  ],
]

const handleInput = (key: string) => {
  inputValue.value += key
}

const handleBackspace = () => {
  inputValue.value = inputValue.value.slice(0, -1)
}

const handleEnter = () => {
  console.log('Enter pressed, value:', inputValue.value)
}
</script>

<template>
  <HmiCardPanel>
    <template #title>键盘</template>

    <div class="keyboard-demo">
      <!-- 布局选择 -->
      <div class="layout-selector">
        <label>键盘类型：</label>
        <button
          v-for="layout in ['full', 'number', 'custom']"
          :key="layout"
          :class="{ active: keyboardLayout === layout }"
          @click="keyboardLayout = layout as any"
        >
          {{ layout }}
        </button>
      </div>

      <!-- 输入显示 -->
      <div class="input-display">
        <input v-model="inputValue" type="text" placeholder="点击下方键盘输入..." />
      </div>

      <!-- 键盘组件 -->
      <div class="keyboard-container">
        <HmiKeyboard
          :layout="keyboardLayout"
          :custom-layout="keyboardLayout === 'custom' ? customLayout : undefined"
          @input="handleInput"
          @backspace="handleBackspace"
          @enter="handleEnter"
        />
      </div>
    </div>
  </HmiCardPanel>
</template>

<style scoped>
.keyboard-demo {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.layout-selector {
  display: flex;
  gap: 10px;
  align-items: center;
  font-size: 14px;
}

.layout-selector button {
  padding: 6px 12px;
  border: 1px solid #ccc;
  background: #f5f5f5;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.3s;
}

.layout-selector button:hover {
  border-color: #00c3ff;
  background: #f9f9f9;
}

.layout-selector button.active {
  background: linear-gradient(135deg, #3a5a6a 0%, #1a3a4a 100%);
  color: #00c3ff;
  border-color: #00c3ff;
}

.input-display {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-display input {
  padding: 8px 12px;
  border: 2px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background: #fafafa;
}

.input-display input:focus {
  outline: none;
  border-color: #00c3ff;
  background: #fff;
}

.keyboard-container {
  display: flex;
  justify-content: center;
  padding: 20px 0;
}
</style>
