<template>
  <q-page class="relative h-full overflow-hidden bg-black text-white">
    <div class="sky pointer-events-none absolute inset-0" />
    <div class="dither-dots stars pointer-events-none absolute inset-0" />
    <div class="moon pointer-events-none absolute">
      <DottedMoon color="var(--c-moon)" />
      <svg class="moon-ring" viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <path id="moon-ring-path" d="M50 50m0 -39a39 39 0 1 1 0 78a39 39 0 1 1 0 -78" />
        </defs>
        <text class="moon-ring-text">
          <textPath href="#moon-ring-path" textLength="242" lengthAdjust="spacing">
            MERRY CHRISTMAS ✦ MERRY CHRISTMAS ✦
          </textPath>
        </text>
      </svg>
    </div>
    <div ref="flyerRef" class="flyer pointer-events-none absolute">
      <XmasIcon name="sleigh-silhouette" class="silhouette w-full" />
    </div>
    <div ref="sparkLayer" class="pointer-events-none absolute inset-0 overflow-hidden" />

    <SnowFall :count="30" />

    <SnowTown />

    <div class="relative flex h-full flex-col items-center justify-between px-6 pb-[8%] pt-[30%]">
      <div class="flex flex-col items-center">
        <svg class="absolute h-0 w-0" aria-hidden="true">
          <filter
            v-for="(seed, i) in SNOW_SEEDS"
            :id="`title-snow-${i}`"
            :key="i"
            x="-15%"
            y="-30%"
            width="130%"
            height="160%">
            <feOffset in="SourceAlpha" dy="7" result="d1" />
            <feOffset in="SourceAlpha" dy="20" result="d2" />
            <feOffset in="SourceAlpha" dy="36" result="d3" />
            <feComposite in="SourceAlpha" in2="d1" operator="out" result="e1" />
            <feComposite in="e1" in2="d2" operator="out" result="e2" />
            <feComposite in="e2" in2="d3" operator="out" result="edge" />
            <feOffset in="edge" dy="-3" result="up" />
            <feMorphology in="up" operator="erode" radius="1" result="thin" />
            <feMorphology in="thin" operator="dilate" radius="2.4" result="fat" />
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.16"
              numOctaves="2"
              :seed="seed"
              result="bumps" />
            <feDisplacementMap
              in="fat"
              in2="bumps"
              scale="8"
              xChannelSelector="R"
              yChannelSelector="G"
              result="lumpy" />
            <feGaussianBlur in="lumpy" stdDeviation="1.5" result="blur" />
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.05"
              numOctaves="1"
              :seed="seed + 40"
              result="patch" />
            <feColorMatrix
              in="patch"
              type="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  2.4 0 0 0 -0.8"
              result="patchA" />
            <feComposite in="blur" in2="patchA" operator="arithmetic" k1="1" result="masked" />
            <feColorMatrix
              :id="`title-snow-amount-${i}`"
              in="masked"
              type="matrix"
              :values="snowMatrix(1)"
              result="snow" />
            <feOffset in="snow" dy="2.5" result="snowDown" />
            <feFlood flood-color="#000" flood-opacity="0.6" />
            <feComposite in2="snowDown" operator="in" result="snowShadow" />
            <feMerge>
              <feMergeNode in="snowShadow" />
              <feMergeNode in="snow" />
            </feMerge>
          </filter>
        </svg>
        <h1 ref="titleRef" class="title mt-3 flex font-black leading-none" aria-label="雪橇快遞">
          <span
            v-for="(ch, i) in TITLE"
            :key="i"
            class="title-char"
            :style="{ animationDelay: `${0.2 + i * 0.12}s` }">
            <svg class="char-body" viewBox="0 -16 106 128" aria-hidden="true">
              <text class="t-shadow" x="53" y="95">{{ ch }}</text>
              <text class="t-main" x="53" y="88">{{ ch }}</text>
              <g :filter="`url(#title-snow-${i})`">
                <text class="t-main" x="53" y="88">{{ ch }}</text>
              </g>
            </svg>
            <i v-for="k in CLUMPS" :key="k" class="clump" />
          </span>
        </h1>
        <p class="subtitle font-xmas anim-jelly mt-5 text-green">Sleigh Rush</p>
        <p v-if="unsupported" class="mt-4 text-body text-red">
          此瀏覽器不支援 WebGL2，請更新系統或改用其他瀏覽器
        </p>
        <p v-else class="tagline mt-3 text-center text-body tracking-widest text-white/60">
          呵呵呵～坐穩胖雪橇，送禮去囉！
        </p>
      </div>

      <div class="flex w-full flex-col items-center gap-3">
        <button
          class="start-btn chubby-btn w-60 max-w-full bg-red py-3 text-title font-black tracking-[0.3em] text-white disabled:opacity-60"
          :disabled="unsupported"
          @click="startGame">
          出發送禮
        </button>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import DottedMoon from 'components/DottedMoon.vue';
