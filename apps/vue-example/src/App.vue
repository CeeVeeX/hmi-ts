<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, type Ref } from 'vue'
import {
  HmiButton,
  HmiStatusLight,
  HmiInput,
  HmiRange,
  HmiRadio,
  HmiSwitch,
} from '@hmi-ts/vue-components'
</script>

<template>
  <div class="app">
    <div>
      <HmiButton class=""> 按钮 </HmiButton>
      <HmiButton class="" inside> 按钮 </HmiButton>
      <HmiButton class="" light="inner"> 按钮 </HmiButton>
      <HmiButton class="" light="ring"> 按钮 </HmiButton>
    </div>
    <div>
      <HmiButton class="w-150px h-150px" radius="50%"> 圆形按钮 </HmiButton>
      <HmiButton class="w-150px h-150px" radius="50%" inside> 圆形按钮 </HmiButton>
      <HmiButton class="w-150px h-150px" radius="50%" light="inner"> 圆形按钮 </HmiButton>
      <HmiButton class="w-150px h-150px" radius="50%" light="ring"> 圆形按钮 </HmiButton>
    </div>

    <div>
      <HmiButton class="" :longPress="2000"> 按钮 </HmiButton>
      <HmiButton class="" :longPress="2000" inside> 按钮 </HmiButton>
      <HmiButton class="" :longPress="2000" light="inner"> 按钮 </HmiButton>
      <HmiButton class="" :longPress="2000" light="ring"> 按钮 </HmiButton>
    </div>
    <div>
      <HmiButton class="w-150px h-150px" :longPress="2000" radius="50%"> 圆形按钮 </HmiButton>
      <HmiButton class="w-150px h-150px" :longPress="2000" radius="50%" inside>
        圆形按钮
      </HmiButton>
      <HmiButton class="w-150px h-150px" :longPress="2000" radius="50%" light="inner">
        圆形按钮
      </HmiButton>
      <HmiButton class="w-150px h-150px" :longPress="2000" radius="50%" light="ring">
        圆形按钮
      </HmiButton>
    </div>
    <HmiStatusLight class="w-40px h-40px"></HmiStatusLight>
    <HmiStatusLight class="w-40px h-40px" radius="2px"></HmiStatusLight>
    <HmiInput w-200px h-40px></HmiInput>
    <HmiRange></HmiRange>
    <HmiRadio></HmiRadio>
    <HmiSwitch></HmiSwitch>
  </div>
</template>

<style>
html,
body {
  margin: 0;
  padding: 0;
}

.app {
  min-height: 100vh;
  background: linear-gradient(#bfbcbb, #9b9797);
  color: #101010;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}
</style>
