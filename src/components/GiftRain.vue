<template>
  <div ref="host" class="gift-rain pointer-events-none absolute inset-0 overflow-hidden">
    <div class="ground" :style="{ transform: `translate3d(0, ${groundTop}px, 0)` }" />
    <div ref="world" class="world" />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { iconSvg } from 'src/game/icons';
import type { GiftShape } from 'src/game/gifts';
import { sound } from 'src/game/sound';

const props = defineProps<{ order: GiftShape[] }>();
const emit = defineEmits<{ done: [] }>();

const SPAWN_EVERY = 0.1;
const GIFT_SIZE = 0.48;
const HIT_RATIO = 0.36;
const DEPTH = 1.2;
const PERSPECTIVE = 4.8;
const EYE_Y = 0.7;
const FAR_BRIGHT = 0.6;
const FOCUS_Y = 1 / 3;
const LANDED_AFTER = 1.4;

const GRAVITY = 3.6;
const BOUNCE = 0.35;
const FRICTION = 0.9;
const ROLL_DAMP = 12;
const AIR = 0.6;
const STEP = 1 / 120;
const CALM = 0.05;

const host = ref<HTMLDivElement>();
const world = ref<HTMLDivElement>();
const groundTop = ref(0);

interface Item {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  angle: number;
  spin: number;
  el: HTMLElement;
  born: number;
  id: number;
  layer: number;
  airUntil: number;
  touching: boolean;
}

const POKE_HEIGHT = 0.35;
const POKE_STEP = 0.1;
const POKE_MAX = 0.8;
const POKE_CHAIN = 0.6;

let raf = 0;
let pokeAt: (clientX: number, clientY: number) => boolean = () => false;

