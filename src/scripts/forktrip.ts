/* The fork's trip to a side and back, now that the fork is two photos instead of a device. Three to try, picked with
   `?trip=` on the fork (remembered for the session); the way back mirrors the way in.

   - expand (default): the chosen half opens across the whole screen, then the page rises over it like a sheet.
     Back: the page drops away and the fork arrives with that side open, then settles to the middle.
   - doors: the two halves part to the sides, the page underneath settling into place. Back: they close over it.
   - iris: the page opens out of a circle from where you clicked. Back: the fork opens out of the middle.

   The words clear first (index.astro, .leaving). Any tap, key or scroll during a trip lands it at once. Reduced
   motion, or a browser without view transitions, goes straight to the page. */

type Side = 'brands' | 'creators';
export type Trip = 'expand' | 'doors' | 'iris';
const TRIPS: Trip[] = ['expand', 'doors', 'iris'];
const SIDES = new Set(['/brands', '/creators']);
const KEY = 'cm-trip';

const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const canVT = () => 'startViewTransition' in document;
const stacked = () => matchMedia('(max-width: 860px), (max-aspect-ratio: 4/5)').matches;
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const path = (u: URL) => u.pathname.replace(/\/$/, '') || '/';

export function tripKind(): Trip {
  const q = new URLSearchParams(location.search).get('trip') as Trip | null;
  try {
    if (q && TRIPS.includes(q)) sessionStorage.setItem(KEY, q);
    const s = sessionStorage.getItem(KEY) as Trip | null;
    if (s && TRIPS.includes(s)) return s;
  } catch {}
  return q && TRIPS.includes(q) ? q : 'expand';
}

interface Plan {
  dir: 'in' | 'out';
  side: Side;
  kind: Trip;
  x: number;
  y: number;
}
let pending: Plan | null = null;

/** Called by the fork on a choice: clears the words (and, for expand, opens the chosen half), then resolves so the
 *  fork can navigate. */
export async function leaveFork(fork: HTMLElement, side: Side, x: number, y: number): Promise<void> {
  if (still() || !canVT()) return;
  const kind = tripKind();
  pending = { dir: 'in', side, kind, x, y };
  fork.dataset.trip = kind;
  fork.classList.add('leaving');
  document.documentElement.classList.add(`trip-${kind}`);
  if (kind === 'expand') {
    fork.style.setProperty('--s', side === 'brands' ? '100' : '0');
    await wait(560);
  } else {
    await wait(140);
  }
}

// the way back: from a side to the fork
document.addEventListener('astro:before-preparation', (e) => {
  if (pending) return;
  const { from, to } = e as Event & { from: URL; to: URL };
  const f = path(from);
  if (!SIDES.has(f) || path(to) !== '/' || still() || !canVT()) return;
  const kind = tripKind();
  pending = { dir: 'out', side: f.slice(1) as Side, kind, x: innerWidth / 2, y: innerHeight / 2 };
  document.documentElement.classList.add(`trip-${kind}`);
});

document.addEventListener('astro:before-swap', (e) => {
  if (!pending) return;
  const p = pending;
  pending = null;
  const ev = e as Event & { newDocument: Document; viewTransition?: ViewTransition };
  const next = ev.newDocument.documentElement;
  next.classList.add(`trip-${p.kind}`);
  if (p.dir === 'out' && p.kind === 'expand') next.classList.add(`back-from-${p.side}`);
  const vt = ev.viewTransition;
  if (!vt?.ready) return;
  vt.ready.then(() => run(p)).catch(() => {});
  vt.finished.finally(() => document.documentElement.classList.remove(...TRIPS.map((t) => `trip-${t}`)));
});

// the fork, arrived with the side we came from open, settles back to the middle
document.addEventListener('astro:after-swap', () => {
  const html = document.documentElement;
  if (!html.classList.contains('back-from-brands') && !html.classList.contains('back-from-creators')) return;
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      html.classList.remove('back-from-brands', 'back-from-creators');
    }),
  );
});

/** The view transition's layers, which Astro names after the page's transition scope rather than "root". */
function layer(which: 'old' | 'new', name?: string) {
  let n = name;
  if (!n) {
    const v = getComputedStyle(document.documentElement).viewTransitionName;
    n = !v || v === 'none' ? 'root' : v;
  }
  return { pseudoElement: `::view-transition-${which}(${n})`, fill: 'both' as const };
}

const SHEET = 'cubic-bezier(0.76, 0, 0.24, 1)';
const OPEN = 'cubic-bezier(0.65, 0, 0.35, 1)';

/* Astro's router hides the old page's layer (opacity 0) when a page's own animation is "none", so every frame that
   keeps the old page on screen says opacity 1. */
