export const MAGIC_KMH_START = 50;
export const MAGIC_GROWTH = 0.0685;
export const MAGIC_KMH_TOP = 690000;

export const magicKmh = (t: number) => MAGIC_KMH_START * Math.exp(MAGIC_GROWTH * t);

export const magicKm = (t: number) =>
  (MAGIC_KMH_START / (3600 * MAGIC_GROWTH)) * (Math.exp(MAGIC_GROWTH * t) - 1);

export type DotTone = 'white' | 'green' | 'red' | 'gold' | 'hole';

export interface DotPart {
  d: string;
  tone: DotTone;
  rule?: 'nonzero' | 'evenodd';
}

export interface Milestone {
  id: string;
  value: number;
  name: string;
  lead: string;
  label: string;
  art: DotPart[];
}

const circle = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0Z`;

const ring = (r: number, w: number, cx = 50, cy = 50) =>
  `${circle(cx, cy, r)}${circle(cx, cy, r - w)}`;

const sunRays = (() => {
  const parts: string[] = [];
  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * Math.PI * 2;
    const p = (r: number, da: number) =>
      `${(50 + Math.cos(a + da) * r).toFixed(1)} ${(50 + Math.sin(a + da) * r).toFixed(1)}`;
    parts.push(`M${p(34, -0.13)}L${p(48, 0)}L${p(34, 0.13)}Z`);
  }
  return parts.join('');
})();

const ISLAND_RING: DotPart = { d: ring(46, 4), tone: 'white', rule: 'evenodd' };
const RING_SLEIGH: DotPart = { d: circle(82, 18, 4.5), tone: 'gold' };

export const DISTANCE_MILESTONES: Milestone[] = [
  {
    id: 'sun',
    value: 150000000,
    name: '太陽',
    lead: '已經飛到',
    label: '1.5 億公里',
    art: [
      { d: sunRays, tone: 'gold' },
      { d: circle(50, 50, 30), tone: 'gold' },
      { d: circle(50, 50, 18), tone: 'red' },
    ],
  },
  {
    id: 'moon',
    value: 384400,
    name: '月球',
    lead: '已經飛到',
    label: '384,400 公里',
    art: [
      { d: circle(50, 50, 44), tone: 'white' },
      { d: circle(34, 36, 9), tone: 'hole' },
      { d: circle(66, 62, 7), tone: 'hole' },
      { d: circle(60, 28, 4.5), tone: 'hole' },
      { d: circle(36, 70, 5.5), tone: 'hole' },
    ],
  },
  {
    id: 'earth',
    value: 40000,
    name: '地球一圈',
    lead: '已經繞完',
    label: '40,000 公里',
    art: [
      { d: ring(49, 3), tone: 'gold', rule: 'evenodd' },
      { d: circle(50, 50, 40), tone: 'white' },
      {
        d: 'M30 26C40 20 50 24 48 34C46 42 36 40 32 48C28 54 20 50 20 42C20 34 24 30 30 26Z',
        tone: 'green',
      },
      {
        d: 'M58 30C68 28 78 34 76 44C74 50 66 48 64 56C62 64 56 70 52 64C48 58 54 50 52 42C50 36 52 32 58 30Z',
        tone: 'green',
      },
      { d: 'M34 62C40 60 46 66 44 74C42 80 34 82 30 76C28 70 30 64 34 62Z', tone: 'green' },
    ],
  },
  {
    id: 'usa',
    value: 11000,
    name: '台灣到美國',
    lead: '已經飛完',
    label: '11,000 公里',
    art: [
      { d: 'M22 62Q50 6 80 38L77 42Q50 14 25 64Z', tone: 'white' },
      { d: 'M14 64C17 56 27 56 27 65C27 74 21 82 18 87C13 82 11 73 14 64Z', tone: 'green' },
      {
        d: 'M66 40C74 32 90 34 96 44C100 52 94 60 88 62C84 64 82 72 74 74C68 74 64 66 62 58C60 50 62 44 66 40Z',
        tone: 'green',
      },
      { d: circle(50, 25, 4.5), tone: 'gold' },
    ],
  },
  {
    id: 'taiwan',
    value: 1000,
    name: '台灣本島環島',
    lead: '已經飛完',
    label: '1,000 公里',
    art: [
      ISLAND_RING,
      RING_SLEIGH,
      {
        d: 'M58 14C64 16 67 22 67 30C67 40 63 49 60 58C56 67 51 75 46 83C44 86 41 86 40 83C38 76 35 69 34 60C32 51 33 42 38 33C43 24 51 13 58 14Z',
        tone: 'green',
      },
    ],
  },
  {
    id: 'penghu',
    value: 100,
    name: '澎湖環島',
    lead: '已經飛完',
    label: '100 公里',
    art: [
      ISLAND_RING,
      RING_SLEIGH,
      {
        d: 'M30 40C40 30 56 34 58 44C60 52 50 56 44 62C38 68 28 62 28 54C28 48 26 44 30 40Z',
        tone: 'green',
      },
      { d: 'M62 28C68 24 76 28 74 36C72 42 64 42 62 36Z', tone: 'green' },
      { d: 'M62 56C68 52 76 56 74 64C72 70 64 70 62 64Z', tone: 'green' },
      { d: 'M38 70C42 68 48 70 46 76C44 80 38 78 38 74Z', tone: 'green' },
    ],
  },
  {
    id: 'liuqiu',
    value: 12,
    name: '小琉球環島',
    lead: '已經飛完',
    label: '12 公里',
    art: [
      ISLAND_RING,
      RING_SLEIGH,
      {
        d: 'M44 30C56 26 66 36 66 50C66 64 56 72 46 70C36 68 30 58 32 46C33 38 37 32 44 30Z',
        tone: 'green',
      },
    ],
  },
];

export const SPEED_MILESTONES: Milestone[] = [
  {
    id: 'parker',
    value: 690000,
    name: '派克太陽探測器',
    lead: '比',
    label: '690,000 km/h',
    art: [
      { d: circle(-40, 50, 52), tone: 'gold' },
      { d: 'M36 50a7 32 0 1 0 14 0a7 32 0 1 0 -14 0Z', tone: 'white' },
      { d: 'M49 45H54V55H49Z', tone: 'white' },
      { d: 'M54 38H74V62H54Z', tone: 'white' },
      { d: 'M60 22H68V38H60Z', tone: 'red' },
      { d: 'M60 62H68V78H60Z', tone: 'red' },
      { d: 'M74 48H88V52H74Z', tone: 'white' },
      { d: 'M86 40L94 50L86 60Z', tone: 'white' },
    ],
  },
  {
    id: 'apollo',
    value: 39900,
    name: '阿波羅 10 號',
    lead: '比',
    label: '39,900 km/h',
    art: [
      { d: 'M44 30H56V82H44Z', tone: 'white' },
      { d: 'M44 30L50 10L56 30Z', tone: 'white' },
      { d: 'M49 2H51V12H49Z', tone: 'white' },
      { d: 'M44 72L34 88H44Z', tone: 'white' },
      { d: 'M56 72L66 88H56Z', tone: 'white' },
      { d: 'M44 46H56V50H44Z', tone: 'red' },
      { d: 'M44 62H56V66H44Z', tone: 'red' },
      { d: 'M44 82H56L50 100Z', tone: 'gold' },
      { d: 'M46.5 82H53.5L50 93Z', tone: 'red' },
    ],
  },
  {
    id: 'fighter',
    value: 2650,
    name: '戰鬥機',
    lead: '比',
    label: '2,650 km/h',
    art: [
      {
        d: 'M98 50L62 44L32 14L24 14L32 44L10 46L6 34L1 34L3 50L1 66L6 66L10 54L32 56L24 86L32 86L62 56Z',
        tone: 'white',
      },
      { d: 'M70 47C78 47 83 48.5 85 50C83 51.5 78 53 70 53Z', tone: 'gold' },
    ],
  },
  {
    id: 'plane',
    value: 900,
    name: '飛機',
    lead: '比',
    label: '900 km/h',
    art: [
      { d: 'M8 46H80C90 46 97 48.5 99 50C97 51.5 90 54 80 54H8Z', tone: 'white' },
      { d: 'M46 46H60L40 10H31Z', tone: 'white' },
      { d: 'M46 54H60L40 90H31Z', tone: 'white' },
      { d: 'M10 46H20L11 28H5Z', tone: 'white' },
      { d: 'M10 54H20L11 72H5Z', tone: 'white' },
      { d: 'M40 26H52V31H40Z', tone: 'red' },
      { d: 'M40 69H52V74H40Z', tone: 'red' },
    ],
  },
  {
    id: 'hsr',
    value: 350,
    name: '高鐵',
    lead: '比',
    label: '350 km/h',
    art: [
      { d: 'M4 40H66C82 40 94 50 97 62V68H4Z', tone: 'white' },
      { d: 'M10 47H20V54H10ZM25 47H35V54H25ZM40 47H50V54H40ZM55 47H65V54H55Z', tone: 'hole' },
      { d: 'M72 46C80 46 87 51 90 56H72Z', tone: 'hole' },
      { d: 'M4 60H97V64H4Z', tone: 'red' },
      { d: 'M0 74H100V77H0Z', tone: 'white' },
    ],
  },
  {
    id: 'cheetah',
    value: 120,
    name: '獵豹',
    lead: '比',
    label: '120 km/h',
    art: [
      { d: 'M26 48L6 34L3 38L24 53Z', tone: 'gold' },
      { d: 'M22 50a28 10 0 1 0 56 0a28 10 0 1 0 -56 0Z', tone: 'gold' },
      { d: 'M70 46L80 39L84 51L72 56Z', tone: 'gold' },
      { d: circle(84, 43, 8), tone: 'gold' },
      { d: 'M90 41L99 45L91 49Z', tone: 'gold' },
      { d: 'M79 37L81 30L85 36Z', tone: 'gold' },
      { d: 'M68 54L74 54L94 70L90 74Z', tone: 'gold' },
      { d: 'M62 55L68 56L80 77L74 78Z', tone: 'gold' },
      { d: 'M30 54L37 56L16 74L11 70Z', tone: 'gold' },
      { d: 'M36 55L42 57L30 79L24 77Z', tone: 'gold' },
      {
        d: `${circle(36, 47, 2)}${circle(46, 52, 2)}${circle(54, 45, 2)}${circle(62, 51, 2)}${circle(42, 44, 1.6)}`,
        tone: 'hole',
      },
    ],
  },
];

export function reachedMilestone(list: Milestone[], value: number) {
  return list.find((m) => value >= m.value) ?? null;
}

function trim(n: number) {
  return n.toFixed(1).replace(/\.0$/, '');
}

export function formatBig(v: number) {
  if (v >= 1e8) return `${trim(v / 1e8)}億`;
  if (v >= 1e4) return `${trim(v / 1e4)}萬`;
  if (v < 100) return trim(v);
  return Math.round(v).toLocaleString();
}
