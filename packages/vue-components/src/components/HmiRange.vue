<script setup lang="ts">
import { computed, ref, watch } from 'vue'

defineOptions({
  name: 'HmiRange',
})

const props = withDefaults(
  defineProps<{
    min?: number
    max?: number
    step?: number
    disabled?: boolean
    range?: boolean
    vertical?: boolean
    ticks?: boolean | number[]
    minGap?: number
  }>(),
  {
    min: 0,
    max: 100,
    step: 1,
    disabled: false,
    range: false,
    vertical: false,
    ticks: false,
    minGap: 0,
  },
)

const emit = defineEmits<{
  change: [number | [number, number]]
  dragstart: [number | [number, number]]
  dragend: [number | [number, number]]
}>()

const modelValue = defineModel<number | [number, number]>({
  default: 0,
})

const trackRef = ref<HTMLElement>()
const startValue = ref(0)
const endValue = ref(100)
const activeThumb = ref<'start' | 'end'>('start')
const draggingPointerId = ref<number | null>(null)

const span = computed(() => Math.max(props.max - props.min, 1))

const safeStep = computed(() => {
  if (!Number.isFinite(props.step) || props.step <= 0) return 1
  return props.step
})

const stepDecimals = computed(() => {
  const step = safeStep.value.toString()
  const dot = step.indexOf('.')
  return dot === -1 ? 0 : step.length - dot - 1
})

const stepFactor = computed(() => 10 ** stepDecimals.value)

const startPercent = computed(() => valueToPercent(startValue.value))
const endPercent = computed(() => valueToPercent(endValue.value))

const tickValues = computed(() => {
  const ticks = props.ticks
  if (!ticks) return []

  if (Array.isArray(ticks)) {
    return [...new Set(ticks)]
      .filter((value) => Number.isFinite(value))
      .map((value) => clamp(value))
      .sort((a, b) => a - b)
  }

  const points: number[] = []
  const maxPoints = 500
  const step = safeStep.value
  const count = Math.min(Math.floor((props.max - props.min) / step) + 1, maxPoints)

  for (let i = 0; i < count; i++) {
    points.push(snap(props.min + i * step))
  }

  if (points[points.length - 1] !== props.max) {
    points.push(props.max)
  }

  return points
})

const tickItems = computed(() => {
  const values = tickValues.value
  const lastIndex = values.length - 1

  return values.map((value, index) => {
    let level: 'minor' | 'mid' | 'major' = 'minor'

    if (index === 0 || index === lastIndex || index % 10 === 0) {
      level = 'major'
    } else if (index % 5 === 0) {
      level = 'mid'
    }

    return {
      key: `${index}-${value}`,
      percent: valueToPercent(value),
      level,
    }
  })
})

const fillStyle = computed(() => {
  if (props.vertical) {
    if (props.range) {
      return {
        bottom: `${startPercent.value}%`,
        height: `${Math.max(endPercent.value - startPercent.value, 0)}%`,
      }
    }

    return {
      bottom: '0%',
      height: `${startPercent.value}%`,
    }
  }

  if (props.range) {
    return {
      left: `${startPercent.value}%`,
      width: `${Math.max(endPercent.value - startPercent.value, 0)}%`,
    }
  }

  return {
    left: '0%',
    width: `${startPercent.value}%`,
  }
})

watch(
  () => [modelValue.value, props.min, props.max, props.range] as const,
  () => {
    syncFromModel()
  },
  { immediate: true },
)

function clamp(value: number) {
  return Math.min(props.max, Math.max(props.min, value))
}

function snap(value: number) {
  const normalized = (value - props.min) / safeStep.value
  const snapped = Math.round(normalized) * safeStep.value + props.min
  return Math.round(snapped * stepFactor.value) / stepFactor.value
}

function normalize(value: number) {
  return clamp(snap(value))
}

function valueToPercent(value: number) {
  return ((clamp(value) - props.min) / span.value) * 100
}

