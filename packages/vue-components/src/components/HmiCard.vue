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
    <div class="faceplate">
      <div class="bolt tl"></div>
      <div class="bolt tr"></div>
      <div class="bolt bl"></div>
      <div class="bolt br"></div>
      <div class="title">
        <slot name="title">{{ title }}</slot>
      </div>
      <div class="meters-wrapper">
        <slot></slot>
      </div>
    </div>
  </div>
</template>
<style scoped>
.container {
  --card-shadow-1: rgba(0, 0, 0, 0.9);
  --card-shadow-2: rgba(0, 0, 0, 0.8);
  --faceplate-bg-start: #e0e0e0;
  --faceplate-bg-end: #b0b0b0;
  --faceplate-brush-line: rgba(0, 0, 0, 0.05);
  --bolt-gradient-start: #eee;
  --bolt-gradient-end: #888;
  --bolt-border: #777;
  --bolt-slot: #444;
  --title-color: #333;
  --title-shadow: #fff;

  position: relative;
  display: flex;
  flex-direction: column;
  box-shadow:
    0 5px 10px var(--card-shadow-1),
    0 1px 2px var(--card-shadow-2);
  transform-style: preserve-3d;
  perspective: 1000px;
}

@media (prefers-color-scheme: dark) {
  .container.theme-auto {
    --card-shadow-1: rgba(0, 0, 0, 0.75);
    --card-shadow-2: rgba(0, 0, 0, 0.65);
    --faceplate-bg-start: #50545a;
    --faceplate-bg-end: #2f343b;
    --faceplate-brush-line: rgba(255, 255, 255, 0.06);
    --bolt-gradient-start: #a9afb8;
    --bolt-gradient-end: #5a616d;
    --bolt-border: #3f4652;
    --bolt-slot: #d6dbe3;
    --title-color: #e2e7f0;
    --title-shadow: #1f242d;
  }
}

.container.theme-dark {
  --card-shadow-1: rgba(0, 0, 0, 0.75);
  --card-shadow-2: rgba(0, 0, 0, 0.65);
  --faceplate-bg-start: #50545a;
  --faceplate-bg-end: #2f343b;
  --faceplate-brush-line: rgba(255, 255, 255, 0.06);
  --bolt-gradient-start: #a9afb8;
  --bolt-gradient-end: #5a616d;
  --bolt-border: #3f4652;
  --bolt-slot: #d6dbe3;
  --title-color: #e2e7f0;
  --title-shadow: #1f242d;
}

/* --- 拉丝金属面板 --- */
.faceplate {
  flex-grow: 1;
  background: linear-gradient(180deg, var(--faceplate-bg-start) 0%, var(--faceplate-bg-end) 100%);
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  padding: 40px;
  /* box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.8),
    0 -2px 10px rgba(0, 0, 0, 0.5); */
}
/* 拉丝纹理 */
.faceplate::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: repeating-linear-gradient(
    90deg,
    transparent 0,
    transparent 1px,
    var(--faceplate-brush-line) 2px
  );
  pointer-events: none;
}

/* 螺丝 */
.bolt {
  position: absolute;
  width: 12px;
  height: 12px;
  background: radial-gradient(circle, var(--bolt-gradient-start), var(--bolt-gradient-end));
  border-radius: 50%;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  border: 1px solid var(--bolt-border);
}
.bolt::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 15%;
  width: 70%;
  height: 1px;
  background: var(--bolt-slot);
}
.tl {
  top: 10px;
  left: 10px;
  transform: rotate(44deg);
}
.tr {
  top: 10px;
  right: 10px;
  transform: rotate(34deg);
}
.bl {
  bottom: 10px;
  left: 10px;
  transform: rotate(24deg);
}
.br {
  bottom: 10px;
  right: 10px;
  transform: rotate(60deg);
}

/* --- METERS --- */
.meters-wrapper {
  position: relative;
}

.title {
  text-align: center;
  margin-top: auto;
  padding-bottom: 10px;
  font-size: 1.2rem;
  color: var(--title-color);
  letter-spacing: 4px;
  text-transform: uppercase;
  text-shadow: 0 1px 0 var(--title-shadow);
}
</style>
