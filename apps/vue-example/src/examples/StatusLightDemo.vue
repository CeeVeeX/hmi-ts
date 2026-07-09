<script setup lang="ts">
import { HmiCardPanel, HmiStatusLight, HmiCardScreen } from '@hmi-ts/vue-components'
import { useLocalStorage } from '@vueuse/core'

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
  <HmiCardPanel mt-10px>
    <template #title>指示灯</template>

    <div flex justify-between>
      <HmiCardScreen>
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
      </HmiCardScreen>

      <div>
        <HmiStatusLight
          v-model="statusLightActive"
          v-bind="statusLightOptions"
          class="w-40px h-40px"
        />
        <HmiStatusLight
          v-model="statusLightActive"
          v-bind="statusLightOptions"
          class="w-40px h-40px"
          radius="2px"
        />
      </div>
    </div>
  </HmiCardPanel>
</template>
