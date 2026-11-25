<template>
  <div class="ground-gift">
    <svg class="box" viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <clipPath id="gg-bowhole">
          <path clip-rule="evenodd" :d="HOLE_CLIP" />
        </clipPath>
      </defs>
      <g class="backing" clip-path="url(#gg-bowhole)">
        <path :d="OUTLINE" />
        <path v-for="(d, i) in BOW_BACKING" :key="i" :d="d" fill-rule="evenodd" />
      </g>
      <circle
        v-for="(d, i) in DOTS"
        :key="i"
        :cx="d.x"
        :cy="d.y"
        :r="d.r"
        :fill="d.white ? ribbonColor(d.s) : 'var(--c-red)'" />
    </svg>
    <div class="mound" />
  </div>
</template>

<script setup lang="ts">
import {
  BOW_HOLES,
  BOW_SILHOUETTE,
  CUBE_OUTLINE,
  cubeGiftDots,
  ribbonColor,
} from 'src/game/cube-gift';

const DOTS = cubeGiftDots();
const OUTLINE = `M${CUBE_OUTLINE.map(([x, y]) => `${x} ${y}`).join('L')}Z`;
const ringPath = (poly: [number, number][]) => `M${poly.map(([x, y]) => `${x} ${y}`).join('L')}Z`;
const HOLE_CLIP = `M-20 -20H140V140H-20Z${BOW_HOLES.map(ringPath).join('')}`;
const BOW_BACKING = BOW_SILHOUETTE.map((rings) =>
  rings.map((poly) => `M${poly.map(([x, y]) => `${x} ${y}`).join('L')}Z`).join(''),
);
</script>

<style scoped>
.ground-gift {
  position: relative;
}
.backing {
  fill: var(--c-black);
  stroke: var(--c-black);
  stroke-width: 2;
  stroke-linejoin: round;
}
.box {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  overflow: visible;
  transform: rotate(-8deg);
  transform-origin: 50% 90%;
}
.mound {
  position: absolute;
  left: -18%;
  right: -18%;
  bottom: 0;
  height: 34%;
  border-radius: 50% 50% 0 0 / 100% 100% 0 0;
  background:
    radial-gradient(circle, var(--c-black-20) 0.7px, transparent 1px) 0 0 / 3px 3px,
    var(--c-white);
  box-shadow: 0 -4px 0 var(--c-white-60);
}
</style>
