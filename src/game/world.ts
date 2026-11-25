import {
  BoxGeometry,
  BufferGeometry,
  CapsuleGeometry,
  ConeGeometry,
  CylinderGeometry,
  Euler,
  ExtrudeGeometry,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  LatheGeometry,
  Material,
  Matrix4,
  Mesh,
  Object3D,
  PlaneGeometry,
  Quaternion,
  ShaderMaterial,
  Shape,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  createBlobShadowMaterial,
  createDitherMaterial,
  createGiftGlowMaterial,
  createGiftMaterial,
  createGroundMaterial,
  createOutlineMaterial,
} from './dither';
import { GIFT_SHAPES, GiftShape, colorOf, formOf } from './gifts';

export const ROAD_HALF = 2.4;
export const HOUSE_X = 7.6;

const outline = createOutlineMaterial();

export function addOutline(mesh: Mesh, scale = 1.12) {
  const hull = new Mesh(mesh.geometry, outline);
  hull.scale.setScalar(scale);
  mesh.add(hull);
  return mesh;
}

function part(geometry: BufferGeometry, material: Material, x = 0, y = 0, z = 0) {
  const mesh = new Mesh(geometry, material);
  mesh.position.set(x, y, z);
  return mesh;
}

const rbox = (w: number, h: number, d: number, r = Math.min(w, h, d) * 0.25) =>
  new RoundedBoxGeometry(w, h, d, 2, r);
const box = (w: number, h: number, d: number) => new BoxGeometry(w, h, d);
const cyl = (rt: number, rb: number, h: number, seg = 10) => new CylinderGeometry(rt, rb, h, seg);
const ball = (r: number, ws = 10, hs = 8) => new SphereGeometry(r, ws, hs);
const cone = (r: number, h: number, seg = 10) => new ConeGeometry(r, h, seg);
const pill = (r: number, len: number) => new CapsuleGeometry(r, len, 3, 8);

interface Xf {
  rx?: number;
  ry?: number;
  rz?: number;
  s?: number | [number, number, number];
}

const tmpM = new Matrix4();
const tmpQ = new Quaternion();
const tmpE = new Euler();
const tmpP = new Vector3();
const tmpS = new Vector3();

function placed(geo: BufferGeometry, x = 0, y = 0, z = 0, xf: Xf = {}) {
  tmpQ.setFromEuler(tmpE.set(xf.rx ?? 0, xf.ry ?? 0, xf.rz ?? 0));
  const s = xf.s ?? 1;
  if (typeof s === 'number') tmpS.setScalar(s);
  else tmpS.set(s[0], s[1], s[2]);
  tmpM.compose(tmpP.set(x, y, z), tmpQ, tmpS);
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  geo.dispose();
  g.applyMatrix4(tmpM);
  Object.keys(g.attributes).forEach((k) => {
    if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
  });
  g.clearGroups();
  return g;
}

function merge(geos: BufferGeometry[]) {
  const merged = mergeGeometries(geos) as BufferGeometry;
  geos.forEach((g) => g.dispose());
  return merged;
}

class Kit {
  private parts = new Map<Material, BufferGeometry[]>();

  add(mat: Material, geo: BufferGeometry, x = 0, y = 0, z = 0, xf: Xf = {}) {
    const list = this.parts.get(mat) ?? [];
    list.push(placed(geo, x, y, z, xf));
    this.parts.set(mat, list);
    return this;
  }

  build(parent: Object3D) {
    this.parts.forEach((geos, mat) => parent.add(new Mesh(merge(geos), mat)));
    this.parts.clear();
    return parent;
  }
}

const M = {
  snow: createDitherMaterial({ albedo: 1, emissive: 0.35 }),
  plaster: createDitherMaterial({ albedo: 0.8, emissive: 0.05 }),
  wood: createDitherMaterial({ albedo: 0.85, emissive: 0.08, tint: 'wood' }),
  woodDark: createDitherMaterial({ albedo: 0.45, tint: 'wood' }),
  dark: createDitherMaterial({ albedo: 0.06 }),
  red: createDitherMaterial({ albedo: 0.9, emissive: 0.15, tint: 'red' }),
  green: createDitherMaterial({ albedo: 0.85, emissive: 0.1, tint: 'green' }),
  gold: createDitherMaterial({ albedo: 1, emissive: 0.5, tint: 'gold' }),
  bulbRed: createDitherMaterial({ albedo: 0, emissive: 1.6, tint: 'red' }),
  bulbGreen: createDitherMaterial({ albedo: 0, emissive: 1.6, tint: 'green' }),
  bulbGold: createDitherMaterial({ albedo: 0, emissive: 1.8, tint: 'gold' }),
};
const BULBS = [M.bulbRed, M.bulbGreen, M.bulbGold];

const blobGeo = () => new PlaneGeometry(2, 2).rotateX(-Math.PI / 2);
const blobMat = createBlobShadowMaterial(0.6);

const giftMat = {
  red: createGiftMaterial({ albedo: 1.1, emissive: 0.55, tint: 'red' }),
  green: createGiftMaterial({ albedo: 1.1, emissive: 0.55, tint: 'green' }),
  white: createGiftMaterial({ albedo: 1.1, emissive: 0.7, tint: 'white' }),
};
const giftGlowMat = {
  red: createGiftMaterial({ albedo: 1.1, emissive: 0.55, tint: 'red', glow: true }),
  green: createGiftMaterial({ albedo: 1.1, emissive: 0.55, tint: 'green', glow: true }),
  white: createGiftMaterial({ albedo: 1.1, emissive: 0.7, tint: 'white', glow: true }),
};
const auraMat = {
  red: createGiftGlowMaterial('red'),
  green: createGiftGlowMaterial('green'),
};

function addAura(mesh: Mesh, tint: keyof typeof auraMat, scale = 1.55) {
  const aura = new Mesh(mesh.geometry, auraMat[tint]);
  aura.scale.setScalar(scale);
  mesh.add(aura);
  return mesh;
}

