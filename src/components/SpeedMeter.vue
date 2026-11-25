<template>
  <div class="speed-meter flex flex-col items-end" aria-live="off">
    <svg
      v-if="show !== 'speed'"
      class="distance"
      :viewBox="`0 0 ${distW} 40`"
      :style="{ width: `${distW / 16}rem` }"
      :aria-label="`行駛距離 ${distance} 公尺`">
      <text class="d-shadow" :x="distW / 2" y="33">
        {{ distanceText }}
        <tspan class="unit" dx="2">m</tspan>
      </text>
      <text class="d-main" :x="distW / 2" y="29">
        {{ distanceText }}
        <tspan class="unit" dx="2">m</tspan>
      </text>
    </svg>

    <svg
      v-if="show !== 'distance'"
      class="gauge"
      viewBox="0 0 80 46"
      :aria-label="`時速 ${speed} 公里`">
      <path d="M4 42A36 36 0 0 1 76 42Z" class="g-face" />
      <circle
        v-for="(d, i) in GAUGE"
        :key="i"
        :cx="d.x"
        :cy="d.y"
        :r="i < lit ? d.r : 0.75"
        :fill="i < lit ? d.c : 'var(--c-white-20)'" />
      <text class="g-num" x="40" y="38">{{ speed }}</text>
      <text class="g-unit" x="40" y="45">km/h</text>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ distance: number; speed: number; show?: 'distance' | 'speed' }>();

const MAX_KMH = 120;

const distanceText = computed(() => props.distance.toLocaleString());
const distW = computed(() => 24 + distanceText.value.length * 17);

interface GaugeDot {
  x: number;
  y: number;
  r: number;
  c: string;
}

const GAUGE: GaugeDot[] = (() => {
  const dots: GaugeDot[] = [];
  const n = 15;
  [
    { radius: 33, size: 1 },
    { radius: 27.5, size: 0.8 },
  ].forEach(({ radius, size }) => {
    for (let i = 0; i < n; i += 1) {
      const t = i / (n - 1);
      const a = Math.PI * (1 - t);
      const c = t < 0.55 ? '#ffffff' : t < 0.8 ? '#f59a96' : '#e8413c';
      dots.push({
        x: +(40 + Math.cos(a) * radius).toFixed(2),
        y: +(42 - Math.sin(a) * radius).toFixed(2),
        r: +((1.3 + 1.1 * t) * size).toFixed(2),
        c,
      });
    }
  });
  return dots.sort((p, q) => Math.atan2(42 - q.y, q.x - 40) - Math.atan2(42 - p.y, p.x - 40));
})();

const lit = computed(() =>
  Math.round(Math.max(0, Math.min(1, props.speed / MAX_KMH)) * GAUGE.length),
);
</script>

<style scoped>
.distance {
  display: block;
  height: 2.5rem;
  overflow: visible;
}
.distance text {
  font-family: 'Fredoka', 'Noto Sans TC', sans-serif;
  font-size: 34px;
  font-weight: 700;
  text-anchor: middle;
  stroke-linejoin: round;
  paint-order: stroke;
}
.distance .unit {
  font-size: 20px;
}
.d-main {
  fill: var(--c-white);
  stroke: var(--c-red);
  stroke-width: 7px;
}
.d-shadow {
  fill: var(--c-black);
  stroke: var(--c-black);
  stroke-width: 7px;
}

.gauge {
  display: block;
  width: 5.2rem;
  margin-top: -0.1rem;
  overflow: visible;
}
.g-face {
  fill: var(--c-black-60);
  stroke: var(--c-white-20);
  stroke-width: 1.5;
}
.gauge circle {
  transition:
    r 0.15s,
    fill 0.15s;
}
.g-num {
  font-family: 'Fredoka', 'Noto Sans TC', sans-serif;
  font-size: 15px;
  font-weight: 700;
  text-anchor: middle;
  fill: var(--c-white);
}
.g-unit {
  font-family: 'Fredoka', 'Noto Sans TC', sans-serif;
  font-size: 6px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-anchor: middle;
  fill: var(--c-white-60);
}
</style>
