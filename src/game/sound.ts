type Wave = 'sine' | 'square' | 'sawtooth' | 'triangle';
type FilterKind = 'lowpass' | 'bandpass' | 'highpass';
interface ToneOptions {
  slide?: number;
  delay?: number;
  at?: number;
  out?: AudioNode;
  attack?: number;
}

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

const BPM = 120;
const QUARTER = 60 / BPM;
const SWING = 2 / 3;
const STEPS = 8;
const MELODY = [
  [72, 76, 79, 81, 79, 0, 76, 0],
  [72, 76, 79, 82, 81, 0, 79, 0],
  [81, 0, 77, 81, 84, 0, 81, 0],
  [80, 0, 77, 80, 79, 0, 0, 0],
  [76, 79, 84, 79, 76, 0, 72, 0],
  [73, 76, 79, 81, 79, 0, 76, 0],
  [74, 77, 81, 77, 79, 77, 74, 71],
  [72, 0, 0, 0, 0, 0, 0, 0],
];
const BASS = [
  [48, 52, 55, 52],
  [48, 52, 55, 58],
  [41, 45, 48, 45],
  [41, 44, 48, 44],
  [40, 43, 48, 43],
  [45, 49, 52, 49],
  [50, 53, 43, 47],
  [48, 43, 48, 0],
];
const CHORDS = [
  [
    [64, 67, 72],
    [64, 67, 72],
  ],
  [
    [64, 70, 72],
    [64, 70, 72],
  ],
  [
    [65, 69, 72],
    [65, 69, 72],
  ],
  [
    [65, 68, 72],
    [65, 68, 72],
  ],
  [
    [64, 67, 72],
    [64, 67, 72],
  ],
  [
    [64, 67, 73],
    [64, 67, 73],
  ],
  [
    [65, 69, 72],
    [65, 67, 71],
  ],
  [
    [64, 67, 72],
    [64, 67, 72],
  ],
];

const PENTA = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93];

const FADE_IN = 1.2;
const FADE_OUT = 1.2;
const FADE_PAUSE = 0.4;

class Sound {
  private ctx: AudioContext | null = null;

  private master: GainNode | null = null;

  private musicBus: GainNode | null = null;

  private echo: DelayNode | null = null;

  private noise: AudioBuffer | null = null;

  private musicTimer = 0;

  private nextNoteTime = 0;

  private noteIndex = 0;

  private musicOn = false;

  muted = false;

  private intensity = 0;

