<template>
  <div ref="el" class="sleigh-preview" />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Group, Mesh, PerspectiveCamera, Scene, SphereGeometry, Timer, WebGLRenderer } from 'three';
import { createDitherMaterial, sceneUniforms } from 'src/game/dither';
import { SleighColor, createSleigh } from 'src/game/world';

const props = defineProps<{ color: SleighColor; active: boolean; still?: boolean }>();

const PREVIEW_GIFTS = ['square-red', 'heart-green'] as const;
const STILL_ANGLE = 2.8;
const PIXEL_SIZE = 2;

const el = ref<HTMLDivElement>();
let renderer: WebGLRenderer | null = null;
let scene: Scene | null = null;
let observer: ResizeObserver | null = null;
let spin = props.active ? 1 : 0;
let hop = 0;

watch(
  () => props.active,
  (v) => {
    if (v) hop = 1;
  },
);

onMounted(() => {
  const host = el.value;
  if (!host) return;
  try {
    renderer = new WebGLRenderer({ antialias: false, alpha: true });
  } catch {
    return;
  }
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.style.imageRendering = 'pixelated';
  host.appendChild(canvas);

  scene = new Scene();
  const camera = new PerspectiveCamera(30, 1, 0.1, 60);
  camera.position.set(5.2, 3.6, 5.4);
  camera.lookAt(0, 0.8, -0.7);

  if (!props.still) {
    const pad = new Mesh(
      new SphereGeometry(1, 24, 12),
      createDitherMaterial({ albedo: 0.9, emissive: 0.25 }),
    );
    pad.scale.set(2.6, 0.22, 3.4);
    pad.position.set(0, -0.12, -0.7);
    scene.add(pad);
  }

  const turntable = new Group();
  turntable.position.z = -0.7;
  scene.add(turntable);
  const sleigh = createSleigh([...PREVIEW_GIFTS], props.color);
  sleigh.root.position.z = 0.7;
  turntable.add(sleigh.root);

  const resize = () => {
    if (!renderer) return;
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    renderer.setPixelRatio(1 / PIXEL_SIZE);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const stage = scene;

  if (props.still) {
    turntable.rotation.y = STILL_ANGLE;
    sleigh.armL.rotation.set(0.8, 0, -0.55);
    sleigh.armR.rotation.set(0.8, 0, 0.25);
    const drawOnce = () => {
      if (!renderer) return;
      const { light, lightPower, fade, bend } = sceneUniforms;
      const saved = {
        light: light.value.clone(),
        power: lightPower.value,
        fade: fade.value,
        bx: bend.value.x,
      };
      light.value.set(3, 4, 4);
      lightPower.value = 1.3;
      fade.value = 1;
      bend.value.x = 0;
      renderer.render(stage, camera);
      light.value.copy(saved.light);
      lightPower.value = saved.power;
      fade.value = saved.fade;
      bend.value.x = saved.bx;
    };
    observer = new ResizeObserver(() => {
      resize();
      drawOnce();
    });
    observer.observe(host);
    resize();
    drawOnce();
    return;
  }

  observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  const timer = new Timer();
  renderer.setAnimationLoop((now: number) => {
    if (!renderer) return;
    timer.update(now);
    const dt = Math.min(timer.getDelta(), 0.05);
    const t = timer.getElapsed();
    spin += ((props.active ? 1 : 0) - spin) * Math.min(1, dt * 4);
    turntable.rotation.y += dt * (0.35 + spin * 0.9);
    hop = Math.max(0, hop - dt * 2.2);
    const jump = Math.sin((1 - hop) * Math.PI) * hop;
    turntable.position.y = jump * 0.6;
    turntable.scale.set(1 + jump * 0.08, 1 - jump * 0.08, 1 + jump * 0.08);
    sleigh.body.position.y = Math.abs(Math.sin(t * 6)) * 0.05 * spin;
    sleigh.deer.forEach((d) => {
      const gallop = t * 9;
      d.root.position.y = Math.abs(Math.sin(gallop)) * 0.14 * spin;
      d.legs.forEach((leg, j) => {
        // eslint-disable-next-line no-param-reassign
        leg.rotation.x = Math.sin(gallop + (j < 2 ? 0 : Math.PI)) * 0.7 * spin;
      });
    });
    sleigh.armL.rotation.set(0.8, 0, -0.25 - spin * 0.6 * Math.abs(Math.sin(t * 4)));
    sleigh.armR.rotation.set(0.8, 0, 0.25);
    Object.values(sleigh.peeks).forEach((g) => {
      // eslint-disable-next-line no-param-reassign
      g.rotation.y += dt * 1.6;
    });

    sceneUniforms.light.value.set(3, 4, 4);
    sceneUniforms.lightPower.value = 1.3;
    sceneUniforms.fade.value = 1;
    sceneUniforms.bend.value.x = 0;
    renderer.render(stage, camera);
  });
});

onBeforeUnmount(() => {
  observer?.disconnect();
  if (!renderer) return;
  renderer.setAnimationLoop(null);
  scene?.traverse((obj) => {
    const mesh = obj as unknown as {
      geometry?: { dispose: () => void };
      material?: { dispose: () => void };
    };
    mesh.geometry?.dispose();
    mesh.material?.dispose();
  });
  renderer.dispose();
  renderer.forceContextLoss();
  renderer.domElement.remove();
  renderer = null;
});
</script>

<style scoped>
.sleigh-preview {
  width: 100%;
  height: 100%;
}
</style>
