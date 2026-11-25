<template>
  <div
    v-if="landscape"
    class="rotate-hint fixed inset-0 z-[100] flex items-center justify-center bg-black">
    <SnowFall :count="18" />
    <div class="relative flex flex-col items-center gap-6 text-white">
      <div class="relative h-40 w-40">
        <span class="phone" />
        <XmasIcon name="gift-square-red" class="anim-jelly absolute -bottom-2 -right-6 h-16 w-16" />
      </div>
      <p class="text-title font-black tracking-widest">請轉成直的玩</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import SnowFall from 'components/SnowFall.vue';
import XmasIcon from 'components/XmasIcon.vue';
import { useLandscapeTouch } from 'src/utils/orientation';

const landscape = useLandscapeTouch();
</script>

<style scoped>
.phone {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 4.2rem;
  height: 7rem;
  margin: -3.5rem 0 0 -2.1rem;
  border: 4px solid var(--c-white);
  border-radius: 1.2rem;
  box-shadow: 0 5px 0 var(--c-red);
  animation: rotate-phone 2.4s cubic-bezier(0.3, 1.5, 0.5, 1) infinite;
}
.phone::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 0.4rem;
  width: 0.6rem;
  height: 0.6rem;
  margin-left: -0.3rem;
  border-radius: 50%;
  background: var(--c-white);
}
@keyframes rotate-phone {
  0%,
  20% {
    transform: rotate(-90deg);
  }
  55%,
  100% {
    transform: rotate(0deg);
  }
}
</style>
