<template>
  <div v-if="modelValue" class="tutorial pointer-events-none absolute inset-0 z-30">
    <svg v-if="shade" class="absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <mask id="tut-hole">
          <rect width="100%" height="100%" fill="#fff" />
          <rect
            v-for="(s, i) in spots"
            :key="i"
            :x="s.x"
            :y="s.y"
            :width="s.w"
            :height="s.h"
            :rx="s.r"
            fill="#000" />
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="rgba(0,0,0,0.6)" mask="url(#tut-hole)" />
    </svg>

    <span
      v-for="(s, i) in spots"
      :key="`ring-${i}`"
      class="absolute ring"
      :style="{
        left: `${s.x}px`,
        top: `${s.y}px`,
        width: `${s.w}px`,
        height: `${s.h}px`,
        borderRadius: `${s.r}px`,
      }" />

    <div class="skip-anchor pointer-events-none absolute inset-x-0 bottom-0">
      <div class="skip-pos">
        <button
          class="skip chubby-btn pointer-events-auto bg-white px-3 py-0.5 text-body font-bold text-black"
          @pointerdown.stop
          @click="finish">
          略過 ›
        </button>
      </div>
    </div>

    <div
      v-if="gesture"
      :key="`g-${index}-${phase}`"
      class="gesture-at anim-rise absolute"
      :style="gestureStyle">
      <GestureHint :type="gesture" />
    </div>

    <p
      v-if="title && !isDone"
      :key="`t-${index}-${phase}`"
      class="tut-title anim-pop absolute text-title font-black tracking-widest"
      :style="titleStyle">
      {{ title }}
    </p>

    <div class="pointer-events-auto">
      <DropDialog :model-value="isDone">
        <XmasIcon
          name="gift-square-red"
          class="ready-gift anim-jelly pointer-events-none absolute" />
        <div class="flex flex-col items-center px-6 pb-6 pt-5 text-center">
          <SleighPreview :color="appStore.sleighColor" :active="false" still class="ready-sleigh" />
          <p class="mt-2 text-title font-black tracking-widest">準備好了嗎</p>
          <button
            class="chubby-btn mt-5 w-full bg-red py-2.5 text-title font-black tracking-widest text-white"
            @click="finish">
            開始送禮
          </button>
        </div>
      </DropDialog>
    </div>
  </div>
</template>

<script lang="ts">
export type TutorialAction = { type: 'pick'; slot: number } | { type: 'throw'; side: -1 | 1 };

export type TutorialTarget = 'bubble' | 'gift-0' | 'gift-1' | 'gift-2' | 'bells';
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import DropDialog from 'components/DropDialog.vue';
import GestureHint from 'components/GestureHint.vue';
import SleighPreview from 'components/SleighPreview.vue';
import XmasIcon from 'components/XmasIcon.vue';
import type { Feedback, SleighGame } from 'src/game/SleighGame';
import { useAppStore } from 'src/stores/app-store';

const appStore = useAppStore();

const props = defineProps<{
  modelValue: boolean;
  game?: SleighGame;
  locate: (target: TutorialTarget) => DOMRect | null;
}>();
const emit = defineEmits<{ (e: 'finish'): void }>();

const STEPS = [
  { id: 'left', side: -1, slot: 0 },
  { id: 'right', side: 1, slot: 1 },
  { id: 'rules', side: 0, slot: 0 },
  { id: 'done', side: 0, slot: 0 },
] as const;

type Phase = 'wait' | 'look' | 'pick' | 'throw' | 'fly' | 'good';

const LOOK_AT = 14;

const index = ref(0);
const phase = ref<Phase>('wait');
const step = computed(() => STEPS[index.value]);
const isDone = computed(() => step.value.id === 'done');

const TITLES: Partial<Record<Phase, string>> = {
  pick: '點同款禮物',
};

const title = computed(() => {
  const { id, side } = step.value;
  if (id === 'rules') return '失誤5次結束';
  if (phase.value === 'look') return id === 'left' ? '看要什麼禮物' : '換右邊試試';
  if (phase.value === 'throw') return side < 0 ? '往左滑丟出' : '往右滑丟出';
  return TITLES[phase.value] ?? '';
});

const shade = computed(
  () => step.value.id === 'rules' || !['wait', 'fly', 'good'].includes(phase.value),
);

const targets = computed<TutorialTarget[]>(() => {
  const { id, slot } = step.value;
  if (id === 'rules') return ['bells'];
  if (id === 'done') return [];
  if (phase.value === 'look') return ['bubble'];
  if (phase.value === 'pick') return [`gift-${slot}` as TutorialTarget];
  if (phase.value === 'throw') return ['bubble'];
  return [];
});

interface Spot {
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
}
const spots = ref<Spot[]>([]);
const pickAt = ref<{ x: number; y: number } | null>(null);
const bellsAt = ref<{ x: number; y: number } | null>(null);