function roundedShape(pts: Vector2[], r: number) {
  const s = new Shape();
  const n = pts.length;
  const corner = (k: number) => {
    const p = pts[k];
    const prev = pts[(k + n - 1) % n];
    const next = pts[(k + 1) % n];
    const a = p.clone().add(
      prev
        .clone()
        .sub(p)
        .setLength(Math.min(r, p.distanceTo(prev) / 2.2)),
    );
    const b = p.clone().add(
      next
        .clone()
        .sub(p)
        .setLength(Math.min(r, p.distanceTo(next) / 2.2)),
    );
    return { p, a, b };
  };
  const first = corner(0);
  s.moveTo(first.a.x, first.a.y);
  for (let k = 0; k < n; k += 1) {
    const c = k === 0 ? first : corner(k);
    if (k) s.lineTo(c.a.x, c.a.y);
    s.quadraticCurveTo(c.p.x, c.p.y, c.b.x, c.b.y);
  }
  s.lineTo(first.a.x, first.a.y);
  return s;
}

function starShape(outer: number, inner: number) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 ? inner : outer;
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    return new Vector2(Math.cos(a) * r, Math.sin(a) * r);
  });
  return roundedShape(pts, 0.07);
}

function heartShape() {
  const s = new Shape();
  s.moveTo(0, -0.27);
  s.bezierCurveTo(-0.17, -0.27, -0.37, -0.12, -0.37, 0.07);
  s.bezierCurveTo(-0.37, 0.27, -0.12, 0.34, 0, 0.18);
  s.bezierCurveTo(0.12, 0.34, 0.37, 0.27, 0.37, 0.07);
  s.bezierCurveTo(0.37, -0.12, 0.17, -0.27, 0, -0.27);
  return s;
}

function puffy(shape: Shape, depth: number) {
  return new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.17,
    bevelSize: 0.1,
    bevelSegments: 8,
    curveSegments: 18,
  }).center();
}

function gumdrop() {
  const pts: Vector2[] = [];
  const steps = 24;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const y = -0.27 + t * 0.56;
    const bulge = Math.sin(t * Math.PI) * 0.1;
    const r =
      (0.36 * (1 - t) ** 0.7 + bulge) *
      Math.min(1, Math.sin(Math.min(1, t * 6) * (Math.PI / 2)) + 0.6);
    pts.push(new Vector2(Math.max(0, r), y));
  }
  pts[pts.length - 1].x = 0;
  pts.unshift(new Vector2(0, -0.27));
  return new LatheGeometry(pts, 32);
}

function addBow(g: Group, y: number, mat: Material, z = 0, scale = 1) {
  const bow = new Group();
  [-1, 1].forEach((s) => {
    const loop = part(new TorusGeometry(0.09, 0.06, 12, 24), mat, s * 0.1, 0.05, 0);
    loop.rotation.set(0, 0, s * 0.6);
    bow.add(loop);
  });
  bow.add(part(ball(0.08, 16, 12), mat, 0, 0, 0));
  bow.position.set(0, y, z);
  bow.scale.setScalar(scale);
  g.add(bow);
}

function inflate(geo: BufferGeometry, hx: number, hy: number, hz: number, k = 0.16) {
  const pos = geo.getAttribute('position');
  const f = (v: number, h: number) => Math.max(0, 1 - (v / h) ** 2);
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    pos.setXYZ(
      i,
      x * (1 + k * f(y, hy) * f(z, hz)),
      y * (1 + k * f(x, hx) * f(z, hz)),
      z * (1 + k * f(x, hx) * f(y, hy)),
    );
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}
const puffBox = (w: number, h: number, d: number, r: number, hx: number, hy: number, hz: number) =>
  inflate(new RoundedBoxGeometry(w, h, d, 6, r), hx, hy, hz);

export function createGiftMesh(kind: GiftShape, glow = false) {
  const g = new Group();
  const mats = glow ? giftGlowMat : giftMat;
  const { white } = mats;
  const tint = colorOf(kind);
  const main = mats[tint];
  const form = formOf(kind);
  const body = (mesh: Mesh) => (glow ? addAura(mesh, tint) : mesh);
  if (form === 'square') {
    const [hx, hy, hz] = [0.27, 0.23, 0.27];
    g.add(body(addOutline(part(puffBox(0.54, 0.46, 0.54, 0.22, hx, hy, hz), main), 1.08)));
    g.add(
      part(puffBox(0.57, 0.48, 0.16, 0.07, hx, hy, hz), white),
      part(puffBox(0.16, 0.48, 0.57, 0.07, hx, hy, hz), white),
    );
    addBow(g, 0.31, white);
  } else if (form === 'rect') {
    const [hx, hy, hz] = [0.21, 0.31, 0.21];
    g.add(body(addOutline(part(puffBox(0.42, 0.62, 0.42, 0.18, hx, hy, hz), main), 1.08)));
    g.add(
      part(puffBox(0.45, 0.64, 0.14, 0.06, hx, hy, hz), white),
      part(puffBox(0.14, 0.64, 0.45, 0.06, hx, hy, hz), white),
    );
    addBow(g, 0.39, white);
  } else if (form === 'circle') {
    g.add(body(addOutline(part(ball(0.3, 32, 24), main), 1.08)));
    const strapA = part(new TorusGeometry(0.3, 0.055, 12, 40), white);
    const strapB = part(new TorusGeometry(0.3, 0.055, 12, 40), white);
    strapB.rotation.y = Math.PI / 2;
    g.add(strapA, strapB);
    addBow(g, 0.32, white);
  } else if (form === 'triangle') {
    g.add(body(addOutline(part(gumdrop(), main), 1.08)));
    const band = part(new TorusGeometry(0.36, 0.06, 12, 40), white, 0, -0.04, 0);
    band.rotation.x = Math.PI / 2;
    const strap = part(gumdrop(), white);
    strap.scale.set(0.2, 1.03, 1.03);
    g.add(band, strap);
    addBow(g, -0.02, white, 0.37, 0.9);
  } else {
    g.add(body(addOutline(part(puffy(heartShape(), 0.14), main), 1.08)));
    g.add(
      part(new RoundedBoxGeometry(0.11, 0.48, 0.5, 3, 0.05), white, 0, -0.05, 0),
      part(new RoundedBoxGeometry(0.66, 0.11, 0.5, 3, 0.05), white, 0, 0.02, 0),
    );
    addBow(g, 0.02, white, 0.26, 0.9);
  }
  return g;
}

