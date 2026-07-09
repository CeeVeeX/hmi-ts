<script setup lang="ts">
import { watch } from 'vue'
import { HmiCardPanel, HmiThermometer, HmiCardScreen } from '@hmi-ts/vue-components'
import { useLocalStorage } from '@vueuse/core'

const thermoMin = useLocalStorage('thermoMin', -20)
const thermoMax = useLocalStorage('thermoMax', 50)
const thermoStep = useLocalStorage('thermoStep', 1)
const thermoValue = useLocalStorage('thermoValue', 18)
const thermoUnit = useLocalStorage('thermoUnit', '°C')
const thermoDisabled = useLocalStorage('thermoDisabled', false)
const thermoInteractive = useLocalStorage('thermoInteractive', true)
const thermoTicks = useLocalStorage('thermoTicks', true)
const thermoShowLabels = useLocalStorage('thermoShowLabels', true)
const thermoMajorEvery = useLocalStorage('thermoMajorEvery', 10)

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

watch(
  () => [thermoMin.value, thermoMax.value] as const,
  ([min, max]) => {
    if (max <= min) {
      thermoMax.value = min + 1
    }
  },
)

watch(
  () => [thermoMin.value, thermoMax.value, thermoStep.value, thermoValue.value] as const,
  ([min, max, step, value]) => {
    if (!Number.isFinite(step) || step <= 0) {
      thermoStep.value = 1
    }
    thermoValue.value = clamp(value, min, max)
  },
  { immediate: true },
)
</script>

<template>
  <HmiCardPanel mt-10px>
    <template #title>温度计</template>

    <div flex justify-between gap-20px>
      <HmiCardScreen>
        <div>
          <div>
            最小值
            <input type="number" v-model.number="thermoMin" />
          </div>
          <div>
            最大值
            <input type="number" v-model.number="thermoMax" />
          </div>
          <div>
            步进
            <input type="number" min="0.1" step="0.1" v-model.number="thermoStep" />
          </div>
          <div>
            当前值
            <input type="number" v-model.number="thermoValue" />
          </div>
          <div>
            单位
            <input type="text" v-model="thermoUnit" />
          </div>
          <div>
            主刻度间隔
            <input type="number" min="1" v-model.number="thermoMajorEvery" />
          </div>

          <div>
            刻度
            <input type="checkbox" v-model="thermoTicks" />
          </div>
          <div>
            标签
            <input type="checkbox" v-model="thermoShowLabels" />
          </div>
          <div>
            可交互
            <input type="checkbox" v-model="thermoInteractive" />
          </div>
          <div>
            禁用
            <input type="checkbox" v-model="thermoDisabled" />
          </div>
        </div>
      </HmiCardScreen>

      <div>
        <HmiThermometer
          v-model="thermoValue"
          :min="thermoMin"
          :max="thermoMax"
          :step="thermoStep"
          :major-every="thermoMajorEvery"
          :ticks="thermoTicks"
          :show-labels="thermoShowLabels"
          :interactive="thermoInteractive"
          :disabled="thermoDisabled"
          :unit="thermoUnit"
        />
      </div>
    </div>
  </HmiCardPanel>
</template>
