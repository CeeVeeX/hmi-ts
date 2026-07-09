<script setup lang="ts">
import { computed, ref, watch } from 'vue'

defineOptions({
  name: 'HmiThermometer',
})

const props = withDefaults(
  defineProps<{
    min?: number
    max?: number
    step?: number
    disabled?: boolean
    interactive?: boolean
    ticks?: boolean
    majorEvery?: number
    showLabels?: boolean
    unit?: string
  }>(),
  {
    min: -20,
    max: 50,
    step: 1,
    disabled: false,
    interactive: true,
    ticks: true,
    majorEvery: 10,
    showLabels: true,
    unit: '',
  },
)

const emit = defineEmits<{
  change: [number]
  dragstart: [number]
  dragend: [number]
}>()

const modelValue = defineModel<number>({
  default: 0,
})

const trackRef = ref<HTMLElement>()
const draggingPointerId = ref<number | null>(null)

const safeStep = computed(() => {
  if (!Number.isFinite(props.step) || props.step <= 0) {
    return 1
  }
  return props.step
})

const safeMajorEvery = computed(() => Math.max(1, Math.floor(props.majorEvery)))

const valueSpan = computed(() => Math.max(props.max - props.min, safeStep.value))

const stepDecimals = computed(() => {
  const s = safeStep.value.toString()
  const dot = s.indexOf('.')
  return dot === -1 ? 0 : s.length - dot - 1
})

const stepFactor = computed(() => 10 ** stepDecimals.value)

const currentValue = computed(() => normalize(modelValue.value))

const percent = computed(() => valueToPercent(currentValue.value))

const ticks = computed(() => {
  if (!props.ticks) {
    return [] as Array<{ value: number; percent: number; level: 'minor' | 'major' }>
  }

  const arr: Array<{ value: number; percent: number; level: 'minor' | 'major' }> = []
  const count = Math.floor((props.max - props.min) / safeStep.value)

  for (let i = 0; i <= count; i++) {
    const value = normalize(props.min + i * safeStep.value)
    const isEnd = i === 0 || i === count
    const isMajor = isEnd || i % safeMajorEvery.value === 0

    arr.push({
      value,
      percent: valueToPercent(value),
      level: isMajor ? 'major' : 'minor',
    })
  }

  const hasMax = arr.some((t) => t.value === normalize(props.max))
  if (!hasMax) {
    arr.push({
      value: normalize(props.max),
      percent: valueToPercent(props.max),
      level: 'major',
    })
  }

  return arr
})

const majorTicks = computed(() => ticks.value.filter((t) => t.level === 'major'))

const displayValue = computed(() => `${currentValue.value}${props.unit || ''}`)

watch(
  () => [modelValue.value, props.min, props.max, props.step] as const,
  () => {
    modelValue.value = normalize(modelValue.value)
  },
  { immediate: true },
)

function clamp(value: number) {
  return Math.min(props.max, Math.max(props.min, value))
}

function snap(value: number) {
  const n = (value - props.min) / safeStep.value
  const snapped = Math.round(n) * safeStep.value + props.min
  return Math.round(snapped * stepFactor.value) / stepFactor.value
}

function normalize(value: number) {
  const raw = Number.isFinite(value) ? value : props.min
  return clamp(snap(raw))
}

function valueToPercent(value: number) {
  return ((normalize(value) - props.min) / valueSpan.value) * 100
}

function valueFromPointer(event: PointerEvent) {
  const el = trackRef.value
  if (!el) {
    return props.min
  }

  const rect = el.getBoundingClientRect()
  const ratio = 1 - (event.clientY - rect.top) / rect.height
  const bounded = Math.min(1, Math.max(0, ratio))
  return props.min + bounded * valueSpan.value
}

function updateValue(next: number, triggerChange = true) {
  const normalized = normalize(next)
  modelValue.value = normalized
  if (triggerChange) {
    emit('change', normalized)
  }
}

function onPointerDown(event: PointerEvent) {
  if (props.disabled || !props.interactive) {
    return
  }

  draggingPointerId.value = event.pointerId
  trackRef.value?.setPointerCapture(event.pointerId)
  emit('dragstart', currentValue.value)
  updateValue(valueFromPointer(event))
}

function onPointerMove(event: PointerEvent) {
  if (props.disabled || !props.interactive || draggingPointerId.value !== event.pointerId) {
    return
  }

  updateValue(valueFromPointer(event))
}

function onPointerUp(event: PointerEvent) {
  if (draggingPointerId.value !== event.pointerId) {
    return
  }

  trackRef.value?.releasePointerCapture(event.pointerId)
  draggingPointerId.value = null
  emit('dragend', currentValue.value)
}
</script>

