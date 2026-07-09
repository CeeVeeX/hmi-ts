<script setup lang="ts">
import { ref } from 'vue'
import { HmiCardPanel, HmiCardScreen, HmiKeyboard, type KeyItem } from '@hmi-ts/vue-components'

// 当前演示选择
const activeDemo = ref<'standard' | 'limited' | 'temperature' | 'pressure'>('standard')

// 演示标签配置
const demoTabs = {
  standard: '标准键盘',
  limited: '限制位数',
  temperature: '温度(20~80°C)',
  pressure: '压力(精度)',
}

// 示例1: 标准键盘
const inputValue = ref('')
const keyboardLayout = ref<'full' | 'number' | 'hmi' | 'custom'>('full')

// 示例2: 限制位数的数字输入
const limitedInput = ref('')
const maxLengthValue = ref(6)
const validationMsg = ref('')

// 示例3: 限制范围的温度输入
const temperatureValue = ref('')
const tempMinValue = ref(20)
const tempMaxValue = ref(80)
const tempValidationMsg = ref('')

// 示例4: 限制小数位数的压力输入
const pressureValue = ref('')
const pressureMinValue = ref(0)
const pressureMaxValue = ref(10)
const pressureValidationMsg = ref('')

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

// 处理标准键盘输入
const handleInput = (key: string) => {
  if (key === '') {
    inputValue.value = ''
  } else {
    inputValue.value += key
  }
}

const handleBackspace = () => {
  inputValue.value = inputValue.value.slice(0, -1)
}

const handleEnter = () => {
  console.log('Submit:', inputValue.value)
}

// 处理限制位数的输入
const handleLimitedInput = (key: string) => {
  if (key === '') {
    limitedInput.value = ''
    validationMsg.value = ''
  } else {
    limitedInput.value += key
  }
}

const handleLimitedBackspace = () => {
  limitedInput.value = limitedInput.value.slice(0, -1)
}

const handleLimitedValidation = (value: string, valid: boolean, reason?: string) => {
  if (!valid) {
    validationMsg.value = reason || '输入验证失败'
  } else {
    validationMsg.value = ''
  }
}

// 处理温度输入
const handleTemperatureInput = (key: string) => {
  if (key === '') {
    temperatureValue.value = ''
    tempValidationMsg.value = ''
  } else {
    temperatureValue.value += key
  }
}

const handleTemperatureBackspace = () => {
  temperatureValue.value = temperatureValue.value.slice(0, -1)
}

const handleTemperatureValidation = (value: string, valid: boolean, reason?: string) => {
  if (!valid) {
    tempValidationMsg.value = reason || '输入验证失败'
  } else {
    tempValidationMsg.value = ''
  }
}

// 处理压力输入
const handlePressureInput = (key: string) => {
  if (key === '') {
    pressureValue.value = ''
    pressureValidationMsg.value = ''
  } else {
    pressureValue.value += key
  }
}

const handlePressureBackspace = () => {
  pressureValue.value = pressureValue.value.slice(0, -1)
}

const handlePressureValidation = (value: string, valid: boolean, reason?: string) => {
  if (!valid) {
    pressureValidationMsg.value = reason || '输入验证失败'
  } else {
    pressureValidationMsg.value = ''
  }
}
</script>

