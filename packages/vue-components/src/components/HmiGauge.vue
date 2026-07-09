<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

export interface HmiGaugeProps {
  value?: number
  min?: number
  max?: number
  unit?: string
  title?: string
  size?: number
  warning?: number
  danger?: number
  steps?: number
  decimal?: number
}

const props = withDefaults(defineProps<HmiGaugeProps>(), {
  value: 0,
  min: -20,
  max: 20,
  unit: 'dB',
  title: 'VU',
  size: 280,
  decimal: 1,
})

const canvasRef = ref<HTMLCanvasElement | null>(null)

const displayValue = computed(() => {
  const val = Math.max(props.min!, Math.min(props.max!, props.value!))
  return val.toFixed(props.decimal)
})

const rotationAngle = computed(() => {
  const range = props.max! - props.min!
  const ratio = (props.value! - props.min!) / range
  // 从 225°（左下）到 315°（右下），范围 90°
  return 225 + ratio * 90
})

const gaugeColor = computed(() => {
  if (props.danger !== undefined && props.value! >= props.danger) return '#dc2626'
  if (props.warning !== undefined && props.value! >= props.warning) return '#ea580c'
  return '#059669'
})

const drawGauge = () => {
  const canvas = canvasRef.value
  if (!canvas) return

  const dpr = window.devicePixelRatio || 1
  const size = props.size!
  const height = Math.round(size * 0.65)

  canvas.width = size * dpr
  canvas.height = height * dpr
  canvas.style.width = `${size}px`
  canvas.style.height = `${height}px`

  const ctx = canvas.getContext('2d')!
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, size, height)

  const centerX = size / 2
  const centerY = size / 2
  const radius = size / 2 - 5

  // 绘制背景渐变
  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)
  gradient.addColorStop(0, '#ffffff')
  gradient.addColorStop(1, '#f0f0f0')

  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
  ctx.fill()

  // 绘制表盘边框
  ctx.strokeStyle = '#999'
  ctx.lineWidth = 1
  ctx.stroke()

  // 绘制红色危险区弧（右下角）
  const dangerStartAngle = (315 * Math.PI) / 180
  const dangerEndAngle = (345 * Math.PI) / 180
  ctx.strokeStyle = '#dc2626'
  ctx.lineWidth = 12
  ctx.globalAlpha = 0.5
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius - 20, dangerStartAngle, dangerEndAngle)
  ctx.stroke()
  ctx.globalAlpha = 1

  // 绘制刻度线
  const range = props.max! - props.min!
  for (let i = 0; i <= range; i++) {
    const isMainTick = i % 2 === 0
    // 从 225°（左下）到 315°（右下）
    const ratio = i / range
    const angle = (225 + ratio * 90) * (Math.PI / 180)

    const x1 = centerX + (radius - 20) * Math.cos(angle)
    const y1 = centerY + (radius - 20) * Math.sin(angle)
    const x2 = centerX + (radius - (isMainTick ? 35 : 28)) * Math.cos(angle)
    const y2 = centerY + (radius - (isMainTick ? 35 : 28)) * Math.sin(angle)

    ctx.strokeStyle = isMainTick ? '#333' : '#999'
    ctx.lineWidth = isMainTick ? 2 : 1
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()

    // 绘制主刻度标签
    if (isMainTick) {
      const labelRadius = radius - 55
      const labelX = centerX + labelRadius * Math.cos(angle)
      const labelY = centerY + labelRadius * Math.sin(angle)

      ctx.fillStyle = '#333'
      ctx.font = 'bold 11px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(props.min! + i), labelX, labelY)
    }
  }

  // 绘制指针
  ctx.save()
  ctx.translate(centerX, centerY)
  ctx.rotate((rotationAngle.value * Math.PI) / 180)

  ctx.strokeStyle = '#000'
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(0, -(radius - 35))
  ctx.stroke()

  ctx.restore()

  // 绘制中心圆点
  ctx.fillStyle = '#666'
  ctx.beginPath()
  ctx.arc(centerX, centerY, 8, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#999'
  ctx.beginPath()
  ctx.arc(centerX, centerY, 5, 0, Math.PI * 2)
  ctx.fill()

  // 绘制标题
  ctx.fillStyle = '#999'
  ctx.globalAlpha = 0.7
  ctx.font = 'bold 16px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(props.title!, centerX, centerY + 15)
  ctx.globalAlpha = 1
}

onMounted(() => {
  drawGauge()
})

watch(
  () => [props.value, props.min, props.max, props.size],
  () => {
    drawGauge()
  },
)
</script>

<template>
  <div
    class="hmi-gauge-wrapper"
    :style="{ '--gauge-size': `${size}px`, '--gauge-color': gaugeColor }"
  >
    <!-- Canvas 仪表 -->
    <canvas ref="canvasRef" class="gauge-canvas"></canvas>

    <!-- 数值显示 -->
    <div class="value-panel">
      <div class="value-box">
        <span class="value-num">{{ displayValue }}</span>
        <span class="value-unit">{{ unit }}</span>
      </div>
      <div class="status-box">
        <span class="dot" :style="{ backgroundColor: gaugeColor }"></span>
        <span v-if="danger !== undefined && value! >= danger" class="status-text danger"
          >⚠ 危险</span
        >
        <span v-else-if="warning !== undefined && value! >= warning" class="status-text warning"
          >⚡ 警告</span
        >
        <span v-else class="status-text normal">● 正常</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hmi-gauge-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f5f5f5;
  border-radius: 8px;
}

.gauge-canvas {
  display: block;
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.08));
  image-rendering: -webkit-optimize-contrast;
}

.value-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.value-box {
  display: flex;
  align-items: baseline;
  gap: 2px;
}

.value-num {
  font-size: 24px;
  font-weight: 700;
  color: var(--gauge-color);
  font-family: 'Courier New', monospace;
}

.value-unit {
  font-size: 11px;
  color: #666;
  font-weight: 500;
}

.status-box {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
}

.dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  display: inline-block;
}

.status-text {
  color: #333;
}

.status-text.danger {
  color: #dc2626;
}

.status-text.warning {
  color: #ea580c;
}

.status-text.normal {
  color: #059669;
}
</style>
