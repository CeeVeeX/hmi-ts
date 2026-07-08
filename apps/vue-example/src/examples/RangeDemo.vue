<script setup lang="ts">
import { computed, watch } from 'vue'
import { HmiCard, HmiRange } from '@hmi-ts/vue-components'
import { useLocalStorage } from '@vueuse/core'

const sliderMin = useLocalStorage('sliderMin', 0)
const sliderMax = useLocalStorage('sliderMax', 100)
const sliderStep = useLocalStorage('sliderStep', 1)
const sliderMinGap = useLocalStorage('sliderMinGap', 10)
const sliderDisabled = useLocalStorage('sliderDisabled', false)
const sliderVertical = useLocalStorage('sliderVertical', false)
const sliderRangeMode = useLocalStorage('sliderRangeMode', false)
const sliderTickMode = useLocalStorage<'off' | 'auto' | 'custom'>('sliderTickMode', 'auto')
const sliderTickCount = useLocalStorage('sliderTickCount', 6)

const sliderValue = useLocalStorage('sliderValue', 35)
const sliderRangeValue = useLocalStorage<[number, number]>('sliderRangeValue', [20, 80])

const sliderSpan = computed(() => Math.max(sliderMax.value - sliderMin.value, 1))

const sliderTicks = computed<boolean | number[]>(() => {
  if (sliderTickMode.value === 'off') {
    return false
  }

  if (sliderTickMode.value === 'auto') {
    return true
  }

  const count = Math.max(2, Math.floor(sliderTickCount.value || 0))
  const arr: number[] = []

  for (let i = 0; i < count; i++) {
    arr.push(sliderMin.value + (sliderSpan.value * i) / (count - 1))
  }

  return arr
})

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

watch(
  () => [sliderMin.value, sliderMax.value] as const,
  ([min, max]) => {
    if (max <= min) {
      sliderMax.value = min + 1
    }
  },
)

watch(
  () => [sliderMin.value, sliderMax.value, sliderStep.value] as const,
  ([min, max, step]) => {
    if (!Number.isFinite(step) || step <= 0) {
      sliderStep.value = 1
    }

    sliderValue.value = clamp(sliderValue.value, min, max)

    const left = clamp(sliderRangeValue.value[0] ?? min, min, max)
    const right = clamp(sliderRangeValue.value[1] ?? max, min, max)
    sliderRangeValue.value = left <= right ? [left, right] : [right, left]
  },
  { immediate: true },
)

watch(
  () => [sliderRangeValue.value[0], sliderRangeValue.value[1], sliderMinGap.value] as const,
  ([left, right, minGap]) => {
    const safeGap = Math.max(minGap, 0)
    sliderMinGap.value = safeGap

    if (right - left >= safeGap) {
      return
    }

    const nextRight = clamp(left + safeGap, sliderMin.value, sliderMax.value)
    const nextLeft = clamp(nextRight - safeGap, sliderMin.value, sliderMax.value)
    sliderRangeValue.value = [nextLeft, nextRight]
  },
)
</script>

<template>
  <HmiCard mt-10px>
    <template #title>滑块</template>
    <div flex justify-between gap-20px>
      <div>
        <div>
          最小值
          <input type="number" v-model.number="sliderMin" />
        </div>
        <div>
          最大值
          <input type="number" v-model.number="sliderMax" />
        </div>
        <div>
          步进
          <input type="number" min="0.0001" step="0.1" v-model.number="sliderStep" />
        </div>
        <div>
          最小间距（范围模式）
          <input type="number" min="0" v-model.number="sliderMinGap" />
        </div>

        <div>
          刻度模式
          <select v-model="sliderTickMode">
            <option value="off">关闭</option>
            <option value="auto">自动（按步进）</option>
            <option value="custom">自定义数量</option>
          </select>
        </div>

        <div v-if="sliderTickMode === 'custom'">
          刻度数量
          <input type="number" min="2" v-model.number="sliderTickCount" />
        </div>

        <div>
          范围模式
          <input type="checkbox" v-model="sliderRangeMode" />
        </div>

        <div>
          垂直模式
          <input type="checkbox" v-model="sliderVertical" />
        </div>

        <div>
          禁用
          <input type="checkbox" v-model="sliderDisabled" />
        </div>

        <div v-if="!sliderRangeMode">当前值: {{ sliderValue }}</div>
        <div v-else>当前范围: [{{ sliderRangeValue[0] }}, {{ sliderRangeValue[1] }}]</div>
      </div>

      <div flex gap-20px>
        <div>
          <div>主示例（随参数切换）</div>
          <HmiRange
            v-if="!sliderRangeMode"
            v-model="sliderValue"
            :min="sliderMin"
            :max="sliderMax"
            :step="sliderStep"
            :min-gap="sliderMinGap"
            :ticks="sliderTicks"
            :vertical="sliderVertical"
            :disabled="sliderDisabled"
          />
          <HmiRange
            v-else
            v-model="sliderRangeValue"
            range
            :min="sliderMin"
            :max="sliderMax"
            :step="sliderStep"
            :min-gap="sliderMinGap"
            :ticks="sliderTicks"
            :vertical="sliderVertical"
            :disabled="sliderDisabled"
          />
        </div>
      </div>
    </div>
  </HmiCard>
</template>
