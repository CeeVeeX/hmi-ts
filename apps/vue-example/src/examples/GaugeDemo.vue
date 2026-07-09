<script setup lang="ts">
import { ref } from 'vue'
import { HmiCardPanel, HmiGauge } from '@hmi-ts/vue-components'

// 演示1: 经典VU表风格 - 音量
const volumeValue = ref(65)

// 演示2: 电压表
const voltageValue = ref(220)
const voltageMin = ref(180)
const voltageMax = ref(260)

// 演示3: 电流表
const currentValue = ref(3.5)
const currentMin = ref(0)
const currentMax = ref(10)
const currentWarning = ref(7)
const currentDanger = ref(9)

// 演示4: 温度表（自定义区间）
const temperatureValue = ref(38)
const tempZones = [
  { from: -10, to: 20, color: '#3b82f6' }, // 冷
  { from: 20, to: 25, color: '#10b981' }, // 舒适
  { from: 25, to: 40, color: '#f59e0b' }, // 热
  { from: 40, to: 50, color: '#dc2626' }, // 过热
]

// 演示5: 实时监测仪表板
const dashboardMetrics = ref({
  rpm: 3200, // 转速
  fuel: 78, // 燃油
  temp: 92, // 发动机温度
})

const randomizeMetrics = () => {
  dashboardMetrics.value.rpm = Math.floor(Math.random() * 5000) + 500
  dashboardMetrics.value.fuel = Math.floor(Math.random() * 100)
  dashboardMetrics.value.temp = Math.floor(Math.random() * 80) + 60
}

// 动画演示
const animatedValue = ref(50)
const isAnimating = ref(false)

const animateValue = () => {
  if (isAnimating.value) return
  isAnimating.value = true

  const target = Math.random() * 100
  const step = (target - animatedValue.value) / 30

  const animate = () => {
    animatedValue.value += step
    if ((step > 0 && animatedValue.value < target) || (step < 0 && animatedValue.value > target)) {
      requestAnimationFrame(animate)
    } else {
      animatedValue.value = target
      isAnimating.value = false
    }
  }

  requestAnimationFrame(animate)
}
</script>

<template>
  <HmiCardPanel>
    <template #title>经典模拟仪表演示 (Analog Gauge Demo)</template>

    <div class="demo-container">
      <!-- 演示1: VU音量表 -->
      <div class="demo-section">
        <h3>📻 VU音量表</h3>
        <p class="description">经典音频VU表风格 (-20dB ~ +13dB)</p>
        <div class="gauge-grid">
          <HmiGauge
            :value="volumeValue"
            :min="-20"
            :max="13"
            unit="dB"
            title="音量"
            :size="240"
            :steps="6"
            :decimal="0"
          />
        </div>
        <div class="control-slider">
          <label>调整音量：</label>
          <input v-model.number="volumeValue" type="range" min="-20" max="13" />
          <span>{{ volumeValue }} dB</span>
        </div>
      </div>
    </div>
  </HmiCardPanel>
</template>

<style scoped>
.demo-container {
  display: flex;
  flex-direction: column;
  gap: 32px;
  padding: 20px;
}

.demo-section {
  padding: 20px;
  background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.demo-section h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  letter-spacing: 0.3px;
}

.description {
  margin: 0 0 16px 0;
  font-size: 12px;
  color: #6b7280;
  font-style: italic;
}

.gauge-grid {
  display: flex;
  justify-content: center;
  margin: 16px 0;
}

.control-slider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  font-size: 13px;
}

.control-slider label {
  font-weight: 500;
  color: #374151;
  min-width: 100px;
}

.control-slider input[type='range'] {
  flex: 1;
  min-width: 150px;
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(
    to right,
    #10b981,
    #10b981 70%,
    #f59e0b 70%,
    #f59e0b 85%,
    #dc2626 85%
  );
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}

.control-slider input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  border: 2px solid #fff;
  transition: all 0.2s;
}

.control-slider input[type='range']::-webkit-slider-thumb:hover {
  transform: scale(1.15);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
}

.control-slider input[type='range']::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  border: 2px solid #fff;
  transition: all 0.2s;
}

.control-slider span {
  min-width: 70px;
  text-align: right;
  color: #0891b2;
  font-weight: 600;
  font-family: 'Courier New', monospace;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin: 20px 0;
}

.gauge-item {
  display: flex;
  justify-content: center;
}

.btn-refresh,
.btn-animate {
  padding: 10px 20px;
  border: 2px solid #3b82f6;
  background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
  color: #fff;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.3s;
  margin-top: 12px;
}

.btn-refresh:hover,
.btn-animate:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
}

.btn-animate:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-refresh:active,
.btn-animate:active:not(:disabled) {
  transform: translateY(0);
}

.demo-section.wide {
  grid-column: 1 / -1;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .demo-container {
    gap: 24px;
    padding: 16px;
  }

  .demo-section {
    padding: 16px;
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .control-slider {
    flex-wrap: wrap;
  }

  .control-slider input[type='range'] {
    order: 3;
    flex-basis: 100%;
  }
}
</style>
