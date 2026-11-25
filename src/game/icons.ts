import type { GiftShape } from './gifts';
import { CUBE_STEP, radiusFor, ribbonColor } from './cube-gift';
import { giftArt } from './gift-art';

const R = '#e8413c';
const RD = '#b52a26';
const G = '#3fae5a';
const Y = '#ffd36b';
const YD = '#e0a93c';
const W = '#ffffff';
const B = '#a8693a';
const CREAM = '#f6ead6';
const SHINE = 'rgba(255,255,255,0.55)';
const OUT = '#000000';

type Attrs = Record<string, string | number>;
type Part = [string, Attrs, string, boolean?];

interface Dot {
  x: number;
  y: number;
  r: number;
  c: string;
}

interface Icon {
  w: number;
  h: number;
  parts: Part[];
  flat?: boolean;
  ox?: number;
  defs?: string;
  dots?: Dot[];
  silhouette?: [number, number][][][];
  holes?: [number, number][][];
}

const shine = (cx: number, cy: number, rx = 3, ry = 5, rot = -25): Part => [
  'ellipse',
  { cx, cy, rx, ry, transform: `rotate(${rot} ${cx} ${cy})` },
  SHINE,
  true,
];
const line = (d: string, color: string, width: number, outline = false): Part => [
  'path',
  {
    d,
    stroke: color,
    'stroke-width': width,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  },
  'none',
  !outline,
];
const round = (d: string, color: string, width = 5): Part => [
  'path',
  { d, stroke: color, 'stroke-width': width, 'stroke-linejoin': 'round' },
  color,
];

const STAR =
  'M24 8L28.7 19.5L41.1 20.4L31.6 28.5L34.6 40.6L24 34L13.4 40.6L16.4 28.5L6.9 20.4L19.3 19.5Z';
const HEART =
  'M24 41C10 32 5 24 5 17C5 10.5 10 6 15.5 6C19.5 6 22.5 8.5 24 11.5C25.5 8.5 28.5 6 32.5 6C38 6 43 10.5 43 17C43 24 38 32 24 41Z';

type Pt = [number, number];

const ART_SCALE = 0.4;
function giftIcon(shape: GiftShape, step: number): Icon {
  const sc = ART_SCALE;
  const ox = -0.8;
  const art = giftArt(shape, step / sc);
  const dots = art.dots.map((d) => ({
    x: +(d.x * sc + ox).toFixed(2),
    y: +(d.y * sc).toFixed(2),
    r: +(d.r * sc).toFixed(2),
    c: d.white ? ribbonColor(d.s) : art.color,
  }));
  const silhouette = art.silhouette.map((rings) =>
    rings.map((poly) => poly.map(([x, y]) => [x * sc + ox, y * sc] as Pt)),
  );
  const holes = art.holes.map((poly) => poly.map(([x, y]) => [x * sc + ox, y * sc] as Pt));
  return { w: 48, h: 48, parts: [], flat: true, dots, silhouette, holes };
}

const GIFT_STEP = CUBE_STEP * ART_SCALE;
const giftIcons: Partial<Record<GiftShape, Icon>> = {};
function getGiftIcon(shape: GiftShape) {
  giftIcons[shape] ??= giftIcon(shape, GIFT_STEP);
  return giftIcons[shape] as Icon;
}

export function giftHoleFractions(shape: GiftShape): [number, number][][] {
  const icon = getGiftIcon(shape);
  const size = icon.w + 6;
  return (icon.holes ?? []).map((poly) =>
    poly.map(([x, y]) => [(x + 3) / size, (y + 3) / size] as [number, number]),
  );
}

type BaseIcon = 'bell' | 'snowflake' | 'tree' | 'house' | 'sleigh' | 'sleigh-silhouette' | 'hand';

