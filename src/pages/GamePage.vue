<template>
  <q-page
    class="relative h-full overflow-hidden bg-black text-white"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel">
    <div class="sky pointer-events-none absolute inset-0">
      <div class="dither-dots stars absolute inset-0" />
      <div class="moon absolute">
        <DottedMoon />
      </div>
      <SnowFall :count="22" />
    </div>

    <div ref="stageRef" class="absolute inset-0" />

    <div
      class="danger-edge pointer-events-none absolute inset-0"
      :class="{ 'danger-on': mistakes >= MAX_MISTAKES - 1 && status === 'playing' }" />

    <div
      v-if="errorFlash"
      :key="`flash-${errorFlash}`"
      class="error-flash pointer-events-none absolute inset-0" />
    <div
      v-if="goodFlash"
      :key="`good-${goodFlash}`"
      class="error-flash good-flash pointer-events-none absolute inset-0" />

    <div class="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3">
      <div class="flex flex-col items-start gap-1.5">
        <div class="hud-pill flex gap-0.5 px-1.5 py-1" aria-label="剩餘容錯次數" data-tut="bells">
          <XmasIcon
            v-for="i in MAX_MISTAKES"
            :key="i"
            name="bell"
            coarse
            class="bell h-5 w-5"
            :class="{ 'bell-lost': i > MAX_MISTAKES - mistakes }" />
        </div>
        <div class="hud-pill flex items-center gap-1.5 px-2 py-0.5">
          <XmasIcon
            :key="`d-${delivered}`"
            name="gift-square-red"
            coarse
            class="anim-pop h-5 w-5" />
          <span class="font-mono text-body font-bold leading-none text-black"
            >× {{ delivered }}</span
          >
        </div>
      </div>

      <SpeedMeter :distance="distance" :speed="speed" show="distance" />
    </div>

    <p
      v-if="status === 'countdown' && count"
      :key="`count-${count}`"
      class="countdown pointer-events-none absolute inset-x-0 top-[34%] text-center font-black">
      {{ count }}
    </p>

    <p
      v-if="status === 'loading'"
      class="absolute inset-x-0 top-[44%] animate-pulse text-center text-body">
      載入中…
    </p>

    <SpeedMeter
      v-if="status !== 'loading'"
      :distance="distance"
      :speed="speed"
      show="speed"
      class="corner-gauge pointer-events-none absolute bottom-0 right-0" />

    <div v-if="status !== 'loading'" class="sack-area absolute inset-x-0 bottom-0">
      <div class="sack-backdrop" />
      <GiftSack class="sack">
        <div
          v-for="(g, i) in gifts"
          :key="g"
          class="sack-gift"
          :class="{ 'gift-on': selected === i, 'gift-off': selected >= 0 && selected !== i }"
          :style="{
            left: `${SACK_SLOTS[i].x}%`,
            bottom: `${SACK_SLOTS[i].bottom}%`,
            zIndex: selected === i ? 5 : i === 1 ? 2 : 1,
          }"
          :data-tut="`gift-${i}`">
          <XmasIcon :name="`gift-${g}`" :fat="selected === i" class="h-full w-full" />
        </div>
        <template #top>
          <button
            v-for="(g, i) in gifts"
            :key="g"
            class="sack-hit"
            :style="{ left: `${(i * 100) / 3}%` }"
            :aria-label="`選擇${GIFTS[g].name}禮物`"
            :aria-pressed="selected === i"
            :data-slot="i" />
        </template>
      </GiftSack>
    </div>

    <p
      v-if="qualityToast"
      class="pointer-events-none absolute inset-x-0 top-24 text-center text-body text-white/60">
      {{ qualityToast }}
    </p>

    <p v-if="errorMessage" class="absolute inset-x-6 top-1/3 text-center text-body">
      {{ errorMessage }}
    </p>

    <TutorialOverlay
      ref="tutorialRef"
      :model-value="tutorialOpen"
      :game="game"
      :locate="locate"
      @finish="closeTutorial" />
  </q-page>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import TutorialOverlay from 'components/TutorialOverlay.vue';