export function createGiftSet(scale = 1, glow = false, kinds: GiftShape[] = GIFT_SHAPES) {
  const root = new Group();
  const shapes = {} as Record<GiftShape, Object3D>;
  kinds.forEach((s) => {
    const g = createGiftMesh(s, glow);
    g.visible = false;
    shapes[s] = g;
    root.add(g);
  });
  root.scale.setScalar(scale);
  return { root, shapes };
}

export interface Puff {
  root: Group;
  balls: Mesh[];
  material: ShaderMaterial;
}

export function createPuff(): Puff {
  const material = createDitherMaterial({ albedo: 1, emissive: 0.9 });
  const root = new Group();
  const geo = ball(0.16, 8, 6);
  const balls = Array.from({ length: 7 }, () => {
    const m = new Mesh(geo, material);
    root.add(m);
    return m;
  });
  root.visible = false;
  return { root, balls, material };
}

export const HOUSE_VARIANTS = 4;

export interface HouseView {
  root: Group;
  body: Group;
  door: Vector3;
  bubble: Vector3;
  windows: ShaderMaterial;
  lights: Group;
  doorstep: Record<GiftShape, Object3D>;
}

function roundedOutline(pts: [number, number][], radii: number[], seg = 10): Vector2[] {
  const out: Vector2[] = [];
  pts.forEach((p, k) => {
    const prev = pts[(k + pts.length - 1) % pts.length];
    const next = pts[(k + 1) % pts.length];
    const v1 = new Vector2(prev[0] - p[0], prev[1] - p[1]);
    const v2 = new Vector2(next[0] - p[0], next[1] - p[1]);
    const l1 = v1.length();
    const l2 = v2.length();
    v1.normalize();
    v2.normalize();
    const ang = Math.acos(Math.max(-1, Math.min(1, v1.dot(v2))));
    const dist = Math.min(radii[k] / Math.tan(ang / 2), l1 / 2.1, l2 / 2.1);
    const a = new Vector2(p[0] + v1.x * dist, p[1] + v1.y * dist);
    const b = new Vector2(p[0] + v2.x * dist, p[1] + v2.y * dist);
    for (let i = 0; i <= seg; i += 1) {
      const t = i / seg;
      out.push(
        new Vector2(
          (1 - t) ** 2 * a.x + 2 * (1 - t) * t * p[0] + t ** 2 * b.x,
          (1 - t) ** 2 * a.y + 2 * (1 - t) * t * p[1] + t ** 2 * b.y,
        ),
      );
    }
  });
  return out;
}

function densify(pts: Vector2[], step: number) {
  const out: Vector2[] = [];
  pts.forEach((p, k) => {
    const q = pts[(k + 1) % pts.length];
    const n = Math.max(1, Math.ceil(p.distanceTo(q) / step));
    for (let i = 0; i < n; i += 1) out.push(new Vector2().lerpVectors(p, q, i / n));
  });
  return out;
}

function puffyExtrude(profile: Vector2[], depth: number, bevel: number) {
  const g = new ExtrudeGeometry(new Shape(profile), {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel * 0.8,
    bevelSegments: 6,
    curveSegments: 6,
  });
  g.translate(0, 0, -depth / 2);
  return g;
}

function addRoof(
  kit: Kit,
  o: { w: number; h0: number; rh: number; d: number; z: number; roof: Material; wall: Material },
) {
  const half = o.w / 2 + 0.55;
  const profile = densify(
    roundedOutline(
      [
        [-half, 0],
        [half, 0],
        [0, o.rh],
      ],
      [0.8, 0.8, 1.5],
    ),
    0.15,
  );
  const y0 = o.h0 - 0.18;
  kit.add(o.roof, puffyExtrude(profile, o.d + 0.5, 0.4), 0, y0, o.z);

  const cut = o.rh * 0.42;
  const upper = profile
    .filter((p) => p.y >= cut)
    .map((p) => new Vector2(p.x * 1.05, cut + (p.y - cut) * 1.05 + 0.04));
  const right = upper[0].x;
  const left = upper[upper.length - 1].x;
  const bumps = 4;
  const scallop: Vector2[] = [];
  for (let k = 0; k <= bumps * 6; k += 1) {
    const u = k / (bumps * 6);
    const x = left + (right - left) * u;
    const drop = 0.32 * Math.abs(Math.sin(u * bumps * Math.PI));
    scallop.push(new Vector2(x, cut - drop));
  }
  kit.add(M.snow, puffyExtrude([...upper, ...scallop], o.d + 0.6, 0.36), 0, y0 + 0.14, o.z);
}

function addEaveLights(lights: Kit, w: number, h0: number, rh: number, z: number) {
  const half = w / 2 + 0.55;
  const n = 6;
  let k = 0;
  [-1, 1].forEach((s) => {
    for (let i = 0; i < n; i += 1) {
      const u = 0.1 + (i / n) * 0.75;
      lights.add(BULBS[k % 3], ball(0.16, 8, 6), s * half * (1 - u), h0 - 0.1 + rh * u, z + 0.1);
      k += 1;
    }
  });
}

const LOG_R = 0.23;

function addLogWalls(kit: Kit, w: number, h0: number, d: number, z: number) {
  kit.add(M.woodDark, rbox(w - 0.1, h0, d - 0.1, 0.2), 0, h0 / 2, z);
  const step = LOG_R * 1.85;
  const over = 0.32;
  let layer = 0;
  for (let y = LOG_R; y < h0 - LOG_R * 0.3; y += step, layer += 1) {
    const longX = layer % 2 === 0;
    const lenX = w + (longX ? over * 2 : 0) - LOG_R * 2;
    const lenZ = d + (longX ? 0 : over * 2) - LOG_R * 2;
    [-1, 1].forEach((side) => {
      kit.add(M.wood, pill(LOG_R, lenX), 0, y, z + (side * d) / 2, { rz: Math.PI / 2 });
      kit.add(M.wood, pill(LOG_R, lenZ), (side * w) / 2, y + step / 2, z, { rx: Math.PI / 2 });
    });
  }
}

