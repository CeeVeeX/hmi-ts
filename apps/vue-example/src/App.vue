<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, type Ref } from 'vue'
import { HmiButton, HmiStatusLight, HmiInput, HmiRange, HmiRadio } from '@hmi-ts/vue-components'
</script>

<template>
  <div class="app">
    <HmiButton v-for="value in 10" class="w-100px h-100px"> {{ value }} </HmiButton>
    <HmiStatusLight v-for="value in 10" class="w-40px h-40px"></HmiStatusLight>
    <HmiInput w-200px h-40px></HmiInput>
    <HmiRange></HmiRange>
    <HmiRadio></HmiRadio>
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
