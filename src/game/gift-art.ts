import type { GiftColor, GiftForm, GiftShape } from './gifts';
import { colorOf, formOf } from './gifts';
import {
  BOW_KNOT,
  BOW_HOLES,
  BOW_SILHOUETTE,
  CUBE_OUTLINE,
  CUBE_STEP,
  bowAt,
  bowDots,
  cubeGiftDots,
  nearBow,
  puffyBox,
  radiusFor,
} from './cube-gift';

export interface ArtDot {
  x: number;
  y: number;
  r: number;
  white: boolean;
  s: number;
}

export interface GiftArt {
  dots: ArtDot[];
  color: string;
  silhouette: [number, number][][][];
  holes: [number, number][][];
}

type Pt = [number, number];
type Sample = { shade: number; white: boolean } | null;

const COLORS: Record<GiftColor, string> = {
  red: '#e8413c',
  green: '#3fae5a',
};

const LIGHT = (() => {
  const v = [-0.5, -0.65, 0.72];
  const l = Math.hypot(v[0], v[1], v[2]);
  return v.map((c) => c / l);
})();
const lit = (nx: number, ny: number, nz: number) =>
  Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);

const RIBBON = 5.5;

type V3 = [number, number, number];
const dot3 = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const crossV = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

function inside(poly: Pt[], x: number, y: number) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

function nearestEdge(poly: Pt[], x: number, y: number) {
  let best = Infinity;
  let nx = 0;
  let ny = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const [ax, ay] = poly[j];
    const [bx, by] = poly[i];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (len * len)));
    const d = Math.hypot(x - ax - t * dx, y - ay - t * dy);
    if (d < best) {
      best = d;
      nx = dy / len;
      ny = -dx / len;
    }
  }
  return { d: best, nx, ny };
}

function outward(poly: Pt[]) {
  let area = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    area += (poly[j][0] - poly[i][0]) * (poly[j][1] + poly[i][1]);
  }
  return area > 0 ? poly : [...poly].reverse();
}

const ellipsePoly = (cx: number, cy: number, rx: number, ry: number, deg = 0, n = 32): Pt[] => {
  const a = (deg * Math.PI) / 180;
  return Array.from({ length: n }, (_, k) => {
    const t = (k / n) * Math.PI * 2;
    const x = Math.cos(t) * rx;
    const y = Math.sin(t) * ry;
    return [cx + x * Math.cos(a) - y * Math.sin(a), cy + x * Math.sin(a) + y * Math.cos(a)] as Pt;
  });
};

const heartPoly = (cx: number, cy: number, size: number, n = 120): Pt[] => {
  const insideHeart = (x: number, y: number) => {
    if (Math.hypot(Math.abs(x) - 0.46, y + 0.25) <= 0.47) return true;
    if (y < -0.25) return false;
    return (Math.abs(x) / 0.92) ** 2 + ((y + 0.25) / 0.95) ** 1.6 <= 1;
  };
  const oy = 0.05;
  return Array.from({ length: n }, (_, k) => {
    const t = (k / n) * Math.PI * 2;
    const dx = Math.cos(t);
    const dy = Math.sin(t);
    let lo = 0;
    let hi = 1.6;
    for (let it = 0; it < 24; it += 1) {
      const mid = (lo + hi) / 2;
      if (insideHeart(dx * mid, oy + dy * mid)) lo = mid;
      else hi = mid;
    }
    return [cx + dx * lo * size, cy + (oy + dy * lo) * size] as Pt;
  });
};

interface Shape {
  body: (x: number, y: number) => Sample;
  bow: Pt;
  silhouette: Pt[][];
}

function sphereShape(): Shape {
  const cx = 62;
  const cy = 68;
  const r = 43;
  const pole = norm([-0.1, -0.62, 0.78]);
  const vAxis = norm(crossV(pole, [1, 0, 0]));
  const hAxis = norm(crossV(pole, vAxis));
  return {
    body: (x, y) => {
      const nx = (x - cx) / r;
      const ny = (y - cy) / r;
      const d2 = nx * nx + ny * ny;
      if (d2 > 1) return null;
      const nz = Math.sqrt(1 - d2);
      const w = RIBBON / r;
      const white =
        Math.abs(dot3([nx, ny, nz], vAxis)) < w || Math.abs(dot3([nx, ny, nz], hAxis)) < w;
      return { shade: 0.12 + 0.88 * lit(nx, ny, nz), white };
    },
    bow: [cx + pole[0] * r - BOW_KNOT[0], cy + pole[1] * r - BOW_KNOT[1]],
    silhouette: [ellipsePoly(cx, cy, r, r, 0, 48)],
  };
}

function coneShape(): Shape {
  const cx = 62;
  const top = 20;
  const base = 96;
  const rx = 46;
  const ry = 11;
  const half = (y: number) => {
    const t = Math.max(0, Math.min(1, (y - top) / (base - top)));
    return rx * (0.5 * (1 - (1 - t) ** 1.8) ** 0.55 + 0.5 * t);
  };
  const BELT = 0.55;
  const ys = Array.from({ length: 25 }, (_, k) => top + ((base - top) * k) / 24);
  const outline: Pt[] = [
    ...ys.map((y) => [cx + half(y), y] as Pt),
    ...ellipsePoly(cx, base, rx, ry, 0, 32).filter(([, y]) => y > base),
    ...[...ys].reverse().map((y) => [cx - half(y), y] as Pt),
  ];
  return {
    body: (x, y) => {
      let u: number;
      let slope: number;
      if (y >= top && y <= base) {
        const hw = half(y);
        if (Math.abs(x - cx) > hw || hw < 0.5) return null;
        u = (x - cx) / hw;
        slope = (half(Math.min(base, y + 1)) - half(Math.max(top, y - 1))) / 2;
      } else if (y > base) {
        const e = ((x - cx) / rx) ** 2 + ((y - base) / ry) ** 2;
        if (e > 1) return null;
        u = (x - cx) / rx;
        slope = 0;
      } else return null;
      const nz = Math.sqrt(Math.max(0, 1 - u * u));
      const len = Math.hypot(u, slope, nz);
      const spot = Math.max(0, 1 - Math.hypot(x - (cx - 16), y - (top + 48)) / 18) ** 2;
      const shade = 0.12 + 0.88 * lit(u / len, -slope / len, nz / len) + 0.3 * spot;
      const beltY = top + (base - top) * BELT + ry * BELT * nz;
      const white = Math.abs(u) < 0.11 || Math.abs(y - beltY) < RIBBON;
      return { shade, white };
    },
    bow: [0, top + (base - top) * BELT + ry * BELT - BOW_KNOT[1]],
    silhouette: [outline],
  };
}

