<template>
  <q-page class="relative h-full overflow-hidden bg-black text-white">
    <div data-intro="bg" class="dither-dots stars pointer-events-none absolute inset-0" />
    <SnowFall data-intro="bg" :count="24" />

    <SnowTown />

    <div class="relative flex h-full flex-col items-center px-5 pb-[8%] pt-[10%]">
      <p data-intro="head" class="anim-rise font-xmas text-body tracking-[0.4em] text-white/60">
        CHOOSE YOUR SLEIGH
      </p>
      <h1 data-intro="head" class="headline anim-rise mt-2 text-title font-black tracking-widest">
        選擇你的雪橇
      </h1>

      <div class="mt-8 grid w-full max-w-[22rem] grid-cols-2 gap-3">
        <button
          v-for="(c, i) in COLORS"
          :key="c.id"
          data-intro="card"
          class="card anim-rise flex flex-col items-center pb-3"
          :class="[`card-${c.id}`, { 'card-on': selected === c.id }]"
          :style="{ animationDelay: `${0.15 + i * 0.1}s` }"
          :aria-label="c.label"
          :aria-pressed="selected === c.id"
          @click="choose(c.id)">
          <CheckBadge
            v-if="selected === c.id"
            class="badge anim-pop"
            :color="c.id === 'green' ? 'var(--c-green)' : 'var(--c-red)'" />
          <SleighPreview :color="c.id" :active="selected === c.id" class="preview" />
          <span class="label mt-1 text-title font-black tracking-widest">{{ c.label }}</span>
        </button>
      </div>

      <button
        data-intro="go"
        class="go chubby-btn mt-auto w-60 max-w-full py-3 text-title font-black tracking-[0.3em] text-white"
        :class="selected === 'green' ? 'bg-green' : 'bg-red'"
        @click="start">
        出發！
      </button>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import CheckBadge from 'components/CheckBadge.vue';
import SleighPreview from 'components/SleighPreview.vue';
import SnowFall from 'components/SnowFall.vue';
import SnowTown from 'components/SnowTown.vue';
import { useAppStore } from 'src/stores/app-store';
import type { SleighColor } from 'src/game/world';
import { sound } from 'src/game/sound';

const COLORS: { id: SleighColor; label: string }[] = [
  { id: 'red', label: '紅色雪橇' },
  { id: 'green', label: '綠色雪橇' },
];

const router = useRouter();
const appStore = useAppStore();
const selected = ref<SleighColor>(appStore.sleighColor);

function choose(color: SleighColor) {
  sound.unlock();
  if (selected.value !== color) sound.count(false);
  selected.value = color;
}

function start() {
  sound.unlock();
  appStore.setSleighColor(selected.value);
  router.push({ name: 'GamePage', query: router.currentRoute.value.query });
}
</script>

<style scoped>
.stars {
  opacity: 0.2;
  mask-image: radial-gradient(ellipse at 50% 10%, black 0%, transparent 70%);
  -webkit-mask-image: radial-gradient(ellipse at 50% 10%, black 0%, transparent 70%);
}
.is-intro .anim-rise,
.is-intro .card,
.is-intro .go {
  animation: none;
  transition: none;
}
.intro-played .anim-rise {
  animation: none;
}

.headline {
  text-shadow: 0 3px 0 var(--c-red);
}

.card {
  position: relative;
  border: 3px solid var(--c-white-20);
  border-radius: 1.6rem;
  background: var(--c-black-60);
  box-shadow: 0 5px 0 var(--c-black-60);
  transition:
    transform 0.3s cubic-bezier(0.3, 1.8, 0.5, 1),
    border-color 0.2s;
}
.card:active {
  transform: translateY(3px) scale(1.03, 0.95);
}
.card-on {
  transform: translateY(-0.4rem) scale(1.04);
}
.card-red.card-on {
  border-color: var(--c-red);
  box-shadow:
    0 6px 0 var(--c-black),
    0 0 22px var(--c-red-60);
}
.card-green.card-on {
  border-color: var(--c-green);
  box-shadow:
    0 6px 0 var(--c-black),
    0 0 22px var(--c-green-60);
}
.card-red .label {
  color: var(--c-red);
}
.card-green .label {
  color: var(--c-green);
}
.preview {
  width: 100%;
  aspect-ratio: 4 / 5;
}
.badge {
  position: absolute;
  z-index: 2;
  top: -1.2rem;
  right: -1.2rem;
  width: 3.4rem;
  height: 3.4rem;
}

.go {
  animation: breathe 1.8s ease-in-out infinite;
}
.go:active {
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
