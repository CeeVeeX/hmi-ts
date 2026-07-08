<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, type Ref } from 'vue'
import {
  HmiButton,
  HmiStatusLight,
  HmiInput,
  HmiRange,
  HmiRadio,
  HmiSwitch,
  HmiCard,
} from '@hmi-ts/vue-components'
import { useLocalStorage } from '@vueuse/core'

const radius = useLocalStorage('radius', 10)
const radiusUnit = useLocalStorage('radiusUnit', 'px')
const handlePadding = useLocalStorage('handlePadding', 4)
const handlePaddingUnit = useLocalStorage('handlePaddingUnit', 'px')
const wrapperPadding = useLocalStorage('wrapperPadding', 2)
const wrapperPaddingUnit = useLocalStorage('wrapperPaddingUnit', 'px')
const insidePadding = useLocalStorage('insidePadding', 4)
const insidePaddingUnit = useLocalStorage('insidePaddingUnit', 'px')

const inside = useLocalStorage('inside', false)
const light = useLocalStorage<'ring' | 'inner' | null | ''>('light', '')
const longPress = useLocalStorage('longPress', 2000)
const longPressDisabled = useLocalStorage('longPressDisabled', true)
const latching = useLocalStorage('latching', false)
const triggerCount = useLocalStorage('triggerCount', 1)
const countReset = useLocalStorage('countReset', 1000)

const options = computed(() => ({
  radius: radius.value + radiusUnit.value,
  inside: inside.value,
  light: light.value,
  longPress: longPressDisabled.value ? undefined : longPress.value,
  latching: latching.value,
  triggerCount: triggerCount.value,
  countReset: countReset.value,
  handlePadding: handlePadding.value + handlePaddingUnit.value,
  wrapperPadding: wrapperPadding.value + wrapperPaddingUnit.value,
  insidePadding: insidePadding.value + insidePaddingUnit.value,
}))

const statusLightActive = useLocalStorage('statusLightActive', false)
const statusLightOptions = useLocalStorage('statusLightOptions', {
  radius: '50%',
  activeColor: '#db1010',
  inactiveColor: '#444444',
  blink: false,
  blinkInactive: false,
})
</script>

<template>
  <div class="app">
    <HmiCard>
      <template #title>按钮</template>
      <div flex justify-between>
        <div>
          <div>
            圆角
            <input type="range" v-model="radius" placeholder="请输入圆角大小" />
            <select v-model="radiusUnit">
              <option value="px">px</option>
              <option value="%">%</option>
              <option value="em">em</option>
              <option value="rem">rem</option>
            </select>
          </div>

          <div>
            按钮手柄内边距
            <input type="range" v-model="handlePadding" placeholder="请输入按钮手柄内边距" />
            <select v-model="handlePaddingUnit">
              <option value="px">px</option>
              <option value="%">%</option>
              <option value="em">em</option>
              <option value="rem">rem</option>
            </select>
          </div>

          <div>
            按钮外层包裹内边距
            <input type="range" v-model="wrapperPadding" placeholder="请输入按钮外层包裹内边距" />
            <select v-model="wrapperPaddingUnit">
              <option value="px">px</option>
              <option value="%">%</option>
              <option value="em">em</option>
              <option value="rem">rem</option>
            </select>
          </div>

          <div>
            按钮内容内边距
            <input type="range" v-model="insidePadding" placeholder="请输入按钮内容内边距" />
            <select v-model="insidePaddingUnit">
              <option value="px">px</option>
              <option value="%">%</option>
              <option value="em">em</option>
              <option value="rem">rem</option>
            </select>
          </div>

          <div>
            内容嵌入
            <input type="checkbox" v-model="inside" />
          </div>

          <div>
            光效
            <select v-model="light">
              <option value="">无</option>
              <option value="ring">环形光效</option>
              <option value="inner">内部光效</option>
            </select>
          </div>

          <div>
            长按触发事件的时间间隔
            <input type="number" v-model="longPress" placeholder="请输入长按触发事件的时间间隔" />
            不使用
            <input type="checkbox" v-model="longPressDisabled" />
          </div>

          <div>
            连续点击多少次触发事件
            <input
              type="number"
              v-model="triggerCount"
              placeholder="请输入连续点击多少次触发事件"
            />
          </div>

          <div>
            重置计数器的时间间隔
            <input type="number" v-model="countReset" placeholder="请输入重置计数器的时间间隔" />
          </div>

          <div>
            是否启用锁存
            <input type="checkbox" v-model="latching" />
          </div>
        </div>
        <div>
          <HmiButton class="" v-bind="options"> 按钮 </HmiButton>
          <HmiButton class="w-120px h-120px" v-bind="options"> 按钮 </HmiButton>
        </div>
      </div>
    </HmiCard>

    <HmiCard mt-10px>
      <template #title>指示灯</template>

      <div flex justify-between>
        <div>
          <div>
            激活灯光
            <input type="checkbox" v-model="statusLightActive" />
          </div>

          <div>
            激活时闪烁
            <input type="checkbox" v-model="statusLightOptions.blink" />
          </div>

          <div>
            非激活时闪烁
            <input type="checkbox" v-model="statusLightOptions.blinkInactive" />
          </div>
        </div>
        <div>
          <HmiStatusLight
            v-model="statusLightActive"
            v-bind="statusLightOptions"
            class="w-40px h-40px"
          ></HmiStatusLight>
          <HmiStatusLight
            v-model="statusLightActive"
            v-bind="statusLightOptions"
            class="w-40px h-40px"
            radius="2px"
          ></HmiStatusLight>
        </div>
      </div>
    </HmiCard>

    <HmiCard mt-10px>
      <template #title>输入框</template>

      <HmiInput w-200px h-40px></HmiInput>
    </HmiCard>

    <HmiCard mt-10px>
      <template #title>滑块</template>

      <HmiRange></HmiRange>
    </HmiCard>

    <HmiCard mt-10px>
      <template #title>单选框</template>

      <HmiRadio></HmiRadio>
    </HmiCard>

    <HmiCard mt-10px>
      <template #title>开关</template>
      <HmiSwitch></HmiSwitch>
    </HmiCard>
  </div>
</template>

<style>
html,
body {
  margin: 0;
  padding: 0;
}

.app {
  min-height: 100vh;
  background: linear-gradient(#bfbcbb, #9b9797);
  color: #101010;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}
</style>
