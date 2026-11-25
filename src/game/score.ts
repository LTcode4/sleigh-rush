import type { GameResult } from './SleighGame';

export const POINTS_PER_GIFT = 100;

export const scoreOf = (r: Pick<GameResult, 'delivered' | 'distance'>) =>
  r.delivered * POINTS_PER_GIFT + r.distance;
