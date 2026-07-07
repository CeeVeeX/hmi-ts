<script setup lang="ts">
import { useClick } from '@hmi-ts/vue-use'
import { ref } from 'vue'
defineOptions({
  name: 'HmiButton',
})

const props = withDefaults(
  defineProps<{
    radius?: string
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
</script>

<template>
  <div
    class="around"
    ref="button"
    :style="{
      '--hmi-radius': props.radius,
    }"
  >
    <div class="handle" :class="{ pressed: b1.down.value }">
      <div class="button-wrapper" :class="{ pressed: b1.down.value }">
        <div class="inside">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.around {
  --hmi-radius: 10px;

  vertical-align: top;
  box-sizing: border-box;

  padding: 20px;
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
      0 0 10px rgba(0, 0, 0, 0.5),
      0 10px 10px rgba(0, 0, 0, 0.2),
      inset 0 0 16px rgba(0, 0, 0, 0.85),
      inset 0 0 24px rgba(0, 0, 0, 0.75),
      inset 0 0 48px rgba(0, 0, 0, 0.2);

    perspective: 300px;

    .button-wrapper {
      box-sizing: border-box;

      width: 100%;
      height: 100%;
      padding: 4px;
      display: flex;
      justify-content: center;
      align-items: center;
      border-radius: var(--hmi-radius);
      background-image: linear-gradient(180deg, #eff1f1, #86969c);

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
        background-image: linear-gradient(180deg, #adb9bf, #d4dbdd);
        /* background: linear-gradient(rgba(0, 0, 0, 0) 50%, rgb(0, 0, 0) 50%);
        background-size: 100% 4px; */

        box-shadow:
          inset 0 3px 6px rgba(152, 160, 163, 0.4),
          inset 0 -3px 6px rgba(238, 244, 246, 0.4);

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

      &.pressed {
        transform: scale(0.985);

        filter: brightness(0.97);

        box-shadow:
          0px 0px 14px rgba(0, 0, 0, 0.5),
          0px 0px 8px -2px rgba(0, 0, 0, 0.2),
          0px 0px 8px rgba(0, 0, 0, 0.4),
          0px 0px 10px rgba(255, 255, 255, 0.5),
          inset 0px 3px 3px rgba(255, 255, 255, 0.6),
          inset 0 -3px 3px rgba(89, 91, 92, 0.6);

        .inside {
          /* background-image: linear-gradient(180deg, #0887be, #0d9dda); */
          background-image: radial-gradient(#a4e4ff, #00b3ff 80%);

          box-shadow:
            inset 0 8px 10px rgba(0, 0, 0, 0.18),
            inset 0 -2px 2px rgba(255, 255, 255, 0.25);
        }
      }
    }

    &.pressed {
      box-shadow:
        0 0 5px rgb(0 0 0),
        0px 0px 8px rgba(0, 0, 0, 0.2),
        inset 0 0 16px rgb(0 0 0 / 85%),
        inset 0 0 24px rgb(0 0 0 / 75%),
        inset 0 0 48px rgb(0 0 0 / 60%);
    }
  }
}
</style>