<template>
  <div class="hmi-thermometer" :class="{ 'is-disabled': props.disabled }">
    <div class="hmi-thermometer-header">{{ displayValue }}</div>

    <div class="hmi-thermometer-body">
      <div v-if="props.ticks" class="hmi-thermometer-scale left">
        <div
          v-for="tick in ticks"
          :key="`left-${tick.value}`"
          class="tick"
          :class="`is-${tick.level}`"
          :style="{ bottom: `${tick.percent}%` }"
        />
        <div
          v-if="props.showLabels"
          class="label"
          v-for="tick in majorTicks"
          :key="`left-label-${tick.value}`"
          :style="{ bottom: `${tick.percent}%` }"
        >
          {{ tick.value }}
        </div>
      </div>

      <div
        ref="trackRef"
        class="hmi-thermometer-track"
        :style="{ '--fill-percent': `${percent}%` }"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      >
        <div class="hmi-thermometer-tube">
          <div class="hmi-thermometer-fill" />
        </div>

        <div class="hmi-thermometer-bulb">
          <div class="hmi-thermometer-bulb-fill" />
        </div>
      </div>

      <div v-if="props.ticks" class="hmi-thermometer-scale right">
        <div
          v-for="tick in ticks"
          :key="`right-${tick.value}`"
          class="tick"
          :class="`is-${tick.level}`"
          :style="{ bottom: `${tick.percent}%` }"
        />
        <div
          v-if="props.showLabels"
          class="label"
          v-for="tick in majorTicks"
          :key="`right-label-${tick.value}`"
          :style="{ bottom: `${tick.percent}%` }"
        >
          {{ tick.value }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hmi-thermometer {
  --tube-width: 16px;
  --tube-height: 320px;
  --bulb-size: 54px;
  --tube-bulb-overlap: 0px;
  --scale-gap: 10px;
  --minor-tick: 12px;
  --major-tick: 26px;

  display: inline-flex;
  flex-direction: column;
  align-items: center;
  user-select: none;
  color: #454545;
  margin-bottom: calc(var(--bulb-size) / 2 + 4px);
}

.hmi-thermometer.is-disabled {
  opacity: 0.45;
}

.hmi-thermometer-header {
  margin-bottom: 8px;
  font-weight: 600;
  font-size: 14px;
  color: #505050;
}

.hmi-thermometer-body {
  display: inline-flex;
  align-items: stretch;
  position: relative;
}

.hmi-thermometer-track {
  position: relative;
  width: calc(var(--tube-width) + 16px);
  height: calc(var(--tube-height) + var(--bulb-size) / 2);
  display: flex;
  justify-content: center;
  cursor: ns-resize;
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
}

.hmi-thermometer-tube {
  position: absolute;
  bottom: calc(var(--bulb-size) / 2);
  z-index: 1;
  width: var(--tube-width);
  height: var(--tube-height);
  border-radius: calc(var(--tube-width) / 2) calc(var(--tube-width) / 2) 0 0;
  background: linear-gradient(180deg, #efefef, #dcdcdc);
  box-shadow:
    inset 0 0 8px #0000001f,
    0 1px 3px #00000026;
  padding: 4px;
  box-sizing: border-box;
  overflow: hidden;
  border-top: 2px solid #f6f6f6;
  border-right: 2px solid #f6f6f6;
  border-left: 2px solid #f6f6f6;
}

.hmi-thermometer-fill {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  top: 0;
  border-radius: inherit;
  background: linear-gradient(
    180deg,
    #ff4f4f 0%,
    #ff8a2a 24%,
    #45c96a 52%,
    #3fb5ff 76%,
    #4eafff 100%
  );
  -webkit-mask-image: linear-gradient(
    to bottom,
    transparent 0,
    transparent calc(100% - var(--fill-percent)),
    #000 calc(100% - var(--fill-percent)),
    #000 100%
  );
  mask-image: linear-gradient(
    to bottom,
    transparent 0,
    transparent calc(100% - var(--fill-percent)),
    #000 calc(100% - var(--fill-percent)),
    #000 100%
  );
  box-shadow: 0 0 10px #ff6f914d;
  transition:
    -webkit-mask-image 0.15s linear,
    mask-image 0.15s linear,
    background 0.15s linear;
}

.hmi-thermometer-bulb {
  position: absolute;
  bottom: calc((var(--tube-bulb-overlap) - var(--bulb-size)) / 2 + 2px);
  z-index: 2;
  width: var(--bulb-size);
  height: var(--bulb-size);
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #f7f7f7 0%, #e4e4e4 65%, #d4d4d4 100%);
  box-shadow:
    inset 0 0 0 3px #f6f6f6,
    inset 0 0 16px #00000022,
    0 2px 6px #00000026;
}

.hmi-thermometer-bulb-fill {
  position: absolute;
  inset: 7px;
  border-radius: 50%;
  overflow: visible;
  background: radial-gradient(
    circle at 35% 30%,
    #f7f7f7 0%,
    #8ed6ff 28%,
    #5baee9 58%,
    #4eafff 100%
  );
  box-shadow: 0 0 12px #4dbdff99;
  transition:
    background 0.15s linear,
    box-shadow 0.15s linear;
}

.hmi-thermometer-bulb-fill::before {
  content: '';
  position: absolute;
  left: 50%;
  top: -7px;
  transform: translateX(-50%);
  width: calc(var(--tube-width) - 4px);
  height: 10px;
  background: linear-gradient(180deg, #4eafff 0%, #5baee9 55%, #8ed6ff 100%);
  box-shadow: 0 0 8px #66b4ff66;
}

.hmi-thermometer-scale {
  position: relative;
  width: calc(var(--major-tick) + 34px);
  height: var(--tube-height);
  margin-top: 0;
}

.hmi-thermometer-scale.left {
  margin-right: var(--scale-gap);
}

.hmi-thermometer-scale.right {
  margin-left: var(--scale-gap);
}

.hmi-thermometer-scale .tick {
  position: absolute;
  height: 1px;
  width: var(--minor-tick);
  background: #7f7f7f;
  transform: translateY(50%);
}

.hmi-thermometer-scale .tick.is-major {
  width: var(--major-tick);
  background: #5d5d5d;
}

.hmi-thermometer-scale.left .tick {
  right: 0;
}

.hmi-thermometer-scale.right .tick {
  left: 0;
}

.hmi-thermometer-scale .label {
  position: absolute;
  font-size: 12px;
  color: #808080;
  transform: translateY(50%);
}

.hmi-thermometer-scale.left .label {
  right: calc(var(--major-tick) + 8px);
}

.hmi-thermometer-scale.right .label {
  left: calc(var(--major-tick) + 8px);
}
</style>