const K = '#000000';
const sil = (d: string, width: number, transform = ''): Part => [
  'path',
  {
    d,
    stroke: K,
    'stroke-width': width,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    ...(transform ? { transform } : {}),
  },
  'none',
  true,
];
const silFill = (tag: string, a: Attrs): Part => [tag, a, K, true];

function flyingDeer(x: number, y: number, tilt: number): Part[] {
  const t = `translate(${x} ${y}) rotate(${tilt})`;
  return [
    silFill('ellipse', { cx: 0, cy: 0, rx: 9, ry: 6.2, transform: `${t} rotate(-6)` }),
    sil('M-5.5 -3L-9 -7', 4.8, t),
    silFill('ellipse', { cx: -11, cy: -8.2, rx: 4.4, ry: 3.8, transform: t }),
    silFill('circle', { cx: -15.6, cy: -7.4, r: 1.7, transform: t }),
    sil(
      'M-10 -11.4L-8.6 -15M-9.3 -13.3L-7 -13.9M-12.2 -11.6L-13.2 -15M-12.7 -13.5L-15 -14.1',
      1.7,
      t,
    ),
    sil('M-5 4L-9.5 6.4L-12 5M-2.8 5.2L-7 8L-10 7.6', 2.7, t),
    sil('M5 4.4L9.6 6.8L13 6.4M6.6 3.4L11 4.6L14 3.2', 2.7, t),
    silFill('circle', { cx: 9.2, cy: -3.4, r: 2.1, transform: t }),
  ];
}