import SnowFall from 'components/SnowFall.vue';
import SnowTown from 'components/SnowTown.vue';
import XmasIcon from 'components/XmasIcon.vue';
import { useAppStore } from 'src/stores/app-store';
import { detectQuality } from 'src/game/quality';
import { sound } from 'src/game/sound';

const TITLE = ['雪', '橇', '快', '遞'];
const SNOW_SEEDS = [3, 10, 17, 24];
const CLUMPS = 4;

const SNOW_CYCLE = 3.6;
const SNOW_START = 1.2;
const SNOW_STAGGER = 0.9;
const JUMP_TIME = 0.5;
const SNOW_LEFT = 0.3;
const K_FULL = 5.5;
const K_LOW = 11.5;

function snowMatrix(amount: number) {
  const k = K_FULL + (1 - amount) * (K_LOW - K_FULL);
  return `0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 18 -${k.toFixed(2)}`;
}

function snowAmount(p: number) {
  if (p < 0.1) return 1 - (p / 0.1) * (1 - SNOW_LEFT);
  if (p < 0.6) return SNOW_LEFT;
  if (p < 3) {
    const u = (p - 0.6) / 2.4;
    return SNOW_LEFT + (1 - SNOW_LEFT) * (1 - (1 - u) ** 2);
  }
  return 1;
}

interface Clump {
  el: HTMLElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  spin: number;
  t: number;
}

const titleRef = ref<HTMLElement>();
const flyerRef = ref<HTMLElement>();
const sparkLayer = ref<HTMLElement>();

const SPARK_POOL = 48;
const SPARK_LIFE = 1.1;
const SPARK_EVERY = 0.035;

interface Spark {
  el: HTMLElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  t: number;
  active: boolean;
}
let raf = 0;

