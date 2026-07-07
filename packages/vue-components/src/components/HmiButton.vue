<script setup lang="ts">
import { useClick } from '@hmi-ts/vue-use'
import { computed, ref } from 'vue'
defineOptions({
  name: 'HmiButton',
})

const props = withDefaults(
  defineProps<{
    inside?: boolean
    /**
     * 按钮的圆角大小，默认 10px
     */
    radius?: string
    /**
     * 按钮的光效类型
     * ring: 环形光效
     * inner: 内部光效
     * 默认不显示光效
     */
    light?: 'ring' | 'inner'
    /**
     * 长按触发事件的时间间隔，单位毫秒
     */
    longPress?: number
    /**
     * 连续点击多少次触发事件
     */
    triggerCount?: number
    /**
     * 重置计数器的时间间隔，单位毫秒
     */
    countReset?: number
  }>(),
  {
    radius: '10px',
  },
)

const emit = defineEmits<{
  click: [MouseEvent]
}>()

const button = ref<HTMLButtonElement>()

const b1 = useClick(button)

const longPressProgress = computed(() => {
  if (!props.longPress) {
    return 0
  }

  return Math.max(0, Math.min(1, b1.lasted.value / props.longPress))
})
</script>

<template>
  <div
    class="hmi-button"
    :class="{
      'hmi-button-light': props.light,
      'hmi-button-ring': props.light === 'ring',
      'hmi-button-inner': props.light === 'inner',
      'hmi-button-active': b1.active.value,
      'hmi-button-pressed': b1.pressed.value,
    }"
    :style="{
      '--hmi-radius': props.radius,
    }"
  >
    <div class="hmi-button-handle">
      <div class="hmi-button-button-wrapper" ref="button">
        <div v-if="light" class="hmi-button-light-mesh">
          <slot v-if="!(light === 'ring' || inside)" />
        </div>
        <div v-if="light === 'ring' || inside" class="hmi-button-inside">
          <slot />
        </div>
        <template v-if="!light && !inside">
          <slot />
        </template>
      </div>
    </div>
    <div
      v-if="longPress"
      class="hmi-button-progress"
      :style="{
        '--progress': longPressProgress,
        '--progress-color':
          longPressProgress >= 1 ? 'rgba(44, 195, 98, 0.95)' : 'rgba(0, 195, 255, 0.95)',
      }"
    />
  </div>
</template>

