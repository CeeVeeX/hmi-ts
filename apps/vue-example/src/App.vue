<script setup lang="ts">
import ButtonDemo from './examples/ButtonDemo.vue'
import InputDemo from './examples/InputDemo.vue'
import RadioDemo from './examples/RadioDemo.vue'
import RangeDemo from './examples/RangeDemo.vue'
import StatusLightDemo from './examples/StatusLightDemo.vue'
import SwitchDemo from './examples/SwitchDemo.vue'
import ThermometerDemo from './examples/ThermometerDemo.vue'
</script>

<template>
  <div class="app">
    <ButtonDemo />
    <RangeDemo />
    <ThermometerDemo />
    <StatusLightDemo />
    <InputDemo />
    <RadioDemo />
    <SwitchDemo />
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
