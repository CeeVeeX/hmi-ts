<script setup lang="ts">
import { useClick } from '@hmi-ts/vue-use'
import { ref } from 'vue'
defineOptions({
  name: 'HmiRange',
})

withDefaults(
  defineProps<{
    variant?: 'primary' | 'ghost'
    disabled?: boolean
  }>(),
  {
    variant: 'primary',
    disabled: false,
  },
)

const emit = defineEmits<{
  click: [MouseEvent]
}>()
</script>

<template>
  <input type="range" class="neo-slider" />
</template>

<style scoped>
.neo-slider {
  vertical-align: top;

  appearance: none;
  width: 320px;
  height: 12px;
  border-radius: 999px;
  background: #131314;

  /* box-shadow:
    inset 0 2px 4px rgba(255, 255, 255, 0.8),
    inset 0 -2px 4px rgba(0, 0, 0, 0.25),
    0 2px 6px rgba(0, 0, 0, 0.15); */

  cursor: pointer;
}

/* Track (Chrome) */
.neo-slider::-webkit-slider-runnable-track {
  height: 12px;
  border-radius: 999px;
  background: transparent;
}

/* Thumb */
.neo-slider::-webkit-slider-thumb {
  appearance: none;
  margin-top: -10px;

  width: 32px;
  height: 32px;
  border-radius: 50%;

  background-image: linear-gradient(180deg, #eff1f1, #86969c);

  box-shadow:
    0 0 2px rgb(0 0 0),
    0px 5px 8px rgba(0, 0, 0, 0.2),
    inset 0 0 6px rgb(0 0 0 / 55%),
    inset 0 0 4px rgb(0 0 0 / 45%),
    inset 0 0 8px rgb(0 0 0 / 30%);

  transition: 0.2s;
}

.neo-slider::-webkit-slider-thumb:hover {
  /* transform: scale(0.95); */
}

.neo-slider::-webkit-slider-thumb:active {
  transform: scale(1.08);
  box-shadow:
    0 3px 14px rgba(0, 0, 0, 0.5),
    0 8px 8px -2px rgba(0, 0, 0, 0.2),
    0 15px 8px rgba(0, 0, 0, 0.4),
    0 -12px 10px rgba(255, 255, 255, 0.2),
    inset 0 3px 3px rgba(255, 255, 255, 0.6),
    inset 0 -3px 3px rgba(89, 91, 92, 0.6);
}
</style>