function extrudedShape(front: Pt[], ccx: number, ccy: number, bowAt0: Pt): Shape {
  const poly = outward(front);
  const D: Pt = [14, -12];
  const steps = 14;
  const shifted = Array.from({ length: steps }, (_, k) => {
    const t = (k + 1) / steps;
    return { t, poly: poly.map(([x, y]) => [x + D[0] * t, y + D[1] * t] as Pt) };
  });
  const ribbon = (x: number, y: number) => Math.abs(x - ccx) < RIBBON || Math.abs(y - ccy) < RIBBON;
  const quads: Pt[][] = poly.map((p, i) => {
    const q = poly[(i + 1) % poly.length];
    return [p, q, [q[0] + D[0], q[1] + D[1]], [p[0] + D[0], p[1] + D[1]]];
  });
  return {
    body: (x, y) => {
      if (inside(poly, x, y)) {
        const { d } = nearestEdge(poly, x, y);
        const puff = Math.min(1, d / 16);
        const spot = Math.max(0, 1 - Math.hypot(x - (ccx - 16), y - (ccy - 12)) / 20) ** 2;
        const shade =
          0.3 + 0.42 * Math.sqrt(puff) + 0.12 * ((ccx - x) / 40 + (ccy - y) / 40) + 0.35 * spot;
        return { shade, white: ribbon(x, y) };
      }
      const hit = shifted.find((s) => inside(s.poly, x, y));
      if (!hit) return null;
      const { nx, ny } = nearestEdge(hit.poly, x, y);
      const shade = 0.22 + 0.62 * Math.max(0, -ny) - 0.08 * Math.max(0, nx);
      return { shade, white: ribbon(x - D[0] * hit.t, y - D[1] * hit.t) };
    },
    bow: [bowAt0[0] - BOW_KNOT[0], bowAt0[1] - BOW_KNOT[1]],
    silhouette: [poly, poly.map(([x, y]) => [x + D[0], y + D[1]] as Pt), ...quads],
  };
}

function boxShape(): Shape {
  const A: Pt = [32, 35];
  const U: Pt = [28, -11];
  const V: Pt = [32, 13];
  const box = puffyBox({
    A,
    U,
    V,
    H: 62,
    ribbonU: RIBBON / Math.hypot(U[0], U[1]),
    ribbonV: RIBBON / Math.hypot(V[0], V[1]),
  });
  return {
    body: box.sample,
    bow: [A[0] + (U[0] + V[0]) / 2 - BOW_KNOT[0], A[1] + (U[1] + V[1]) / 2 - BOW_KNOT[1]],
    silhouette: [box.outline],
  };
}

function shapeOf(form: Exclude<GiftForm, 'square'>): Shape {
  if (form === 'circle') return sphereShape();
  if (form === 'triangle') return coneShape();
  if (form === 'rect') return boxShape();
  const front = heartPoly(54, 68, 44);
  return extrudedShape(front, 54, 70, [54, 70]);
}

const bowSilhouette = ([ox, oy]: Pt): Pt[][][] =>
  BOW_SILHOUETTE.map((rings) => rings.map((ring) => ring.map(([x, y]) => [x + ox, y + oy] as Pt)));

export function giftArt(kind: GiftShape, step = CUBE_STEP): GiftArt {
  const form = formOf(kind);
  const color = COLORS[colorOf(kind)];
  if (form === 'square') {
    return {
      dots: cubeGiftDots(step),
      color,
      silhouette: [[CUBE_OUTLINE], ...bowSilhouette([0, 0])],
      holes: BOW_HOLES,
    };
  }
  const shape = shapeOf(form);
  const [ox, oy] = shape.bow;
  const dots: ArtDot[] = [];
  const push = (x: number, y: number, shade: number, white: boolean) =>
    dots.push({ x, y, r: +radiusFor(step, shade).toFixed(2), white, s: shade });
  for (let row = 0, y = step / 2; y < 120; row += 1, y += step) {
    for (let x = step / 2 + (row % 2) * (step / 2); x < 120; x += step) {
      const px = +x.toFixed(2);
      const py = +y.toFixed(2);
      if (typeof bowAt(px, py, ox, oy) !== 'number' && !nearBow(px, py, ox, oy)) {
        const b = shape.body(px, py);
        if (b) push(px, py, b.shade, b.white);
      }
    }
  }
  dots.push(...bowDots(step, ox, oy));
  return {
    dots,
    color,
    silhouette: [...shape.silhouette.map((poly) => [poly]), ...bowSilhouette([ox, oy])],
    holes: BOW_HOLES.map((hole) => hole.map(([x, y]) => [x + ox, y + oy] as Pt)),
  };
}
