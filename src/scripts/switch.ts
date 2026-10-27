/* Brands <-> Creators: the two heroes share the photo and the phone, so what changes is the words. On a switch
   between the two pages (the nav's audience switch, or back and forward), the hero's title, sub and claim field get
   their own view-transition layers (src/styles/switch.css): the old words lift away, then the new title rises in word
   by word, the yellow draws in on its mark, and the sub and field follow. Everything else swaps in place, so nothing
   else moves. The fork's trip in and out (Stage.astro) is left alone, and reduced motion swaps at once. */

const SIDES = new Set(['/brands', '/creators']);
const side = (u: URL) => u.pathname.replace(/\/$/, '');
const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

let switching = false;

document.addEventListener('astro:before-preparation', (e) => {
  const { from, to } = e as Event & { from: URL; to: URL };
  const a = side(from);
  const b = side(to);
  switching = SIDES.has(a) && SIDES.has(b) && a !== b && !still() && 'startViewTransition' in document;
  // the old page's words are captured as the transition starts, so name them now
  document.documentElement.classList.toggle('switching', switching);
});

document.addEventListener('astro:before-swap', (e) => {
  if (!switching) return;
  // and the new page's, which the swap copies onto <html> from the incoming document
  (e as Event & { newDocument: Document }).newDocument.documentElement.classList.add('switching');
});

document.addEventListener('astro:after-swap', () => {
  if (!switching) return;
  switching = false;
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  const title = hero?.querySelector<HTMLElement>('.title');
  if (!hero || !title) return done();
  const sub = hero.querySelector<HTMLElement>('.sub');
  const claim = hero.querySelector<HTMLElement>('[data-claim]');
  const anims: Animation[] = [];

  // the new title, word by word: words are wrapped for the ride and unwrapped after. They stay inline and rise with
  // relative `top`, which never touches layout, so the title breaks its lines exactly as it will at rest
  const original = Array.from(title.childNodes);
  const words: HTMLElement[] = [];
  const wrap = (text: string) => {
    const f = document.createDocumentFragment();
    for (const part of text.split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part)) f.append(part);
      else {
        const w = document.createElement('span');
        w.className = 'sw';
        w.textContent = part;
        words.push(w);
        f.append(w);
      }
    }
    return f;
  };
  const mark = title.querySelector<HTMLElement>('mark.hl');
  title.replaceChildren(
    ...original.map((n) => {
      if (n.nodeType === Node.TEXT_NODE) return wrap(n.textContent ?? '');
      if (n === mark) {
        words.push(mark);
        mark.classList.add('sw');
      }
      return n;
    }),
  );

  const START = 160;
  const STEP = 18;
  words.forEach((w, i) => {
    anims.push(
      w.animate(
        [
          { opacity: 0, top: '0.32em' },
          { opacity: 1, top: '0em' },
        ],
        { duration: 320, delay: START + i * STEP, easing: EASE, fill: 'backwards' },
      ),
    );
  });
  // the yellow draws in from the left once the mark has risen
  if (mark) {
    const at = START + words.indexOf(mark) * STEP + 90;
    const h = (v: string) => `calc(100% - var(--top) - var(--bot)${v})`;
    anims.push(
      mark.animate(
        [
          { backgroundSize: `0 ${h(' - 4px')}, 0 ${h('')}` },
          { backgroundSize: `calc(100% - 4px) ${h(' - 4px')}, 100% ${h('')}` },
        ],
        { duration: 340, delay: at, easing: EASE, fill: 'backwards' },
      ),
    );
  }
  const after = START + words.length * STEP;
  for (const [el, delay] of [
    [sub, after - 70],
    [claim, after - 20],
  ] as const) {
    if (!el) continue;
    anims.push(
      el.animate(
        [
          { opacity: 0, transform: 'translateY(8px)' },
          { opacity: 1, transform: 'none' },
        ],
        { duration: 340, delay, easing: EASE, fill: 'backwards' },
      ),
    );
  }

  Promise.all(anims.map((a) => a.finished.catch(() => {}))).then(() => {
    // unwrap the words
    if (title.isConnected) {
      mark?.classList.remove('sw');
      title.replaceChildren(...original);
    }
    done();
  });
});

function done() {
  document.documentElement.classList.remove('switching');
}
