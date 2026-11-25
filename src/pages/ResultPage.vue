<template>
  <q-page
    v-if="result"
    class="relative h-full overflow-hidden bg-black text-white"
    @pointerdown="onPagePointer">
    <div class="sky pointer-events-none absolute inset-0" />
    <div class="dither-dots bg-dots pointer-events-none absolute inset-0" />
    <div class="moon pointer-events-none absolute">
      <DottedMoon color="var(--c-moon)" />
    </div>
    <SnowFall :count="24" />

    <SnowTown :houses="false" layer="back" />

    <GiftRain ref="rainRef" :order="result.order ?? []" @done="showInfo = true" />

    <button
      v-if="!showInfo"
      class="skip absolute inset-0"
      aria-label="略過動畫，直接看結果"
      @click="showInfo = true" />

    <SnowTown :houses="false" layer="front" />

    <div v-if="showInfo" class="scrim pointer-events-none absolute inset-0" />
    <div v-if="showInfo" class="relative flex h-full flex-col items-center px-5 pb-[6%] pt-[8%]">
      <div class="flex w-full flex-1 flex-col items-center justify-center">
        <div class="anim-rise flex flex-col items-center">
          <SleighPreview :color="appStore.sleighColor" :active="false" still class="sleigh" />
          <p class="headline mt-2 text-title font-black tracking-[0.3em]">平安夜任務結束</p>
        </div>

        <div
          class="tag anim-rise relative mt-6 w-[80%] max-w-[18rem]"
          style="animation-delay: 0.15s">
          <div class="tag-inner flex flex-col items-center px-4 py-4">
            <p class="text-body tracking-[0.4em] text-white/60">分數</p>
            <p class="score mt-1 font-mono font-bold leading-none">
              {{ shownScore.toLocaleString() }}
            </p>
          </div>
        </div>

        <div class="mt-4 grid w-full max-w-[18rem] grid-cols-2 gap-3">
          <div
            class="stat anim-rise flex flex-col items-center py-3"
            style="animation-delay: 0.35s">
            <span class="font-mono text-title font-bold leading-none">
              {{ result.delivered }}
            </span>
            <span class="mt-1.5 text-body text-white/60">答對禮物</span>
          </div>
          <div
            class="stat anim-rise flex flex-col items-center py-3"
            style="animation-delay: 0.45s">
            <span class="font-mono text-title font-bold leading-none">
              {{ result.distance.toLocaleString() }}<span class="ml-0.5 text-body">m</span>
            </span>
            <span class="mt-1.5 text-body text-white/60">距離</span>
          </div>
        </div>
      </div>

      <div class="flex w-full max-w-[20rem] gap-3 pt-3">
        <button
          class="chubby-btn flex-1 bg-white py-2.5 text-body font-bold text-black"
          @click="goHome">
          回首頁
        </button>
        <button
          class="chubby-btn flex-1 bg-red py-2.5 text-body font-black text-white"
          @click="retry">
          再玩一次
        </button>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import DottedMoon from 'components/DottedMoon.vue';
import GiftRain from 'components/GiftRain.vue';
import SleighPreview from 'components/SleighPreview.vue';
import SnowFall from 'components/SnowFall.vue';
import SnowTown from 'components/SnowTown.vue';
import { useAppStore } from 'src/stores/app-store';
import { scoreOf } from 'src/game/score';

const router = useRouter();
const appStore = useAppStore();
const result = computed(() => appStore.lastResult);

if (!appStore.lastResult) router.replace({ name: 'HomePage' });

const score = computed(() => (result.value ? scoreOf(result.value) : 0));

const showInfo = ref(false);

const rainRef = ref<InstanceType<typeof GiftRain>>();
function onPagePointer(e: PointerEvent) {
  if (!showInfo.value || (e.target as HTMLElement).closest('button')) return;
  rainRef.value?.poke(e.clientX, e.clientY);
}

const shownScore = ref(0);
let raf = 0;
watch(showInfo, (v) => {
  if (!v) return;
  const target = score.value;
  const start = performance.now();
  const duration = Math.min(1600, 400 + target * 0.5);
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    shownScore.value = Math.round(target * (1 - (1 - t) ** 3));
    if (t < 1) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
});
onBeforeUnmount(() => cancelAnimationFrame(raf));

function retry() {
  router.replace({ name: 'GamePage', query: router.currentRoute.value.query });
}

function goHome() {
  router.replace({ name: 'HomePage', query: router.currentRoute.value.query });
}
</script>

<style scoped>
.sky {
  background: var(--c-black);
}
.skip {
  z-index: 1;
}
.scrim {
  background: var(--c-black-60);
  animation: anim-fade-in 0.5s both;
}
@keyframes anim-fade-in {
  from {
    opacity: 0;
  }
}
.moon {
  --c-moon: #f4f4f4;
  top: 4%;
  right: 6%;
  width: 26%;
  aspect-ratio: 1;
  border-radius: 50%;
  box-shadow: 0 0 40px var(--c-white-20);
}
.bg-dots {
  opacity: 0.18;
  mask-image: radial-gradient(ellipse at 50% 30%, black 0%, transparent 70%);
  -webkit-mask-image: radial-gradient(ellipse at 50% 30%, black 0%, transparent 70%);
}
.sleigh {
  width: 12rem;
  aspect-ratio: 5 / 4;
}
.headline {
  text-shadow: 0 3px 0 var(--c-red);
}

.tag {
  transform-origin: top center;
}
.tag-inner {
  position: relative;
  border: 3px solid var(--c-white);
  border-radius: 1.8rem;
  background:
    radial-gradient(circle, var(--c-white-20) 0.6px, transparent 0.9px) 0 0 / 3px 3px,
    var(--c-green);
  box-shadow:
    0 7px 0 var(--c-black),
    0 12px 24px var(--c-black-60);
  animation: tag-swing 4s ease-in-out infinite;
}
@keyframes tag-swing {
  0%,
  100% {
    transform: rotate(-1.5deg);
  }
  50% {
    transform: rotate(1.5deg);
  }
}
.score {
  font-size: var(--fs-display);
  text-shadow:
    0 4px 0 var(--c-red),
    0 7px 0 var(--c-black);
}
.stat {
  border: 2px solid var(--c-white-20);
  border-radius: 1rem;
  background: var(--c-black-60);
}
</style>
