<template>
  <Transition name="dlg-fade">
    <div
      v-if="modelValue"
      class="absolute inset-0 z-40 bg-black/60"
      @pointerdown.stop
      @click="closable && close()" />
  </Transition>
  <Transition name="dlg-drop">
    <div
      v-if="modelValue"
      class="pointer-events-none absolute inset-0 z-50 flex items-center justify-center p-5">
      <div
        class="dlg-panel pointer-events-auto relative w-full max-w-[22rem] bg-black text-white"
        role="dialog"
        aria-modal="true"
        @pointerdown.stop>
        <span class="dlg-rope left-6" />
        <span class="dlg-rope right-6" />
        <slot />
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{ modelValue: boolean; closable?: boolean }>(), {
  closable: false,
});
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>();

function close() {
  if (props.closable) emit('update:modelValue', false);
}
</script>

<style scoped>
.dlg-panel {
  border: 3px solid var(--c-white);
  border-radius: 1.6rem;
  box-shadow:
    0 7px 0 var(--c-red),
    0 12px 24px var(--c-black-60);
}
.dlg-rope {
  position: absolute;
  bottom: 100%;
  width: 4px;
  height: 100vh;
  border-radius: 2px;
  background: var(--c-white-60);
}

.dlg-fade-enter-active,
.dlg-fade-leave-active {
  transition: opacity 0.3s;
}
.dlg-fade-enter-from,
.dlg-fade-leave-to {
  opacity: 0;
}

.dlg-drop-enter-active {
  animation: dlg-drop-in 0.75s cubic-bezier(0.3, 0.8, 0.4, 1) both;
}
.dlg-drop-leave-active {
  animation: dlg-drop-out 0.4s cubic-bezier(0.5, 0, 0.9, 0.5) both;
}
@keyframes dlg-drop-in {
  0% {
    transform: translateY(-120vh) rotate(-3deg);
  }
  60% {
    transform: translateY(14px) rotate(1.5deg);
  }
  78% {
    transform: translateY(-6px) rotate(-0.8deg);
  }
  90% {
    transform: translateY(2px) rotate(0.3deg);
  }
  100% {
    transform: none;
  }
}
@keyframes dlg-drop-out {
  to {
    transform: translateY(120vh) rotate(5deg);
  }
}
</style>
