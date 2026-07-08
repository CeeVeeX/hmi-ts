<script setup lang="ts">
import { useClick } from '@hmi-ts/vue-use'
import { ref } from 'vue'
defineOptions({
  name: 'HmiInput',
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
  <input type="text" class="hmi-input" placeholder="input" />
</template>

<style scoped>
.hmi-input {
  box-sizing: border-box;
  /* background: #f5f8fa36; */
  background: #f5f8fa00;
  border: 2px solid #ebebeb;
  color: #ccc;

  padding: 4px;
}

/* 聚焦样式 */
.hmi-input:focus {
  outline: none;
  border-color: #fff;
  color: #fff;
  /* box-shadow: 0 0 5px #00b3ff; */
}

/* 占位符样式 */
.hmi-input::placeholder {
  color: #ebebeb;
}
</style>
