# HmiGauge 仪表组件

## 📋 概述

`HmiGauge` 是一个高度拟物化的 Vue 3 仪表组件，专为工业 HMI 应用设计。它提供了逼真的3D效果、流畅的动画、多种显示模式和强大的数据验证功能。

## ✨ 主要特性

### 1. **拟物化设计**

- 真实的3D阴影和光影效果
- 梯度填充的圆形背景
- 逼真的指针动画
- 发光的中心装饰圆

### 2. **灵活的数据表示**

- 支持任意范围的数值显示
- 可配置的刻度和精度
- 数字实时显示
- 单位标注

### 3. **智能状态指示**

- **正常状态**（绿色 #10b981）
- **警告状态**（黄色 #f59e0b）
- **危险状态**（红色 #ef4444）
- 自动状态检测和颜色变化
- 脉冲动画指示灯

### 4. **多种显示模式**

- 内置警告/危险阈值模式
- 自定义颜色区间模式
- 灵活组合使用

### 5. **流畅动画**

- 指针平滑旋转动画（立方贝塞尔缓动）
- 状态灯脉冲效果
- 响应式UI交互

## 📦 Props API

| 属性      | 类型   | 默认值    | 说明             |
| --------- | ------ | --------- | ---------------- |
| `value`   | Number | 50        | 当前值           |
| `min`     | Number | 0         | 最小值           |
| `max`     | Number | 100       | 最大值           |
| `unit`    | String | ''        | 单位显示         |
| `title`   | String | '仪表'    | 仪表标题         |
| `size`    | Number | 240       | 仪表尺寸（像素） |
| `warning` | Number | undefined | 警告阈值         |
| `danger`  | Number | undefined | 危险阈值         |
| `zones`   | Array  | undefined | 自定义颜色区间   |
| `steps`   | Number | 10        | 刻度数量         |
| `decimal` | Number | 1         | 小数位数         |

## 🎯 使用示例

### 基础用法

```vue
<template>
  <HmiGauge :value="45" :min="0" :max="100" unit="°C" title="温度" :size="240" />
</template>
```

### 带警告/危险值

```vue
<template>
  <HmiGauge
    :value="pressureValue"
    :min="0"
    :max="100"
    :warning="70"
    :danger="90"
    unit="kPa"
    title="系统压力"
    :size="220"
  />
</template>
```

### 自定义颜色区间

```vue
<script setup>
const zones = [
  { from: 0, to: 30, color: '#f59e0b' }, // 偏干
  { from: 30, to: 60, color: '#10b981' }, // 适中
  { from: 60, to: 100, color: '#3b82f6' }, // 偏湿
]
</script>

<template>
  <HmiGauge :value="55" :min="0" :max="100" :zones="zones" unit="%" title="相对湿度" />
</template>
```

### 多仪表仪表板

```vue
<template>
  <div class="dashboard">
    <HmiGauge
      :value="temperature"
      :min="0"
      :max="60"
      :warning="45"
      :danger="55"
      unit="°C"
      title="环境温度"
      :size="200"
    />

    <HmiGauge
      :value="humidity"
      :min="0"
      :max="100"
      :zones="humidityZones"
      unit="%"
      title="相对湿度"
      :size="200"
    />

    <HmiGauge
      :value="pressure"
      :min="980"
      :max="1050"
      :warning="1030"
      :danger="1040"
      unit="hPa"
      title="气压"
      :size="200"
    />
  </div>
</template>
```

## 🎨 颜色方案

### 默认颜色区间

- **绿色**（#10b981）：正常范围（0 - warning）
- **黄色**（#f59e0b）：警告范围（warning - danger）
- **红色**（#ef4444）：危险范围（danger - max）

### 自定义颜色区间结构

```typescript
interface Zone {
  from: number // 区间起始值
  to: number // 区间结束值
  color: string // 该区间的颜色（十六进制或 RGB）
}
```

## 📐 尺寸和布局

### 推荐尺寸

- **单个仪表**：240px - 280px（用于详细监测）
- **多仪表面板**：180px - 220px（用于综合显示）
- **紧凑模式**：140px - 160px（用于空间限制）

### 响应式设计

- 自动适应容器宽度
- 移动设备自动调整字体大小
- 触摸友好的交互区域

## 🔄 动画特性

### 指针动画

- 持续时间：0.4 秒
- 缓动函数：`cubic-bezier(0.34, 1.56, 0.64, 1)`（弹簧效果）
- 平滑的值变化动画

### 状态灯动画

- 脉冲周期：2 秒
- 循环播放（0% → 100% → 0%）
- 自动响应状态变化

## 🎓 最佳实践

### 1. 精度设置

```vue
<!-- 整数显示 -->
<HmiGauge :decimal="0" />

<!-- 一位小数 -->
<HmiGauge :decimal="1" />

<!-- 两位小数 -->
<HmiGauge :decimal="2" />
```

### 2. 范围配置

```vue
<!-- 确保 min < warning < danger < max -->
<HmiGauge
  :value="70"
  :min="0"
  :max="100"
  :warning="70"    <!-- 警告从 70 开始 -->
  :danger="90"     <!-- 危险从 90 开始 -->
/>
```

### 3. 刻度数量

```vue
<!-- 5 个刻度，适合粗略读数 -->
<HmiGauge :steps="4" />

<!-- 10 个刻度，标准配置 -->
<HmiGauge :steps="9" />

<!-- 15+ 个刻度，精细读数 -->
<HmiGauge :steps="14" />
```

### 4. 响应式布局

```vue
<style scoped>
.gauge-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 24px;
}

@media (max-width: 768px) {
  .gauge-grid {
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  }
}
</style>
```

## 🚀 性能优化

### 高效渲染

- 使用 SVG 矢量图形
- CSS 动画而非 JavaScript 计时
- 自动防抖值更新
- 最小化重新排版

### 大数据量处理

- 支持实时数据更新
- 高效的变化检测
- 无内存泄漏

## 🔧 高级配置

### 动态范围

```vue
<script setup>
const min = ref(0)
const max = ref(100)

const updateRange = (newMin, newMax) => {
  min.value = newMin
  max.value = newMax
}
</script>

<template>
  <HmiGauge :value="value" :min="min" :max="max" />
</template>
```

### 条件着色

```vue
<script setup>
const getZones = (type) => {
  if (type === 'temperature') {
    return [
      { from: 0, to: 20, color: '#60a5fa' }, // 冷
      { from: 20, to: 30, color: '#10b981' }, // 舒适
      { from: 30, to: 50, color: '#f59e0b' }, // 热
      { from: 50, to: 100, color: '#ef4444' }, // 过热
    ]
  }
  // 其他类型...
}

const zones = getZones('temperature')
</script>

<template>
  <HmiGauge :zones="zones" />
</template>
```

## 📱 触摸屏适配

HmiGauge 经过优化，适合触摸屏使用：

- 大按钮和标签便于点击
- 高对比度颜色易于识别
- 流畅动画减少视觉疲劳
- 清晰的单位标注

## 🐛 常见问题

### Q: 如何隐藏单位？

A: 将 `unit` 设置为空字符串即可。

### Q: 能否自定义指针颜色？

A: 可以。指针颜色会根据状态自动变化（正常/警告/危险）。

### Q: 如何加速指针动画？

A: 修改组件中的 `transition: transform 0.4s` 为更短的时间（例如 0.2s）。

### Q: 支持负值吗？

A: 完全支持。设置 `min` 为负数即可。

## 📄 许可证

MIT License