function emitValue(triggerChange = false) {
  if (props.range) {
    const next: [number, number] = [startValue.value, endValue.value]
    modelValue.value = next
    if (triggerChange) {
      emit('change', next)
    }
    return
  }

  modelValue.value = startValue.value
  if (triggerChange) {
    emit('change', startValue.value)
  }
}

function syncFromModel() {
  if (props.range) {
    const value = modelValue.value
    let left = props.min
    let right = props.max

    if (Array.isArray(value)) {
      left = normalize(value[0] ?? props.min)
      right = normalize(value[1] ?? props.max)
    }

    if (left > right) {
      ;[left, right] = [right, left]
    }

    if (right - left < props.minGap) {
      right = clamp(left + props.minGap)
      if (right - left < props.minGap) {
        left = clamp(right - props.minGap)
      }
    }

    startValue.value = left
    endValue.value = right
    return
  }

  const value = Array.isArray(modelValue.value) ? modelValue.value[0] : modelValue.value

  startValue.value = normalize(value ?? props.min)
}

function updateByValue(rawValue: number, thumb: 'start' | 'end') {
  const next = normalize(rawValue)

  if (props.range) {
    if (thumb === 'start') {
      startValue.value = Math.min(next, endValue.value - props.minGap)
      startValue.value = clamp(startValue.value)
    } else {
      endValue.value = Math.max(next, startValue.value + props.minGap)
      endValue.value = clamp(endValue.value)
    }
  } else {
    startValue.value = next
  }

  emitValue(true)
}

function getValueFromPointer(event: PointerEvent) {
  const track = trackRef.value
  if (!track) return props.min

  const rect = track.getBoundingClientRect()
  if (props.vertical) {
    const ratio = 1 - (event.clientY - rect.top) / rect.height
    return props.min + clampRatio(ratio) * span.value
  }

  const ratio = (event.clientX - rect.left) / rect.width
  return props.min + clampRatio(ratio) * span.value
}

function clampRatio(value: number) {
  return Math.min(1, Math.max(0, value))
}

function pickNearestThumb(value: number) {
  if (!props.range) return 'start'
  const distanceToStart = Math.abs(value - startValue.value)
  const distanceToEnd = Math.abs(value - endValue.value)
  return distanceToStart <= distanceToEnd ? 'start' : 'end'
}

function beginDrag(event: PointerEvent, thumb: 'start' | 'end') {
  if (props.disabled) return

  activeThumb.value = thumb
  draggingPointerId.value = event.pointerId
  trackRef.value?.setPointerCapture(event.pointerId)
  emit('dragstart', props.range ? [startValue.value, endValue.value] : startValue.value)
}

function onTrackPointerDown(event: PointerEvent) {
  if (props.disabled) return

  const raw = getValueFromPointer(event)
  const thumb = pickNearestThumb(raw)
  beginDrag(event, thumb)
  updateByValue(raw, thumb)
}

function onThumbPointerDown(event: PointerEvent, thumb: 'start' | 'end') {
  event.stopPropagation()
  beginDrag(event, thumb)
}

function onTrackPointerMove(event: PointerEvent) {
  if (props.disabled || draggingPointerId.value !== event.pointerId) return
  updateByValue(getValueFromPointer(event), activeThumb.value)
}

function onTrackPointerUp(event: PointerEvent) {
  if (draggingPointerId.value !== event.pointerId) return
  endDrag(event.pointerId)
}

function onTrackPointerCancel(event: PointerEvent) {
  if (draggingPointerId.value !== event.pointerId) return
  endDrag(event.pointerId)
}

function endDrag(pointerId: number) {
  trackRef.value?.releasePointerCapture(pointerId)
  draggingPointerId.value = null
  emit('dragend', props.range ? [startValue.value, endValue.value] : startValue.value)
}