function addWindow(kit: Kit, mat: Material, x: number, y: number, z: number, roundWin = false) {
  if (roundWin) {
    kit.add(M.plaster, new TorusGeometry(0.42, 0.15, 8, 20), x, y, z + 0.06);
    kit.add(mat, ball(0.4, 16, 10), x, y, z, { s: [1, 1, 0.3] });
    kit.add(M.dark, pill(0.045, 0.66), x, y, z + 0.1);
    kit.add(M.dark, pill(0.045, 0.66), x, y, z + 0.1, { rz: Math.PI / 2 });
    kit.add(M.snow, ball(0.26, 10, 8), x, y + 0.5, z + 0.1, { s: [2, 0.7, 1.1] });
    return;
  }
  kit.add(M.plaster, rbox(0.9, 0.82, 0.08, 0.04), x, y, z);
  kit.add(mat, rbox(0.7, 0.62, 0.12, 0.05), x, y, z);
  kit.add(M.dark, box(0.05, 0.62, 0.14), x, y, z);
  kit.add(M.dark, box(0.7, 0.05, 0.14), x, y, z);
  kit.add(M.snow, pill(0.09, 0.85), x, y - 0.42, z + 0.1, { rz: Math.PI / 2 });
}

function addDoor(kit: Kit, z: number, mat: Material = M.red) {
  kit.add(M.plaster, rbox(1.1, 1.5, 0.08, 0.04), 0, 0.75, z);
  kit.add(M.plaster, cyl(0.55, 0.55, 0.08, 14), 0, 1.5, z, { rx: Math.PI / 2 });
  kit.add(mat, rbox(0.9, 1.4, 0.12, 0.05), 0, 0.7, z);
  kit.add(mat, cyl(0.45, 0.45, 0.12, 14), 0, 1.4, z, { rx: Math.PI / 2 });
  kit.add(M.gold, ball(0.1, 8, 6), 0.28, 0.72, z + 0.1);
  kit.add(M.green, new TorusGeometry(0.22, 0.13, 8, 14), 0, 1.2, z + 0.14);
  kit.add(M.red, ball(0.1, 8, 6), -0.09, 1.0, z + 0.24);
  kit.add(M.red, ball(0.1, 8, 6), 0.09, 1.0, z + 0.24);
  kit.add(M.snow, ball(0.8, 14, 8), 0, 0.06, z + 0.42, { s: [1, 0.2, 0.55] });
}

function addChimney(kit: Kit, x: number, y: number, z: number) {
  const barrel = Array.from({ length: 9 }, (_, k) => {
    const t = k / 8;
    return new Vector2(0.36 + Math.sin(t * Math.PI) * 0.1, -0.6 + t * 1.2);
  });
  barrel.unshift(new Vector2(0, -0.6));
  barrel.push(new Vector2(0, 0.6));
  kit.add(M.red, new LatheGeometry(barrel, 14), x, y, z);
  kit.add(M.red, new TorusGeometry(0.4, 0.13, 8, 16), x, y + 0.56, z, { rx: Math.PI / 2 });
  kit.add(M.snow, ball(0.52, 12, 8), x, y + 0.74, z, { s: [1, 0.62, 1] });
}

function treeParts(decorated: boolean) {
  const tiers = [
    { r: 1.75, h: 1.7, y: 0.65 },
    { r: 1.38, h: 1.45, y: 1.75 },
    { r: 1.0, h: 1.25, y: 2.7 },
  ];
  const curve = [
    [0, 0],
    [0.86, 0],
    [1, 0.14],
    [0.95, 0.32],
    [0.72, 0.6],
    [0.38, 0.86],
    [0, 1],
  ];
  const radiusAt = (u: number) => {
    for (let k = 1; k < curve.length; k += 1) {
      if (u <= curve[k][1]) {
        const [r0, h0] = curve[k - 1];
        const [r1, h1] = curve[k];
        return r0 + ((r1 - r0) * (u - h0)) / (h1 - h0 || 1);
      }
    }
    return 0;
  };
  const leaves: BufferGeometry[] = [];
  const snow: BufferGeometry[] = [];
  const red: BufferGeometry[] = [];
  const gold: BufferGeometry[] = [];
  tiers.forEach(({ r, h, y }, ti) => {
    const pts = curve.map(([cr, ch]) => new Vector2(cr * r, ch * h));
    leaves.push(placed(new LatheGeometry(pts, 12), 0, y, 0));
    const cut = 0.5;
    const capPts = curve
      .filter(([, ch]) => ch >= cut)
      .map(([cr, ch]) => new Vector2(cr * r * 1.05, (ch - cut) * h * 1.05));
    capPts.unshift(new Vector2(radiusAt(cut) * r * 1.05, 0));
    snow.push(placed(new LatheGeometry(capPts, 12), 0, y + cut * h, 0));
    const rimR = radiusAt(cut) * r * 1.02;
    const n = 7 + ti;
    for (let k = 0; k < n; k += 1) {
      const a = (k / n) * Math.PI * 2 + ti;
      snow.push(
        placed(
          ball(0.23 * (1 - ti * 0.15), 6, 4),
          Math.cos(a) * rimR,
          y + cut * h - 0.04,
          Math.sin(a) * rimR,
          {
            s: [1, 0.85, 1],
          },
        ),
      );
    }
    if (decorated) {
      const ornR = radiusAt(0.22) * r * 1.0;
      for (let k = 0; k < 4; k += 1) {
        const a = (k / 4) * Math.PI * 2 + ti * 0.9 + 0.4;
        (k % 2 ? gold : red).push(
          placed(ball(0.18, 6, 4), Math.cos(a) * ornR, y + 0.22 * h, Math.sin(a) * ornR),
        );
      }
    }
  });
  if (decorated) gold.push(placed(puffy(starShape(0.36, 0.22), 0.12), 0, 4.0, 0));
  const trunk = [placed(cyl(0.34, 0.4, 0.75, 8), 0, 0.38, 0)];
  return { leaves, snow, red, gold, trunk };
}

function addPine(kit: Kit, x: number, z: number, h: number, ornaments: boolean) {
  const k = h / 4;
  const parts = treeParts(ornaments);
  const add = (mat: Material, geos: BufferGeometry[]) =>
    geos.forEach((g) => kit.add(mat, g, x, 0, z, { s: k }));
  add(M.green, parts.leaves);
  add(M.snow, parts.snow);
  add(M.red, parts.red);
  add(M.gold, parts.gold);
  add(M.woodDark, parts.trunk);
}