const ICONS: Record<BaseIcon, Icon> = {
  'sleigh-silhouette': {
    w: 100,
    h: 60,
    ox: 60,
    flat: true,
    parts: [
      sil('M109 26L79 24.5', 0.9),
      ...flyingDeer(82, 27, -8),
      sil('M100 53L146 53Q155 53 155 46', 2.6),
      sil('M100 53Q93 53 93 47.5Q93 43.5 97 44.5', 2.6),
      sil('M108 45V53M140 45V53', 2.2),
      silFill('path', {
        d: 'M104 34Q101 27 107 26L111 30L148 30Q152 30 152 34L151 42Q150 46 145 46L110 46Q104 46 104 40Z',
      }),
      silFill('ellipse', { cx: 141, cy: 27, rx: 10.5, ry: 11 }),
      silFill('path', {
        d: 'M130.5 19.5Q131.5 15 135 16.5Q138 14.3 141 16Q144 14.3 147 16.5Q150.5 15 151.5 19.5Z',
      }),
      silFill('rect', {
        x: 135,
        y: 10,
        width: 10,
        height: 10,
        rx: 1,
        transform: 'rotate(-10 140 15)',
      }),
      silFill('ellipse', {
        cx: 137.6,
        cy: 8.9,
        rx: 2.4,
        ry: 1.5,
        transform: 'rotate(-35 137.6 8.9)',
      }),
      silFill('ellipse', {
        cx: 141.8,
        cy: 8.1,
        rx: 2.4,
        ry: 1.5,
        transform: 'rotate(15 141.8 8.1)',
      }),
      silFill('path', {
        d: HEART,
        transform: 'translate(149.6 14) rotate(18) scale(0.22) translate(-24 -23)',
      }),
      silFill('ellipse', { cx: 120.5, cy: 25.5, rx: 9.5, ry: 9 }),
      silFill('circle', { cx: 118.5, cy: 13.5, r: 5.3 }),
      silFill('circle', { cx: 113.3, cy: 14, r: 1.7 }),
      silFill('path', {
        d: 'M114.3 14.8Q113.2 19.5 115.2 22.3Q117.4 23.6 119.4 21.4Q121 18.8 120.6 15.8Z',
      }),
      sil('M116 23L109 26', 4.2),
      silFill('rect', { x: 112.6, y: 8.4, width: 11.8, height: 3, rx: 1.5 }),
      silFill('path', {
        d: 'M114.5 10.5Q115.5 3.5 121 3Q127 2.8 131.5 9Q127.5 6.8 123 8L122.5 10.5Z',
        transform: 'translate(0 -1.4)',
      }),
      silFill('circle', { cx: 131.6, cy: 8.2, r: 2.5 }),
    ],
  },

  bell: {
    w: 48,
    h: 48,
    parts: [
      ['ellipse', { cx: 16, cy: 8.5, rx: 6.5, ry: 4.8, transform: 'rotate(-20 16 8.5)' }, R],
      ['ellipse', { cx: 32, cy: 8.5, rx: 6.5, ry: 4.8, transform: 'rotate(20 32 8.5)' }, R],
      round('M24 11C14 11 8.5 18.5 8.5 27L6.5 35L41.5 35L39.5 27C39.5 18.5 34 11 24 11Z', Y, 3),
      ['circle', { cx: 24, cy: 9, r: 4.2 }, RD],
      ['rect', { x: 5, y: 33, width: 38, height: 6.5, rx: 3.25 }, YD],
      ['circle', { cx: 24, cy: 42.5, r: 4.8 }, YD],
      shine(17, 21, 2.6, 5.5, 15),
    ],
  },
  snowflake: {
    w: 48,
    h: 48,
    parts: [
      line('M24 5V43M7.5 14.5L40.5 33.5M7.5 33.5L40.5 14.5', W, 4, true),
      line('M18.5 8.5L24 13L29.5 8.5M18.5 39.5L24 35L29.5 39.5', W, 3.5, true),
      [
        'path',
        {
          d: 'M18.5 8.5L24 13L29.5 8.5M18.5 39.5L24 35L29.5 39.5',
          transform: 'rotate(60 24 24)',
          stroke: W,
          'stroke-width': 3.5,
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
        },
        'none',
      ],
      [
        'path',
        {
          d: 'M18.5 8.5L24 13L29.5 8.5M18.5 39.5L24 35L29.5 39.5',
          transform: 'rotate(120 24 24)',
          stroke: W,
          'stroke-width': 3.5,
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
        },
        'none',
      ],
      ['circle', { cx: 24, cy: 24, r: 4.5 }, W],
    ],
  },
  tree: {
    w: 48,
    h: 52,
    parts: [
      ['rect', { x: 19.5, y: 41, width: 9, height: 9.5, rx: 3.5 }, B],
      [
        'path',
        {
          d: 'M4.5 40Q4.5 32.5 13 29.5Q24 25 35 29.5Q43.5 32.5 43.5 40Q43.5 44.5 38.5 44.5L9.5 44.5Q4.5 44.5 4.5 40Z',
        },
        G,
      ],
      [
        'path',
        {
          d: 'M8.5 29.5Q8.5 23.5 16 21Q24 17.5 32 21Q39.5 23.5 39.5 29.5Q39.5 33.5 35 33.5L13 33.5Q8.5 33.5 8.5 29.5Z',
        },
        G,
      ],
      [
        'path',
        {
          d: 'M13.5 20Q13.5 14.5 19 12Q24 9.5 29 12Q34.5 14.5 34.5 20Q34.5 23.5 31 23.5L17 23.5Q13.5 23.5 13.5 20Z',
        },
        G,
      ],
      [
        'path',
        {
          d: 'M15.5 15Q19 10.5 24 10.2Q29 10.5 32.5 15Q30 13.8 28 15.6Q26 13.6 24 15.4Q22 13.6 20 15.6Q18 13.8 15.5 15Z',
        },
        W,
        true,
      ],
      [
        'path',
        {
          d: 'M11 25Q16 20.2 24 19.6Q32 20.2 37 25Q34 23.6 31.5 25.6Q29 23.4 26.5 25.4Q24 23.2 21.5 25.4Q19 23.4 16.5 25.6Q14 23.6 11 25Z',
        },
        W,
        true,
      ],
      [
        'path',
        {
          d: 'M7 35.5Q14 29.8 24 29.2Q34 29.8 41 35.5Q37.5 33.8 34.5 36Q31.5 33.6 28.5 35.8Q26 33.4 24 35.6Q21.5 33.4 19 35.8Q16 33.6 13 36Q10 33.8 7 35.5Z',
        },
        W,
        true,
      ],
      ['circle', { cx: 15, cy: 39.5, r: 2.8 }, R, true],
      ['circle', { cx: 33, cy: 40, r: 2.8 }, Y, true],
      ['circle', { cx: 24, cy: 41.5, r: 2.4 }, Y, true],
      ['circle', { cx: 18.5, cy: 29.5, r: 2.5 }, Y, true],
      ['circle', { cx: 30, cy: 29.5, r: 2.5 }, R, true],
      ['circle', { cx: 24, cy: 19, r: 2.2 }, R, true],
      [
        'path',
        {
          d: STAR,
          transform: 'translate(24 6.5) scale(0.3) translate(-24 -25)',
          stroke: Y,
          'stroke-width': 12,
          'stroke-linejoin': 'round',
        },
        Y,
      ],
    ],
  },
  house: {
    w: 48,
    h: 48,
    parts: [
      ['rect', { x: 30.5, y: 7, width: 7.5, height: 13, rx: 3.75 }, R],
      ['ellipse', { cx: 34.2, cy: 7.5, rx: 5.4, ry: 3.2 }, W],
      ['rect', { x: 7.5, y: 21, width: 33, height: 22.5, rx: 10 }, CREAM],
      [
        'path',
        {
          d: 'M4 25.5Q4 20.5 9 17.5L19.5 9.8Q24 6.8 28.5 9.8L39 17.5Q44 20.5 44 25.5Q44 28.5 40 28.2L8 28.2Q4 28.5 4 25.5Z',
        },
        R,
      ],
      [
        'path',
        {
          d: 'M6.5 21.5Q8 16 14 13.2L20.5 9.2Q24 7.4 27.5 9.2L34 13.2Q40 16 41.5 21.5Q38.5 19.6 35.5 22Q32.5 18.8 29 21.4Q25.5 18.4 22 21.4Q18.5 18.8 15.5 22Q11.5 19.6 6.5 21.5Z',
        },
        W,
      ],
      ['rect', { x: 19.5, y: 30.5, width: 9, height: 13, rx: 4.5 }, R],
      ['circle', { cx: 13.8, cy: 33.5, r: 3.6 }, Y],
      ['circle', { cx: 34.2, cy: 33.5, r: 3.6 }, Y],
      line('M13.8 30.2V36.8M10.5 33.5H17.1', '#e0a93c', 1.2),
      line('M34.2 30.2V36.8M30.9 33.5H37.5', '#e0a93c', 1.2),
      ['ellipse', { cx: 24, cy: 44.2, rx: 22.5, ry: 3.6 }, W],
    ],
  },
  sleigh: {
    w: 100,
    h: 52,
    parts: [
      line('M8 19Q4 13 6 10M8 19Q9 13 13 12M15 20Q16 14 21 14', B, 2.5, true),
      ['ellipse', { cx: 22, cy: 33, rx: 11, ry: 7.5 }, B],
      line('M15 38L14 46M21 39L21 47M27 39L28 47M31 36L33 44', B, 3.5, true),
      ['circle', { cx: 11, cy: 24, r: 6 }, B],
      ['circle', { cx: 5, cy: 25, r: 2.6 }, R],
      line('M30 30Q40 34 50 33', Y, 1.8),
      line('M44 49L86 49Q94 49 94 41', Y, 3.5, true),
      line('M54 43L54 49M82 43L82 49', Y, 3, true),
      ['rect', { x: 76, y: 7, width: 9, height: 9, rx: 2.5 }, R],
      ['circle', { cx: 89, cy: 10, r: 4.5 }, G],
      [
        'path',
        {
          d: STAR,
          transform: 'translate(82 5) scale(0.24) translate(-24 -25)',
          stroke: Y,
          'stroke-width': 8,
          'stroke-linejoin': 'round',
        },
        Y,
      ],
      ['ellipse', { cx: 83, cy: 24, rx: 11, ry: 10 }, W],
      ['ellipse', { cx: 83, cy: 15.5, rx: 7.5, ry: 2.6 }, W],
      line('M76 17.5Q83 20 90 17.5', Y, 2),
      line('M56 22L47 9', R, 4.5),
      ['circle', { cx: 46.5, cy: 8, r: 3 }, '#000000'],
      ['ellipse', { cx: 61, cy: 26, rx: 8.5, ry: 8 }, R],
      ['rect', { x: 52.5, y: 26, width: 17, height: 3 }, '#000000', true],
      ['circle', { cx: 60, cy: 12.5, r: 5.5 }, '#f5c9a6'],
      ['ellipse', { cx: 56.5, cy: 16.5, rx: 4.5, ry: 5 }, W],
      ['circle', { cx: 58.5, cy: 11.5, r: 1 }, '#000000', true],
      round('M54.5 9.5Q57 1.5 63.5 1.5Q68.5 2 71 6.5L66 9.5Z', R, 2),
      ['rect', { x: 53.5, y: 8, width: 13.5, height: 3.6, rx: 1.8 }, W],
      ['circle', { cx: 71, cy: 6.5, r: 2.6 }, W],
      ['rect', { x: 50, y: 31, width: 42, height: 14, rx: 7 }, R],
      line('M50 36Q42 35 44 27', R, 5, true),
      ['rect', { x: 50, y: 37, width: 42, height: 2.5 }, Y, true],
    ],
  },
  hand: {
    w: 40,
    h: 48,
    parts: [
      ['rect', { x: 14, y: 3, width: 10, height: 28, rx: 5 }, W],
      ['ellipse', { cx: 8, cy: 31, rx: 5, ry: 7.5, transform: 'rotate(-30 8 31)' }, W],
      ['rect', { x: 7, y: 21, width: 29, height: 23, rx: 10 }, W],
      line('M24 23V30M30 24V30', '#cfd8e3', 2.5),
    ],
  },
};

