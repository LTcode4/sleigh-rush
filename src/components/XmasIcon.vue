<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <span class="xmas-icon" v-html="svg" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { IconName, iconSvg } from 'src/game/icons';

const props = defineProps<{ name: IconName; coarse?: boolean; fat?: boolean }>();
const svg = computed(() => iconSvg(props.name, '', props.coarse, props.fat));
</script>

<style scoped>
.xmas-icon {
  display: block;
}
.xmas-icon :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}
</style>
