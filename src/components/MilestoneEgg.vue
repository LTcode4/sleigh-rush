<template>
  <div class="milestone-egg flex flex-col items-center">
    <div class="egg-scene relative w-full">
      <div class="egg-moon absolute">
        <DottedMoon color="var(--c-white-20)" />
      </div>
      <SnowFall :count="10" />
      <DotShape :parts="main.art" :delay="0.3" class="egg-main relative mx-auto" />
    </div>

    <p class="mt-4 text-title font-black leading-snug">
      <template v-if="distance">
        平安夜你{{ distance.lead }}<br />
        <span class="text-red">{{ distance.name }}</span>
        <span class="ml-1 text-body font-bold text-white/60">{{ distance.label }}</span>
      </template>
      <template v-else-if="speed">
        你的雪橇{{ speed.lead }}<br />
        <span class="text-red">{{ speed.name }}</span>
        還快<br />
        <span class="text-body font-bold text-white/60"
          >最高時速 {{ formatBig(topSpeed) }} km/h</span
        >
      </template>
    </p>

    <div
      v-if="distance && speed"
      class="egg-speed mt-4 flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left">
      <DotShape :parts="speed.art" :step="4" :delay="1.2" class="egg-speed-art shrink-0" />
      <p class="text-body leading-snug">
        最高時速 {{ formatBig(topSpeed) }} km/h<br />
        {{ speed.lead }}<span class="font-black text-red">{{ speed.name }}</span
        >還快
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import DotShape from 'components/DotShape.vue';
import DottedMoon from 'components/DottedMoon.vue';
import SnowFall from 'components/SnowFall.vue';
import {
  DISTANCE_MILESTONES,
  SPEED_MILESTONES,
  formatBig,
  reachedMilestone,
} from 'src/game/milestones';

const props = defineProps<{ distanceKm: number; topSpeed: number }>();

const distance = computed(() => reachedMilestone(DISTANCE_MILESTONES, props.distanceKm));
const speed = computed(() => reachedMilestone(SPEED_MILESTONES, props.topSpeed));
const main = computed(() => distance.value ?? speed.value ?? SPEED_MILESTONES[0]);
</script>

<style scoped>
.egg-scene {
  height: 13rem;
}
.egg-moon {
  top: 0.5rem;
  right: 0.5rem;
  width: 2.6rem;
  height: 2.6rem;
}
.egg-main {
  width: 13rem;
  height: 13rem;
}
.egg-speed {
  border: 2px solid var(--c-white-20);
}
.egg-speed-art {
  width: 3.5rem;
  height: 3.5rem;
}
</style>
