<script setup lang="ts">
import ButtonDemo from './examples/ButtonDemo.vue'
import InputDemo from './examples/InputDemo.vue'
import RadioDemo from './examples/RadioDemo.vue'
import RangeDemo from './examples/RangeDemo.vue'
import StatusLightDemo from './examples/StatusLightDemo.vue'
import SwitchDemo from './examples/SwitchDemo.vue'
import ThermometerDemo from './examples/ThermometerDemo.vue'
import KeyboardDemo from './examples/KeyboardDemo.vue'
</script>

<template>
  <div class="app">
    <KeyboardDemo></KeyboardDemo>
    <ButtonDemo mt-10px />
    <RangeDemo mt-10px />
    <ThermometerDemo mt-10px />
    <StatusLightDemo mt-10px />
    <InputDemo mt-10px />
    <RadioDemo mt-10px />
    <SwitchDemo mt-10px />
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
  padding: 20px;
}
</style>
