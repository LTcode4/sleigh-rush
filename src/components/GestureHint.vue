<template>
  <div class="gesture pointer-events-none relative" :class="type">
    <template v-if="type === 'tap'">
      <span class="ripple" />
      <span class="ripple ripple-2" />
    </template>
    <template v-else>
      <span class="trail" />
      <span class="chevrons font-black">{{ type === 'swipe-left' ? '‹ ‹ ‹' : '› › ›' }}</span>
    </template>
    <XmasIcon name="hand" class="hand" />
  </div>
</template>

<script setup lang="ts">
import XmasIcon from 'components/XmasIcon.vue';

defineProps<{ type: 'tap' | 'swipe-left' | 'swipe-right' }>();
</script>

<style scoped>
.gesture {
  width: 7rem;
  height: 7rem;
}
.hand {
  position: absolute;
  left: calc(50% - 1.25rem);
  top: 50%;
  width: 2.6rem;
  height: 3.1rem;
}

.tap .hand {
  animation: press 1.2s ease-in-out infinite;
}
@keyframes press {
  0%,
  100% {
    transform: translate(0, 10px);
  }
  35%,
  55% {
    transform: translate(0, 0) scale(0.92);
  }
}
.ripple {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 3.2rem;
  height: 3.2rem;
  margin: -1.6rem 0 0 -1.6rem;
  border: 3px solid var(--c-green);
  border-radius: 50%;
  opacity: 0;
  animation: ripple 1.2s ease-out infinite;
}
.ripple-2 {
  animation-delay: 0.15s;
  border-color: var(--c-white);
}
@keyframes ripple {
  0%,
  35% {
    opacity: 0;
    transform: scale(0.3);
  }
  40% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: scale(1.4);
  }
}

.swipe-left .hand {
  animation: swipe-left 1.4s cubic-bezier(0.5, 0, 0.3, 1) infinite;
}
.swipe-right .hand {
  animation: swipe-right 1.4s cubic-bezier(0.5, 0, 0.3, 1) infinite;
}
@keyframes swipe-left {
  0% {
    opacity: 0;
    transform: translateX(3rem);
  }
  15% {
    opacity: 1;
    transform: translateX(3rem);
  }
  75% {
    opacity: 1;
    transform: translateX(-3rem);
  }
  100% {
    opacity: 0;
    transform: translateX(-3rem);
  }
}
@keyframes swipe-right {
  0% {
    opacity: 0;
    transform: translateX(-3rem);
  }
  15% {
    opacity: 1;
    transform: translateX(-3rem);
  }
  75% {
    opacity: 1;
    transform: translateX(3rem);
  }
  100% {
    opacity: 0;
    transform: translateX(3rem);
  }
}
.trail {
  position: absolute;
  top: calc(50% - 2px);
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(to var(--dir), transparent, var(--c-green));
}
.swipe-left .trail {
  --dir: left;
  right: 0.5rem;
  animation: trail-left 1.4s cubic-bezier(0.5, 0, 0.3, 1) infinite;
}
.swipe-right .trail {
  --dir: right;
  left: 0.5rem;
  animation: trail-right 1.4s cubic-bezier(0.5, 0, 0.3, 1) infinite;
}
@keyframes trail-left {
  0%,
  15% {
    width: 0;
    opacity: 1;
  }
  75% {
    width: 6rem;
    opacity: 1;
  }
  100% {
    width: 6rem;
    opacity: 0;
  }
}
@keyframes trail-right {
  0%,
  15% {
    width: 0;
    opacity: 1;
  }
  75% {
    width: 6rem;
    opacity: 1;
  }
  100% {
    width: 6rem;
    opacity: 0;
  }
}
.chevrons {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(50% - 2.4rem);
  text-align: center;
  font-size: var(--fs-title);
  letter-spacing: 0.2em;
  color: var(--c-green);
  animation: anim-glow 1.4s ease-in-out infinite;
}
</style>