import type { TutorialAction, TutorialTarget } from 'components/TutorialOverlay.vue';
import DottedMoon from 'components/DottedMoon.vue';
import SnowFall from 'components/SnowFall.vue';
import SpeedMeter from 'components/SpeedMeter.vue';
import GiftSack from 'components/GiftSack.vue';
import XmasIcon from 'components/XmasIcon.vue';
import { useAppStore } from 'src/stores/app-store';
import { MAX_MISTAKES, SleighGame, Side } from 'src/game/SleighGame';
import { GIFTS, pickGifts } from 'src/game/gifts';
import { TIER_LABEL, detectQuality } from 'src/game/quality';
import { sound } from 'src/game/sound';
import { useLandscapeTouch } from 'src/utils/orientation';
import { captureException } from '@sentry/vue';
import { track } from 'src/utils/track';
import { scoreOf } from 'src/game/score';
import type { GameResult } from 'src/game/SleighGame';

type Status = 'loading' | 'waiting' | 'tutorial' | 'countdown' | 'playing' | 'over';

const route = useRoute();
const router = useRouter();
const appStore = useAppStore();

const gifts = pickGifts(3);

const stageRef = ref<HTMLDivElement>();
const landscape = useLandscapeTouch();
const game = shallowRef<SleighGame>();
const status = ref<Status>('loading');
const tutorialOpen = ref(false);
const tutorialRef = ref<InstanceType<typeof TutorialOverlay>>();
const selected = ref(0);
const distance = ref(0);
const speed = ref(0);
const mistakes = ref(0);
const errorFlash = ref(0);
const goodFlash = ref(0);
const delivered = ref(0);
const count = ref<number | string>(0);
const qualityToast = ref('');
const errorMessage = ref('');
let toastTimer = 0;
let resultTimer = 0;
let countTimer = 0;
let disposed = false;

function tutorialGate(action: TutorialAction, run: () => void) {
  if (!tutorialOpen.value) {
    run();
    return;
  }
  if (!tutorialRef.value?.allows(action)) return;
  run();
  tutorialRef.value?.notify(action);
}

const SACK_SLOTS = [
  { x: 28, bottom: 2 },
  { x: 50, bottom: 6 },
  { x: 72, bottom: 2 },
];

function selectGift(i: number) {
  if (landscape.value) return;
  sound.unlock();
  tutorialGate({ type: 'pick', slot: i }, () => {
    if (selected.value !== i) sound.pick();
    selected.value = i;
  });
}

function throwGift(side: Side) {
  if (landscape.value) return;
  sound.unlock();
  if (status.value !== 'playing' && status.value !== 'tutorial') return;
  tutorialGate({ type: 'throw', side }, () => {
    game.value?.throwGift(selected.value, side);
  });
}

function syncPause() {
  const paused = document.hidden || landscape.value;
  game.value?.setPaused(paused);
  sound.setMusicPaused(paused);
}