function addSnowman(kit: Kit, x: number, z: number) {
  kit.add(M.snow, ball(0.6, 14, 10), x, 0.48, z, { s: [1.08, 0.95, 1.08] });
  kit.add(M.snow, ball(0.44, 12, 10), x, 1.2, z, { s: [1.06, 0.95, 1.06] });
  kit.add(M.snow, ball(0.33, 12, 10), x, 1.74, z);
  kit.add(M.dark, cyl(0.33, 0.33, 0.06, 12), x, 1.98, z);
  kit.add(M.dark, rbox(0.36, 0.3, 0.36, 0.1), x, 2.14, z);
  kit.add(M.red, new TorusGeometry(0.32, 0.11, 8, 14), x, 1.46, z, { rx: Math.PI / 2 });
  kit.add(M.red, pill(0.1, 0.2), x + 0.16, 1.28, z + 0.32);
  kit.add(M.gold, ball(0.08, 8, 6), x, 1.72, z + 0.36);
  [-1, 1].forEach((s) => {
    kit.add(M.dark, ball(0.05, 6, 5), x + s * 0.11, 1.82, z + 0.29);
    kit.add(M.red, ball(0.06, 6, 5), x + s * 0.2, 1.68, z + 0.26);
    kit.add(M.woodDark, pill(0.045, 0.45), x + s * 0.6, 1.32, z, { rz: s * 0.9 });
  });
  kit.add(M.dark, ball(0.035, 5, 4), x, 1.6, z + 0.32);
}

function addFence(kit: Kit, front: number, back: number, half: number, gate: number) {
  const mat = M.plaster;
  for (let x = -half; x <= half + 0.01; x += 0.55) {
    if (Math.abs(x) >= gate) {
      kit.add(mat, pill(0.11, 0.5), x, 0.36, front);
      kit.add(M.snow, ball(0.15, 8, 6), x, 0.8, front);
    }
  }
  [-1, 1].forEach((s) => {
    const len = half - gate;
    [0.28, 0.55].forEach((y) => {
      kit.add(mat, rbox(len, 0.12, 0.1, 0.05), (s * (half + gate)) / 2, y, front);
      kit.add(mat, rbox(0.1, 0.12, front - back, 0.05), s * half, y, (front + back) / 2);
    });
  });
}

function addMound(kit: Kit, x: number, z: number, r: number) {
  kit.add(M.snow, ball(r, 10, 6), x, 0, z, { s: [1.5, 0.55, 1] });
}

export function createHouse(variant: number, kinds: GiftShape[] = GIFT_SHAPES): HouseView {
  const root = new Group();
  const body = new Group();
  root.add(body);
  const kit = new Kit();
  const lights = new Kit();
  const windows = createDitherMaterial({ albedo: 0.2, emissive: 0.15, tint: 'gold' });
  let door: Vector3;
  let bubbleY: number;

  if (variant === 0) {
    const w = 3.6;
    const h0 = 2.1;
    const d = 3;
    const z = 0.3;
    const front = z + d / 2;
    addLogWalls(kit, w, h0, d, z);
    addRoof(kit, { w, h0, rh: 1.5, d, z, roof: M.red, wall: M.wood });
    addChimney(kit, 1, h0 + 1.2, z - 0.6);
    addDoor(kit, front + LOG_R + 0.04, M.woodDark);
    addWindow(kit, windows, -1.15, 1.25, front + LOG_R + 0.05, true);
    addWindow(kit, windows, 1.15, 1.25, front + LOG_R + 0.05, true);
    addPine(kit, -2.7, 2.5, 1.6, true);
    addMound(kit, 2.4, 2.6, 0.55);
    addEaveLights(lights, w, h0, 1.5, front + 0.55);
    door = new Vector3(0, 0.35, front + 0.8);
    bubbleY = h0 + 1.5 + 1.3;
  } else if (variant === 1) {
    const w = 3.4;
    const h0 = 2.3;
    const d = 2.8;
    const z = -1;
    const front = z + d / 2;
    addLogWalls(kit, w, h0, d, z);
    addRoof(kit, { w, h0, rh: 1.4, d, z, roof: M.green, wall: M.wood });
    addChimney(kit, -0.9, h0 + 1.1, z - 0.5);
    addDoor(kit, front + LOG_R + 0.04);
    addWindow(kit, windows, -1.05, 1.35, front + LOG_R + 0.05, true);
    addWindow(kit, windows, 1.05, 1.35, front + LOG_R + 0.05, true);
    addFence(kit, 3.2, -2.4, 3.4, 0.7);
    for (let pz = front + 0.9; pz < 3; pz += 0.55) {
      kit.add(M.woodDark, cyl(0.25, 0.25, 0.05, 10), (pz * 7) % 0.2, 0.03, pz);
    }
    addPine(kit, -2.2, 1.8, 2, true);
    addSnowman(kit, 2.1, 1.9);
    addEaveLights(lights, w, h0, 1.4, front + 0.55);
    door = new Vector3(0, 0.35, front + 0.8);
    bubbleY = h0 + 1.4 + 1.3;
  } else if (variant === 2) {
    const w = 4.4;
    const h0 = 2;
    const d = 3.2;
    const z = 0;
    const front = z + d / 2;
    addLogWalls(kit, w, h0, d, z);
    addRoof(kit, { w, h0, rh: 1.3, d, z, roof: M.woodDark, wall: M.wood });
    addChimney(kit, -1.3, h0 + 1, z - 0.5);
    kit.add(M.red, rbox(w + 0.2, 0.3, 1.35, 0.14), 0, h0 + 0.05, front + 0.6);
    kit.add(M.snow, rbox(w + 0.1, 0.38, 1.3, 0.18), 0, h0 + 0.24, front + 0.6);
    [-1, 1].forEach((s) => {
      kit.add(M.woodDark, pill(0.1, h0 - 0.2), s * 1.9, h0 / 2, front + 1.15);
      kit.add(M.bulbGold, ball(0.16, 8, 6), s * 1.9, 1.5, front + 1.32);
    });
    addDoor(kit, front + LOG_R + 0.04);
    addWindow(kit, windows, -1.4, 1.2, front + LOG_R + 0.05, true);
    addWindow(kit, windows, 1.4, 1.2, front + LOG_R + 0.05, true);
    addPine(kit, -2.9, 2.8, 1.3, false);
    addPine(kit, 2.9, 2.8, 1.4, false);
    addEaveLights(lights, w, h0, 1.3, front + 0.55);
    door = new Vector3(0, 0.35, front + 1.2);
    bubbleY = h0 + 1.3 + 1.3;
  } else {
    const w = 3;
    const h0 = 2.2;
    const d = 2.6;
    const z = -1.2;
    const front = z + d / 2;
    addLogWalls(kit, w, h0, d, z);
    addRoof(kit, { w, h0, rh: 1.6, d, z, roof: M.red, wall: M.wood });
    addChimney(kit, 0.7, h0 + 1.3, z - 0.4);
    addDoor(kit, front + LOG_R + 0.04, M.green);
    addWindow(kit, windows, -0.95, 1.3, front + LOG_R + 0.05, true);
    addWindow(kit, windows, 0.95, 1.3, front + LOG_R + 0.05, true);
    [-1, 1].forEach((s) => {
      for (let i = 0; i < 4; i += 1) {
        const bx = s * (1.05 + i * 0.6);
        kit.add(M.green, ball(0.42, 12, 8), bx, 0.36, 3.1, { s: [1, 0.85, 1] });
        kit.add(M.snow, ball(0.3, 10, 6), bx, 0.64, 3.1, { s: [1, 0.5, 1] });
      }
      kit.add(M.plaster, pill(0.09, 1.4), s * 0.8, 0.8, 3.1);
    });
    kit.add(M.green, new TorusGeometry(0.8, 0.12, 6, 14, Math.PI), 0, 1.6, 3.1);
    kit.add(M.red, ball(0.12, 8, 6), -0.1, 2.42, 3.2);
    kit.add(M.red, ball(0.12, 8, 6), 0.1, 2.42, 3.2);
    kit.add(M.woodDark, pill(0.05, 0.8), 1.6, 0.45, 2.4);
    kit.add(M.red, rbox(0.34, 0.3, 0.48, 0.12), 1.6, 0.98, 2.4);
    kit.add(M.snow, ball(0.2, 8, 6), 1.6, 1.15, 2.4, { s: [1, 0.4, 1.3] });
    addSnowman(kit, -2, 1.5);
    addEaveLights(lights, w, h0, 1.6, front + 0.55);
    door = new Vector3(0, 0.35, front + 0.8);
    bubbleY = h0 + 1.6 + 1.3;
  }

  kit.build(body);
  const blob = new Mesh(blobGeo(), blobMat);
  blob.position.set(0, 0.03, -0.3);
  blob.scale.set(3.3, 1, 2.9);
  root.add(blob);
  const lightGroup = new Group();
  lights.build(lightGroup);
  lightGroup.visible = false;
  body.add(lightGroup);

  const gifts = createGiftSet(0.8, false, kinds);
  gifts.root.position.copy(door).setY(0.24);
  root.add(gifts.root);

  return {
    root,
    body,
    door,
    bubble: new Vector3(0, bubbleY, door.z - 0.8),
    windows,
    lights: lightGroup,
    doorstep: gifts.shapes,
  };
}