function onThumbKeydown(event: KeyboardEvent, thumb: 'start' | 'end') {
  if (props.disabled) return

  const multiplier = event.shiftKey ? 10 : 1
  const delta = safeStep.value * multiplier
  let next: number | null = null

  switch (event.key) {
    case 'ArrowLeft':
    case 'ArrowDown':
      next = (thumb === 'start' ? startValue.value : endValue.value) - delta
      break
    case 'ArrowRight':
    case 'ArrowUp':
      next = (thumb === 'start' ? startValue.value : endValue.value) + delta
      break
    case 'Home':
      next = props.min
      break
    case 'End':
      next = props.max
      break
    default:
      return
  }

  event.preventDefault()
  updateByValue(next, thumb)
}
</script>

<template>
  <div
    class="hmi-range"
    :class="{
      'is-vertical': props.vertical,
      'is-disabled': props.disabled,
    }"
  >
    <div
      ref="trackRef"
      class="hmi-range-track"
      @pointerdown="onTrackPointerDown"
      @pointermove="onTrackPointerMove"
      @pointerup="onTrackPointerUp"
      @pointercancel="onTrackPointerCancel"
    >
      <div class="hmi-range-fill" :style="fillStyle" />

      <div
        v-if="tickItems.length"
        class="hmi-range-ticks"
        :class="{ 'is-vertical': props.vertical }"
      >
        <template v-for="item in tickItems" :key="item.key">
          <template v-if="props.vertical">
            <div
              :key="`${item.key}-l`"
              class="hmi-range-tick is-left"
              :class="`is-${item.level}`"
              :style="{ bottom: `${item.percent}%` }"
            />
            <div
              :key="`${item.key}-r`"
              class="hmi-range-tick is-right"
              :class="`is-${item.level}`"
              :style="{ bottom: `${item.percent}%` }"
            />
          </template>
          <template v-else>
            <div
              :key="`${item.key}-t`"
              class="hmi-range-tick is-top"
              :class="`is-${item.level}`"
              :style="{ left: `${item.percent}%` }"
            />
            <div
              :key="`${item.key}-b`"
              class="hmi-range-tick is-bottom"
              :class="`is-${item.level}`"
              :style="{ left: `${item.percent}%` }"
            />
          </template>
        </template>
      </div>

      <button
        type="button"
        class="hmi-range-thumb"
        :class="{ 'is-active': activeThumb === 'start' }"
        :style="props.vertical ? { bottom: `${startPercent}%` } : { left: `${startPercent}%` }"
        :disabled="props.disabled"
        @pointerdown="onThumbPointerDown($event, 'start')"
        @keydown="onThumbKeydown($event, 'start')"
      />

      <button
        v-if="props.range"
        type="button"
        class="hmi-range-thumb"
        :class="{ 'is-active': activeThumb === 'end' }"
        :style="props.vertical ? { bottom: `${endPercent}%` } : { left: `${endPercent}%` }"
        :disabled="props.disabled"
        @pointerdown="onThumbPointerDown($event, 'end')"
        @keydown="onThumbKeydown($event, 'end')"
      />
    </div>
  </div>
</template>

<style scoped>
.hmi-range {
  --track-thickness: 12px;
  --thumb-size: 30px;
  --track-color: #15120f;
  --fill-color: #ff5b1f;
  --tick-gap: 8px;
  --tick-minor-size: 10px;
  --tick-mid-size: 16px;
  --tick-major-size: 24px;
  --tick-padding-block: calc(var(--tick-major-size) + var(--tick-gap));
  --tick-padding-inline: calc(var(--tick-major-size) + 12px);

  vertical-align: top;
  display: inline-flex;
  width: 320px;
  padding: var(--tick-padding-block) var(--tick-padding-inline);
  box-sizing: border-box;
  position: relative;
  overflow: visible;
}

.hmi-range.is-vertical {
  width: auto;
  height: 320px;
}

.hmi-range.is-disabled {
  opacity: 0.45;
}

