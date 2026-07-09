<script setup lang="ts">
import { HmiCardPanel, HmiInput } from '@hmi-ts/vue-components'
</script>

<template>
  <HmiCardPanel mt-10px>
    <template #title>输入框</template>
    <HmiInput w-200px h-40px />
  </HmiCardPanel>
</template>