export type IconName = BaseIcon | `gift-${GiftShape}`;

export type DotIconName = 'bell' | `gift-${GiftShape}`;

function inEllipse(x: number, y: number, cx: number, cy: number, rx: number, ry: number, rot = 0) {
  const a = (-rot * Math.PI) / 180;
  const dx = x - cx;
  const dy = y - cy;
  const u = dx * Math.cos(a) - dy * Math.sin(a);
  const v = dx * Math.sin(a) + dy * Math.cos(a);
  return (u / rx) ** 2 + (v / ry) ** 2 <= 1;
}

function bellHalfWidth(y: number) {
  if (y < 27) return 15.5 * Math.sqrt(Math.max(0, 1 - ((27 - y) / 16) ** 2));
  return 15.5 + ((y - 27) / 8) * 2;
}

const LIP = { x0: 8.25, x1: 39.75, y: 36.25, r: 3.25 };
const inLip = (x: number, y: number) =>
  Math.hypot(x - Math.max(LIP.x0, Math.min(LIP.x1, x)), y - LIP.y) <= LIP.r;

function ellipsePoly(cx: number, cy: number, rx: number, ry: number, rot = 0): Pt[] {
  const a = (rot * Math.PI) / 180;
  return Array.from({ length: 24 }, (_, i) => {
    const t = (i / 24) * Math.PI * 2;
    const u = rx * Math.cos(t);
    const v = ry * Math.sin(t);
    return [cx + u * Math.cos(a) - v * Math.sin(a), cy + u * Math.sin(a) + v * Math.cos(a)] as Pt;
  });
}

