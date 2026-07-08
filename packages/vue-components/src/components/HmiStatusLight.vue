<script setup lang="ts">
import { useClick } from '@hmi-ts/vue-use'
import { ref, watch } from 'vue'
defineOptions({
  name: 'HmiStatusLight',
})

const props = withDefaults(
  defineProps<{
    radius?: string
    activeColor?: string
    inactiveColor?: string
    /**
     * 激活时闪烁
     */
    blink?: boolean
    /**
     * 非激活时闪烁
     */
    blinkInactive?: boolean
  }>(),
  {
    radius: '50%',
    activeColor: '#db1010',
    inactiveColor: '#444444',
    blink: false,
    blinkInactive: false,
  },
)

const modelValue = defineModel<boolean>()

const emit = defineEmits<{
  click: [MouseEvent]
}>()

watch(modelValue, (newValue) => {
  console.log('modelValue changed:', newValue)
})
</script>

<template>
  <div
    class="around"
    :class="{
      active: modelValue,
      blink: props.blink && modelValue,
      blinkInactive: props.blinkInactive && !modelValue,
    }"
    ref="button"
    :style="{
      '--hmi-radius': props.radius,
      '--hmi-active-color': props.activeColor || '#00ff00',
      '--hmi-inactive-color': props.inactiveColor || '#ff0000',
    }"
  >
    <div class="handle">
      <div class="button-wrapper">
        <div class="inside">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes blink-animation {
  0% {
    background-color: var(--hmi-active-color);
    background-image: radial-gradient(#fff, var(--hmi-active-color) 50%);
  }
  50% {
    background-color: var(--hmi-inactive-color);
    background-image: none;
  }
  100% {
    background-color: var(--hmi-active-color);
    background-image: radial-gradient(#fff, var(--hmi-active-color) 50%);
  }
}

.around {
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
      background: linear-gradient(180deg, #2a2a2a, #525252);
      /* background-image: radial-gradient(transparent 30%, rgba(101, 0, 0, 0.7) 70%); */

      cursor: pointer;
      /* 防止触摸屏点击显示元素范围半透明黑色背景 */
      -webkit-tap-highlight-color: transparent;

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
        background: var(--hmi-inactive-color);
        box-shadow:
          0 0 10px rgba(255, 255, 255, 0.5),
          inset 0 8px 10px rgba(0, 0, 0, 0.18),
          inset 0 -2px 2px rgba(255, 255, 255, 0.25);

        transition:
          transform 0.05s ease,
          box-shadow 0.05s ease,
          background 0.05s ease;
      }

      .inside::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border-radius: var(--hmi-radius);
        background-image: linear-gradient(
          to right,
          rgba(0, 0, 0, 0) 50%,
          rgba(255, 255, 255, 0.126) 50%
        );
        background-size: 4px 100%;
      }

      .inside::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border-radius: var(--hmi-radius);
        background-image: linear-gradient(
          to bottom,
          rgba(0, 0, 0, 0) 50%,
          rgba(255, 255, 255, 0.126) 50%
        );
        background-size: 100% 4px;
      }
    }
  }

  &.blink {
    .handle {
      .button-wrapper {
        .inside {
          animation: blink-animation 0.5s infinite;
        }
      }
    }
  }

  &.blinkInactive {
    .handle {
      .button-wrapper {
        .inside {
          animation: blink-animation 0.5s infinite;
        }
      }
    }
  }

  &.active {
    .handle {
      .button-wrapper {
        .inside {
          background-image: radial-gradient(#fff, var(--hmi-active-color) 50%);
        }
      }
    }
  }
}
</style>
