<template>
  <svg class="dotted-moon" viewBox="0 0 100 100" aria-hidden="true">
    <circle v-for="(d, i) in DOTS" :key="i" :cx="d.x" :cy="d.y" :r="d.r" :fill="color" />
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ color?: string }>(), { color: 'var(--c-white)' });

interface Dot {
  x: number;
  y: number;
  r: number;
}

const STEP = 3.2;
const R = 49;
const LIGHT = (() => {
  const v = [-0.45, -0.55, 0.7];
  const l = Math.hypot(v[0], v[1], v[2]);
  return v.map((c) => c / l);
})();
const CRATERS: [number, number, number][] = [
  [32, 36, 10],
  [66, 62, 8],
  [58, 28, 5],
  [36, 70, 6],
];

const DOTS: Dot[] = [];
for (let row = 0, y = STEP / 2; y < 100; row += 1, y += STEP) {
  for (let x = STEP / 2 + (row % 2) * (STEP / 2); x < 100; x += STEP) {
    const nx = (x - 50) / R;
    const ny = (y - 50) / R;
    const n2 = nx * nx + ny * ny;
    if (n2 < 1) {
      const nz = Math.sqrt(1 - n2);
      let shade = Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);
      CRATERS.forEach(([cx, cy, cr]) => {
        const d = Math.hypot(x - cx, y - cy) / cr;
        if (d < 1) shade *= 0.45 + 0.55 * d * d;
      });
      const edge = Math.min(1, (1 - Math.sqrt(n2)) * 12);
      const r = STEP * 0.5 * (0.32 + 0.68 * shade) * (0.6 + 0.4 * edge);
      DOTS.push({ x: +x.toFixed(2), y: +y.toFixed(2), r: +Math.max(0.3, r).toFixed(2) });
    }
  }
}
</script>

<style scoped>
.dotted-moon {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}
</style>