export interface Reindeer {
  root: Group;
  legs: Object3D[];
  head: Object3D;
}

export interface Sleigh {
  root: Group;
  body: Group;
  santa: Group;
  armL: Object3D;
  armR: Object3D;
  deer: Reindeer[];
  sack: Group;
  peeks: Partial<Record<GiftShape, Object3D>>;
}

export const SACK_TOP = new Vector3(0.05, 2.0, 0.3);

export type SleighColor = 'red' | 'green';

function createReindeer(fur: Material, light: Material, nose: Material, harness: Material) {
  const root = new Group();
  const body = addOutline(part(ball(0.44, 14, 12), fur, 0, 0.8, 0), 1.07);
  body.scale.set(1.05, 0.95, 1.12);
  root.add(body);
  const belly = part(ball(0.28, 12, 10), light, 0, 0.68, -0.18);
  belly.scale.set(1.05, 0.9, 0.85);
  root.add(belly);
  root.add(part(ball(0.13, 8, 6), light, 0, 0.92, 0.5));
  root.add(part(ball(0.2, 10, 8), fur, 0, 1.08, -0.36));
  const collar = part(new TorusGeometry(0.2, 0.065, 6, 14), harness, 0, 1.02, -0.38);
  collar.rotation.x = 0.5;
  root.add(collar);
  root.add(part(ball(0.08, 8, 6), M.gold, 0, 0.86, -0.56));

  const head = new Group();
  head.position.set(0, 1.32, -0.5);
  head.add(addOutline(part(ball(0.31, 14, 12), fur), 1.07));
  const muzzle = part(ball(0.18, 10, 8), light, 0, -0.1, -0.22);
  muzzle.scale.set(1.25, 0.85, 0.9);
  head.add(muzzle);
  head.add(addOutline(part(ball(0.11, 10, 8), nose, 0, -0.04, -0.4), 1.15));
  [-1, 1].forEach((s) => {
    head.add(part(ball(0.045, 6, 5), M.dark, s * 0.13, 0.08, -0.27));
    const antler = part(pill(0.055, 0.16), light, s * 0.13, 0.36, 0.02);
    antler.rotation.z = -s * 0.4;
    const tine = part(pill(0.045, 0.06), light, s * 0.24, 0.42, 0);
    tine.rotation.z = s * 0.7;
    head.add(antler, tine, part(ball(0.07, 6, 5), light, s * 0.21, 0.5, 0.02));
    const ear = part(ball(0.08, 8, 6), fur, s * 0.3, 0.1, 0.06);
    ear.scale.set(1.7, 0.75, 0.85);
    ear.rotation.z = -s * 0.3;
    head.add(ear);
  });
  root.add(head);

  const legGeo = pill(0.11, 0.12).translate(0, -0.17, 0);
  const hoofGeo = ball(0.12, 8, 6).translate(0, -0.3, 0);
  const legs = [
    [-0.2, -0.26],
    [0.2, -0.26],
    [-0.2, 0.28],
    [0.2, 0.28],
  ].map(([x, z]) => {
    const leg = new Group();
    leg.position.set(x, 0.52, z);
    leg.add(new Mesh(legGeo, fur), new Mesh(hoofGeo, light));
    root.add(leg);
    return leg;
  });
  return { root, legs, head };
}

