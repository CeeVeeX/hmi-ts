<script lang="ts" setup>
defineOptions({
  name: 'HmiCard',
})

const props = withDefaults(
  defineProps<{
    title?: string
    theme?: 'auto' | 'light' | 'dark'
  }>(),
  {
    theme: 'auto',
  },
)
</script>

<template>
  <div class="container" :class="`theme-${props.theme}`">
    <slot></slot>
  </div>
</template>
<style scoped>
.container {
  --case-top: #676c73;
  --case-bot: #2b2f35;
  --lcd-bg: #626262;
  --lcd-ink: #ffffff;
  --lcd-line: #0000000f;

  position: relative;
  padding: 10px;
  background: var(--lcd-bg);
  border-radius: 9px;
  overflow: hidden;
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 0.5),
    inset 0 -2px 0 rgba(0, 0, 0, 0.12),
    0 0 0 2px #101010;

  color: var(--lcd-ink);
}

@media (prefers-color-scheme: dark) {
  .container.theme-auto {
    --case-top: #676c73;
    --case-bot: #2b2f35;
    --lcd-bg: #ababab;
    --lcd-ink: #30353c;
    --lcd-line: rgba(0, 0, 0, 0.06);
  }
}

.container.theme-dark {
  --case-top: #676c73;
  --case-bot: #2b2f35;
  --lcd-bg: #ababab;
  --lcd-ink: #30353c;
  --lcd-line: rgba(0, 0, 0, 0.06);
}

.container::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    repeating-linear-gradient(0deg, transparent 0 1px, var(--lcd-line) 1px 4px),
    repeating-linear-gradient(90deg, transparent 0 1px, var(--lcd-line) 1px 4px);
  pointer-events: none;
}
</style>
