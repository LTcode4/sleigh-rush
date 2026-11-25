import { defineStore } from 'pinia';
import type { GameResult } from 'src/game/SleighGame';
import type { QualitySettings } from 'src/game/quality';
import type { SleighColor } from 'src/game/world';
import type { User } from 'src/types/User';

const BEST_KEY = 'sleigh-rush-best';

const TUTORIAL_KEY = 'sleigh-rush-tutorial-seen';

const COLOR_KEY = 'sleigh-rush-color';

function readColor(): SleighColor {
  try {
    return localStorage.getItem(COLOR_KEY) === 'green' ? 'green' : 'red';
  } catch {
    return 'red';
  }
}

function readBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function readTutorialSeen(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_KEY) === '1';
  } catch {
    return false;
  }
}

interface State {
  currentUser: User | null;
  quality: QualitySettings | null;
  webgl2: boolean;
  bestDistance: number;
  lastResult: GameResult | null;
  isNewBest: boolean;
  tutorialSeen: boolean;
  sleighColor: SleighColor;
  forceTutorial: boolean;
}

function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export const useAppStore = defineStore('app', {
  state: (): State => ({
    currentUser: null,
    quality: null,
    webgl2: true,
    bestDistance: readBest(),
    lastResult: null,
    isNewBest: false,
    tutorialSeen: readTutorialSeen(),
    sleighColor: readColor(),
    forceTutorial: false,
  }),
  getters: {
    isLoggedIn: (state) => !!state.currentUser,
  },
  actions: {
    setLineProfile(profile: { displayName: string; pictureUrl?: string; userId: string }) {
      this.currentUser = {
        provider: 'line',
        id: profile.userId,
        name: profile.displayName,
        avatarUrl: profile.pictureUrl,
      };
    },
    setSleighColor(color: SleighColor) {
      this.sleighColor = color;
      save(COLOR_KEY, color);
    },
    markTutorialSeen() {
      this.tutorialSeen = true;
      save(TUTORIAL_KEY, '1');
    },
    submitResult(result: GameResult) {
      this.lastResult = result;
      this.isNewBest = result.distance > this.bestDistance;
      if (this.isNewBest) {
        this.bestDistance = result.distance;
        save(BEST_KEY, String(result.distance));
      }
      return this.isNewBest;
    },
  },
});
