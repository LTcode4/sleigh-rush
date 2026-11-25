<template>
  <q-layout>
    <div class="app-shell">
      <q-page-container ref="stageRef" class="app-container">
        <router-view v-slot="{ Component }">
          <transition
            appear
            :css="!homeToSleigh"
            :mode="homeToSleigh ? undefined : 'out-in'"
            enter-active-class="animated fadeIn slow"
            leave-active-class="animated fadeOut slow"
            v-on="homeToSleigh ? { leave: homeLeave, enter: onSleighEnter } : {}">
            <component v-if="isLoaded" :is="Component" class="w-full flex-grow" />
            <div v-else>
              <div class="fixed-center">
                <q-spinner color="red" size="100px" />
              </div>
            </div>
          </transition>
        </router-view>
      </q-page-container>
    </div>
    <RotateHint />
  </q-layout>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { QSpinner, useQuasar } from 'quasar';
import { captureException } from '@sentry/vue';
import { Preloader } from 'src/utils/preloader';
import RotateHint from 'components/RotateHint.vue';
import { homeLeave, killPageTransition, sleighEnter } from 'src/utils/page-transition';
import { LANDSCAPE_TOUCH_QUERY } from 'src/utils/orientation';

const isLoaded = ref(false);

const homeToSleigh = ref(false);
const router = useRouter();
const removeGuard = router.beforeEach((to, from) => {
  killPageTransition();
  homeToSleigh.value = from.name === 'HomePage' && to.name === 'SleighPage';
});
onBeforeUnmount(removeGuard);

function onSleighEnter(el: Element, done: () => void) {
  sleighEnter(el, () => {
    homeToSleigh.value = false;
    done();
  });
}
const $q = useQuasar();

const BASE_W = 375;
const BASE_H = 667;
const stageRef = ref<{ $el: HTMLElement }>();
let stageObserver: ResizeObserver | null = null;

function fitRootFont(el: HTMLElement) {
  if (window.matchMedia(LANDSCAPE_TOUCH_QUERY).matches) {
    document.documentElement.style.fontSize = '16px';
    return;
  }
  const scale = Math.min(el.clientWidth / BASE_W, el.clientHeight / BASE_H);
  const clamped = Math.min(1.25, Math.max(0.45, scale));
  document.documentElement.style.fontSize = `${(16 * clamped).toFixed(2)}px`;
}

onMounted(() => {
  const el = stageRef.value?.$el;
  if (!el) return;
  fitRootFont(el);
  stageObserver = new ResizeObserver(() => fitRootFont(el));
  stageObserver.observe(el);
});
onBeforeUnmount(() => stageObserver?.disconnect());

onMounted(async () => {
  const preloader = new Preloader();
  await preloader.loadAll().catch((e: Error) => {
    captureException(e, { tags: { stage: 'preload' } });
    $q.notify({
      message: '網頁有新的內容，重新整理取得新版本',
      timeout: 0,
      position: 'top',
      actions: [
        {
          label: '重新整理',
          color: 'white',
          handler: () => {
            window.location.reload();
          },
        },
      ],
    });
  });
  isLoaded.value = true;
});
</script>
<style lang="scss">
$main-bg-color: #000;
$secondary-bg-color: #000;
body {
  background: $secondary-bg-color;
  color: #fff;
  font-size: 20px;
  font-weight: 400;
  line-height: 1.5;
  letter-spacing: 0em;
  text-align: center;
}
.main-bg {
  background-size: cover;
  background-position: center top;
  background-repeat: no-repeat;
}
.app-shell {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.app-container {
  position: relative;
  flex: none;
  box-sizing: border-box;
  overflow: hidden;
  background: $main-bg-color;
  > div {
    width: 100%;
    height: 100%;
  }
  .q-page {
    height: 100%;
    min-height: 0 !important;
  }
}

.app-shell {
  padding: 2vh;
}
.app-container {
  height: 100%;
  max-width: 100%;
  aspect-ratio: 9 / 16;
  border: 1px solid rgba(232, 65, 60, 0.6);
  box-shadow: 0 0 24px rgba(232, 65, 60, 0.2);
}
@supports (container-type: size) {
  .app-shell {
    container-type: size;
  }
  .app-container {
    aspect-ratio: auto;
    width: min(100cqw, calc(100cqh * 9 / 16));
    height: min(100cqh, calc(100cqw * 16 / 9));
  }
}

@media (hover: none) and (pointer: coarse) {
  .app-shell {
    padding: 0;
  }
  .app-container {
    width: 100%;
    height: 100%;
    max-width: 75vh;
    aspect-ratio: auto;
    border: none;
    box-shadow: none;
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
  }
  @supports (container-type: size) {
    .app-container {
      max-width: none;
      width: min(100cqw, calc(100cqh * 3 / 4));
      height: 100cqh;
    }
  }
}
</style>
