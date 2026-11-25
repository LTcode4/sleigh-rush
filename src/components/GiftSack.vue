<template>
  <div class="gift-sack">
    <svg class="layer" :viewBox="`0 0 ${W} ${H}`" aria-hidden="true">
      <circle v-for="(d, i) in BACK" :key="i" :cx="d.x" :cy="d.y" :r="d.r" :fill="d.c" />
    </svg>
    <div class="gifts" :style="{ clipPath: CLIP }">
      <slot />
    </div>
    <svg class="layer" :viewBox="`0 0 ${W} ${H}`" aria-hidden="true">
      <circle v-for="(d, i) in FRONT" :key="i" :cx="d.x" :cy="d.y" :r="d.r" :fill="d.c" />
    </svg>
    <slot name="top" />
  </div>
</template>

<script setup lang="ts">
interface Dot {
  x: number;
  y: number;
  r: number;
  c: string;
}

const W = 200;
const H = 72;
const MX = 100;
const MY = 24;
const RX = 88;
const RY = 14.5;
const LIP = 8.5;
const FOLDS = 16;
const FOLD_AMP = 0.3;
const STEP = 2.6;

const SACK = '#e4e4e4';
const SACK_LIGHT = '#ffffff';
const SACK_INNER = '#7a7a7a';
const PATCH = '#e8413c';
const FLARE = 0.35;
const PATCH_BOX = [146, 52, 11, 5];

function inPatch(x: number, y: number) {
  const [cx, cy, hw, hh] = PATCH_BOX;
  const r = 3;
  const dx = Math.max(0, Math.abs(x - cx) - (hw - r));
  const dy = Math.max(0, Math.abs(y - cy) - (hh - r));
  return dx * dx + dy * dy <= r * r;
}

const radius = (shade: number) => STEP * 0.5 * (0.22 + 0.78 * Math.max(0, Math.min(1, shade)));

const BACK: Dot[] = [];
const FRONT: Dot[] = [];
for (let row = 0, y = STEP / 2; y < H; row += 1, y += STEP) {
  for (let x = STEP / 2 + (row % 2) * (STEP / 2); x < W; x += STEP) {
    const u = (x - MX) / RX;
    const v = (y - MY) / RY;
    const q = Math.sqrt(u * u + v * v);
    const ang = Math.atan2(v, u);
    const rad = Math.hypot(RX * Math.cos(ang), RY * Math.sin(ang));
    const dist = (q - 1) * rad;
    const thick = LIP * (1 + FOLD_AMP * Math.cos(ang * FOLDS));
    const dot = (shade: number, c: string) => ({
      x: +x.toFixed(2),
      y: +y.toFixed(2),
      r: +radius(shade).toFixed(2),
      c,
    });
    if (Math.abs(dist) <= thick) {
      const s = dist / thick;
      const tube = Math.sqrt(1 - s * s);
      const front = Math.sin(ang) > 0;
      const light =
        0.78 + 0.22 * (-0.6 * Math.cos(ang) - 0.4 * Math.sin(ang)) + (front ? 0.08 : -0.12);
      const shade = tube * light - (s < 0 ? 0.12 : 0) * (1 - tube);
      (front ? FRONT : BACK).push(dot(shade, shade > 0.86 ? SACK_LIGHT : SACK));
    } else if (y > MY && q > 1) {
      const halfW = RX + LIP * 0.6 + (y - MY) * FLARE;
      if (Math.abs(x - MX) <= halfW) {
        const nx = Math.max(-1, Math.min(1, (x - MX) / (halfW + 6)));
        const nz = Math.sqrt(1 - nx * nx);
        let shade = Math.max(0, -0.45 * nx + 0.8 * nz);
        shade *= 0.8 + 0.2 * (1 - (y - MY) / (H - MY));
        shade *= 0.85 + 0.15 * Math.cos((x - MX) * 0.22 + y * 0.06);
        if (dist < thick + 3) shade *= 0.45;
        FRONT.push(dot(shade, inPatch(x, y) ? PATCH : shade > 0.9 ? SACK_LIGHT : SACK));
      }
    } else if (q < 1) {
      BACK.push(dot(0.12 + 0.3 * Math.max(0, v), SACK_INNER));
    }
  }
}

const CLIP = (() => {
  const pct = (px: number, py: number) =>
    `${((px / W) * 100).toFixed(2)}% ${((py / H) * 100).toFixed(2)}%`;
  const pts = ['-20% -500%', '120% -500%', pct(W + 40, MY)];
  for (let k = 0; k <= 40; k += 1) {
    const a = (k / 40) * Math.PI;
    const rad = Math.hypot(RX * Math.cos(a), RY * Math.sin(a));
    const inner = 1 - (LIP * (1 + FOLD_AMP * Math.cos(a * FOLDS))) / rad;
    pts.push(pct(MX + RX * inner * Math.cos(a), MY + RY * inner * Math.sin(a)));
  }
  pts.push(pct(-40, MY));
  return `polygon(${pts.join(', ')})`;
})();
</script>

<style scoped>
.gift-sack {
  position: relative;
  width: 100%;
  aspect-ratio: 200 / 72;
}
.layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}
.gifts {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
</style>