function locate(target: TutorialTarget): DOMRect | null {
  const stage = stageRef.value;
  if (!stage) return null;
  const el =
    target === 'bubble'
      ? game.value?.tutorialBubble()?.querySelector('.gb-box')
      : stage.parentElement?.querySelector(`[data-tut="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const base = stage.getBoundingClientRect();
  return new DOMRect(r.left - base.left, r.top - base.top, r.width, r.height);
}

function trackGameOver(result: GameResult) {
  const score = scoreOf(result);
  const { sleighColor } = appStore;
  track('post_score', { score, sleigh_color: sleighColor });
  track('level_end', {
    score,
    distance: result.distance,
    delivered: result.delivered,
    wrong: result.wrong,
    missed: result.missed,
    thrown: result.thrown,
    max_combo: result.maxCombo,
    top_speed: result.topSpeed,
    play_time: result.time,
    sleigh_color: sleighColor,
  });
}

function startCountdown() {
  status.value = 'countdown';
  let n = 3;
  const tick = () => {
    if (n > 0) {
      count.value = n;
      sound.count(false);
      n -= 1;
      countTimer = window.setTimeout(tick, 700);
    } else {
      count.value = 'GO!';
      sound.count(true);
      status.value = 'playing';
      game.value?.start();
      track('level_start', { sleigh_color: appStore.sleighColor, gifts: gifts.join(',') });
      countTimer = window.setTimeout(() => {
        count.value = 0;
      }, 600);
    }
  };
  tick();
}

function openTutorial() {
  const g = game.value;
  if (!g) return;
  g.startTutorial();
  selected.value = -1;
  tutorialOpen.value = true;
  status.value = 'tutorial';
  syncPause();
}

function closeTutorial() {
  sound.unlock();
  appStore.markTutorialSeen();
  appStore.forceTutorial = false;
  tutorialOpen.value = false;
  game.value?.endTutorial();
  selected.value = 0;
  if (landscape.value) status.value = 'waiting';
  else startCountdown();
}

const SWIPE = 28;
let pointerId = -1;
let startX = 0;
let startY = 0;
let thrown = false;
let pressedSlot = -1;

function onPointerDown(e: PointerEvent) {
  pointerId = e.pointerId;
  startX = e.clientX;
  startY = e.clientY;
  thrown = false;
  const hit = (e.target as HTMLElement).closest<HTMLElement>('[data-slot]');
  pressedSlot = hit ? Number(hit.dataset.slot) : -1;
}

function onPointerMove(e: PointerEvent) {
  if (e.pointerId !== pointerId || thrown) return;
  const dx = e.clientX - startX;
  const dy = e.clientY - startY;
  if (Math.abs(dx) < SWIPE || Math.abs(dx) < Math.abs(dy)) return;
  thrown = true;
  throwGift(dx < 0 ? -1 : 1);
}

function onPointerUp(e: PointerEvent) {
  if (e.pointerId !== pointerId) return;
  pointerId = -1;
  if (!thrown && pressedSlot >= 0) selectGift(pressedSlot);
  pressedSlot = -1;
}

function onPointerCancel(e: PointerEvent) {
  if (e.pointerId === pointerId) pointerId = -1;
  pressedSlot = -1;
}

function onVisibility() {
  syncPause();
}
watch(landscape, (v) => {
  syncPause();
  if (v && status.value === 'countdown') {
    window.clearTimeout(countTimer);
    count.value = 0;
    status.value = 'waiting';
  } else if (!v && status.value === 'waiting') startCountdown();
});

function goResult() {
  router.replace({ name: 'ResultPage', query: route.query });
}

onMounted(async () => {
  document.addEventListener('visibilitychange', onVisibility);

  try {
    if (!appStore.quality) {
      const result = detectQuality();
      appStore.quality = result.settings;
      appStore.webgl2 = result.webgl2;
    }
    const settings = { ...appStore.quality };
    const instance = await SleighGame.create(
      stageRef.value as HTMLDivElement,
      settings,
      {
        onDistance: (v) => {
          distance.value = v;
        },
        onSpeed: (v) => {
          speed.value = v;
        },
        onMistakes: (v) => {
          mistakes.value = v;
        },
        onDelivered: (v) => {
          delivered.value = v;
        },
        onFeedback: (type) => {
          if (type === 'good') goodFlash.value += 1;
          else errorFlash.value += 1;
          if (tutorialOpen.value) tutorialRef.value?.onFeedback(type);
        },
        onGameOver: (result) => {
          sound.stopMusic();
          appStore.submitResult(result);
          status.value = 'over';
          resultTimer = window.setTimeout(goResult, 1800);
          trackGameOver(result);
        },
        onQualityChange: (s) => {
          qualityToast.value = `偵測到效能不足，已自動降低畫質（${TIER_LABEL[s.tier]}）`;
          window.clearTimeout(toastTimer);
          toastTimer = window.setTimeout(() => {
            qualityToast.value = '';
          }, 2500);
        },
      },
      gifts,
      false,
      appStore.sleighColor,
    );
    if (disposed) {
      instance.dispose();
      return;
    }
    game.value = instance;
    if (process.env.DEV) (window as unknown as { game: SleighGame }).game = instance;
    sound.unlock();
    sound.startMusic();
    syncPause();
    if (!appStore.tutorialSeen || appStore.forceTutorial) {
      openTutorial();
    } else if (landscape.value) {
      status.value = 'waiting';
    } else {
      startCountdown();
    }
  } catch (e) {
    console.error(e);
    captureException(e, {
      tags: { stage: 'game-init', webgl2: String(appStore.webgl2) },
      extra: { quality: appStore.quality },
    });
    errorMessage.value = '此裝置無法啟動 3D 繪圖（需要 WebGL2），請更新瀏覽器後再試。';
  }
});

onBeforeUnmount(() => {
  disposed = true;
  document.removeEventListener('visibilitychange', onVisibility);
  window.clearTimeout(toastTimer);
  window.clearTimeout(resultTimer);
  window.clearTimeout(countTimer);
  sound.stopMusic(0.8);
  game.value?.dispose();
});
</script>

<style scoped>
.sky {
  background: var(--c-black);
}
.stars {
  opacity: 0.35;
  mask-image: linear-gradient(to bottom, black 0%, transparent 45%);
  -webkit-mask-image: linear-gradient(to bottom, black 0%, transparent 45%);
}
.moon {
  top: 7%;
  right: 12%;
  width: 16%;
  aspect-ratio: 1;
  border-radius: 50%;
  box-shadow: 0 0 40px var(--c-white-20);
}

.hud-pill {
  border: 2px solid var(--c-black);
  border-radius: 999px;
  background: var(--c-white);
}
.bell {
  transition:
    opacity 0.3s,
    transform 0.4s cubic-bezier(0.3, 1.8, 0.5, 1);
}
.bell-lost {
  opacity: 0.2;
  filter: grayscale(1);
  transform: scale(0.75) rotate(-20deg);
}

.sack-area {
  touch-action: none;
}
.corner-gauge {
  z-index: 2;
  padding: 0 0.35rem 0.35rem 0;
}
.corner-gauge :deep(.gauge) {
  width: 4.6rem;
}
.sack-backdrop {
  position: absolute;
  left: 6%;
  right: 6%;
  bottom: 0;
  aspect-ratio: 2 / 1;
  border-radius: 50% 50% 0 0 / 100% 100% 0 0;
  background: var(--c-black);
  box-shadow: 0 -3px 0 var(--c-white-20);
}
.sack-area .sack {
  width: 66%;
  margin: 0 auto -8%;
}
.sack-gift {
  position: absolute;
  width: 60%;
  aspect-ratio: 1;
  margin-left: -30%;
  transform-origin: 50% 100%;
  transition:
    transform 0.25s ease-out,
    filter 0.25s ease-out;
}
.sack-gift.gift-off {
  filter: saturate(0.35) brightness(0.6);
}
.sack-gift.gift-on {
  transform: translateY(-20%) scale(1.25);
  animation: gift-hop 0.55s cubic-bezier(0.3, 1.4, 0.5, 1);
}
@keyframes gift-hop {
  0% {
    transform: translateY(0) scale(1.05, 0.9);
  }
  40% {
    transform: translateY(-30%) scale(1.18, 1.36);
  }
  70% {
    transform: translateY(-17%) scale(1.34, 1.16);
  }
  100% {
    transform: translateY(-20%) scale(1.25);
  }
}
.sack-hit {
  position: absolute;
  bottom: 0;
  width: 33.34%;
  height: 230%;
  touch-action: none;
}
.countdown {
  font-family: 'Fredoka', 'Noto Sans TC', sans-serif;
  font-size: var(--fs-display);
  line-height: 1;
  color: var(--c-white);
  text-shadow:
    0 5px 0 var(--c-red),
    0 9px 0 var(--c-black),
    0 0 24px var(--c-green-60);
  animation: count-in 0.6s cubic-bezier(0.3, 1.8, 0.5, 1) both;
}
@keyframes count-in {
  from {
    transform: scale(0.2) rotate(-20deg);
    opacity: 0;
  }
}

.danger-edge {
  opacity: 0;
  background-image: radial-gradient(circle, var(--c-red) 0.8px, transparent 1px);
  background-size: 5px 5px;
  mask-image: radial-gradient(ellipse at 50% 50%, transparent 45%, black 90%);
  -webkit-mask-image: radial-gradient(ellipse at 50% 50%, transparent 45%, black 90%);
}
.danger-on {
  animation: danger 1.2s ease-in-out infinite;
}
@keyframes danger {
  50% {
    opacity: 0.8;
  }
}
.error-flash {
  opacity: 0;
  background: linear-gradient(to right, var(--c-red-60), transparent 22%),
    linear-gradient(to left, var(--c-red-60), transparent 22%);
  animation: error-flash 1s ease-in-out forwards;
}
.good-flash {
  background: linear-gradient(to right, var(--c-green-60), transparent 22%),
    linear-gradient(to left, var(--c-green-60), transparent 22%);
}
@keyframes error-flash {
  50% {
    opacity: 1;
  }
}
</style>

<style>
.bubble-layer {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}
.gift-bubble {
  position: absolute;
  left: 0;
  top: 0;
  padding-bottom: 1.4rem;
  transform-origin: 50% 100%;
  will-change: transform;
}
.gb-box {
  position: relative;
  width: 6rem;
  height: 6rem;
  transform-origin: 50% 120%;
  animation: gb-in 0.5s cubic-bezier(0.3, 1.8, 0.5, 1) both;
}
.gb-cloud {
  position: absolute;
  left: -12.5%;
  top: -4%;
  width: 125%;
  aspect-ratio: 100 / 95;
  overflow: visible;
}
.gb-cloud-edge {
  fill: none;
  stroke: var(--c-white);
  stroke-width: 8;
  stroke-linejoin: round;
}
.gb-cloud-body {
  fill: var(--c-white);
  stroke: var(--c-white);
  stroke-width: 5.5;
  stroke-linejoin: round;
}
@keyframes gb-in {
  from {
    transform: scale(0.2);
  }
}
.gb-gift {
  position: relative;
  z-index: 1;
  display: block;
  width: 100%;
  height: 100%;
}
.gb-mark {
  position: absolute;
  z-index: 2;
  top: -0.7rem;
  right: -0.7rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.8rem;
  height: 1.8rem;
  border: 3px solid var(--c-black);
  border-radius: 50%;
  color: var(--c-white);
  font-size: var(--fs-title);
  font-weight: 900;
  line-height: 1;
  animation: gb-pop 0.45s cubic-bezier(0.3, 1.8, 0.5, 1) both;
}
.gift-bubble[data-state='done'] .gb-mark {
  background: var(--c-green);
}
.gift-bubble[data-state='done'] .gb-box {
  animation: gb-happy 0.6s cubic-bezier(0.3, 1.6, 0.5, 1);
}
.gift-bubble[data-state='wrong'] .gb-mark {
  background: var(--c-red);
}
.gift-bubble[data-state='wrong'] .gb-box {
  animation: gb-shake 0.45s ease-in-out;
}
.gift-bubble[data-state='missed'] .gb-box {
  filter: grayscale(1);
  opacity: 0.5;
}
.gift-bubble[data-state='missed'] .gb-mark {
  background: var(--c-white-20);
}
@keyframes gb-pop {
  from {
    transform: scale(0);
  }
}
@keyframes gb-happy {
  30% {
    transform: scale(1.25, 0.85);
  }
  55% {
    transform: scale(0.9, 1.15) translateY(-10%);
  }
  80% {
    transform: scale(1.05, 0.95);
  }
}
@keyframes gb-shake {
  20%,
  60% {
    transform: translateX(-6px) rotate(-8deg);
  }
  40%,
  80% {
    transform: translateX(6px) rotate(8deg);
  }
}
</style>