function bellSilhouette(): Pt[][][] {
  const ys = Array.from({ length: 25 }, (_, i) => 11 + i);
  const body: Pt[] = [
    ...ys.map((y) => [24 - bellHalfWidth(y), y] as Pt),
    ...ys.reverse().map((y) => [24 + bellHalfWidth(y), y] as Pt),
  ];
  const lip: Pt[] = Array.from({ length: 26 }, (_, i) => {
    const right = i < 13;
    const a = -Math.PI / 2 + (Math.PI * (i % 13)) / 12 + (right ? 0 : Math.PI);
    return [(right ? LIP.x1 : LIP.x0) + Math.cos(a) * LIP.r, LIP.y + Math.sin(a) * LIP.r] as Pt;
  });
  return [
    [ellipsePoly(16, 8.5, 6.5, 4.8, -20)],
    [ellipsePoly(32, 8.5, 6.5, 4.8, 20)],
    [ellipsePoly(24, 9, 4.2, 4.2)],
    [body],
    [lip],
    [ellipsePoly(24, 42.5, 4.8, 4.8)],
  ];
}

function bellColorAt(x: number, y: number): string | null {
  if (Math.hypot(x - 24, y - 42.5) <= 4.8) return YD;
  if (inLip(x, y)) return YD;
  if (Math.hypot(x - 24, y - 9) <= 4.2) return RD;
  if (y >= 11 && y <= 35 && Math.abs(x - 24) <= bellHalfWidth(y)) return Y;
  if (inEllipse(x, y, 16, 8.5, 6.5, 4.8, -20) || inEllipse(x, y, 32, 8.5, 6.5, 4.8, 20)) return R;
  return null;
}

