export type GiftForm = 'square' | 'rect' | 'circle' | 'triangle' | 'heart';
export type GiftColor = 'red' | 'green';
export type GiftShape = `${GiftForm}-${GiftColor}`;

export const GIFT_FORMS: GiftForm[] = ['square', 'rect', 'circle', 'triangle', 'heart'];
export const GIFT_COLORS: GiftColor[] = ['red', 'green'];

const FORM_NAME: Record<GiftForm, string> = {
  square: '方塊',
  rect: '長方形',
  circle: '圓球',
  triangle: '三角',
  heart: '愛心',
};
const COLOR_NAME: Record<GiftColor, string> = { red: '紅色', green: '綠色' };

export interface GiftInfo {
  id: GiftShape;
  form: GiftForm;
  color: GiftColor;
  name: string;
}

export const formOf = (kind: GiftShape) => kind.split('-')[0] as GiftForm;
export const colorOf = (kind: GiftShape) => kind.split('-')[1] as GiftColor;

export const GIFT_SHAPES: GiftShape[] = GIFT_FORMS.flatMap((f) =>
  GIFT_COLORS.map((c) => `${f}-${c}` as GiftShape),
);

export const GIFTS = Object.fromEntries(
  GIFT_SHAPES.map((id) => {
    const form = formOf(id);
    const color = colorOf(id);
    return [id, { id, form, color, name: `${COLOR_NAME[color]}${FORM_NAME[form]}` }];
  }),
) as Record<GiftShape, GiftInfo>;

function shuffle<T>(list: T[]) {
  const pool = [...list];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

export function pickGifts(count = 3): GiftShape[] {
  const form = shuffle(GIFT_FORMS)[0];
  const pair = GIFT_COLORS.map((c) => `${form}-${c}` as GiftShape);
  const rest = shuffle(GIFT_SHAPES.filter((k) => !pair.includes(k)));
  return shuffle([...pair, ...rest].slice(0, count));
}