<template>
  <HmiCardPanel>
    <template #title>虚拟键盘 (Virtual Keyboard)</template>

    <div class="keyboard-panel">
      <!-- 演示选择标签 -->
      <div class="demo-tabs">
        <button
          v-for="(demo, key) in demoTabs"
          :key="key"
          :class="{ active: activeDemo === key }"
          @click="activeDemo = key"
        >
          {{ demo }}
        </button>
      </div>

      <!-- 演示内容 -->
      <div class="demo-section">
        <!-- 演示1: 标准键盘 -->
        <div v-show="activeDemo === 'standard'" class="demo-area">
          <div class="control-group">
            <label>键盘类型：</label>
            <div class="button-group">
              <button
                v-for="layout in ['full', 'number', 'hmi', 'custom']"
                :key="layout"
                :class="{ active: keyboardLayout === layout }"
                @click="keyboardLayout = layout as any"
              >
                {{ layout }}
              </button>
            </div>
          </div>

          <div class="input-display">
            <input v-model="inputValue" type="text" placeholder="点击下方键盘输入..." readonly />
          </div>

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

        <!-- 演示2: 限制位数的数字输入 -->
        <div v-show="activeDemo === 'limited'" class="demo-area">
          <HmiCardScreen class="settings-panel">
            <div class="setting-item">
              <label>最大位数：</label>
              <input v-model.number="maxLengthValue" type="range" min="1" max="10" />
              <span>{{ maxLengthValue }}</span>
            </div>
          </HmiCardScreen>

          <div class="input-display">
            <label>输入值（最多{{ maxLengthValue }}位）：</label>
            <input v-model="limitedInput" type="text" placeholder="输入数字..." readonly />
            <div v-if="validationMsg" class="error-message">{{ validationMsg }}</div>
          </div>

          <div class="keyboard-container">
            <HmiKeyboard
              layout="hmi"
              :max-length="maxLengthValue"
              @input="handleLimitedInput"
              @backspace="handleLimitedBackspace"
              @validate="handleLimitedValidation"
            />
          </div>
        </div>

        <!-- 演示3: 限制数值范围的温度 -->
        <div v-show="activeDemo === 'temperature'" class="demo-area">
          <HmiCardScreen class="settings-panel">
            <div class="setting-item">
              <label>最小值：</label>
              <input v-model.number="tempMinValue" type="range" min="0" max="50" />
              <span>{{ tempMinValue }}°C</span>
            </div>
            <div class="setting-item">
              <label>最大值：</label>
              <input v-model.number="tempMaxValue" type="range" min="50" max="200" />
              <span>{{ tempMaxValue }}°C</span>
            </div>
          </HmiCardScreen>

          <div class="input-display">
            <label>温度值（{{ tempMinValue }}~{{ tempMaxValue }}°C）：</label>
            <input v-model="temperatureValue" type="text" placeholder="输入温度值..." readonly />
            <div v-if="tempValidationMsg" class="error-message">{{ tempValidationMsg }}</div>
          </div>

          <div class="keyboard-container">
            <HmiKeyboard
              layout="number"
              :min="tempMinValue"
              :max="tempMaxValue"
              :decimal-places="0"
              @input="handleTemperatureInput"
              @backspace="handleTemperatureBackspace"
              @validate="handleTemperatureValidation"
            />
          </div>
        </div>

        <!-- 演示4: 限制小数位数的压力 -->
        <div v-show="activeDemo === 'pressure'" class="demo-area">
          <div class="input-display">
            <label>压力值（{{ pressureMinValue }}.00~{{ pressureMaxValue }}.00 Bar）：</label>
            <input v-model="pressureValue" type="text" placeholder="输入压力值..." readonly />
            <div v-if="pressureValidationMsg" class="error-message">
              {{ pressureValidationMsg }}
            </div>
          </div>

          <div class="keyboard-container">
            <HmiKeyboard
              layout="number"
              :min="pressureMinValue"
              :max="pressureMaxValue"
              :decimal-places="2"
              @input="handlePressureInput"
              @backspace="handlePressureBackspace"
              @validate="handlePressureValidation"
            />
          </div>
        </div>
      </div>
    </div>
  </HmiCardPanel>
</template>

<style scoped>
.settings-panel {
  padding: 12px;
  background: #f9f9f9;
  border-radius: 6px;
}

.setting-item {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 8px;
  font-size: 13px;
}

.settings-panel {
  padding: 12px;
  background: #f9f9f9;
  border-radius: 6px;
  margin-bottom: 12px;
}

.setting-item {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 8px;
  font-size: 13px;
}

.setting-item:last-child {
  margin-bottom: 0;
}

.setting-item label {
  font-weight: 500;
  min-width: 70px;
}

.setting-item input[type='range'] {
  flex: 1;
  min-width: 150px;
}

.setting-item span {
  min-width: 60px;
  text-align: right;
  color: #00c3ff;
  font-weight: 500;
}

.input-display {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.input-display label {
  font-size: 13px;
  font-weight: 500;
  /* color: #333; */
}

.input-display input {
  padding: 10px 12px;
  border: 2px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background: #fafafa;
  font-family: 'Courier New', monospace;
}

.input-display input:focus {
  outline: none;
  border-color: #00c3ff;
  background: #fff;
}

.error-message {
  color: #ff6b6b;
  font-size: 12px;
  margin-top: 4px;
}

.keyboard-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.demo-tabs {
  display: flex;
  gap: 8px;
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 0;
}

.demo-tabs button {
  padding: 10px 16px;
  border: none;
  background: transparent;
  color: #fff;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  border-bottom: 3px solid transparent;
  transition: all 0.3s;
  position: relative;
  bottom: -2px;
}

.demo-tabs button:hover {
  color: #00c3ff;
}

.demo-tabs button.active {
  color: #00c3ff;
  border-bottom-color: #00c3ff;
}

.demo-section {
  min-height: 400px;
  animation: fadeIn 0.2s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.demo-area {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.control-group {
  display: flex;
  gap: 12px;
  align-items: center;
  font-size: 14px;
}

.control-group label {
  font-weight: 500;
  white-space: nowrap;
}

.button-group {
  display: flex;
  gap: 8px;
}

.button-group button {
  padding: 6px 12px;
  border: 1px solid #ccc;
  background: #f5f5f5;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.3s;
  font-size: 12px;
  font-weight: 500;
}

.button-group button:hover {
  border-color: #00c3ff;
  background: #f9f9f9;
}

.button-group button.active {
  background: linear-gradient(135deg, #3a5a6a 0%, #1a3a4a 100%);
  color: #00c3ff;
  border-color: #00c3ff;
}

.keyboard-container {
  display: flex;
  justify-content: center;
  padding: 16px 0;
}
</style>
