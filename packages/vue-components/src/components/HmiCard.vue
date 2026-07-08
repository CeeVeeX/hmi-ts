<script lang="ts" setup>
defineOptions({
  name: 'HmiCard',
})

const props = withDefaults(
  defineProps<{
    title?: string
  }>(),
  {},
)
</script>

<template>
  <div class="container">
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
  --wood-base: #3e2723;
  --wood-grain: #281510;
  --metal-face: #d8d8d8;
  --metal-shadow: #999;
  --glass-coating: rgba(200, 220, 255, 0.1);
  --filament-off: #4a3b3b;
  --filament-on: #ff8800;
  --glow-color: rgba(255, 160, 50, 0.6);
  --jewel-off: #400;
  --jewel-on: #ff0000;
  /* width: 380px;
  height: 500px; */
  position: relative;
  display: flex;
  flex-direction: column;
  box-shadow:
    0 5px 10px rgba(0, 0, 0, 0.9),
    0 1px 2px rgba(0, 0, 0, 0.8);
  transform-style: preserve-3d;
  perspective: 1000px;
}

/* --- 拉丝金属面板 --- */
.faceplate {
  flex-grow: 1;
  background: linear-gradient(180deg, #e0e0e0 0%, #b0b0b0 100%);
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
    rgba(0, 0, 0, 0.05) 2px
  );
  pointer-events: none;
}

/* 螺丝 */
.bolt {
  position: absolute;
  width: 12px;
  height: 12px;
  background: radial-gradient(circle, #eee, #888);
  border-radius: 50%;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  border: 1px solid #777;
}
.bolt::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 15%;
  width: 70%;
  height: 1px;
  background: #444;
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
  color: #333;
  letter-spacing: 4px;
  text-transform: uppercase;
  text-shadow: 0 1px 0 #fff;
}
</style>