function bellDotIcon(step: number): Icon {
  const dots: Dot[] = [];
  for (let row = 0, y = step / 2; y < 48; row += 1, y += step) {
    for (let x = step / 2 + (row % 2) * (step / 2); x < 48; x += step) {
      const c = bellColorAt(x, y);
      if (c) {
        const shade = Math.max(0, 1 - Math.hypot(x - 15, y - 15) / 30);
        dots.push({
          x: +x.toFixed(2),
          y: +y.toFixed(2),
          r: +radiusFor(step, 0.2 + 0.8 * shade).toFixed(2),
          c,
        });
      }
    }
  }
  return { w: 48, h: 48, parts: [], flat: true, dots, silhouette: bellSilhouette() };
}

const HUD_DOT_STEP = 3;
const dotIcons = new Map<string, Icon>();
function getDotIcon(name: DotIconName, step: number) {
  const key = `${name}|${step}`;
  let icon = dotIcons.get(key);
  if (!icon) {
    icon = name === 'bell' ? bellDotIcon(step) : giftIcon(name.slice(5) as GiftShape, step);
    dotIcons.set(key, icon);
  }
  return icon;
}

function getIcon(name: IconName): Icon {
  if (name.startsWith('gift-')) return getGiftIcon(name.slice(5) as GiftShape);
  return ICONS[name as BaseIcon];
}

const attrs = (a: Attrs) =>
  Object.entries(a)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ');

const cache = new Map<string, string>();

const dotCircles = (dots: Dot[]) =>
  dots.map((d) => `<circle cx="${d.x}" cy="${d.y}" r="${d.r}" fill="${d.c}"/>`).join('');

const dotUrls = new Map<Dot[], string>();
type Silhouette = [number, number][][][];

const FAT_DOT_SCALE = 1.45;
const fatDotsCache = new Map<Dot[], Dot[]>();
function fatDots(dots: Dot[]) {
  let hit = fatDotsCache.get(dots);
  if (!hit) {
    hit = dots.map((d) => ({ ...d, r: +(d.r * FAT_DOT_SCALE).toFixed(2) }));
    fatDotsCache.set(dots, hit);
  }
  return hit;
}
const DOT_RES = 8;

