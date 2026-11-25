<template>
  <div class="town pointer-events-none absolute inset-x-0 bottom-0">
    <div v-if="layer !== 'front'" class="hill hill-back" />
    <div
      v-for="(b, i) in houses && layer === 'all' ? TOWN_NOW : []"
      :key="i"
      class="town-slot absolute"
      :style="{ left: b.left, bottom: b.bottom, width: b.size, '--tilt': b.tilt }">
      <XmasIcon :name="b.name" class="town-item anim-jelly" :style="{ animationDelay: b.delay }" />
    </div>
    <GroundGift v-if="houses && layer === 'all'" class="ground-gift" />
    <div v-if="layer !== 'back'" class="hill hill-front" />
  </div>
</template>

<script setup lang="ts">
import GroundGift from 'components/GroundGift.vue';
import XmasIcon from 'components/XmasIcon.vue';
import type { IconName } from 'src/game/icons';

withDefaults(defineProps<{ houses?: boolean; layer?: 'all' | 'back' | 'front' }>(), {
  houses: true,
  layer: 'all',
});

const HILL_A = 0.7;
const HILL_B = 0.62;
const TOWN_RATIO = (0.3 * 16) / 9;
const SINK = 0.03;

const JELLY_PERIOD = 2.4;

const TOWN_ITEMS: { name: IconName; x: number; size: number }[] = [
  { name: 'house', x: 0.47, size: 16 },
  { name: 'tree', x: 0.59, size: 11 },
  { name: 'house', x: 0.71, size: 17 },
  { name: 'tree', x: 0.83, size: 11 },
  { name: 'house', x: 0.94, size: 15 },
];

const TOWN = TOWN_ITEMS.map((b, i) => {
  const u = (b.x - 0.5) / HILL_A;
  const h = Math.sqrt(1 - u * u);
  const slope = (-HILL_B * TOWN_RATIO * u) / (HILL_A * h);
  const tilt = (-Math.atan(slope) * 180) / Math.PI;
  return {
    name: b.name,
    left: `${(b.x * 100).toFixed(1)}%`,
    bottom: `${((HILL_B * h - SINK) * 100).toFixed(1)}%`,
    size: `${b.size}%`,
    tilt: `${tilt.toFixed(1)}deg`,
    delay: (i * -0.6) % JELLY_PERIOD,
  };
});

const clock = (performance.now() / 1000) % JELLY_PERIOD;
const TOWN_NOW = TOWN.map((b) => ({ ...b, delay: `${(b.delay - clock).toFixed(3)}s` }));
</script>

<style scoped>
.town {
  height: 30%;
}
.hill {
  position: absolute;
  border-radius: 50% 50% 0 0 / 100% 100% 0 0;
}
.hill-back {
  left: -20%;
  right: -20%;
  bottom: 0;
  height: 62%;
  background:
    radial-gradient(circle, var(--c-black-20) 0.7px, transparent 1px) 0 0 / 4px 4px,
    var(--c-white-60);
}
.hill-front {
  left: -10%;
  right: -10%;
  bottom: 0;
  height: 40%;
  background:
    radial-gradient(circle, var(--c-black-20) 0.7px, transparent 1px) 0 0 / 3px 3px,
    var(--c-white);
  box-shadow: 0 -4px 0 var(--c-white-60);
}
.town-slot {
  transform: translateX(-50%) rotate(var(--tilt));
  transform-origin: 50% 100%;
}
.town-item {
  aspect-ratio: 1;
  transform-origin: 50% 100%;
}
.town .ground-gift {
  position: absolute;
  left: -8%;
  bottom: 20%;
  width: 52%;
}
</style>
