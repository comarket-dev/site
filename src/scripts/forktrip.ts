/* The fork's trip to a side and back, now that the fork is two photos instead of a device: an iris. The page opens
   out of a circle from where you clicked; back, the fork opens out of the middle of the page.

   The words clear first (index.astro, .leaving). Any tap, key or scroll during a trip lands it at once. Reduced
   motion, or a browser without view transitions, goes straight to the page. */

type Side = 'brands' | 'creators';
const SIDES = new Set(['/brands', '/creators']);
const MS = 1150;
const OPEN = 'cubic-bezier(0.65, 0, 0.35, 1)';

const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const canVT = () => 'startViewTransition' in document;
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const path = (u: URL) => u.pathname.replace(/\/$/, '') || '/';

/** where the circle opens from, or null when no trip is on its way */
let pending: { x: number; y: number } | null = null;

/** Called by the fork on a choice: clears the words, then resolves so the fork can navigate. */
export async function leaveFork(fork: HTMLElement, _side: Side, x: number, y: number): Promise<void> {
  if (still() || !canVT()) return;
  pending = { x, y };
  fork.classList.add('leaving');
  document.documentElement.classList.add('trip-iris');
  await wait(140);
}

// the way back: from a side to the fork
document.addEventListener('astro:before-preparation', (e) => {
  if (pending) return;
  const { from, to } = e as Event & { from: URL; to: URL };
  if (!SIDES.has(path(from)) || path(to) !== '/' || still() || !canVT()) return;
  pending = { x: innerWidth / 2, y: innerHeight / 2 };
  document.documentElement.classList.add('trip-iris');
});

document.addEventListener('astro:before-swap', (e) => {
  if (!pending) return;
  const p = pending;
  pending = null;
  const ev = e as Event & { newDocument: Document; viewTransition?: ViewTransition };
  ev.newDocument.documentElement.classList.add('trip-iris');
  const vt = ev.viewTransition;
  if (!vt?.ready) return;
  vt.ready.then(() => run(p.x, p.y)).catch(() => {});
  vt.finished.finally(() => document.documentElement.classList.remove('trip-iris'));
});

/** The view transition's layers, which Astro names after the page's transition scope rather than "root". */
function layer(which: 'old' | 'new') {
  const v = getComputedStyle(document.documentElement).viewTransitionName;
  const n = !v || v === 'none' ? 'root' : v;
  return { pseudoElement: `::view-transition-${which}(${n})`, fill: 'both' as const };
}

/* Astro's router hides the old page's layer (opacity 0) when a page's own animation is "none", so every frame that
   keeps the old page on screen says opacity 1. */
function run(x: number, y: number) {
  const html = document.documentElement;
  const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const anims = [
    html.animate([{ clipPath: `circle(0px at ${x}px ${y}px)` }, { clipPath: `circle(${r}px at ${x}px ${y}px)` }], {
      ...layer('new'),
      duration: MS,
      easing: OPEN,
    }),
    html.animate(
      [
        { transform: 'none', filter: 'brightness(1)', opacity: 1 },
        { transform: 'scale(0.95)', filter: 'brightness(0.5)', opacity: 1 },
      ],
      { ...layer('old'), duration: MS, easing: OPEN },
    ),
  ];
  skippable(anims);
}

function skippable(anims: Animation[]) {
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
