export interface CubeDot {
  x: number;
  y: number;
  r: number;
  white: boolean;
  s: number;
}

const RIBBON_HALF = 0.13;

export const ribbonColor = (shade: number) =>
  shade > 0.5 ? '#ffffff' : shade > 0.3 ? '#e6e6e6' : '#c4c4c4';

export const CUBE_STEP = 2.6;

const KNOT_X = 62;
const KNOT_Y = 31;
const LOOP_LEN = 17;
const LOOP_W = 13.5;
const LOOP_TILT = 0.32;
const KNOT_RX = 7;
const KNOT_RY = 7;
const TAIL_LEN = 10;
const TAIL_W0 = 4.2;
const TAIL_W1 = 6;
const TAIL_CURL = 3.5;
const BOW_GAP = 1.4;

const loopHalf = (t: number) => 2.4 + LOOP_W * Math.sin(Math.PI * t) ** 0.75 * (0.55 + 0.45 * t);
const holeHalf = (t: number) =>
  t > 0.34 && t < 0.88 ? loopHalf(t) * 0.55 * Math.sin((Math.PI * (t - 0.34)) / 0.54) : 0;
const tailPoint = (s: number, u: number): [number, number] => [
  s * (1.5 + 3 * u + TAIL_CURL * u * u),
  2.5 + TAIL_LEN * u,
];
const tailHalf = (u: number) => TAIL_W0 + (TAIL_W1 - TAIL_W0) * u;

function loopAt(x: number, y: number): number | 'hole' | null {
  const s = x < 0 ? -1 : 1;
  const dx = s * Math.cos(LOOP_TILT);
  const dy = -Math.sin(LOOP_TILT);
  const t = (x * dx + y * dy) / LOOP_LEN;
  if (t <= 0 || t >= 1) return null;
  const v = -x * dy + y * dx;
  const hw = loopHalf(t);
  if (Math.abs(v) > hw) return null;
  if (Math.abs(v) < holeHalf(t)) return 'hole';
  const across = v / hw;
  let shade = 0.9 - 0.35 * across * across - 0.2 * Math.max(0, across);
  if (t < 0.18) shade *= 0.6 + (0.4 * t) / 0.18;
  return shade;
}

function tailAt(x: number, y: number): number | null {
  const s = x < 0 ? -1 : 1;
  let best = Infinity;
  let bu = 0;
  for (let k = 0; k <= 24; k += 1) {
    const u = k / 24;
    const [tx, ty] = tailPoint(s, u);
    const d = Math.hypot(x - tx, y - ty);
    if (d < best) {
      best = d;
      bu = u;
    }
  }
  const hw = tailHalf(bu);
  if (best > hw) return null;
  if (bu > 0.86 && best < ((bu - 0.86) / 0.14) * hw) return null;
  return (0.78 - 0.22 * bu) * (0.88 + 0.12 * Math.cos(bu * 6));
}

export function bowAt(px: number, py: number, ox = 0, oy = 0): number | 'hole' | null {
  const x = px - ox - KNOT_X;
  const y = py - oy - KNOT_Y;
  const k = (x / KNOT_RX) ** 2 + (y / KNOT_RY) ** 2;
  if (k <= 1) return 1 - k * 0.4;
  const loop = loopAt(x, y);
  if (loop !== null) return loop;
  return tailAt(x, y);
}

export function nearBow(x: number, y: number, ox = 0, oy = 0) {
  for (let a = 0; a < 8; a += 1) {
    const ang = (a * Math.PI) / 4;
    if (
      typeof bowAt(x + Math.cos(ang) * BOW_GAP, y + Math.sin(ang) * BOW_GAP, ox, oy) === 'number'
    ) {
      return true;
    }
  }
  return false;
}

export const radiusFor = (step: number, shade: number) =>
  step * (0.077 + 0.404 * Math.max(0, Math.min(1, shade)));

const BOW_FINE = 1;

export function bowDots(step: number, ox = 0, oy = 0) {
  const fine = step * BOW_FINE;
  const dots: { x: number; y: number; r: number; white: true; s: number }[] = [];
  const x0 = KNOT_X + ox - 32;
  const y0 = KNOT_Y + oy - 22;
  for (let row = 0, y = y0; y < y0 + 48; row += 1, y += fine) {
    for (let x = x0 + (row % 2) * (fine / 2); x < x0 + 64; x += fine) {
      const px = +x.toFixed(2);
      const py = +y.toFixed(2);
      const b = bowAt(px, py, ox, oy);
      if (typeof b === 'number') {
        dots.push({ x: px, y: py, r: +radiusFor(fine, b).toFixed(2), white: true, s: b });
      }
    }
  }
  return dots;
}

export const BOW_KNOT: [number, number] = [KNOT_X, KNOT_Y];