onMounted(() => {
  const chars = Array.from(titleRef.value?.querySelectorAll<HTMLElement>('.title-char') ?? []);
  const state = chars.map((el, i) => ({
    body: el.querySelector<SVGElement>('.char-body') as SVGElement,
    matrix: document.getElementById(`title-snow-amount-${i}`),
    clumpEls: Array.from(el.querySelectorAll<HTMLElement>('.clump')),
    clumps: [] as Clump[],
    shownAmount: 1,
    lastCycle: -1,
  }));
  const sparks: Spark[] = Array.from({ length: SPARK_POOL }, () => {
    const el = document.createElement('i');
    el.className = 'spark';
    sparkLayer.value?.appendChild(el);
    return { el, x: 0, y: 0, vx: 0, vy: 0, size: 1, t: 0, active: false };
  });
  let sparkTimer = 0;

  const updateSparks = (dt: number) => {
    const layer = sparkLayer.value;
    const flyer = flyerRef.value;
    if (!layer || !flyer) return;
    const box = layer.getBoundingClientRect();
    const f = flyer.getBoundingClientRect();
    const visible = f.right > box.left && f.left < box.right;
    sparkTimer -= dt;
    while (visible && sparkTimer <= 0) {
      sparkTimer += SPARK_EVERY;
      const sp = sparks.find((x) => !x.active);
      if (!sp) break;
      sp.active = true;
      sp.t = 0;
      sp.x = f.right - box.left - f.width * (0.06 + Math.random() * 0.08);
      sp.y = f.top - box.top + f.height * (0.72 + Math.random() * 0.16);
      sp.vx = 6 + Math.random() * 18;
      sp.vy = -6 + Math.random() * 22;
      sp.size = 0.5 + Math.random() * 0.8;
    }
    sparks.forEach((sp) => {
      if (!sp.active) return;
      /* eslint-disable no-param-reassign */
      sp.t += dt;
      sp.vy += 26 * dt;
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      const k = sp.t / SPARK_LIFE;
      if (k >= 1) {
        sp.active = false;
        sp.el.style.opacity = '0';
        return;
      }
      const twinkle = 0.55 + 0.45 * Math.sin(sp.t * 28 + sp.size * 10);
      sp.el.style.opacity = ((1 - k) * twinkle).toFixed(2);
      sp.el.style.transform = `translate(${sp.x.toFixed(1)}px, ${sp.y.toFixed(1)}px) scale(${(
        sp.size *
        (1 - k * 0.7)
      ).toFixed(2)})`;
      /* eslint-enable no-param-reassign */
    });
  };

  let last = performance.now();
  const tick = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    updateSparks(dt);
    const time = now / 1000;
    state.forEach((s, i) => {
      const local = time - SNOW_START - i * SNOW_STAGGER;
      const p = local < 0 ? SNOW_CYCLE - 0.01 : local % SNOW_CYCLE;
      const cycle = local < 0 ? -1 : Math.floor(local / SNOW_CYCLE);

      let y = 0;
      let sx = 1;
      let sy = 1;
      if (p < JUMP_TIME) {
        const u = p / JUMP_TIME;
        const h = Math.sin(u * Math.PI);
        y = -h * 0.16;
        sy = 1 + h * 0.1;
        sx = 1 - h * 0.07;
      } else if (p < JUMP_TIME + 0.25) {
        const q = Math.sin(((p - JUMP_TIME) / 0.25) * Math.PI);
        sy = 1 - q * 0.12;
        sx = 1 + q * 0.1;
      }
      s.body.style.transform = `translateY(${y.toFixed(3)}em) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;

      const amount = snowAmount(p);
      if (Math.abs(amount - s.shownAmount) > 0.02 || (amount === 1 && s.shownAmount !== 1)) {
        s.shownAmount = amount;
        s.matrix?.setAttribute('values', snowMatrix(amount));
      }

      if (cycle !== s.lastCycle && p >= 0.06) {
        s.lastCycle = cycle;
        s.clumps = s.clumpEls.map((el) => ({
          el,
          x: 0.15 + Math.random() * 0.75,
          y: 0.14 + y,
          vx: (Math.random() - 0.5) * 0.8,
          vy: -0.4 - Math.random() * 0.6,
          size: 0.6 + Math.random() * 0.7,
          spin: (Math.random() - 0.5) * 600,
          t: 0,
        }));
      }
      s.clumps.forEach((c) => {
        /* eslint-disable no-param-reassign */
        c.t += dt;
        c.vy += 6 * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        const fade = Math.max(0, 1 - Math.max(0, c.t - 0.45) / 0.45);
        c.el.style.opacity = String(fade);
        c.el.style.transform = `translate(${c.x.toFixed(3)}em, ${c.y.toFixed(3)}em) rotate(${(
          c.spin * c.t
        ).toFixed(0)}deg) scale(${c.size.toFixed(2)})`;
        /* eslint-enable no-param-reassign */
      });
      s.clumps = s.clumps.filter((c) => c.t < 0.9);
    });
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
});
onBeforeUnmount(() => cancelAnimationFrame(raf));

const router = useRouter();
const appStore = useAppStore();

if (!appStore.quality) {
  const result = detectQuality();
  appStore.quality = result.settings;
  appStore.webgl2 = result.webgl2;
}
const unsupported = computed(() => !appStore.webgl2);

function startGame() {
  sound.unlock();
  router.push({ name: 'SleighPage', query: router.currentRoute.value.query });
}
</script>

<style scoped>
.sky {
  background: var(--c-black);
}
.stars {
  opacity: 0.3;
  mask-image: radial-gradient(ellipse at 50% 10%, black 0%, transparent 70%);
  -webkit-mask-image: radial-gradient(ellipse at 50% 10%, black 0%, transparent 70%);
}

.moon {
  --c-moon: #f4f4f4;
  top: 5%;
  left: 50%;
  width: 40%;
  margin-left: -20%;
  aspect-ratio: 1;
  border-radius: 50%;
  box-shadow: 0 0 60px var(--c-white-20);
  animation: moon-glow 4s ease-in-out infinite;
}
@keyframes moon-glow {
  50% {
    box-shadow: 0 0 80px var(--c-white-20);
  }
}
.moon-ring {
  position: absolute;
  inset: -16%;
  width: 132%;
  height: 132%;
  overflow: visible;
  animation: moon-ring-spin 26s linear infinite;
}
.moon-ring-text {
  font-family: 'Fredoka', 'Noto Sans TC', sans-serif;
  font-size: 7px;
  font-weight: 700;
  fill: var(--c-white);
  stroke: var(--c-black);
  stroke-width: 1.2px;
  stroke-linejoin: round;
  paint-order: stroke;
}
@keyframes moon-ring-spin {
  to {
    transform: rotate(360deg);
  }
}

:deep(.spark) {
  position: absolute;
  left: 0;
  top: 0;
  width: 0.35rem;
  height: 0.35rem;
  margin: -0.175rem 0 0 -0.175rem;
  border-radius: 50%;
  background: var(--c-white);
  box-shadow: 0 0 0.25rem var(--c-white-60);
  opacity: 0;
  will-change: transform, opacity;
}
.flyer {
  top: 13%;
  width: 48%;
  animation: fly 10s linear infinite;
}
.silhouette {
  aspect-ratio: 106 / 66;
}
@keyframes fly {
  0% {
    left: 110%;
    transform: translateY(20%) rotate(4deg);
  }
  25% {
    transform: translateY(-15%) rotate(-3deg);
  }
  50% {
    transform: translateY(15%) rotate(3deg);
  }
  75% {
    transform: translateY(-10%) rotate(-2deg);
  }
  100% {
    left: -60%;
    transform: translateY(10%) rotate(2deg);
  }
}

.title {
  font-size: var(--fs-display);
  gap: 0.04em;
}
.title-char {
  position: relative;
  display: block;
  width: 1.06em;
  height: 1.28em;
  animation: anim-pop 0.6s cubic-bezier(0.3, 1.8, 0.5, 1) both;
}
.char-body {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
  transform-origin: 50% 100%;
}
.clump {
  position: absolute;
  left: 0;
  top: 0;
  width: 0.13em;
  height: 0.11em;
  margin: -0.055em 0 0 -0.065em;
  border-radius: 50% 50% 45% 45% / 60% 60% 40% 40%;
  background: var(--c-white);
  box-shadow: 0 0.02em 0 var(--c-black-60);
  opacity: 0;
  pointer-events: none;
}
.title-char text {
  font-family: 'Noto Sans TC', sans-serif;
  font-size: 100px;
  font-weight: 900;
  text-anchor: middle;
  stroke-linejoin: round;
  paint-order: stroke;
}
.t-main {
  fill: var(--c-white);
  stroke: var(--c-red);
  stroke-width: 11px;
}
.t-shadow {
  fill: var(--c-black);
  stroke: var(--c-black);
  stroke-width: 11px;
}

.tagline {
  animation: anim-rise 0.6s 0.4s both;
}

.subtitle {
  font-size: var(--fs-title);
  letter-spacing: 0.04em;
  text-shadow:
    0 3px 0 var(--c-black),
    0 0 14px var(--c-green-60);
}

.start-btn {
  animation: breathe 1.8s ease-in-out infinite;
}
.start-btn:active {
  animation: none;
}
@keyframes breathe {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.06, 0.96);
  }
}
</style>
