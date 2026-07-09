# HmiKeyboard HMI 功能改进说明

## 📋 改进内容

### 1. 优化触摸屏布局 ✅

- **按键尺寸** - 默认从 36px 提升到 48px，更适合触摸屏操作
- **间距** - 调整了键间距以提供更好的触感
- **字体大小** - 适应更大的按键
- **触摸优化** - 添加了 `touch-action: manipulation` 和 `-webkit-touch-callout` 优化

### 2. 新增 HMI 专用键盘布局 ✅

```
┌─────────────────────────────┐
│  1   2   3  [DEL]           │
│  4   5   6   [+]            │
│  7   8   9   [-]            │
│  0   .  [CLR] [OK]          │
└─────────────────────────────┘
```

特点：

- 4x4 按键矩阵（工业标准）
- 快速访问功能键（DEL/CLR/OK）
- 数学运算支持（+/-）
- 适合生产环境操作

**使用方式：**

```vue
<HmiKeyboard layout="hmi" />
```

### 3. 输入位数限制 ✅

限制最多可输入的字符数，适用于所有布局。

**Props：**

- `maxLength: number` - 最大输入位数（默认：15）

**示例 - 限制输入6位整数：**

```vue
<HmiKeyboard layout="hmi" :max-length="6" @validate="handleValidation" />
```

**验证事件：**

```typescript
const handleValidation = (value: string, valid: boolean, reason?: string) => {
  if (!valid) {
    console.log(`验证失败: ${reason}`)
  }
}
```

### 4. 数值范围限制 ✅

限制输入数值的最小值和最大值，适用于 `number` 和 `hmi` 布局。

**Props：**

- `min: number` - 最小值
- `max: number` - 最大值

**示例 - 限制温度范围 0~100°C：**

```vue
<HmiKeyboard
  layout="number"
  :min="0"
  :max="100"
  :decimal-places="0"
  @validate="handleTempValidation"
/>
```

### 5. 小数位数限制 ✅

控制允许输入的小数位数。

**Props：**

- `decimalPlaces: number` - 允许的小数位数（默认：2，设置为0表示不允许小数）

**示例 - 限制压力输入精度为 0.00 Bar：**

```vue
<HmiKeyboard
  layout="number"
  :min="0"
  :max="10"
  :decimal-places="2"
  @validate="handlePressureValidation"
/>
```

### 6. 新增验证事件 ✅

**事件：**

```typescript
emit('validate', value: string, valid: boolean, reason?: string)
```

当输入验证失败时，会发出此事件并附带失败原因：

- "超过最大位数限制"
- "不允许输入小数点"
- "只允许一个小数点"
- "最多允许X位小数"
- "最小值为X"
- "最大值为X"

### 7. 公开 API 方法 ✅

使用 `ref` 可以调用以下方法：

```typescript
const keyboardRef = ref<InstanceType<typeof HmiKeyboard> | null>(null)

// 重置输入
keyboardRef.value?.resetInput()

// 设置输入值
keyboardRef.value?.setInputValue('12345')

// 获取当前输入值
const value = keyboardRef.value?.getInputValue()
```

## 🎯 HMI 应用场景示例

### 场景1：设备温度设置

```vue
<script setup>
const tempValue = ref('')
const tempValidationMsg = ref('')

const handleInput = (key: string) => {
  tempValue.value += key
}

const handleValidation = (value, valid, reason) => {
  tempValidationMsg.value = valid ? '' : reason
}
</script>

<template>
  <div>
    <input v-model="tempValue" placeholder="设置温度 (20~80°C)" readonly />
    <HmiKeyboard
      layout="hmi"
      :max-length="3"
      :min="20"
      :max="80"
      :decimal-places="0"
      @input="handleInput"
      @validate="handleValidation"
    />
    <p v-if="tempValidationMsg" class="error">{{ tempValidationMsg }}</p>
  </div>
</template>
```

### 场景2：压力传感器校准

```vue
<template>
  <div>
    <input v-model="pressureValue" placeholder="输入压力值 (0.00~25.00 Bar)" readonly />
    <HmiKeyboard
      layout="number"
      :max-length="6"
      :min="0"
      :max="25"
      :decimal-places="2"
      @input="handlePressureInput"
      @validate="handlePressureValidation"
    />
  </div>
</template>
```

### 场景3：批量编号输入

```vue
<template>
  <div>
    <input v-model="batchNumber" placeholder="输入批号 (最多6位)" readonly />
    <HmiKeyboard layout="hmi" :max-length="6" @input="handleInput" />
  </div>
</template>
```

## 📊 所有键盘布局对比

| 布局     | 用途     | 特点               | 触摸屏友好 |
| -------- | -------- | ------------------ | ---------- |
| `full`   | 标准键盘 | 包含字母和数字     | ✅         |
| `number` | 数字键盘 | 标准3x4数字布局    | ✅         |
| `hmi`    | 工业控制 | 4x4工业布局+功能键 | ✅✅       |
| `custom` | 自定义   | 完全自定义         | 可配置     |

## 🎨 样式优化

- 默认按键大小：48x48px（优化触摸）
- 默认圆角：8px
- 功能键独特颜色标识
- 按下动画：流畅的 0.08s 过渡
- 触摸反馈：视觉和物理反馈

## ✅ 新增 Props 总结

```typescript
interface HmiKeyboardProps {
  layout?: 'full' | 'number' | 'hmi' | 'custom'
  customLayout?: KeyItem[][]
  radius?: string // 默认: '8px'
  keyWidth?: string // 默认: '48px'
  keyHeight?: string // 默认: '48px'
  maxLength?: number // 默认: 15
  min?: number // 可选
  max?: number // 可选
  decimalPlaces?: number // 默认: 2
}
```

## ✅ 新增 Events 总结

```typescript
emit('input', key: string)
emit('backspace')
emit('enter')
emit('validate', value: string, valid: boolean, reason?: string)
```

## 📱 触摸屏优化细节

1. **按键尺寸** - 48px 符合触摸屏最小推荐尺寸（44px+）
2. **按键间距** - 充足的间距防止误触
3. **反馈速度** - 0.08s 的反馈让用户立即感受到按键动作
4. **可访问性** - 清晰的视觉状态（按下、悬停、禁用）
5. **触摸事件** - 完整支持 `touchstart`、`touchend`、`mousedown`、`mouseup`

## 🚀 版本更新

**Version 0.0.1 -> 当前版本**

新增特性：

- ✅ HMI 专用键盘布局
- ✅ 输入位数限制
- ✅ 数值范围验证
- ✅ 小数位数控制
- ✅ 验证事件系统
- ✅ 公开 API 方法
- ✅ 触摸屏优化
- ✅ 增大默认按键尺寸

改进：

- ✅ 更好的工业应用支持
- ✅ 增强的用户输入验证
- ✅ 更优的触摸体验
- ✅ 完整的错误反馈机制