export const BOW_HOLES: [number, number][][] = [];
export const BOW_SILHOUETTE: [number, number][][][] = (() => {
  const polys: [number, number][][][] = [];
  const holes = BOW_HOLES;
  [-1, 1].forEach((s) => {
    const dx = s * Math.cos(LOOP_TILT);
    const dy = -Math.sin(LOOP_TILT);
    const top: [number, number][] = [];
    const bottom: [number, number][] = [];
    for (let k = 0; k <= 20; k += 1) {
      const t = k / 20;
      const hw = loopHalf(t) + 0.6;
      const cx = KNOT_X + dx * t * LOOP_LEN;
      const cy = KNOT_Y + dy * t * LOOP_LEN;
      top.push([cx + dy * hw, cy - dx * hw]);
      bottom.push([cx - dy * hw, cy + dx * hw]);
    }
    const holeTop: [number, number][] = [];
    const holeBottom: [number, number][] = [];
    for (let k = 1; k < 20; k += 1) {
      const t = 0.34 + (k / 20) * 0.54;
      const hw = holeHalf(t) + 0.6;
      const cx = KNOT_X + dx * t * LOOP_LEN;
      const cy = KNOT_Y + dy * t * LOOP_LEN;
      holeTop.push([cx + dy * hw, cy - dx * hw]);
      holeBottom.push([cx - dy * hw, cy + dx * hw]);
    }
    const hole = [...holeTop, ...holeBottom.reverse()];
    holes.push(hole);
    polys.push([[...top, ...bottom.reverse()], hole]);
    const left: [number, number][] = [];
    const right: [number, number][] = [];
    for (let k = 0; k <= 12; k += 1) {
      const u = k / 12;
      const [tx, ty] = tailPoint(s, u);
      const hw = tailHalf(u) + 0.6;
      left.push([KNOT_X + tx - hw, KNOT_Y + ty]);
      right.push([KNOT_X + tx + hw, KNOT_Y + ty]);
    }
    polys.push([[...left, ...right.reverse()]]);
  });
  polys.push([
    Array.from({ length: 16 }, (_, k) => {
      const a = (k / 16) * Math.PI * 2;
      return [KNOT_X + Math.cos(a) * (KNOT_RX + 0.6), KNOT_Y + Math.sin(a) * (KNOT_RY + 0.6)];
    }),
  ]);
  return polys;
})();

export function inPoly(poly: [number, number][], x: number, y: number) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

export function edgeDist(poly: [number, number][], x: number, y: number) {
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const [ax, ay] = poly[j];
    const [bx, by] = poly[i];
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    best = Math.min(best, Math.hypot(x - ax - t * dx, y - ay - t * dy));
  }
  return best;
}

export function roundPoly(poly: [number, number][], r: number): [number, number][] {
  const n = poly.length;
  const cx = poly.reduce((a, p) => a + p[0], 0) / n;
  const cy = poly.reduce((a, p) => a + p[1], 0) / n;
  const inward = (a: [number, number], b: [number, number]): [number, number] => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    let nx = -dy / l;
    let ny = dx / l;
    if ((cx - a[0]) * nx + (cy - a[1]) * ny < 0) {
      nx = -nx;
      ny = -ny;
    }
    return [nx, ny];
  };
  const out: [number, number][] = [];
  poly.forEach((p, i) => {
    const n1 = inward(poly[(i + n - 1) % n], p);
    const n2 = inward(p, poly[(i + 1) % n]);
    const k = r / (1 + n1[0] * n2[0] + n1[1] * n2[1]);
    const vx = p[0] + (n1[0] + n2[0]) * k;
    const vy = p[1] + (n1[1] + n2[1]) * k;
    const a1 = Math.atan2(-n1[1], -n1[0]);
    let da = Math.atan2(-n2[1], -n2[0]) - a1;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    const seg = Math.max(1, Math.ceil(Math.abs(da) / 0.25));
    for (let j = 0; j <= seg; j += 1) {
      const a = a1 + (da * j) / seg;
      out.push([+(vx + Math.cos(a) * r).toFixed(2), +(vy + Math.sin(a) * r).toFixed(2)]);
    }
  });
  return out;
}

export const BOX_ROUND = 10;
const BOX_BULGE = 0.12;

type Pt = [number, number];

export interface BoxSpec {
  A: Pt;
  U: Pt;
  V: Pt;
  H: number;
  ribbonU: number;
  ribbonV: number;
}

const LIGHT_2D: Pt = [-0.6, -0.8];
const unit = ([x, y]: Pt): Pt => {
  const l = Math.hypot(x, y) || 1;
  return [x / l, y / l];
};
const solve = ([px, py]: Pt, e1: Pt, e2: Pt): Pt => {
  const det = e1[0] * e2[1] - e1[1] * e2[0];
  return [(px * e2[1] - py * e2[0]) / det, (py * e1[0] - px * e1[1]) / det];
};
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const outOf01 = (v: number) => Math.max(0, -v, v - 1);

