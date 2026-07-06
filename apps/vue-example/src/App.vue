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
    <HmiButton class="w-150px h-150px"> 按钮 </HmiButton>
    <HmiButton class="w-150px h-150px" radius="50%"> 圆形按钮 </HmiButton>
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
  background: #61686b;
  color: #333;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}
</style>