.hmi-range-track {
  position: relative;
  width: 100%;
  height: var(--track-thickness);
  border-radius: 999px;
  background: linear-gradient(180deg, #11100f, var(--track-color));
  box-shadow:
    inset 0 1px 2px #ffffff1f,
    inset 0 -2px 4px #00000099,
    0 2px 6px #00000052;
  cursor: pointer;
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
}

.is-vertical .hmi-range-track {
  width: var(--track-thickness);
  height: 100%;
}

.hmi-range-fill {
  position: absolute;
  top: 0;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #ff7f2a, var(--fill-color));
  box-shadow: 0 0 12px #ff6d2c8c;
}

.is-vertical .hmi-range-fill {
  left: 0;
  width: 100%;
  top: auto;
  background: linear-gradient(180deg, #ff7f2a, var(--fill-color));
}

.hmi-range-ticks {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: visible;
}

.hmi-range-tick {
  position: absolute;
  top: 50%;
  width: 2px;
  height: var(--tick-minor-size);
  border-radius: 2px;
  background: #8f8f8fcc;
  transform: translate(-50%, -50%);
}

.hmi-range-tick.is-mid {
  height: var(--tick-mid-size);
}

.hmi-range-tick.is-major {
  height: var(--tick-major-size);
  background: #7f7f7fe0;
}

.hmi-range-ticks:not(.is-vertical) .hmi-range-tick {
  transform: translateX(-50%);
}

.hmi-range-ticks:not(.is-vertical) .hmi-range-tick.is-top {
  top: auto;
  bottom: calc(100% + var(--tick-gap));
}

.hmi-range-ticks:not(.is-vertical) .hmi-range-tick.is-bottom {
  top: calc(100% + var(--tick-gap));
}

.hmi-range-ticks.is-vertical .hmi-range-tick {
  top: auto;
  left: auto;
  height: 1px;
  border-radius: 999px;
  transform: translateY(50%);
}

.hmi-range-ticks.is-vertical .hmi-range-tick.is-left {
  right: calc(100% + 8px);
}

.hmi-range-ticks.is-vertical .hmi-range-tick.is-right {
  left: calc(100% + 8px);
}

.hmi-range-ticks.is-vertical .hmi-range-tick {
  width: var(--tick-minor-size);
}

.hmi-range-ticks.is-vertical .hmi-range-tick.is-mid {
  width: var(--tick-mid-size);
}

.hmi-range-ticks.is-vertical .hmi-range-tick.is-major {
  width: var(--tick-major-size);
  background: #7a7a7a;
}

.hmi-range-thumb {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: var(--thumb-size);
  height: var(--thumb-size);
  border: 0;
  border-radius: 50%;
  background-image: linear-gradient(180deg, #eff1f1, #86969c);
  box-shadow:
    0 0px 6px #00000080,
    0 0px 2px -2px #0003,
    0 0px 15px #0006,
    0 -12px 10px #fff3,
    inset 0 3px 3px #fff9,
    inset 0 -3px 3px #595b5c99;
  cursor: grab;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.is-vertical .hmi-range-thumb {
  left: 50%;
  top: auto;
  transform: translate(-50%, 50%);
}

.hmi-range-thumb:hover,
.hmi-range-thumb.is-active,
.hmi-range-thumb:focus-visible {
  transform: translate(-50%, -50%) scale(1.06);
  box-shadow:
    0 3px 14px #00000080,
    0 8px 8px -2px #00000033,
    0 15px 8px #00000066,
    0 -12px 10px #ffffff33,
    inset 0 3px 3px #ffffff99,
    inset 0 -3px 3px #595b5c99;
}

.is-vertical .hmi-range-thumb:hover,
.is-vertical .hmi-range-thumb.is-active,
.is-vertical .hmi-range-thumb:focus-visible {
  transform: translate(-50%, 50%) scale(1.06);
}

.hmi-range-thumb:disabled {
  cursor: not-allowed;
}
</style>