export function createSleigh(gifts: GiftShape[], color: SleighColor = 'red'): Sleigh {
  const red = createDitherMaterial({ albedo: 1, emissive: 0.35, tint: 'red' });
  const paint =
    color === 'green' ? createDitherMaterial({ albedo: 1, emissive: 0.4, tint: 'green' }) : red;
  const gold = createDitherMaterial({ albedo: 1, emissive: 0.6, tint: 'gold' });
  const white = createDitherMaterial({ albedo: 1, emissive: 0.6, warm: false });
  const dark = createDitherMaterial({ albedo: 0.1, warm: false });
  const brown = createDitherMaterial({ albedo: 1, emissive: 0.3, tint: 'wood' });
  const nose = createDitherMaterial({ albedo: 0, emissive: 1.8, tint: 'red' });
  const glow = createDitherMaterial({ albedo: 0, emissive: 1.8, tint: 'gold' });

  const root = new Group();
  const body = new Group();
  root.add(body);

  [-0.58, 0.58].forEach((x) => {
    body.add(part(pill(0.08, 2.1).rotateX(Math.PI / 2), gold, x, 0.06, 0.1));
    const curl = part(new TorusGeometry(0.28, 0.08, 8, 14, Math.PI * 1.3), gold, x, 0.34, -1.05);
    curl.rotation.y = Math.PI / 2;
    body.add(curl);
    body.add(part(pill(0.07, 0.2), gold, x, 0.22, -0.5));
    body.add(part(pill(0.07, 0.2), gold, x, 0.22, 0.7));
  });
  body.add(
    addOutline(part(puffBox(1.44, 0.66, 2.0, 0.3, 0.72, 0.33, 1), paint, 0, 0.66, 0.1), 1.06),
  );
  const scoop = addOutline(
    part(puffBox(1.44, 0.6, 0.44, 0.2, 0.72, 0.3, 0.22), paint, 0, 0.9, -0.86),
    1.06,
  );
  scoop.rotation.x = -0.5;
  body.add(scoop);
  body.add(
    addOutline(part(puffBox(1.44, 0.96, 0.42, 0.2, 0.72, 0.48, 0.21), paint, 0, 1.14, 0.95), 1.06),
  );
  body.add(part(pill(0.085, 1.42).rotateZ(Math.PI / 2), gold, 0, 0.98, -0.88));
  body.add(part(pill(0.085, 1.42).rotateZ(Math.PI / 2), gold, 0, 1.64, 0.95));
  body.add(part(pill(0.04, 0.34), gold, 0.76, 1.0, -0.95));
  body.add(addOutline(part(ball(0.17, 12, 10), glow, 0.76, 1.24, -0.95), 1.2));

  const sackWhite = createDitherMaterial({ albedo: 1, emissive: 0.75, warm: false });
  const sack = new Group();
  sack.position.set(SACK_TOP.x, 0.57, SACK_TOP.z);
  body.add(sack);
  const bag = addOutline(part(ball(0.66, 16, 12), sackWhite, 0, 0.6, 0), 1.06);
  bag.scale.set(1.08, 1.05, 1);
  sack.add(bag);
  [-0.5, 0, 0.5].forEach((a) => {
    const fold = part(pill(0.07, 0.5), sackWhite, Math.sin(a) * 0.64, 0.62, Math.cos(a) * 0.62);
    fold.rotation.set(0, a, 0);
    sack.add(fold);
  });
  sack.add(part(rbox(0.28, 0.24, 0.06, 0.06), red, 0.32, 0.45, 0.6));
  sack.add(part(cyl(0.56, 0.6, 0.24, 18), sackWhite, 0, 1.22, 0));
  sack.add(part(cyl(0.5, 0.5, 0.04, 18), createDitherMaterial({ albedo: 0.05 }), 0, 1.34, 0));
  const ruffle = part(new TorusGeometry(0.58, 0.13, 8, 20), sackWhite, 0, 1.36, 0);
  ruffle.rotation.x = Math.PI / 2;
  const rope = part(new TorusGeometry(0.6, 0.05, 6, 20), gold, 0, 1.16, 0);
  rope.rotation.x = Math.PI / 2;
  sack.add(addOutline(ruffle, 1.06), rope);
  sack.add(
    part(ball(0.08, 8, 6), gold, 0.46, 1.12, 0.36),
    part(ball(0.08, 8, 6), gold, 0.54, 1.06, 0.3),
  );
  sack.add(
    part(pill(0.03, 0.16), gold, 0.52, 0.94, 0.36),
    part(pill(0.03, 0.16), gold, 0.44, 0.92, 0.42),
  );
  const peeks: Partial<Record<GiftShape, Object3D>> = {};
  const slots =
    gifts.length === 2
      ? [
          [-0.1, 1.42, -0.02, -0.3, 1.1],
          [0.2, 1.34, 0.05, 0.45, 0.66],
        ]
      : [
          [-0.2, 1.36, 0.06, -0.35, 0.82],
          [0.03, 1.46, -0.1, 0.1, 0.85],
          [0.22, 1.36, 0.1, 0.4, 0.82],
        ];
  gifts.slice(0, 3).forEach((shape, i) => {
    const g = createGiftMesh(shape);
    const [x, y, z, r, size] = slots[i];
    g.position.set(x, y, z);
    g.rotation.set(0.15, r, r * 0.4);
    g.scale.setScalar(size);
    g.userData.base = y;
    peeks[shape] = g;
    sack.add(g);
  });
  const santa = new Group();
  santa.position.set(-0.3, 0.9, -0.5);
  body.add(santa);
  const coat = addOutline(part(ball(0.44, 16, 12), red, 0, 0.4, 0), 1.06);
  coat.scale.set(1.05, 1, 0.95);
  santa.add(coat);
  const trim = part(pill(0.07, 0.36), white, 0, 0.5, -0.4);
  trim.rotation.x = 0.35;
  santa.add(trim);
  const belt = part(new TorusGeometry(0.43, 0.07, 6, 16), dark, 0, 0.32, 0);
  belt.rotation.x = Math.PI / 2;
  belt.scale.set(1.05, 0.95, 1);
  santa.add(belt, addOutline(part(rbox(0.18, 0.14, 0.06, 0.04), gold, 0, 0.32, -0.42), 1.1));
  santa.add(addOutline(part(ball(0.27, 14, 12), white, 0, 0.94, 0), 1.07));
  [-1, 1].forEach((s) => {
    santa.add(part(ball(0.07, 8, 6), red, s * 0.15, 0.92, -0.2));
    santa.add(part(ball(0.035, 6, 5), dark, s * 0.09, 1.0, -0.24));
  });
  santa.add(part(ball(0.07, 8, 6), red, 0, 0.92, -0.28));
  const beard = part(ball(0.26, 12, 10), white, 0, 0.76, -0.12);
  beard.scale.set(1.25, 1.1, 0.85);
  santa.add(beard);
  const hat = addOutline(part(cone(0.25, 0.42, 14), red, 0, 1.26, 0.06), 1.1);
  hat.rotation.x = 0.45;
  santa.add(hat);
  const brim = part(new TorusGeometry(0.24, 0.1, 8, 14), white, 0, 1.08, 0);
  brim.rotation.x = Math.PI / 2;
  santa.add(brim, addOutline(part(ball(0.14, 10, 8), white, 0, 1.43, 0.24), 1.1));
  const armGeo = pill(0.13, 0.16).translate(0, -0.16, 0);
  const makeArm = (x: number) => {
    const arm = new Group();
    arm.position.set(x, 0.62, 0);
    arm.add(addOutline(new Mesh(armGeo, red), 1.12));
    arm.add(part(ball(0.13, 8, 6), white, 0, -0.32, 0));
    arm.add(part(ball(0.12, 8, 6), dark, 0, -0.43, 0));
    santa.add(arm);
    return arm;
  };
  const armL = makeArm(-0.44);
  const armR = makeArm(0.44);

  const reindeer = createReindeer(brown, white, nose, red);
  reindeer.root.position.set(0, 0, -2.6);
  root.add(reindeer.root);
  [-1, 1].forEach((sx) => {
    root.add(part(pill(0.025, 1.2).rotateX(Math.PI / 2), gold, sx * 0.24, 0.9, -1.55));
  });
  root.add(part(pill(0.025, 0.42).rotateZ(Math.PI / 2), gold, 0, 0.9, -2.15));
  const deer = [reindeer];

  return { root, body, santa, armL, armR, deer, sack, peeks };
}