onMounted(() => {
  const hostEl = host.value;
  const worldEl = world.value;
  if (!hostEl || !worldEl) return;
  const W = hostEl.clientWidth;
  const H = hostEl.clientHeight;
  const size = W * GIFT_SIZE;
  const r = size * HIT_RATIO;
  const depth = W * DEPTH;
  const focal = W * PERSPECTIVE;
  const eye = H * EYE_Y;
  const floor = H - (size / 2 - r);
  const g = GRAVITY * W;
  const calmSpeed = CALM * W;

  let camY = 0;
  const scaleAt = (z: number) => focal / (focal + z);
  const toScreenY = (y: number, s: number) => eye + (y - camY - eye) * s;
  const halfView = (z: number) => W / 2 / scaleAt(z);

  const items: Item[] = [];
  let next = 0;
  let clock = 0;
  let lastSpawn = 0;
  let finished = false;
  let last = performance.now();
  let acc = 0;

  const spawn = (shape: GiftShape) => {
    const el = document.createElement('div');
    el.className = 'rain-gift';
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.innerHTML = iconSvg(`gift-${shape}`);
    worldEl.appendChild(el);
    const z = r + Math.random() * (depth - r * 2);
    const s = scaleAt(z);
    const sx = size * s * 0.5 + Math.random() * (W - size * s);
    const sy = -size * s * 0.5;
    el.style.filter = `brightness(${(1 - ((1 - FAR_BRIGHT) * z) / depth).toFixed(2)})`;
    items.push({
      x: W / 2 + (sx - W / 2) / s,
      y: camY + eye + (sy - eye) / s,
      z,
      vx: 0,
      vy: 0,
      vz: 0,
      angle: (Math.random() - 0.5) * 0.8,
      spin: (Math.random() - 0.5) * 9,
      el,
      born: clock,
      id: items.length,
      layer: -1,
      airUntil: 0,
      touching: false,
    });
  };

  const collide = (a: Item, b: Item) => {
    /* eslint-disable no-param-reassign */
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    const d2 = dx * dx + dy * dy + dz * dz;
    const min = r * 2;
    if (d2 >= min * min || d2 === 0) return;
    const d = Math.sqrt(d2);
    const nx = dx / d;
    const ny = dy / d;
    const nz = dz / d;
    a.touching = true;
    b.touching = true;
    const push = (min - d) / 2;
    a.x -= nx * push;
    a.y -= ny * push;
    a.z -= nz * push;
    b.x += nx * push;
    b.y += ny * push;
    b.z += nz * push;
    const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny + (b.vz - a.vz) * nz;
    if (vn < 0) {
      const j = (-(1 + BOUNCE) * vn) / 2;
      a.vx -= j * nx;
      a.vy -= j * ny;
      a.vz -= j * nz;
      b.vx += j * nx;
      b.vy += j * ny;
      b.vz += j * nz;
      const tx = -ny;
      const ty = nx;
      const vt = (b.vx - a.vx) * tx + (b.vy - a.vy) * ty;
      const f = vt * (1 - FRICTION) * 0.5;
      a.vx += f * tx;
      a.vy += f * ty;
      b.vx -= f * tx;
      b.vy -= f * ty;
      if (-vn > calmSpeed) {
        a.spin += vt / r / 4;
        b.spin -= vt / r / 4;
      }
    }
    /* eslint-enable no-param-reassign */
  };

  const step = () => {
    const air = 1 - AIR * STEP;
    items.forEach((it) => {
      /* eslint-disable no-param-reassign */
      it.vy += g * STEP;
      it.vx *= air;
      it.vy *= air;
      it.vz *= air;
      it.x += it.vx * STEP;
      it.y += it.vy * STEP;
      it.z += it.vz * STEP;
      it.angle += it.spin * STEP;
      it.spin *= 1 - 1.5 * STEP;
      it.touching = false;
      /* eslint-enable no-param-reassign */
    });

    const cell = r * 2;
    const keyOf = (x: number, y: number, z: number) => `${x},${y},${z}`;
    const grid = new Map<string, Item[]>();
    items.forEach((it) => {
      const key = keyOf(Math.floor(it.x / cell), Math.floor(it.y / cell), Math.floor(it.z / cell));
      const list = grid.get(key);
      if (list) list.push(it);
      else grid.set(key, [it]);
    });
    items.forEach((a) => {
      const cx = Math.floor(a.x / cell);
      const cy = Math.floor(a.y / cell);
      const cz = Math.floor(a.z / cell);
      for (let ox = -1; ox <= 1; ox += 1) {
        for (let oy = -1; oy <= 1; oy += 1) {
          for (let oz = -1; oz <= 1; oz += 1) {
            grid.get(keyOf(cx + ox, cy + oy, cz + oz))?.forEach((b) => {
              if (a.id < b.id) collide(a, b);
            });
          }
        }
      }
    });

    items.forEach((it) => {
      /* eslint-disable no-param-reassign */
      if (it.y + r > floor) {
        it.y = floor - r;
        if (it.vy > 0) it.vy *= -BOUNCE;
        if (Math.abs(it.vy) < calmSpeed) it.vy = 0;
        it.vx *= FRICTION;
        it.vz *= FRICTION;
        it.touching = true;
      }
      if (it.touching) it.spin *= 1 - ROLL_DAMP * STEP;
      if (it.z < r) {
        it.z = r;
        if (it.vz < 0) it.vz *= -BOUNCE;
      } else if (it.z > depth - r) {
        it.z = depth - r;
        if (it.vz > 0) it.vz *= -BOUNCE;
      }
      const half = halfView(it.z) - size / 2;
      if (it.x < W / 2 - half) {
        it.x = W / 2 - half;
        if (it.vx < 0) it.vx *= -BOUNCE;
      } else if (it.x > W / 2 + half) {
        it.x = W / 2 + half;
        if (it.vx > 0) it.vx *= -BOUNCE;
      }
      /* eslint-enable no-param-reassign */
    });
  };

  let lastPoke = -Infinity;
  let pokeChain = 0;
  pokeAt = (clientX, clientY) => {
    const box = hostEl.getBoundingClientRect();
    const px = clientX - box.left;
    const py = clientY - box.top;
    let hit: Item | null = null;
    items.forEach((it) => {
      const s = scaleAt(it.z);
      const sx = W / 2 + (it.x - W / 2) * s;
      const sy = toScreenY(it.y, s);
      const rr = size * s * 0.42;
      if ((px - sx) ** 2 + (py - sy) ** 2 < rr * rr && (!hit || it.z < hit.z)) hit = it;
    });
    const it = hit as Item | null;
    if (!it) return false;
    pokeChain = clock - lastPoke < POKE_CHAIN ? pokeChain + 1 : 0;
    lastPoke = clock;
    const height = Math.min(POKE_MAX, POKE_HEIGHT + pokeChain * POKE_STEP) * H;
    it.vy = -Math.sqrt(2 * g * height);
    it.vx += (Math.random() - 0.5) * W * 0.8;
    it.spin += (Math.random() < 0.5 ? -1 : 1) * (10 + Math.random() * 6);
    it.airUntil = clock + 2.5;
    sound.unlock();
    sound.throw();
    return true;
  };

  const finish = () => {
    if (finished) return;
    finished = true;
    emit('done');
  };
  if (!props.order.length) finish();

  let camTarget = 0;

  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    clock += dt;

    while (next < props.order.length && clock >= next * SPAWN_EVERY) {
      spawn(props.order[next]);
      next += 1;
      lastSpawn = clock;
    }
    acc += dt;
    while (acc >= STEP) {
      step();
      acc -= STEP;
    }

    items.forEach((it) => {
      if (clock - it.born < LANDED_AFTER || clock < it.airUntil) return;
      const s = scaleAt(it.z);
      const need = it.y - size / 2 - eye - (H * FOCUS_Y - eye) / s;
      camTarget = Math.min(camTarget, need);
    });
    camY += (camTarget - camY) * Math.min(1, dt * 2.5);
    groundTop.value = Math.round(toScreenY(floor, scaleAt(depth)));

    items.forEach((it) => {
      const s = scaleAt(it.z);
      const sx = W / 2 + (it.x - W / 2) * s;
      const sy = toScreenY(it.y, s);
      // eslint-disable-next-line no-param-reassign
      it.el.style.transform = `translate3d(${(sx - size / 2).toFixed(1)}px, ${(
        sy -
        size / 2
      ).toFixed(1)}px, 0) scale(${s.toFixed(3)}) rotate(${it.angle.toFixed(3)}rad)`;
      const layer = Math.round((depth - it.z) / (r * 0.5));
      if (layer !== it.layer) {
        // eslint-disable-next-line no-param-reassign
        it.layer = layer;
        // eslint-disable-next-line no-param-reassign
        it.el.style.zIndex = String(layer);
      }
    });

    if (!finished && next >= props.order.length) {
      const since = clock - lastSpawn;
      const calm = items.every((it) => Math.hypot(it.vx, it.vy, it.vz) < calmSpeed);
      const camDone = Math.abs(camTarget - camY) < 2;
      if ((since > 1 && calm && camDone) || since > 4) finish();
    }
  };
  raf = requestAnimationFrame(tick);
});

onBeforeUnmount(() => cancelAnimationFrame(raf));

defineExpose({ poke: (clientX: number, clientY: number) => pokeAt(clientX, clientY) });
</script>

<style scoped>
.gift-rain {
  isolation: isolate;
}
.world {
  position: absolute;
  inset: 0;
}
.ground {
  position: absolute;
  top: 0;
  left: -10%;
  right: -10%;
  height: 200%;
  will-change: transform;
  border-radius: 50% 50% 0 0 / 2.5rem 2.5rem 0 0;
  background:
    radial-gradient(circle, var(--c-black-20) 0.7px, transparent 1px) 0 0 / 3px 3px,
    var(--c-white);
  box-shadow: 0 -4px 0 var(--c-white-60);
}
.world :deep(.rain-gift) {
  position: absolute;
  left: 0;
  top: 0;
  will-change: transform;
}
.world :deep(.rain-gift svg) {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}
</style>
