<script setup lang="ts">
import { useClick } from '@hmi-ts/vue-use'
import { ref } from 'vue'
defineOptions({
  name: 'HmiStatusLight',
})

const props = withDefaults(
  defineProps<{
    radius?: string
  }>(),
  {
    radius: '50%',
  },
)


const emit = defineEmits<{
  click: [MouseEvent]
}>()

const active = ref(true)
</script>

<template>
  <div class="around" ref="button" :style="{
    '--hmi-radius': props.radius,
  }"">
    <div class="handle" :class="{ pressed: active }">
      <div class="button-wrapper" :class="{ pressed: active }">
        <div class="inside">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.around {
  --hmi-radius: 50%;

  vertical-align: top;
  box-sizing: border-box;

  padding: 5px;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  /* background: #f5f8fa36; */

  .handle {
    width: 100%;
    height: 100%;
    box-sizing: border-box;

    padding: 2px;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: var(--hmi-radius);
    background: #c5d1da;
    box-shadow:
      0 0 5px rgb(0 0 0),
      0px 0px 8px rgba(0, 0, 0, 0.2),
      inset 0 0 16px rgb(0 0 0 / 85%),
      inset 0 0 24px rgb(0 0 0 / 75%),
      inset 0 0 48px rgb(0 0 0 / 60%);

    perspective: 300px;

    .button-wrapper {
      box-sizing: border-box;

      width: 100%;
      height: 100%;
      padding: 2px;
      display: flex;
      justify-content: center;
      align-items: center;
      border-radius: var(--hmi-radius);
      background-image: linear-gradient(180deg, #2a2a2a, #525252);
      /* background-image: radial-gradient(transparent 30%, rgba(101, 0, 0, 0.7) 70%); */

      cursor: pointer;

      box-shadow:
        -1px 5px 14px #00000080,
        0px 5px 8px -2px #0003,
        0 0 8px #0006,
        0 0 10px #ffffff80,
        inset 0 3px 3px #fff9,
        inset 0 -3px 3px #595b5c99;

      transition:
        transform 0.05s ease,
        box-shadow 0.05s ease,
        filter 0.05s ease;

      .inside {
        box-sizing: border-box;
        width: 100%;
        height: 100%;

        display: flex;
        justify-content: center;
        align-items: center;

        padding: 4px;
        position: relative;
        border-radius: var(--hmi-radius);
        background-image: linear-gradient(#2a2a2a, #525252);

        box-shadow:
          0 0 10px rgba(255, 255, 255, 0.5),
          inset 0 8px 10px rgba(0, 0, 0, 0.18),
          inset 0 -2px 2px rgba(255, 255, 255, 0.25);

        transition:
          transform 0.05s ease,
          box-shadow 0.05s ease,
          background 0.05s ease;
      }

      &.pressed {
        .inside {
          background-image: radial-gradient(#fff, #ff1818 50%);
        }
      }
    }

    &.pressed {

    }
  }
}
</style>
