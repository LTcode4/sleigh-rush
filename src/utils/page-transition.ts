const BACK_OUT = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
const BACK_OUT_STRONG = 'cubic-bezier(0.34, 1.9, 0.64, 1)';

let titleCenter: { x: number; y: number } | null = null;
let running: Animation[] = [];

function centerOf(el: Element) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

type AnimateArgs = Parameters<Element['animate']>;

function play(el: Element, keyframes: AnimateArgs[0], options: AnimateArgs[1]) {
  const a = el.animate(keyframes, options);
  running.push(a);
  return a.finished.catch(() => undefined);
}

export function homeLeave(el: Element, done: () => void) {
  const page = el as HTMLElement;
  const title = page.querySelector('.title');
  titleCenter = title ? centerOf(title) : null;

  Object.assign(page.style, {
    position: 'absolute',
    inset: '0',
    zIndex: '0',
    pointerEvents: 'none',
  });

  page.querySelectorAll<HTMLElement>('.town').forEach((town) => {
    // eslint-disable-next-line no-param-reassign
    town.style.visibility = 'hidden';
  });

  const jobs = [
    play(page, [{ opacity: 1 }, { opacity: 0 }], {
      duration: 900,
      delay: 100,
      easing: 'ease-in-out',
      fill: 'forwards',
    }),
  ];
  if (title) {
    jobs.push(
      play(
        title,
        [
          { transform: 'scale(1)', opacity: 1 },
          { transform: 'scale(1.15)', opacity: 0 },
        ],
        { duration: 600, easing: 'cubic-bezier(0.55, 0, 1, 0.45)', fill: 'forwards' },
      ),
    );
  }
  Promise.all(jobs).then(done);
}

export function sleighEnter(el: Element, done: () => void) {
  const page = el as HTMLElement;
  const q = (key: string) =>
    Array.from(page.querySelectorAll<HTMLElement>(`[data-intro="${key}"]`));

  page.classList.add('is-intro');
  Object.assign(page.style, { zIndex: '1', backgroundColor: 'transparent' });

  const jobs: Promise<unknown>[] = [];
  q('bg').forEach((b) => {
    jobs.push(
      play(b, [{ opacity: 0 }, { opacity: 1 }], {
        duration: 800,
        delay: 100,
        easing: 'ease-out',
        fill: 'backwards',
      }),
    );
  });

  const from = titleCenter;
  q('card').forEach((card, i) => {
    const c = centerOf(card);
    const dx = from ? from.x - c.x : 0;
    const dy = from ? from.y - c.y : -40;
    jobs.push(
      play(
        card,
        [
          {
            transform: `translate(${dx}px, ${dy}px) scale(0.1) rotate(${i ? 12 : -12}deg)`,
            opacity: 0,
          },
          { opacity: 1, offset: 0.3 },
          { transform: 'none', opacity: 1 },
        ],
        { duration: 900, delay: 200 + i * 140, easing: BACK_OUT, fill: 'backwards' },
      ),
    );
  });

  q('head').forEach((h, i) => {
    jobs.push(
      play(
        h,
        [
          { transform: 'translateY(16px) scale(0.85)', opacity: 0 },
          { transform: 'none', opacity: 1 },
        ],
        { duration: 500, delay: 650 + i * 80, easing: BACK_OUT_STRONG, fill: 'backwards' },
      ),
    );
  });

  q('go').forEach((g) => {
    jobs.push(
      play(
        g,
        [
          { transform: 'scale(0.3)', opacity: 0 },
          { transform: 'none', opacity: 1 },
        ],
        { duration: 550, delay: 850, easing: BACK_OUT_STRONG, fill: 'backwards' },
      ),
    );
  });

  Promise.all(jobs).then(() => {
    page.classList.replace('is-intro', 'intro-played');
    page.style.zIndex = '';
    page.style.backgroundColor = '';
    running = [];
    done();
  });
}

export function killPageTransition() {
  running.forEach((a) => {
    try {
      a.finish();
    } catch {
      a.cancel();
    }
  });
  running = [];
}