function dotUrl(dots: Dot[], clip?: Silhouette) {
  const hit = dotUrls.get(dots);
  if (hit !== undefined) return hit;
  let url = '';
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 48 * DOT_RES;
    canvas.height = 48 * DOT_RES;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(DOT_RES, DOT_RES);
      dots.forEach((d) => {
        ctx.fillStyle = d.c;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      });
      if (clip) {
        const mask = document.createElement('canvas');
        mask.width = canvas.width;
        mask.height = canvas.height;
        const m = mask.getContext('2d');
        if (m) {
          m.scale(DOT_RES, DOT_RES);
          clip.forEach((rings) => {
            const path = new Path2D();
            rings.forEach((poly) => {
              poly.forEach(([x, y], i) => (i ? path.lineTo(x, y) : path.moveTo(x, y)));
              path.closePath();
            });
            m.fill(path, 'evenodd');
          });
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.globalCompositeOperation = 'destination-in';
          ctx.drawImage(mask, 0, 0);
        }
      }
      url = canvas.toDataURL('image/png');
    }
  } catch {
    url = '';
  }
  dotUrls.set(dots, url);
  return url;
}

function dotsBody(dots: Dot[], clip?: Silhouette) {
  const url = typeof document !== 'undefined' ? dotUrl(dots, clip) : '';
  if (!url) return dotCircles(dots);
  return `<image href="${url}" x="0" y="0" width="48" height="48" preserveAspectRatio="none"/>`;
}

let uid = 0;

function withUniqueIds(svg: string) {
  if (!svg.includes('id="gift-')) return svg;
  uid += 1;
  const n = uid;
  return svg.replace(/gift-(ball|cap|star|heart|bowhole)\b/g, (m) => `${m}-${n}`);
}

export function iconSvg(name: IconName, cls = '', coarse = false, fat = false) {
  const key = `${name}|${cls}|${coarse}|${fat}`;
  const hit = cache.get(key);
  if (hit) return withUniqueIds(hit);
  const icon = coarse ? getDotIcon(name as DotIconName, HUD_DOT_STEP) : getIcon(name);
  const outline = icon.parts
    .filter((p) => !p[3] && !icon.flat)
    .map(([tag, a, fill]) => {
      const width = Number(a['stroke-width'] ?? 0) + 5;
      return `<${tag} ${attrs({
        ...a,
        fill: fill === 'none' ? 'none' : OUT,
        stroke: OUT,
        'stroke-width': width,
        'stroke-linejoin': 'round',
        'stroke-linecap': 'round',
      })}/>`;
    })
    .join('');
  const body = icon.dots
    ? fat
      ? dotsBody(fatDots(icon.dots), icon.silhouette)
      : dotsBody(icon.dots)
    : icon.parts.map(([tag, a, fill]) => `<${tag} ${attrs({ ...a, fill })}/>`).join('');
  const ring = (poly: [number, number][]) =>
    `M${poly.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')}Z`;
  const holeClip = icon.holes?.length
    ? `<clipPath id="gift-bowhole"><path clip-rule="evenodd" d="M-20 -20H70V70H-20Z${icon.holes
        .map(ring)
        .join('')}"/></clipPath>`
    : '';
  const backing = icon.silhouette
    ? `<g fill="${OUT}" fill-rule="evenodd" stroke="${OUT}" stroke-width="2.4" stroke-linejoin="round"${
        holeClip ? ' clip-path="url(#gift-bowhole)"' : ''
      }>${icon.silhouette.map((rings) => `<path d="${rings.map(ring).join('')}"/>`).join('')}</g>`
    : '';
  const defs = icon.defs || holeClip ? `<defs>${icon.defs ?? ''}${holeClip}</defs>` : '';
  const svg = `<svg class="${cls}" viewBox="${(icon.ox ?? 0) - 3} -3 ${icon.w + 6} ${icon.h + 6}"  aria-hidden="true">${defs}${outline}${backing}${body}</svg>`;
  cache.set(key, svg);
  return withUniqueIds(svg);
}
