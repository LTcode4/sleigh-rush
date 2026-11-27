import {
  InstancedMesh,
  Mesh,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Timer,
  Vector3,
  WebGLRenderer,
} from 'three';
import {
  CLEAR_COLOR,
  bendPoint,
  createShadowMaterial,
  sceneUniforms,
  setDitherEmissive,
  setDitherOpacity,
} from './dither';
import { GiftShape } from './gifts';
import { giftHoleFractions, iconSvg } from './icons';
import { magicKm, magicKmh } from './milestones';
import { QualitySettings, degrade } from './quality';
import { sound } from './sound';
import {
  HOUSE_X,
  HouseView,
  ROAD_HALF,
  SACK_TOP,
  SleighColor,
  Sleigh,
  createForest,
  createGiftSet,
  createPuff,
  Puff,
  createGround,
  createHouse,
  createLamps,
  createSleigh,
  createSnow,
  HOUSE_VARIANTS,
} from './world';

export type Side = -1 | 1;

export interface ShapeStat {
  shape: GiftShape;
  delivered: number;
}

export interface GameResult {
  distance: number;
  distanceKm: number;
  delivered: number;
  wrong: number;
  missed: number;
  thrown: number;
  maxCombo: number;
  topSpeed: number;
  time: number;
  gifts: ShapeStat[];
  order: GiftShape[];
}

export interface AssistInfo {
  side: Side;
  slot: number;
}

export type Feedback = 'good' | 'wrong' | 'miss';

export interface TargetInfo {
  shape: GiftShape;
  remain: number;
}

export interface GameEvents {
  onDistance?: (km: number) => void;
  onSpeed?: (kmh: number) => void;
  onMistakes?: (n: number) => void;
  onDelivered?: (n: number) => void;
  onCombo?: (n: number) => void;
  onFeedback?: (type: Feedback, side: Side) => void;
  onTargets?: (left: TargetInfo | null, right: TargetInfo | null) => void;
  onAssist?: (info: AssistInfo | null) => void;
  onGameOver?: (result: GameResult) => void;
  onQualityChange?: (settings: QualitySettings) => void;
}

export const MAX_MISTAKES = 5;
const M_PER_UNIT = 2;
const SPEED_MIN = 6.5;
const SPEED_MAX = 17.5;
const DIFF_DISTANCE = 1000;
const PASS_Z = 3;
const SPAWN_AHEAD = 80;
const BUBBLE_SHOW = 25;
const BUBBLE_BOX_REM = 6;
const BUBBLE_PAD_REM = 1.4;
const THROW_COOLDOWN = 0.18;
const HOVER = 1.1;
const GIFT_SPIN = 1.6;
const RESULT_SHOW = 0.8;
const BUBBLE_FADE = 7;
const ASSIST_HOUSES = 2;
const ASSIST_Z = 14;
const ASSIST_SLOWMO = 0.06;
const DECOR_CHANCE = 0.15;
const HOUSE_GAP = [18, 26];
const PAIR_FROM = 0.25;
const PAIR_CHANCE_MAX = 0.4;
const PAIR_OFFSET = [1.5, 4];
const HOUSE_POOL = 12;
const LAMP_SPACING = 14;
const LAMPS_PER_SIDE = 7;
const FLIGHT_POOL = 6;
const PUFF_POOL = 6;
const PUFF_TIME = 0.55;

const CAM_BACK = 5.8;
const CAM_UP = 3.4;
const LOOK_AHEAD = 10;
const LOOK_UP = 1.6;

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const randInt = (a: number, b: number) => Math.floor(rand(a, b + 1));
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

type HouseState = 'pending' | 'done' | 'wrong' | 'missed' | 'decor';

interface House {
  view: HouseView;
  active: boolean;
  side: Side;
  z: number;
  want: GiftShape | null;
  state: HouseState;
  incoming: number;
  door: Vector3;
  anchor: Vector3;
  bubble: HTMLDivElement;
  bubbleKey: string;
  boing: number;
  wobble: number;
  pop: number;
  popShape: GiftShape | null;
  bubbleAlpha: number;
  onScreen: boolean;
  resolvedT: number;
}

interface PuffState extends Puff {
  active: boolean;
  t: number;
  dirs: Vector3[];
}

const easeOutBack = (t: number) => {
  const c = 1.9;
  return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
};

interface Flight {
  root: Object3D;
  shapes: Record<GiftShape, Object3D>;
  active: boolean;
  shape: GiftShape;
  from: Vector3;
  to: Vector3;
  t: number;
  dur: number;
  arc: number;
  house: House | null;
}

const CLOUD_D =
  'M24 72C10 72 4 60 10 50C2 42 8 26 22 28C24 14 40 8 52 16C60 4 82 8 84 24' +
  'C98 26 100 46 90 54C96 66 84 76 72 72C66 80 52 80 46 74C40 80 28 78 24 72Z';
const CLOUD_PUFFS = '<circle cx="50" cy="84" r="5"/><circle cx="44" cy="91.5" r="2.8"/>';
const CLOUD_LEFT = -0.125;
const CLOUD_TOP = -0.04;
const CLOUD_W = 1.25;
let cloudSeq = 0;

