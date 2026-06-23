<script setup lang="ts">
defineOptions({
  name: 'HmiButton',
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

function onClick(event: MouseEvent) {
  emit('click', event)
}
</script>

<template>
  <button
    class="hmi-button"
    :class="`hmi-button--${variant}`"
    :disabled="disabled"
    type="button"
    @click="onClick"
  >
    11123123123
    <slot />
  </button>
</template>

<style scoped>
.hmi-button {
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 10px 14px;
}

.hmi-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.hmi-button--primary {
  background-color: #0f766e;
  color: #ffffff;
}

.hmi-button--primary:hover:not(:disabled) {
  background-color: #115e59;
}

.hmi-button--ghost {
  background-color: transparent;
  color: #0f766e;
  border: 1px solid #0f766e;
}

.hmi-button--ghost:hover:not(:disabled) {
  background-color: rgba(15, 118, 110, 0.08);
}
</style>
