<template>
  <svg class="dot-shape" viewBox="0 0 100 100" aria-hidden="true">
    <circle
      v-for="(d, i) in dots"
      :key="i"
      :cx="d.x"
      :cy="d.y"
      :r="d.r"
      :fill="d.c"
      class="dot"
      :style="{ animationDelay: `${delay + d.t}s` }" />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { DotPart, DotTone } from 'src/game/milestones';

const props = withDefaults(defineProps<{ parts: DotPart[]; step?: number; delay?: number }>(), {
  step: 2.6,
  delay: 0,
});

const TONES: Record<Exclude<DotTone, 'hole'>, string> = {
  white: 'var(--c-white)',
  green: 'var(--c-green)',
  red: 'var(--c-red)',
  gold: '#ffd36b',
};

interface Dot {
  x: number;
  y: number;
  r: number;
  c: string;
  t: number;
}

const ctx = document.createElement('canvas').getContext('2d') as CanvasRenderingContext2D;

const dots = computed<Dot[]>(() => {
  const S = props.step;
  const paths = props.parts.map((p) => ({ ...p, path: new Path2D(p.d) }));
  const hit = (x: number, y: number) => {
    for (let i = paths.length - 1; i >= 0; i -= 1) {
      const p = paths[i];
      if (ctx.isPointInPath(p.path, x, y, p.rule ?? 'nonzero')) return i;
    }
    return -1;
  };
  const out: Dot[] = [];
  const near = [0, 1, 2, 3, 4, 5].map((k) => [
    Math.cos((k * Math.PI) / 3) * S,
    Math.sin((k * Math.PI) / 3) * S,
  ]);
  for (let row = 0, y = S / 2; y < 100; row += 1, y += S * 0.866) {
    for (let x = S / 2 + (row % 2) * (S / 2); x < 100; x += S) {
      const i = hit(x, y);
      const tone = i < 0 ? 'hole' : paths[i].tone;
      if (tone !== 'hole') {
        const same = near.filter(([dx, dy]) => hit(x + dx, y + dy) === i).length / near.length;
        out.push({
          x: +x.toFixed(2),
          y: +y.toFixed(2),
          r: +(S * 0.46 * (0.55 + 0.45 * same)).toFixed(2),
          c: TONES[tone],
          t: +((100 - y) * 0.012 + Math.random() * 0.25).toFixed(2),
        });
      }
    }
  }
  return out;
});
</script>

<style scoped>
.dot-shape {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}
.dot {
  animation: dot-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  transform-box: fill-box;
  transform-origin: center;
}
@keyframes dot-in {
  from {
    opacity: 0;
    transform: scale(0);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