function cloudSvg(shape: GiftShape) {
  cloudSeq += 1;
  const id = `gb-hole-${cloudSeq}`;
  const holes = giftHoleFractions(shape)
    .map(
      (poly) =>
        `M${poly
          .map(([fx, fy]) => {
            const x = ((fx - CLOUD_LEFT) / CLOUD_W) * 100;
            const y = ((fy - CLOUD_TOP) / CLOUD_W) * 100;
            return `${x.toFixed(1)} ${y.toFixed(1)}`;
          })
          .join('L')}Z`,
    )
    .join('');
  return (
    '<svg class="gb-cloud" viewBox="0 0 100 95" aria-hidden="true">' +
    `<defs><clipPath id="${id}"><path clip-rule="evenodd" d="M-20 -20H120V120H-20Z${holes}"/></clipPath></defs>` +
    `<g clip-path="url(#${id})">` +
    `<g class="gb-cloud-edge"><path d="${CLOUD_D}"/>${CLOUD_PUFFS}</g>` +
    `<g class="gb-cloud-body"><path d="${CLOUD_D}"/>${CLOUD_PUFFS}</g></g></svg>`
  );
}

function backOut(t: number) {
  const c1 = 2.2;
  const u = t - 1;
  return 1 + (c1 + 1) * u * u * u + c1 * u * u;
}

const v1 = new Vector3();

export class SleighGame {
  readonly renderer: WebGLRenderer;

  private scene = new Scene();

  private camera = new PerspectiveCamera(68, 1, 0.1, 140);

  private baseFov = 68;

  private timer = new Timer();

  private sleigh: Sleigh;

  private ground: Mesh;

  private forest: InstancedMesh[];

  private treeZ: number[] = [];

  private lamps: InstancedMesh[];

  private lampZ: number[] = [];

  private snow: InstancedMesh;

  private snowPos: Vector3[] = [];

  private houses: House[] = [];

  private flights: Flight[] = [];

  private puffs: PuffState[] = [];

  private bubbleLayer: HTMLDivElement;

  private dummy = new Object3D();

  private resizeObserver: ResizeObserver;

  private viewW = 1;

  private viewH = 1;

  private bubbleBox = 96;

  readonly gifts: GiftShape[];

  private running = false;

  private over = false;

  private paused = false;

  private timeScale = 1;

  private travel = 0;

  private speed = 0;

  private elapsed = 0;

  private mistakes = 0;

  private delivered = 0;

  private wrong = 0;

  private missed = 0;

  private thrown = 0;

  private combo = 0;

  private maxCombo = 0;

  private byShape: Record<string, number> = {};

  private order: GiftShape[] = [];

  private houseCount = 0;

  private nextHouseZ = 0;

  private nextSide: Side = -1;

  private sideStreak = 0;

  private cooldown = 0;

  private assistLeft = 0;

  private tutorial = false;

  private tutorialTarget: House | null = null;

  private assistHouse: House | null = null;

  private shownDistance = -1;

  private shownSpeed = -1;

  private shownTargets = '';

  private overT = 0;

  private throwT = 0;

  private throwSide: Side = 1;

  private sackT = 0;

  private hopShape: GiftShape | null = null;

  private wobbleT = 0;

  private wobbleDur = 1;

  private wobbleAmp = 1;

  private nextWobble = 3;

  private shadows: { mesh: Mesh; mat: ShaderMaterial }[] = [];

  private lastFrame = 0;

  private perfFrames = 0;

  private perfTime = 0;

  private slowWindows = 0;

  private constructor(
    private container: HTMLElement,
    private settings: QualitySettings,
    private events: GameEvents,
    renderer: WebGLRenderer,
    gifts: GiftShape[],
    assist: boolean,
    color: SleighColor,
  ) {
    this.renderer = renderer;
    this.gifts = gifts;
    this.assistLeft = assist ? ASSIST_HOUSES : 0;

    const canvas = renderer.domElement;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.imageRendering = 'pixelated';
    container.appendChild(canvas);

    this.bubbleLayer = document.createElement('div');
    this.bubbleLayer.className = 'bubble-layer';
    container.appendChild(this.bubbleLayer);

    this.ground = createGround();
    this.scene.add(this.ground);

    this.sleigh = createSleigh(gifts, color);
    this.scene.add(this.sleigh.root);
    for (let i = 0; i < 2; i += 1) {
      const mat = createShadowMaterial();
      const mesh = new Mesh(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), mat);
      mesh.frustumCulled = false;
      this.scene.add(mesh);
      this.shadows.push({ mesh, mat });
    }

    this.forest = createForest(settings.treeCount);
    this.forest.forEach((m) => this.scene.add(m));
    this.lamps = createLamps(LAMPS_PER_SIDE * 2);
    this.lamps.forEach((m) => this.scene.add(m));
    this.snow = createSnow(settings.snowCount);
    this.scene.add(this.snow);
    for (let i = 0; i < settings.snowCount; i += 1) this.snowPos.push(new Vector3());

    for (let i = 0; i < HOUSE_POOL; i += 1) {
      const view = createHouse(i % HOUSE_VARIANTS, gifts);
      view.root.visible = false;
      this.scene.add(view.root);
      const bubble = document.createElement('div');
      bubble.className = 'gift-bubble';
      this.bubbleLayer.appendChild(bubble);
      this.houses.push({
        view,
        active: false,
        side: 1,
        z: 0,
        want: null,
        state: 'decor',
        incoming: 0,
        door: new Vector3(),
        anchor: new Vector3(),
        bubble,
        bubbleKey: '',
        boing: 0,
        wobble: 0,
        pop: 1,
        popShape: null,
        bubbleAlpha: 0,
        onScreen: false,
        resolvedT: 0,
      });
    }