<style scoped>
.hmi-button {
  --hmi-radius: 10px;
  position: relative;
  vertical-align: top;
  box-sizing: border-box;
  padding: 2px;
  display: inline-flex;
  justify-content: center;
  align-items: center;

  .hmi-button-progress {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    padding: 5px;
    border-radius: var(--hmi-radius);
    pointer-events: none;
    background: conic-gradient(
      from 180deg,
      var(--progress-color, rgba(0, 195, 255, 0.95)) calc(var(--progress, 0) * 1turn),
      transparent 0
    );
    -webkit-mask:
      linear-gradient(#000 0 0) content-box,
      linear-gradient(#000 0 0);
    mask:
      linear-gradient(#000 0 0) content-box,
      linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    transition: background 0.1s linear;
  }

  .hmi-button-handle {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    padding: 4px;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: var(--hmi-radius);
    background: #9b9797;
    perspective: 300px;
    box-shadow:
      0 0 10px rgba(0, 0, 0, 0.5),
      0 10px 10px rgba(0, 0, 0, 0.2),
      inset 0 0 16px rgba(0, 0, 0, 0.85),
      inset 0 0 24px rgba(0, 0, 0, 0.75),
      inset 0 0 48px rgba(0, 0, 0, 0.2);

    .hmi-button-button-wrapper {
      position: relative;
      box-sizing: border-box;
      width: 100%;
      height: 100%;
      padding: 2px;
      display: grid;
      place-items: center;
      border-radius: var(--hmi-radius);
      background-image: linear-gradient(#fcf9f6, #e2d8d7);
      cursor: pointer;
      /* 防止触摸屏点击显示元素范围半透明黑色背景 */
      -webkit-tap-highlight-color: transparent;

      box-shadow:
        0 9px 14px rgba(0, 0, 0, 0.5),
        0 19px 8px -2px rgba(0, 0, 0, 0.2),
        0 33px 8px rgba(0, 0, 0, 0.4),
        0 -12px 10px rgba(255, 255, 255, 0.2),
        inset 0 3px 3px rgba(255, 255, 255, 0.6),
        inset 0 -3px 3px rgba(89, 91, 92, 0.6);

      transition:
        transform 0.15s ease,
        box-shadow 0.15s ease,
        background 0.15s ease;

      /*  */
      .hmi-button-light-mesh {
        box-sizing: border-box;
        width: 100%;
        height: 100%;
        grid-area: 1 / 1;
        z-index: 0;
        display: flex;
        justify-content: center;
        align-items: center;

        padding: 4px;
        position: relative;
        border-radius: var(--hmi-radius);
        background: #aaaaaa;

        box-shadow:
          inset 0 0px 10px #00000029,
          inset 0 -4px 2px #ffffff40;

        transition:
          transform 0.15s ease,
          box-shadow 0.15s ease,
          background 0.15s ease;
      }

      .hmi-button-inside {
        grid-area: 1 / 1;
        z-index: 1;
        border-radius: var(--hmi-radius);
        padding: 4px;
        box-sizing: border-box;
        display: flex;
        justify-content: center;
        align-items: center;
        background-image: linear-gradient(#e8e4e1, #d1c8c7);
        box-shadow:
          0 0 2px #000,
          inset 0px 5px 10px #0000003d,
          inset 0 -5px 10px #ffffff;
        position: relative;
        margin: 8px;
        flex: 1;
        justify-self: stretch;
        align-self: stretch;
        min-width: max-content;
        min-height: max-content;
      }
    }
  }

  &.hmi-button-light {
    &.hmi-button-active {
      .hmi-button-handle {
        .hmi-button-button-wrapper {
          .hmi-button-light-mesh {
            background-image: radial-gradient(#a4e4ff, #00b3ff 80%);

            box-shadow:
              0 0 10px #00b3ff,
              inset 0 0px 2px #000000,
              inset 0 -4px 2px #ffffff40;
          }
        }
      }
    }

    .hmi-button-handle {
      .hmi-button-button-wrapper {
        /* ----------------------------------------------------------------------------网格 */
        .hmi-button-light-mesh::after,
        .hmi-button-light-mesh::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border-radius: var(--hmi-radius);
        }

        .hmi-button-light-mesh::after {
          background-image: linear-gradient(
            to right,
            rgba(0, 0, 0, 0) 50%,
            rgba(255, 255, 255, 0.126) 50%
          );
          background-size: 4px 100%;
        }

        .hmi-button-light-mesh::before {
          background-image: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0) 50%,
            rgba(255, 255, 255, 0.126) 50%
          );
          background-size: 100% 4px;
        }
        /* ----------------------------------------------------------------------------网格 */
      }
    }
  }

  &.hmi-button-active {
    .hmi-button-handle {
      .hmi-button-button-wrapper {
        transform: scale(0.95);

        filter: brightness(0.97);
      }
    }
  }

  &.hmi-button-pressed {
    .hmi-button-handle {
      .hmi-button-button-wrapper {
        transform: scale(0.9);
        filter: brightness(0.97);
      }
    }
  }

  &.hmi-button-active,
  &.hmi-button-pressed {
    .hmi-button-handle {
      .hmi-button-button-wrapper {
        box-shadow:
          0px 0px 14px rgba(0, 0, 0, 0.5),
          0px 0px 8px -2px rgba(0, 0, 0, 0.2),
          0px 0px 8px rgba(0, 0, 0, 0.4),
          0px 0px 10px rgba(255, 255, 255, 0.5),
          inset 0px 3px 3px rgba(255, 255, 255, 0.6),
          inset 0 -3px 3px rgba(89, 91, 92, 0.6);

        box-shadow:
          inset 0 2px 4px #000000a3,
          inset 0px -4px 2px #ffffff80;
      }

      box-shadow:
        0px 0px 8px rgba(0, 0, 0, 0.2),
        inset 0 0 16px rgb(0 0 0 / 85%),
        inset 0 0 24px rgb(0 0 0 / 75%),
        inset 0 0 48px rgb(0 0 0 / 60%);
    }
  }
}
</style>