export function createGround() {
  const geo = new PlaneGeometry(90, 150, 1, 60).rotateX(-Math.PI / 2);
  const mesh = new Mesh(geo, createGroundMaterial(ROAD_HALF));
  mesh.frustumCulled = false;
  return mesh;
}

function instanced(geo: BufferGeometry, mat: Material, count: number) {
  const mesh = new InstancedMesh(geo, mat, Math.max(count, 1));
  mesh.count = count;
  mesh.frustumCulled = false;
  return mesh;
}

export function createForest(count: number) {
  const parts = treeParts(true);
  return [
    instanced(
      placed(new PlaneGeometry(4.4, 4.4).rotateX(-Math.PI / 2), 0, 0.03, 0),
      createBlobShadowMaterial(0.55, 2.1),
      count,
    ),
    instanced(merge(parts.leaves), createDitherMaterial({ albedo: 0.6, tint: 'green' }), count),
    instanced(merge(parts.snow), createDitherMaterial({ albedo: 1, emissive: 0.3 }), count),
    instanced(merge(parts.trunk), createDitherMaterial({ albedo: 0.4, tint: 'wood' }), count),
    instanced(
      merge(parts.red),
      createDitherMaterial({ albedo: 1, emissive: 0.45, tint: 'red' }),
      count,
    ),
    instanced(
      merge(parts.gold),
      createDitherMaterial({ albedo: 1, emissive: 0.7, tint: 'gold' }),
      count,
    ),
  ];
}

export function createLamps(count: number) {
  const white: BufferGeometry[] = [
    placed(cyl(0.17, 0.2, 2.2, 12), 0, 1.1, 0),
    placed(ball(0.6, 12, 6), 0.2, 0, 0, { s: [1.5, 0.55, 1.3] }),
    placed(ball(0.8, 12, 6), 0.4, 0, 7, { s: [1.6, 0.6, 1.4] }),
    placed(ball(0.55, 12, 6), 0.1, 0, 7.8, { s: [1.4, 0.55, 1.2] }),
  ];
  const red: BufferGeometry[] = [];
  for (let y = 0.3; y < 2.2; y += 0.38) {
    red.push(placed(new TorusGeometry(0.18, 0.07, 6, 14), 0, y, 0, { rx: Math.PI / 2 }));
  }
  red.push(placed(new TorusGeometry(0.34, 0.17, 10, 16, Math.PI), -0.34, 2.2, 0));
  red.push(placed(ball(0.17, 10, 8), -0.68, 2.2, 0));
  red.push(placed(puffBox(0.6, 0.52, 0.6, 0.24, 0.3, 0.26, 0.3), 0.9, 0.28, 0.6, { ry: 0.3 }));
  const lamp = [placed(ball(0.3, 12, 10), -0.68, 1.82, 0)];
  const green = [
    placed(new TorusGeometry(0.24, 0.11, 8, 14), 0, 1.5, 0.2),
    placed(puffBox(0.5, 0.46, 0.5, 0.2, 0.25, 0.23, 0.25), 1.0, 0.24, -0.1, { ry: -0.4 }),
  ];
  const gold = [
    placed(puffBox(0.63, 0.54, 0.16, 0.07, 0.3, 0.26, 0.3), 0.9, 0.29, 0.6, { ry: 0.3 }),
    placed(puffBox(0.16, 0.54, 0.63, 0.07, 0.3, 0.26, 0.3), 0.9, 0.29, 0.6, { ry: 0.3 }),
    placed(ball(0.24, 10, 8), 1.05, 0.58, 0.15),
  ];
  return [
    instanced(merge(white), createDitherMaterial({ albedo: 1, emissive: 0.35 }), count),
    instanced(merge(red), createDitherMaterial({ albedo: 1, emissive: 0.35, tint: 'red' }), count),
    instanced(merge(lamp), createDitherMaterial({ albedo: 0, emissive: 1.8, tint: 'gold' }), count),
    instanced(
      merge(green),
      createDitherMaterial({ albedo: 1, emissive: 0.25, tint: 'green' }),
      count,
    ),
    instanced(merge(gold), createDitherMaterial({ albedo: 1, emissive: 0.5, tint: 'gold' }), count),
  ];
}

export function createSnow(count: number) {
  return instanced(
    new IcosahedronGeometry(0.045, 0),
    createDitherMaterial({ albedo: 0, emissive: 0.8, warm: false }),
    count,
  );
}