const gesture = computed(() => {
  if (phase.value === 'pick' && step.value.id !== 'rules') return 'tap';
  if (phase.value === 'throw') return step.value.side < 0 ? 'swipe-left' : 'swipe-right';
  return null;
});

const gestureStyle = computed(() => {
  if (gesture.value === 'tap' && pickAt.value) {
    return { left: `${pickAt.value.x}px`, top: `${pickAt.value.y}px` };
  }
  return { left: '50%', top: '46%' };
});

const titleStyle = computed(() => {
  if (step.value.id === 'rules' && bellsAt.value) {
    return { left: '1rem', top: `${bellsAt.value.y}px`, textAlign: 'left' as const };
  }
  return { left: '1rem', right: '1rem', top: '60%', textAlign: 'center' as const };
});

let raf = 0;
let timer = 0;

function tick() {
  const { game } = props;
  if (!props.modelValue || !game) return;
  if (phase.value === 'wait') {
    const d = game.tutorialDistance();
    if (d !== null && d < LOOK_AT && game.tutorialBubble()) {
      game.setTimeScale(0);
      phase.value = 'look';
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        phase.value = 'pick';
      }, 1800);
    }
  }
  const pad = 8;
  spots.value = targets.value
    .map((t) => props.locate(t))
    .filter((r): r is DOMRect => !!r)
    .map((r) => ({
      x: r.left - pad,
      y: r.top - pad,
      w: r.width + pad * 2,
      h: r.height + pad * 2,
      r: Math.min(r.width, r.height) / 2 + pad,
    }));
  const gift = props.locate(`gift-${step.value.slot}` as TutorialTarget);
  pickAt.value = gift ? { x: gift.left + gift.width / 2, y: gift.top + gift.height * 0.4 } : null;
  const bells = props.locate('bells');
  bellsAt.value = bells ? { x: bells.left, y: bells.bottom + 14 } : null;
  raf = requestAnimationFrame(tick);
}

function enterStep() {
  const { game } = props;
  if (!game) return;
  window.clearTimeout(timer);
  game.setTimeScale(1);
  const { id, side, slot } = step.value;
  if (id === 'left' || id === 'right') {
    phase.value = 'wait';
    game.tutorialHouse(side, slot, 30);
  } else if (id === 'rules') {
    phase.value = 'wait';
    timer = window.setTimeout(next, 3200);
  }
}

function next() {
  if (index.value < STEPS.length - 1) {
    index.value += 1;
    enterStep();
  }
}

function finish() {
  cancelAnimationFrame(raf);
  window.clearTimeout(timer);
  props.game?.setTimeScale(1);
  emit('finish');
}

function allows(action: TutorialAction) {
  const { slot, side } = step.value;
  if (action.type === 'pick') return phase.value === 'pick' && action.slot === slot;
  return phase.value === 'throw' && action.side === side;
}

function notify(action: TutorialAction) {
  if (action.type === 'pick' && phase.value === 'pick') phase.value = 'throw';
  else if (action.type === 'throw' && phase.value === 'throw') {
    props.game?.setTimeScale(1);
    phase.value = 'fly';
  }
}

function onFeedback(type: Feedback) {
  if (step.value.id !== 'left' && step.value.id !== 'right') return;
  window.clearTimeout(timer);
  if (type === 'good') {
    phase.value = 'good';
    timer = window.setTimeout(next, 1300);
  } else {
    timer = window.setTimeout(enterStep, 600);
  }
}

watch(
  () => props.modelValue,
  (open) => {
    cancelAnimationFrame(raf);
    if (!open) return;
    index.value = 0;
    enterStep();
    raf = requestAnimationFrame(tick);
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  cancelAnimationFrame(raf);
  window.clearTimeout(timer);
});

defineExpose({ allows, notify, onFeedback });
</script>

<style scoped>
.ready-gift {
  z-index: 1;
  top: -4.6rem;
  left: -3rem;
  width: 11.5rem;
  height: 11.5rem;
  transform-origin: 50% 90%;
  filter: drop-shadow(0 6px 6px var(--c-black-60));
}
.ready-sleigh {
  width: 12rem;
  aspect-ratio: 5 / 4;
}
.skip-anchor {
  height: 0;
  padding-bottom: 54%;
}
.skip-pos {
  position: absolute;
  top: 0;
  right: 0.75rem;
  transform: translateY(-100%);
}
.ring {
  border: 3px dashed var(--c-green);
  box-shadow: 0 0 14px var(--c-green-60);
  animation: tut-ring 1s ease-in-out infinite;
}
@keyframes tut-ring {
  50% {
    transform: scale(1.06);
  }
}
.gesture-at {
  margin: -3.5rem 0 0 -3.5rem;
  z-index: 2;
}
.tut-title {
  z-index: 2;
  color: var(--c-white);
  text-shadow:
    0 3px 0 var(--c-black),
    0 0 12px var(--c-black);
}
</style>