  unlock() {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.setupGraph(this.ctx);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  private setupGraph(ctx: AudioContext) {
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(ctx.destination);

    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 0;
    this.musicBus.connect(this.master);

    this.echo = ctx.createDelay(1);
    this.echo.delayTime.value = QUARTER * 0.75;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.28;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 3200;
    this.echo.connect(tone).connect(feedback).connect(this.echo);
    tone.connect(this.musicBus);

    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
  }

  private startTime(opts: { at?: number; delay?: number }) {
    const { ctx } = this;
    if (!ctx) return 0;
    return (opts.at || ctx.currentTime + (opts.delay ?? 0)) + 0.001;
  }

  private tone(freq: number, dur: number, type: Wave, vol: number, opts: ToneOptions = {}) {
    const { slide = 0, out, attack = 0.008 } = opts;
    const { ctx, master } = this;
    if (!ctx || !master || this.muted || vol <= 0) return;
    const t = this.startTime(opts);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(out ?? master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private wobble(
    freq: number,
    dur: number,
    type: Wave,
    vol: number,
    opts: ToneOptions & { rate?: number; depth?: number } = {},
  ) {
    const { slide = 0, rate = 8, depth = 0.04 } = opts;
    const { ctx, master } = this;
    if (!ctx || !master || this.muted) return;
    const t = this.startTime(opts);
    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    lfo.frequency.value = rate;
    lfoGain.gain.value = freq * depth;
    lfo.connect(lfoGain).connect(osc.frequency);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    gain.gain.setValueAtTime(vol, t + dur * 0.6);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(master);
    osc.start(t);
    lfo.start(t);
    osc.stop(t + dur + 0.02);
    lfo.stop(t + dur + 0.02);
  }

  private hiss(
    dur: number,
    vol: number,
    from: number,
    to: number,
    type: FilterKind,
    opts: { at?: number; delay?: number; out?: AudioNode; q?: number } = {},
  ) {
    const { ctx, master, noise } = this;
    if (!ctx || !master || !noise || this.muted || vol <= 0) return;
    const t = this.startTime(opts);
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.Q.value = opts.q ?? 4;
    filter.frequency.setValueAtTime(from, t);
    filter.frequency.exponentialRampToValueAtTime(to, t + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.01, dur * 0.3));
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src
      .connect(filter)
      .connect(gain)
      .connect(opts.out ?? master);
    src.start(t, Math.random() * 1.5);
    src.stop(t + dur + 0.02);
  }

  private bell(midi: number, dur: number, vol: number, opts: ToneOptions = {}) {
    const f = hz(midi);
    this.tone(f, dur, 'sine', vol, opts);
    this.tone(f * 2.76, dur * 0.35, 'sine', vol * 0.35, opts);
    this.tone(f * 5.4, dur * 0.15, 'sine', vol * 0.12, opts);
  }

  private fadeTo(param: AudioParam, target: number, seconds: number) {
    const { ctx } = this;
    if (!ctx) return;
    const t = ctx.currentTime;
    param.cancelScheduledValues(t);
    param.setValueAtTime(param.value, t);
    param.linearRampToValueAtTime(target, t + seconds);
  }

  startMusic(fade = FADE_IN) {
    const { ctx, musicBus } = this;
    if (!ctx || !musicBus || this.musicOn) return;
    this.musicOn = true;
    this.noteIndex = 0;
    this.nextNoteTime = ctx.currentTime + 0.1;
    this.fadeTo(musicBus.gain, this.muted ? 0 : 1, fade);
    window.clearInterval(this.musicTimer);
    this.musicTimer = window.setInterval(() => this.scheduleMusic(), 25);
  }

  stopMusic(fade = FADE_OUT) {
    const { ctx, musicBus } = this;
    if (!ctx || !musicBus || !this.musicOn) return;
    this.musicOn = false;
    window.clearInterval(this.musicTimer);
    this.fadeTo(musicBus.gain, 0, fade);
  }

  setMusicPaused(paused: boolean) {
    const { ctx, musicBus } = this;
    if (!ctx || !musicBus || !this.musicOn) return;
    this.fadeTo(musicBus.gain, paused || this.muted ? 0 : 1, paused ? FADE_PAUSE : FADE_IN);
  }

  setIntensity(value: number) {
    this.intensity = Math.min(1, Math.max(0, value));
  }

  private scheduleMusic() {
    const { ctx } = this;
    if (!ctx || !this.musicOn) return;
    const beat = QUARTER * (BPM / (BPM + 24 * this.intensity));
    while (this.nextNoteTime < ctx.currentTime + 0.15) {
      const odd = this.noteIndex % 2 === 1;
      this.playStep(this.noteIndex, this.nextNoteTime, beat);
      this.nextNoteTime += beat * (odd ? 1 - SWING : SWING);
      this.noteIndex = (this.noteIndex + 1) % (MELODY.length * STEPS);
    }
  }

  private playStep(index: number, at: number, beat: number) {
    const { musicBus, echo } = this;
    if (!musicBus || !echo) return;
    const bar = Math.floor(index / STEPS);
    const step = index % STEPS;
    const note = MELODY[bar][step];
    const k = this.intensity;
    const half = step < 4 ? 0 : 1;
    const chord = CHORDS[bar][half];

    if (note) {
      this.bell(note, 0.5, 0.06, { at, out: musicBus });
      this.tone(hz(note), 0.4, 'triangle', 0.02, { at, out: echo });
      if (k > 0.4) this.bell(note + 12, 0.25, 0.022 * k, { at, out: musicBus });
    }

    if (step % 4 === 0) this.pad(chord, at, beat * 2, musicBus);

    if (step % 2 === 0) {
      const b = BASS[bar][step / 2];
      if (b) {
        this.tone(hz(b), 0.3, 'sine', 0.2, { at, out: musicBus, slide: -hz(b) * 0.06 });
        this.tone(hz(b + 12), 0.14, 'triangle', 0.04, { at, out: musicBus });
      }
      if (step === 2 || step === 6) {
        chord.forEach((n) => this.tone(hz(n), 0.1, 'triangle', 0.022, { at, out: musicBus }));
      }
    }

    const accent = step === 2 || step === 6;
    this.sleighBells(at, (accent ? 0.05 : 0.025) * (1 + k * 0.6), musicBus);
    if (bar === MELODY.length - 1 && step >= 2) {
      for (let i = 1; i < 3; i += 1) this.sleighBells(at + (beat / 6) * i, 0.03, musicBus);
    }
    if (index === 0 || (k > 0.6 && bar === 4 && step === 0)) {
      this.churchBell(at, echo);
    }
  }

  private sleighBells(at: number, vol: number, out: AudioNode) {
    for (let i = 0; i < 4; i += 1) {
      const f = 4200 + Math.random() * 4800;
      this.tone(f, 0.06 + Math.random() * 0.08, 'sine', vol * 0.5, {
        at: at + Math.random() * 0.018,
        out,
        attack: 0.002,
      });
    }
    this.hiss(0.05, vol * 0.8, 9000, 7000, 'highpass', { at, out, q: 1 });
  }

  private churchBell(at: number, out: AudioNode) {
    const f = hz(60);
    [
      [0.5, 0.05],
      [1, 0.06],
      [1.2, 0.035],
      [1.5, 0.03],
      [2, 0.025],
      [2.5, 0.015],
      [3, 0.012],
    ].forEach(([m, v]) =>
      this.tone(f * m, 2.4 / Math.sqrt(m), 'sine', v, { at, out, attack: 0.004 }),
    );
  }

  private pad(notes: number[], at: number, dur: number, out: AudioNode) {
    const { ctx } = this;
    if (!ctx || this.muted) return;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1400;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(0.03, at + dur * 0.3);
    gain.gain.linearRampToValueAtTime(0.0001, at + dur + 0.1);
    filter.connect(gain).connect(out);
    notes.forEach((n) => {
      [-7, 7].forEach((cents) => {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = hz(n - 12);
        osc.detune.value = cents;
        osc.connect(filter);
        osc.start(at);
        osc.stop(at + dur + 0.15);
      });
    });
  }

  private shake(seconds: number, vol: number) {
    const { ctx, master } = this;
    if (!ctx || !master) return;
    const n = Math.round(seconds / 0.045);
    for (let i = 0; i < n; i += 1) {
      this.sleighBells(ctx.currentTime + i * 0.045, vol * (1 - i / n), master);
    }
  }

  pick() {
    this.tone(520, 0.1, 'sine', 0.14, { slide: 420 });
    this.tone(1040, 0.06, 'triangle', 0.03, { delay: 0.03 });
  }

  throw() {
    this.hiss(0.22, 0.07, 700, 3200, 'bandpass', { q: 2 });
    this.tone(380, 0.16, 'triangle', 0.08, { slide: 520 });
  }

  deliver(combo: number) {
    const i = Math.min(Math.max(0, combo - 1), PENTA.length - 3);
    this.tone(240, 0.2, 'sine', 0.18, { slide: 180 });
    this.shake(0.4, 0.05);
    this.bell(PENTA[i], 0.3, 0.09);
    this.bell(PENTA[i + 2], 0.45, 0.1, { delay: 0.08 });
    if (combo > 0 && combo % 5 === 0) {
      [84, 86, 88, 91, 96].forEach((n, k) => this.bell(n, 0.4, 0.06, { delay: 0.2 + k * 0.06 }));
    }
  }

  wrong() {
    this.wobble(220, 0.4, 'triangle', 0.14, { slide: -90, rate: 11, depth: 0.06 });
    this.tone(110, 0.3, 'sine', 0.14, { slide: -30 });
  }

  miss() {
    this.wobble(880, 0.45, 'sine', 0.08, { slide: -560, rate: 6, depth: 0.025 });
    this.hiss(0.2, 0.04, 2000, 600, 'bandpass', { delay: 0.05 });
  }

  count(go: boolean) {
    if (go) {
      [72, 76, 79, 84].forEach((n, k) => this.bell(n, 0.5, 0.09, { delay: k * 0.05 }));
      this.shake(0.6, 0.06);
      this.tone(262, 0.3, 'sine', 0.16, { slide: 260 });
    } else {
      this.tone(440, 0.16, 'sine', 0.16, { slide: 180 });
      this.bell(81, 0.2, 0.04);
    }
  }

  gameOver() {
    [79, 76, 72].forEach((n, k) => this.bell(n, 0.4, 0.1, { delay: k * 0.22 }));
    this.wobble(hz(67), 0.7, 'triangle', 0.08, { delay: 0.66, rate: 5, depth: 0.02 });
    [60, 64, 67, 72].forEach((n) => this.bell(n, 1.4, 0.05, { delay: 1 }));
  }
}

export const sound = new Sound();