    for (let i = 0; i < PUFF_POOL; i += 1) {
      const puff = createPuff();
      this.scene.add(puff.root);
      const dirs = puff.balls.map((_, k) => {
        const a = (k / puff.balls.length) * Math.PI * 2;
        return new Vector3(Math.cos(a), rand(0.4, 1), Math.sin(a));
      });
      this.puffs.push({ ...puff, active: false, t: 0, dirs });
    }

    for (let i = 0; i < FLIGHT_POOL; i += 1) {
      const set = createGiftSet(1.5, true, gifts);
      set.root.visible = false;
      this.scene.add(set.root);
      this.flights.push({
        ...set,
        active: false,
        shape: gifts[0],
        from: new Vector3(),
        to: new Vector3(),
        t: 0,
        dur: 1,
        arc: 1,
        house: null,
      });
    }

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.reset();
  }

  static async create(
    container: HTMLElement,
    settings: QualitySettings,
    events: GameEvents,
    gifts: GiftShape[],
    assist: boolean,
    color: SleighColor = 'red',
  ) {
    const renderer = new WebGLRenderer({
      antialias: false,
      alpha: true,
      powerPreference: settings.tier === 'low' ? 'low-power' : 'high-performance',
    });
    renderer.setClearColor(CLEAR_COLOR, 0);
    const game = new SleighGame(container, settings, events, renderer, gifts, assist, color);
    await game.precompile();
    game.renderer.setAnimationLoop((t: number) => game.frame(t));
    return game;
  }

  get quality() {
    return this.settings;
  }

  private async precompile() {
    const hidden: Object3D[] = [];
    this.scene.traverse((o) => {
      if (!o.visible) {
        hidden.push(o);
        o.visible = true;
      }
    });
    this.updateCamera();
    await this.renderer.compileAsync(this.scene, this.camera);
    hidden.forEach((o) => {
      o.visible = false;
    });
  }

  private resize() {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.viewW = w;
    this.viewH = h;
    this.bubbleBox =
      parseFloat(getComputedStyle(document.documentElement).fontSize) * BUBBLE_BOX_REM;
    this.renderer.setPixelRatio(1 / this.settings.pixelSize);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.baseFov = w / h < 0.75 ? 72 : 55;
    this.camera.fov = this.baseFov;
    this.camera.updateProjectionMatrix();
  }

  private reset() {
    this.running = false;
    this.over = false;
    this.travel = 0;
    this.speed = 0;
    this.elapsed = 0;
    this.mistakes = 0;
    this.delivered = 0;
    this.wrong = 0;
    this.missed = 0;
    this.thrown = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.byShape = {};
    this.order = [];
    this.houseCount = 0;
    this.cooldown = 0;
    this.assistHouse = null;
    this.timeScale = 1;
    sound.setIntensity(0);
    sceneUniforms.fade.value = 1;
    this.houses.forEach((h) => this.removeHouse(h));
    this.flights.forEach((f) => {
      f.active = false;
      f.root.visible = false;
    });
    this.nextHouseZ = -rand(16, 20);
    this.nextSide = Math.random() < 0.5 ? -1 : 1;
    this.sideStreak = 0;
    this.spawnHouses();
    for (let i = 0; i < this.settings.treeCount; i += 1) this.placeTree(i, -100, 6);
    for (let i = 0; i < LAMPS_PER_SIDE * 2; i += 1) {
      this.lampZ[i] = -Math.floor(i / 2) * LAMP_SPACING - (i % 2) * (LAMP_SPACING / 2);
      this.placeLamp(i);
    }
    this.snowPos.forEach((p) => this.placeSnow(p, true));
    this.events.onDistance?.(0);
    this.events.onSpeed?.(0);
    this.events.onMistakes?.(0);
    this.events.onDelivered?.(0);
    this.events.onCombo?.(0);
  }

  startTutorial() {
    this.reset();
    this.houses.forEach((h) => this.removeHouse(h));
    this.tutorial = true;
    this.tutorialTarget = null;
    this.timeScale = 1;
    this.running = true;
    this.paused = false;
  }

  tutorialHouse(side: Side, slot: number, ahead = 30) {
    const h = this.placeHouse(side, this.z - ahead);
    if (!h) return;
    h.want = this.gifts[slot];
    this.setHouseState(h, 'pending');
    this.tutorialTarget = h;
  }

  tutorialDistance() {
    const h = this.tutorialTarget;
    return h && h.active ? this.z - h.door.z : null;
  }

  tutorialBubble() {
    const h = this.tutorialTarget;
    return h && h.active && h.bubble.style.display !== 'none' ? h.bubble : null;
  }

  endTutorial() {
    this.tutorial = false;
    this.tutorialTarget = null;
    this.reset();
  }

  setTimeScale(scale: number) {
    this.timeScale = scale;
  }

  start() {
    this.running = true;
    this.paused = false;
  }

  setPaused(paused: boolean) {
    this.paused = paused;
  }

  private get z() {
    return -this.travel;
  }

  private difficulty() {
    return Math.min(1, this.travel / DIFF_DISTANCE);
  }

  private spawnHouses() {
    while (this.nextHouseZ > this.z - SPAWN_AHEAD) {
      const diff = this.difficulty();
      const first = this.placeHouse(this.nextSide, this.nextHouseZ);
      const pairChance =
        diff > PAIR_FROM ? (PAIR_CHANCE_MAX * (diff - PAIR_FROM)) / (1 - PAIR_FROM) : 0;
      const paired = !!first && Math.random() < pairChance && this.placePair(first);
      this.nextHouseZ -= rand(HOUSE_GAP[0], HOUSE_GAP[1]) * (1 + diff * 0.35) * (paired ? 1.2 : 1);
      const flip = paired || this.sideStreak >= 1 || Math.random() < 0.5;
      this.sideStreak = flip ? 0 : this.sideStreak + 1;
      if (flip) this.nextSide = this.nextSide < 0 ? 1 : -1;
    }
  }

  private placePair(first: House) {
    const h = this.placeHouse(
      first.side < 0 ? 1 : -1,
      first.z - rand(PAIR_OFFSET[0], PAIR_OFFSET[1]),
    );
    if (!h) return false;
    const want = (except: GiftShape | null) => {
      const pool = this.gifts.filter((g) => g !== except);
      return pool[randInt(0, pool.length - 1)];
    };
    if (!first.want) {
      first.want = want(null);
      this.setHouseState(first, 'pending');
    }
    h.want = want(first.want);
    this.setHouseState(h, 'pending');
    return true;
  }

  private placeHouse(side: Side, z: number): House | null {
    const free = this.houses.filter((h) => !h.active);
    if (!free.length) return null;
    const h = free[randInt(0, free.length - 1)];
    const { root } = h.view;
    h.active = true;
    h.side = side;
    h.z = z;
    h.incoming = 0;
    h.onScreen = false;
    root.position.set(side * HOUSE_X, 0, z);
    root.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    root.visible = true;
    root.updateMatrixWorld(true);
    h.door.copy(h.view.door).applyMatrix4(root.matrixWorld);
    h.anchor.copy(h.view.bubble).applyMatrix4(root.matrixWorld);
    Object.values(h.view.doorstep).forEach((g) => {
      g.visible = false;
    });
    h.boing = 0;
    h.wobble = 0;
    h.pop = 1;
    h.popShape = null;
    h.view.body.scale.setScalar(1);
    h.view.body.rotation.set(0, 0, 0);
    const decor = this.houseCount > 3 && Math.random() < DECOR_CHANCE;
    this.houseCount += 1;
    h.want = decor ? null : this.gifts[randInt(0, this.gifts.length - 1)];
    this.setHouseState(h, decor ? 'decor' : 'pending');
    return h;
  }

  // eslint-disable-next-line class-methods-use-this
  private removeHouse(h: House) {
    h.active = false;
    h.view.root.visible = false;
    h.bubble.style.display = 'none';
  }

  // eslint-disable-next-line class-methods-use-this
  private setHouseState(h: House, state: HouseState) {
    h.state = state;
    h.resolvedT = 0;
    if (state === 'pending' || state === 'decor') h.bubbleAlpha = 0;
    const lit = state === 'done' || state === 'decor';
    const glow: Partial<Record<HouseState, number>> = { done: 1.8, decor: 1.4, pending: 0.25 };
    setDitherEmissive(h.view.windows, glow[state] ?? 0);
    h.view.lights.visible = lit;
    if (state === 'decor' || !h.want) return;
    const mark = { pending: '', done: '✓', wrong: '✕', missed: '' }[state];
    h.bubble.innerHTML = `<div class="gb-box">${cloudSvg(h.want)}${iconSvg(`gift-${h.want}`, 'gb-gift')}</div>${
      mark ? `<span class="gb-mark">${mark}</span>` : ''
    }`;
    h.bubble.dataset.state = state;
  }

  private inRange(h: House) {
    if (!h.active || h.state !== 'pending' || h.incoming || !h.onScreen) return false;
    const rel = this.z - h.door.z;
    return rel > -PASS_Z && rel < BUBBLE_SHOW;
  }

  private findTarget(side: Side, shape?: GiftShape) {
    let best: House | null = null;
    let bestRel = Infinity;
    let match: House | null = null;
    let matchRel = Infinity;
    this.houses.forEach((h) => {
      if (h.side !== side || !this.inRange(h)) return;
      const rel = this.z - h.door.z;
      if (rel < bestRel) {
        best = h;
        bestRel = rel;
      }
      if (shape && h.want === shape && rel < matchRel) {
        match = h;
        matchRel = rel;
      }
    });
    return (match ?? best) as House | null;
  }

  throwGift(slot: number, side: Side) {
    if (!this.running || this.paused || this.cooldown > 0) return false;
    const shape = this.gifts[slot];
    const f = this.flights.find((x) => !x.active);
    if (!shape || !f) return false;
    const target = this.findTarget(side, shape);
    f.from.set(
      this.sleigh.root.position.x + SACK_TOP.x,
      this.sleigh.root.position.y + SACK_TOP.y,
      this.z + SACK_TOP.z,
    );
    if (target) {
      f.to.copy(target.door);
      target.incoming += 1;
    } else {
      f.to.set(side * (ROAD_HALF + 1.4), 0.2, this.z - 5 - this.speed * 0.4);
    }
    const d = f.from.distanceTo(f.to);
    f.house = target;
    f.shape = shape;
    f.t = 0;
    f.dur = Math.min(0.38 + d * 0.012, 0.85);
    f.arc = Math.min(1.2 + d * 0.07, 4);
    f.active = true;
    f.root.visible = true;
    f.root.position.copy(f.from);
    Object.entries(f.shapes).forEach(([k, g]) => {
      g.visible = k === shape;
    });
    this.thrown += 1;
    this.cooldown = THROW_COOLDOWN;
    this.throwT = 1;
    this.sackT = 1;
    this.hopShape = shape;
    this.throwSide = side;
    sound.throw();
    if (this.assistHouse) this.endAssist();
    return true;
  }

  private updateFlights(dt: number) {
    this.flights.forEach((f) => {
      if (!f.active) return;
      f.t += dt / f.dur;
      const k = Math.min(1, f.t);
      f.root.position.lerpVectors(f.from, f.to, k);
      f.root.position.y += Math.sin(k * Math.PI) * f.arc;
      f.root.rotation.x = 0.25;
      f.root.rotation.y += dt * GIFT_SPIN * 3;
      const sq = Math.cos(k * Math.PI) * 0.18;
      f.root.scale.set(1.5 * (1 - sq * 0.6), 1.5 * (1 + sq), 1.5 * (1 - sq * 0.6));
      if (k >= 1) this.land(f);
    });
  }

  private land(f: Flight) {
    f.active = false;
    f.root.visible = false;
    this.spawnPuff(f.to);
    const h = f.house;
    if (!h) return;
    h.incoming -= 1;
    if (!h.active || h.state !== 'pending') return;
    if (h.want === f.shape) {
      this.setHouseState(h, 'done');
      h.view.doorstep[f.shape].visible = true;
      h.popShape = f.shape;
      h.pop = 0;
      h.boing = 1;
      this.delivered += 1;
      this.combo += 1;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.byShape[f.shape] = (this.byShape[f.shape] ?? 0) + 1;
      this.order.push(f.shape);
      sound.deliver(this.combo);
      this.events.onDelivered?.(this.delivered);
      this.events.onCombo?.(this.combo);
      this.events.onFeedback?.('good', h.side);
    } else {
      this.setHouseState(h, 'wrong');
      h.wobble = 1;
      this.wrong += 1;
      sound.wrong();
      this.events.onFeedback?.('wrong', h.side);
      this.mistake();
    }
  }

  private spawnPuff(at: Vector3) {
    const p = this.puffs.find((x) => !x.active);
    if (!p) return;
    p.active = true;
    p.t = 0;
    p.root.visible = true;
    p.root.position.copy(at).setY(Math.max(0.15, at.y));
  }

  private updateJuice(dt: number) {
    this.puffs.forEach((p) => {
      if (!p.active) return;
      // eslint-disable-next-line no-param-reassign
      p.t += dt / PUFF_TIME;
      const k = Math.min(1, p.t);
      p.balls.forEach((b, i) => {
        const d = p.dirs[i];
        const r = 0.15 + easeOutBack(k) * 0.75;
        b.position.set(d.x * r, d.y * r * 0.8 - k * k * 0.3, d.z * r);
        b.scale.setScalar(0.6 + k * 0.9);
      });
      setDitherOpacity(p.material, 1 - k);
      if (k >= 1) {
        // eslint-disable-next-line no-param-reassign
        p.active = false;
        // eslint-disable-next-line no-param-reassign
        p.root.visible = false;
      }
    });
    this.houses.forEach((h) => {
      if (!h.active) return;
      const { body } = h.view;
      if (h.boing > 0) {
        h.boing = Math.max(0, h.boing - dt / 0.7);
        const u = 1 - h.boing;
        const b = Math.sin(u * Math.PI * 3) * 0.14 * h.boing;
        body.scale.set(1 - b * 0.5, 1 + b, 1 - b * 0.5);
      }
      if (h.wobble > 0) {
        h.wobble = Math.max(0, h.wobble - dt / 0.6);
        body.rotation.z = Math.sin((1 - h.wobble) * Math.PI * 6) * 0.07 * h.wobble;
      }
      if (h.popShape) h.view.doorstep[h.popShape].rotation.y += dt * GIFT_SPIN;
      if (h.popShape && h.pop < 1) {
        h.pop = Math.min(1, h.pop + dt / 0.45);
        h.view.doorstep[h.popShape].scale.setScalar(Math.max(0.01, easeOutBack(h.pop)));
      }
    });
  }

  private mistake() {
    if (this.tutorial) return;
    this.mistakes += 1;
    this.combo = 0;
    if (navigator.vibrate) navigator.vibrate(80);
    this.events.onCombo?.(0);
    this.events.onMistakes?.(this.mistakes);
    if (this.mistakes >= MAX_MISTAKES) this.gameOver();
  }

  private updateAssist() {
    const cur = this.assistHouse;
    if (cur && cur.state === 'pending' && !cur.incoming && !cur.onScreen) this.endAssist();
    if (this.assistLeft <= 0 || this.assistHouse) return;
    const a = this.findTarget(-1);
    const b = this.findTarget(1);
    const relA = a ? this.z - a.door.z : Infinity;
    const relB = b ? this.z - b.door.z : Infinity;
    const h = relA <= relB ? a : b;
    if (!h || !h.want || Math.min(relA, relB) > ASSIST_Z) return;
    this.assistHouse = h;
    this.timeScale = ASSIST_SLOWMO;
    this.events.onAssist?.({ side: h.side, slot: this.gifts.indexOf(h.want) });
  }

  private endAssist() {
    this.assistHouse = null;
    this.assistLeft -= 1;
    this.timeScale = 1;
    this.events.onAssist?.(null);
  }

  private gameOver() {
    if (!this.running) return;
    this.running = false;
    this.over = true;
    this.overT = 0;
    if (this.assistHouse) this.endAssist();
    this.houses.forEach((h) => {
      h.bubble.style.display = 'none';
    });
    this.events.onTargets?.(null, null);
    sound.gameOver();
    this.events.onGameOver?.({
      distance: Math.round(this.travel * M_PER_UNIT),
      distanceKm: Math.round(magicKm(this.elapsed) * 10) / 10,
      delivered: this.delivered,
      wrong: this.wrong,
      missed: this.missed,
      thrown: this.thrown,
      maxCombo: this.maxCombo,
      topSpeed: Math.round(magicKmh(this.elapsed)),
      time: this.elapsed,
      gifts: this.gifts.map((shape) => ({ shape, delivered: this.byShape[shape] ?? 0 })),
      order: [...this.order],
    });
  }

  private frame(now: number) {
    const cap = this.settings.fpsCap;
    if (cap && now - this.lastFrame < 1000 / cap - 2) return;
    const frameDt = this.lastFrame ? (now - this.lastFrame) / 1000 : 1 / 60;
    this.lastFrame = now;
    this.monitorPerf(frameDt);

    this.timer.update(now);
    const raw = this.paused ? 0 : Math.min(this.timer.getDelta(), 1 / 20);
    const dt = raw * this.timeScale;
    if (this.running && dt > 0) this.updateGame(dt);
    else if (this.over) {
      this.overT += raw;
      this.speed *= Math.exp(-raw * 2.2);
      this.travel += this.speed * raw;
      sceneUniforms.fade.value = Math.max(0.35, 1 - this.overT * 0.5);
    }

    this.updateVisuals(dt);
    sceneUniforms.time.value = this.timer.getElapsed();
    this.renderer.render(this.scene, this.camera);
    if (!this.over) this.updateBubbles(raw);
  }

  private updateGame(dt: number) {
    this.elapsed += dt;
    const diff = this.difficulty();
    const target = SPEED_MIN + (SPEED_MAX - SPEED_MIN) * diff;
    this.speed += (target - this.speed) * Math.min(1, dt * 1.2);
    this.travel += this.speed * dt;
    this.cooldown = Math.max(0, this.cooldown - dt);

    const km = Math.floor(magicKm(this.elapsed) * 10) / 10;
    if (km !== this.shownDistance) {
      this.shownDistance = km;
      this.events.onDistance?.(km);
    }
    const kmh = Math.round(magicKmh(this.elapsed));
    if (kmh !== this.shownSpeed) {
      this.shownSpeed = kmh;
      this.events.onSpeed?.(kmh);
    }

    sound.setIntensity(diff);

    if (!this.tutorial) this.spawnHouses();
    this.houses.forEach((h) => {
      if (!h.active) return;
      const rel = this.z - h.door.z;
      if (h.state === 'pending' && !h.incoming && rel < -PASS_Z) {
        this.setHouseState(h, 'missed');
        this.missed += 1;
        sound.miss();
        this.events.onFeedback?.('miss', h.side);
        if (this.assistHouse === h) this.endAssist();
        this.mistake();
      }
      if (rel < -16 && !h.incoming) this.removeHouse(h);
    });
    this.updateFlights(dt);
    if (this.running && !this.tutorial) this.updateAssist();
  }

  private updateVisuals(dt: number) {
    const t = this.timer.getElapsed();
    const { z } = this;
    const { sleigh } = this;
    const run = Math.min(1, this.speed / SPEED_MIN);

    sceneUniforms.bend.value.x =
      Math.sin(this.travel * 0.0045) * 0.0011 + Math.sin(this.travel * 0.0021 + 1) * 0.0007;

    this.nextWobble -= dt;
    if (this.nextWobble <= 0 && this.wobbleT <= 0) {
      this.wobbleDur = rand(0.8, 1.6);
      this.wobbleT = this.wobbleDur;
      this.wobbleAmp = rand(0.6, 1.2);
      this.nextWobble = rand(2, 5);
    }
    this.wobbleT = Math.max(0, this.wobbleT - dt);
    const env = this.wobbleT > 0 ? Math.sin((1 - this.wobbleT / this.wobbleDur) * Math.PI) : 0;
    const wob = env * this.wobbleAmp;
    const sway = Math.sin(t * 1.3) * 0.12 * run + Math.sin(t * 8.5) * 0.4 * wob;
    const lift =
      HOVER +
      Math.sin(t * 1.8) * 0.1 +
      Math.sin(t * 0.9 + 1) * 0.06 +
      Math.sin(t * 11) * 0.18 * wob;
    sleigh.root.position.set(sway, lift, z);
    sleigh.root.rotation.z = Math.sin(t * 8.5 + 0.8) * 0.16 * wob + Math.sin(t * 1.3) * 0.02;
    sleigh.root.rotation.x = Math.sin(t * 6) * 0.05 * wob;
    const rise = lift - HOVER;
    const spread = 1 + rise * 0.5;
    const strength = clamp(0.62 - rise * 0.7, 0.3, 0.75);
    const tiltShift = -sleigh.root.rotation.z * 1.6;
    this.placeShadow(0, sway + tiltShift, z + 0.15, 0.95 * spread, 1.45 * spread, strength);
    this.placeShadow(
      1,
      sway * 0.85 + tiltShift * 0.6,
      z - 2.6,
      0.5 * spread,
      0.8 * spread,
      strength * 0.85,
    );
    sleigh.body.position.y = Math.sin(t * 2) * 0.02;
    sleigh.body.rotation.z = Math.sin(t * 2.6) * 0.03 * run;
    sleigh.deer.forEach((d, i) => {
      const gallop = t * (6 + this.speed * 0.4) + i * 0.6;
      d.root.position.y = Math.abs(Math.sin(gallop)) * 0.16 * run;
      d.legs.forEach((leg, j) => {
        const phase = j < 2 ? 0 : Math.PI;
        // eslint-disable-next-line no-param-reassign
        leg.rotation.x = Math.sin(gallop + phase) * 0.7 * run;
      });
      // eslint-disable-next-line no-param-reassign
      d.head.rotation.x = Math.sin(gallop * 2) * 0.08;
    });
    this.throwT = Math.max(0, this.throwT - dt * 3.5);
    const swing = Math.sin(this.throwT * Math.PI) * 2.3;
    const left = this.throwSide < 0 ? swing : 0;
    const right = this.throwSide > 0 ? swing : 0;
    sleigh.armL.rotation.set(0.8 - left * 0.3, 0, -0.25 - left);
    sleigh.armR.rotation.set(0.8 - right * 0.3, 0, 0.25 + right);
    sleigh.santa.rotation.y = (right - left) * -0.15;

    this.sackT = Math.max(0, this.sackT - dt * 2.5);
    const squash = Math.sin((1 - this.sackT) * Math.PI * 2.5) * 0.14 * this.sackT;
    const jiggle = Math.sin(t * 7) * 0.03 * run;
    sleigh.sack.scale.set(
      1 + squash * 0.6 - jiggle,
      1 - squash + jiggle,
      1 + squash * 0.6 - jiggle,
    );
    Object.entries(sleigh.peeks).forEach(([shape, g], i) => {
      const hop =
        shape === this.hopShape ? Math.sin((1 - this.sackT) * Math.PI) * 0.35 * this.sackT : 0;
      // eslint-disable-next-line no-param-reassign
      g.position.y = g.userData.base + hop + Math.abs(Math.sin(t * 7 + i)) * 0.04 * run;
      // eslint-disable-next-line no-param-reassign
      g.rotation.z = Math.sin(t * 2 + i * 2) * 0.08;
      // eslint-disable-next-line no-param-reassign
      g.rotation.y += dt * GIFT_SPIN;
    });

    sceneUniforms.light.value.set(sway + 0.7, 1.8 + lift, z - 1.6);

    this.ground.position.set(0, 0, z - 70);

    this.updateJuice(dt);
    this.updateCamera();
    this.updateForest();
    this.updateSnow(dt);
  }

  private placeShadow(i: number, x: number, z: number, rx: number, rz: number, strength: number) {
    const { mesh, mat } = this.shadows[i];
    mesh.position.set(x, 0.04, z);
    mesh.scale.set(rx * 2.2, 1, rz * 2.2);
    mat.uniforms.uCenter.value.set(x, 0, z);
    mat.uniforms.uRadius.value.set(rx, rz);
    mat.uniforms.uStrength.value = strength;
  }

  private updateCamera() {
    const { z } = this;
    this.camera.position.set(0, CAM_UP, z + CAM_BACK);
    this.camera.lookAt(0, LOOK_UP, z - LOOK_AHEAD);
    const fov = this.baseFov + Math.max(0, this.speed - SPEED_MIN) * 0.5;
    if (Math.abs(fov - this.camera.fov) > 0.05) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
  }

  private updateBubbles(dt: number) {
    const camZ = this.camera.position.z;
    const targets = [this.findTarget(-1), this.findTarget(1)];
    this.emitTargets(targets);
    this.houses.forEach((h) => {
      const el = h.bubble;
      if (!h.active || h.state === 'decor') {
        h.bubbleAlpha = 0;
        if (el.style.display !== 'none') el.style.display = 'none';
        return;
      }
      h.resolvedT += dt;
      v1.copy(h.anchor);
      bendPoint(v1, camZ);
      const dist = this.camera.position.distanceTo(v1);
      v1.project(this.camera);
      const x = (v1.x * 0.5 + 0.5) * this.viewW;
      const y = (-v1.y * 0.5 + 0.5) * this.viewH;
      const scale = clamp(13 / dist, 0.38, 1.2) * 1.25;
      h.onScreen = v1.z <= 1 && this.bubbleOnScreen(x, y, scale);
      let want = 0;
      if (h.state === 'pending') want = this.inRange(h) || h.incoming > 0 ? 1 : 0;
      else if (h.state === 'done' || h.state === 'wrong') want = h.resolvedT < RESULT_SHOW ? 1 : 0;
      h.bubbleAlpha += (want - h.bubbleAlpha) * Math.min(1, dt * BUBBLE_FADE);
      if (want === 0 && h.bubbleAlpha < 0.02) {
        h.bubbleAlpha = 0;
        if (el.style.display !== 'none') el.style.display = 'none';
        return;
      }
      if (v1.z > 1) {
        el.style.display = 'none';
        return;
      }
      const a = h.bubbleAlpha;
      const pop = want ? backOut(a) : 0.8 + 0.2 * a;
      const s = scale * pop;
      el.style.display = '';
      el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) translate(-50%,-100%) scale(${s.toFixed(3)})`;
      el.style.opacity = (want ? Math.min(1, a * 3) : a).toFixed(3);
      el.style.zIndex = String(1000 - Math.round(dist));
      const isTarget = h.state === 'pending';
      const key = `${isTarget}|${h.side}`;
      if (key !== h.bubbleKey) {
        h.bubbleKey = key;
        el.classList.toggle('is-target', isTarget);
        el.dataset.side = h.side < 0 ? 'left' : 'right';
      }
    });
  }

  private bubbleOnScreen(x: number, y: number, scale: number) {
    const w = this.bubbleBox;
    const h = w + BUBBLE_PAD_REM * (w / BUBBLE_BOX_REM);
    const halfW = 0.625 * w * scale;
    const top = y - (h + 0.04 * w) * scale;
    const bottom = y - (h - 1.15 * w) * scale;
    return x + halfW > 0 && x - halfW < this.viewW && bottom > 0 && top < this.viewH;
  }

  private emitTargets(targets: (House | null)[]) {
    const info = targets.map((h) => {
      if (!h || !h.want || this.over) return null;
      const rel = this.z - h.door.z;
      const remain = clamp((rel + PASS_Z) / (BUBBLE_SHOW + PASS_Z), 0, 1);
      return { shape: h.want, remain: Math.ceil(remain * 20) / 20, id: this.houses.indexOf(h) };
    });
    const key = info.map((t) => (t ? `${t.id}:${t.remain}` : '-')).join('|');
    if (key === this.shownTargets) return;
    this.shownTargets = key;
    const [l, r] = info.map((t) => (t ? { shape: t.shape, remain: t.remain } : null));
    this.events.onTargets?.(l, r);
  }

  private placeTree(i: number, zMin: number, zMax: number) {
    const side = Math.random() < 0.5 ? -1 : 1;
    const z = this.z + rand(zMin, zMax);
    const x = Math.random() < 0.8 ? rand(12, 34) : rand(5.5, 6.5);
    this.treeZ[i] = z;
    const d = this.dummy;
    d.position.set(side * x, 0, z);
    d.rotation.set(0, rand(0, Math.PI), 0);
    d.scale.setScalar(x < 7 ? rand(0.45, 0.6) : rand(0.7, 1.5));
    d.updateMatrix();
    this.forest.forEach((m) => m.setMatrixAt(i, d.matrix));
  }

  private placeLamp(i: number) {
    const side = i % 2 ? 1 : -1;
    const d = this.dummy;
    d.position.set(side * (ROAD_HALF + 0.8), 0, this.lampZ[i]);
    d.rotation.set(0, side < 0 ? Math.PI : 0, 0);
    d.scale.setScalar(1);
    d.updateMatrix();
    this.lamps.forEach((m) => m.setMatrixAt(i, d.matrix));
  }

  private updateForest() {
    const { z } = this;
    let dirty = false;
    for (let i = 0; i < this.settings.treeCount; i += 1) {
      if (this.treeZ[i] > z + CAM_BACK + 4) {
        this.placeTree(i, -100, -70);
        dirty = true;
      }
    }
    if (dirty) {
      this.forest.forEach((m) => {
        // eslint-disable-next-line no-param-reassign
        m.instanceMatrix.needsUpdate = true;
      });
    }
    dirty = false;
    for (let i = 0; i < this.lampZ.length; i += 1) {
      if (this.lampZ[i] > z + CAM_BACK + 2) {
        this.lampZ[i] -= LAMPS_PER_SIDE * LAMP_SPACING;
        this.placeLamp(i);
        dirty = true;
      }
    }
    if (dirty) {
      this.lamps.forEach((m) => {
        // eslint-disable-next-line no-param-reassign
        m.instanceMatrix.needsUpdate = true;
      });
    }
  }

  private placeSnow(p: Vector3, anywhere = false) {
    const camZ = this.z + CAM_BACK;
    const x = (Math.random() < 0.5 ? -1 : 1) * rand(3, 14);
    p.set(x, anywhere ? rand(0, 10) : rand(7, 11), camZ - rand(anywhere ? 0 : 20, 45));
  }

  private updateSnow(dt: number) {
    const n = this.settings.snowCount;
    this.snow.count = n;
    if (!n) return;
    const t = this.timer.getElapsed();
    const camZ = this.z + CAM_BACK;
    for (let i = 0; i < n; i += 1) {
      const p = this.snowPos[i];
      p.y -= dt * 1.4;
      p.x += Math.sin(t * 0.8 + i) * dt * 0.4;
      if (p.y < 0 || p.z > camZ) this.placeSnow(p);
      this.dummy.position.copy(p);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.setScalar(1);
      this.dummy.updateMatrix();
      this.snow.setMatrixAt(i, this.dummy.matrix);
    }
    this.snow.instanceMatrix.needsUpdate = true;
  }

  private monitorPerf(dt: number) {
    if (document.hidden || dt > 0.5) return;
    this.perfFrames += 1;
    this.perfTime += dt;
    if (this.perfTime < 2) return;
    const fps = this.perfFrames / this.perfTime;
    this.perfFrames = 0;
    this.perfTime = 0;
    const target = this.settings.fpsCap ? this.settings.fpsCap * 0.8 : 45;
    this.slowWindows = fps < target ? this.slowWindows + 1 : 0;
    if (this.slowWindows >= 2 && degrade(this.settings)) {
      this.slowWindows = 0;
      this.resize();
      this.events.onQualityChange?.(this.settings);
    }
  }

  dispose() {
    this.running = false;
    this.renderer.setAnimationLoop(null);
    this.resizeObserver.disconnect();
    this.scene.traverse((obj) => {
      const mesh = obj as unknown as {
        geometry?: { dispose: () => void };
        material?: { dispose: () => void };
      };
      mesh.geometry?.dispose();
      mesh.material?.dispose();
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.bubbleLayer.remove();
  }
}
