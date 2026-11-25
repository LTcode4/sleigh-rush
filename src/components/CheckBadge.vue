<template>
  <svg class="check-badge" viewBox="0 0 40 40" aria-hidden="true">
    <circle cx="20" cy="20" r="19" fill="var(--c-black)" />
    <circle
      v-for="(d, i) in DOTS"
      :key="i"
      :cx="d.x"
      :cy="d.y"
      :r="d.r"
      :fill="d.check ? color : 'var(--c-white)'" />
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ color?: string }>(), { color: 'var(--c-green)' });

interface Dot {
  x: number;
  y: number;
  r: number;
  check: boolean;
}

const STEP = 3;
const CX = 20;
const CY = 20;
const R = 16.5;
const CHECK: [number, number][] = [
  [11.5, 20.5],
  [17.5, 26.5],
  [28.5, 13.5],
];
const CHECK_W = 3.4;

const LIGHT = (() => {
  const v = [-0.5, -0.65, 0.72];
  const l = Math.hypot(v[0], v[1], v[2]);
  return v.map((c) => c / l);
})();

function checkDist(x: number, y: number) {
  let best = Infinity;
  for (let i = 1; i < CHECK.length; i += 1) {
    const [ax, ay] = CHECK[i - 1];
    const [bx, by] = CHECK[i];
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
    best = Math.min(best, Math.hypot(x - ax - t * dx, y - ay - t * dy));
  }
  return best;
}

const DOTS: Dot[] = [];
for (let row = 0, y = STEP / 2; y < 40; row += 1, y += STEP) {
  for (let x = STEP / 2 + (row % 2) * (STEP / 2); x < 40; x += STEP) {
    const nx = (x - CX) / R;
    const ny = (y - CY) / R;
    const n2 = nx * nx + ny * ny;
    if (n2 < 1) {
      const nz = Math.sqrt(1 - n2);
      const shade = Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);
      const d = checkDist(x, y);
      const check = d < CHECK_W;
      if (check || d > CHECK_W + 1.6) {
        const r = check ? STEP * 0.5 : STEP * 0.5 * (0.25 + 0.7 * shade);
        DOTS.push({ x: +x.toFixed(2), y: +y.toFixed(2), r: +r.toFixed(2), check });
      }
    }
  }
}
</script>

<style scoped>
.check-badge {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