export function puffyBox(spec: BoxSpec) {
  const { A, U, V, H, ribbonU, ribbonV } = spec;
  const Hv: Pt = [0, H];
  const B: Pt = [A[0] + U[0], A[1] + U[1]];
  const D: Pt = [A[0] + V[0], A[1] + V[1]];
  const C: Pt = [D[0] + U[0], D[1] + U[1]];
  const corners: Pt[] = [A, B, C, [C[0], C[1] + H], [D[0], D[1] + H], [A[0], A[1] + H]];
  const cx = corners.reduce((a, p) => a + p[0], 0) / 6;
  const cy = corners.reduce((a, p) => a + p[1], 0) / 6;
  const curved: Pt[] = [];
  corners.forEach((p, i) => {
    const q = corners[(i + 1) % 6];
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    let [nx, ny] = unit([q[1] - p[1], p[0] - q[0]]);
    if (((p[0] + q[0]) / 2 - cx) * nx + ((p[1] + q[1]) / 2 - cy) * ny < 0) {
      nx = -nx;
      ny = -ny;
    }
    const mx = (p[0] + q[0]) / 2 + nx * len * BOX_BULGE * 2;
    const my = (p[1] + q[1]) / 2 + ny * len * BOX_BULGE * 2;
    for (let k = 0; k < 10; k += 1) {
      const t = k / 10;
      const w = 1 - t;
      curved.push([
        w * w * p[0] + 2 * w * t * mx + t * t * q[0],
        w * w * p[1] + 2 * w * t * my + t * t * q[1],
      ]);
    }
  });
  const outline = roundPoly(curved, BOX_ROUND);

  const faces = [
    {
      o: A,
      e1: U,
      e2: V,
      base: (a: number, b: number) => 0.95 - (a + b) * 0.1,
      rib: (a: number, b: number) => Math.abs(a - 0.5) < ribbonU || Math.abs(b - 0.5) < ribbonV,
    },
    {
      o: A,
      e1: V,
      e2: Hv,
      base: (a: number, b: number) => 0.62 - b * 0.2 - a * 0.06,
      rib: (a: number) => Math.abs(a - 0.5) < ribbonV,
    },
    {
      o: D,
      e1: U,
      e2: Hv,
      base: (a: number, b: number) => 0.3 - b * 0.1 + a * 0.03,
      rib: (a: number) => Math.abs(a - 0.5) < ribbonU,
    },
  ].map((f) => ({ ...f, d1: unit(f.e1), d2: unit(f.e2) }));

  const sample = (x: number, y: number): { shade: number; white: boolean } | null => {
    if (!inPoly(outline, x, y)) return null;
    let best = faces[0];
    let ab: Pt = [0, 0];
    let err = Infinity;
    faces.forEach((f) => {
      const [a, b] = solve([x - f.o[0], y - f.o[1]], f.e1, f.e2);
      const e = outOf01(a) + outOf01(b);
      if (e < err) {
        err = e;
        best = f;
        ab = [a, b];
      }
    });
    const a = clamp01(ab[0]);
    const b = clamp01(ab[1]);
    const qa = 2 * a - 1;
    const qb = 2 * b - 1;
    const r = Math.min(1, (qa ** 4 + qb ** 4) ** 0.25);
    const dome = Math.sqrt(1 - r * r);
    const tx = qa * best.d1[0] + qb * best.d2[0];
    const ty = qa * best.d1[1] + qb * best.d2[1];
    const facing = tx * LIGHT_2D[0] + ty * LIGHT_2D[1];
    const ha = best.d1[0] * LIGHT_2D[0] + best.d1[1] * LIGHT_2D[1];
    const hb = best.d2[0] * LIGHT_2D[0] + best.d2[1] * LIGHT_2D[1];
    const hl = Math.hypot(ha, hb) || 1;
    const spot = Math.max(0, 1 - Math.hypot(qa - (ha / hl) * 0.4, qb - (hb / hl) * 0.4) / 0.6) ** 2;
    const seam = r > 0.8 ? 0.45 + 0.55 * ((1 - r) / 0.2) : 1;
    const shade = clamp01(
      (best.base(a, b) * (0.8 + 0.35 * dome) + 0.18 * facing * dome + 0.4 * spot) * seam,
    );
    return { shade, white: best.rib(a, b) };
  };
  return { outline, sample };
}

const CUBE = puffyBox({
  A: [20, 38],
  U: [44, -16],
  V: [40, 16],
  H: 52,
  ribbonU: RIBBON_HALF,
  ribbonV: RIBBON_HALF,
});

export const CUBE_OUTLINE: [number, number][] = CUBE.outline;

function dotAt(x: number, y: number, step: number): CubeDot | null {
  if (typeof bowAt(x, y) === 'number' || nearBow(x, y)) return null;
  const hit = CUBE.sample(x, y);
  if (!hit) return null;
  return { x, y, r: radiusFor(step, hit.shade), white: hit.white, s: hit.shade };
}

export function cubeGiftDots(step = CUBE_STEP) {
  const dots: CubeDot[] = [];
  for (let row = 0, y = step / 2; y < 120; row += 1, y += step) {
    for (let x = step / 2 + (row % 2) * (step / 2); x < 120; x += step) {
      const d = dotAt(+x.toFixed(2), +y.toFixed(2), step);
      if (d) dots.push(d);
    }
  }
  return [...dots, ...bowDots(step)];
}
