<template>
  <div class="snowfall pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
    <span
      v-for="(f, i) in flakes"
      :key="i"
      class="flake"
      :style="{
        left: f.left,
        width: f.size,
        height: f.size,
        opacity: f.opacity,
        filter: f.blur,
        animationDuration: `${f.dur}s, ${f.sway}s`,
        animationDelay: `${f.delay}s, ${f.delay}s`,
      }" />
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{ count?: number }>(), { count: 28 });

const flakes = Array.from({ length: props.count }, (_, i) => {
  const depth = (i * 7) % 3;
  return {
    left: `${(i * 37 + 11) % 100}%`,
    size: `${3 + depth * 2.5}px`,
    opacity: 0.35 + depth * 0.2,
    blur: depth === 2 ? 'blur(1px)' : 'none',
    dur: 16 - depth * 3 + (i % 4),
    sway: 3 + (i % 3),
    delay: -((i * 1.9) % 16),
  };
});
</script>

<style scoped>
.flake {
  position: absolute;
  top: -4%;
  border-radius: 50%;
  background: var(--c-white);
  animation-name: snow-fall, snow-sway;
  animation-timing-function: linear, ease-in-out;
  animation-iteration-count: infinite;
  animation-direction: normal, alternate;
}
@keyframes snow-fall {
  to {
    top: 104%;
  }
}
@keyframes snow-sway {
  from {
    transform: translateX(-0.6rem);
  }
  to {
    transform: translateX(0.6rem);
  }
}
</style>