function run(p: Plan) {
  const html = document.documentElement;
  const anims: Animation[] = [];
  const a = (kf: Keyframe[], opts: KeyframeAnimationOptions) => anims.push(html.animate(kf, opts));
  const dim = (from: number, to: number) => [`brightness(${from})`, `brightness(${to})`];

  if (p.kind === 'expand') {
    const ms = 950;
    if (p.dir === 'in') {
      // the page rises over the open photo like a sheet; the photo sinks and darkens under it
      a([{ transform: 'translateY(100%)' }, { transform: 'none' }], { ...layer('new'), duration: ms, easing: SHEET });
      a([{ transform: 'translateY(100%)' }, { transform: 'none' }], { ...layer('new', 'stage'), duration: ms, easing: SHEET });
      a(
        [
          { transform: 'none', filter: dim(1, 1)[0], opacity: 1 },
          { transform: 'translateY(-8%) scale(1.04)', filter: dim(0.5, 0.5)[0], opacity: 1 },
        ],
        { ...layer('old'), duration: ms, easing: SHEET },
      );
    } else {
      // the page drops away, the fork underneath it already open on that side
      a([{ transform: 'none', zIndex: 2, opacity: 1 }, { transform: 'translateY(100%)', zIndex: 2, opacity: 1 }], { ...layer('old'), duration: ms, easing: SHEET });
      a([{ transform: 'none', opacity: 1 }, { transform: 'translateY(100%)', opacity: 1 }], { ...layer('new', 'stage'), duration: ms, easing: SHEET });
      a(
        [
          { transform: 'translateY(-6%) scale(1.04)', filter: dim(0.5, 0.5)[0] },
          { transform: 'none', filter: dim(1, 1)[0] },
        ],
        { ...layer('new'), duration: ms, easing: SHEET },
      );
    }
  }

  if (p.kind === 'doors') {
    const ms = 1050;
    const v = stacked();
    // side by side they part left and right; on the phone's diagonal, out through their own corners
    const off = (side: Side) => (v ? `translate(${side === 'brands' ? '-60%, -100%' : '60%, 100%'})` : `translateX(${side === 'brands' ? -100 : 100}%)`);
    if (p.dir === 'in') {
      // the halves part; the side you chose lingers a beat, so the eye follows it out
      for (const side of ['brands', 'creators'] as Side[]) {
        a([{ transform: 'none' }, { transform: off(side) }], {
          ...layer('old', `fork-${side}`),
          duration: ms - 120,
          delay: side === p.side ? 120 : 0,
          easing: SHEET,
        });
      }
      a([{ opacity: 1 }, { opacity: 0 }], { ...layer('old', 'fork-ui'), duration: 160 });
      a([{ opacity: 0 }, { opacity: 0 }], { ...layer('old'), duration: ms });
      a(
        [
          { transform: 'scale(1.08)', filter: dim(0.7, 0.7)[0] },
          { transform: 'none', filter: dim(1, 1)[0] },
        ],
        { ...layer('new'), duration: ms, easing: SHEET },
      );
    } else {
      // they close over the page, then the fork's words come back
      for (const side of ['brands', 'creators'] as Side[]) {
        a([{ transform: off(side) }, { transform: 'none' }], {
          ...layer('new', `fork-${side}`),
          duration: ms - 120,
          delay: side === p.side ? 0 : 120,
          easing: SHEET,
        });
      }
      a([{ opacity: 0 }, { opacity: 0, offset: 0.75 }, { opacity: 1 }], { ...layer('new', 'fork-ui'), duration: ms + 200 });
      a([{ opacity: 0 }, { opacity: 0 }], { ...layer('new'), duration: ms });
      a(
        [
          { transform: 'none', filter: dim(1, 1)[0], opacity: 1 },
          { transform: 'scale(0.94)', filter: dim(0.55, 0.55)[0], opacity: 1 },
        ],
        { ...layer('old'), duration: ms, easing: SHEET },
      );
    }
  }

  if (p.kind === 'iris') {
    const ms = 1000;
    const { x, y } = p;
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const circle = [{ clipPath: `circle(0px at ${x}px ${y}px)` }, { clipPath: `circle(${r}px at ${x}px ${y}px)` }];
    a(circle, { ...layer('new'), duration: ms, easing: OPEN });
    a(
      [
        { transform: 'none', filter: dim(1, 1)[0], opacity: 1 },
        { transform: 'scale(0.95)', filter: dim(0.5, 0.5)[0], opacity: 1 },
      ],
      { ...layer('old'), duration: ms, easing: OPEN },
    );
  }

  skippable(anims);
}

function skippable(anims: Animation[]) {
  if (!anims.length) return;
  const events = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
  const skip = () => {
    off();
    anims.forEach((x) => {
      try {
        x.finish();
      } catch {}
    });
  };
  const off = () => events.forEach((t) => removeEventListener(t, skip, true));
  events.forEach((t) => addEventListener(t, skip, { capture: true, passive: true }));
  Promise.all(anims.map((x) => x.finished.catch(() => {}))).then(off);
}
