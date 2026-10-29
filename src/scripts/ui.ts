/* Small shared behaviors. Every binder returns a cleanup so page swaps don't leak listeners. */

export const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Fade-up reveals for [data-reveal]. Content is visible without JS. */
export function bindReveals(root: ParentNode = document): () => void {
  const els = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'));
  if (!('IntersectionObserver' in window)) {
    els.forEach((e) => e.classList.add('in'));
    return () => {};
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      }
    },
    // start a little before an element arrives, so a scroll never waits on it
    { rootMargin: '0px 0px 15% 0px', threshold: 0 },
  );
  /* Landing part way down a page (back, or a #waitlist link): what's already on screen is just there. From the
     top, the first screen keeps its short entrance. */
  if (scrollY > 0)
    els.forEach((e) => {
      const r = e.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) {
        e.style.transition = 'none';
        e.classList.add('in');
        requestAnimationFrame(() => (e.style.transition = ''));
      }
    });
  els.forEach((e) => io.observe(e));
  return () => io.disconnect();
}

/** Type and delete a list of words into an element, forever. */
export function cycleWords(el: HTMLElement, words: string[], hold = 2200): () => void {
  if (reduceMotion() || words.length < 2) return () => {};
  let alive = true;
  let i = 0;
  let timer = 0;
  const wait = (ms: number) => new Promise<void>((r) => (timer = window.setTimeout(r, ms)));
  (async () => {
    await wait(hold);
    while (alive) {
      const next = words[(i + 1) % words.length];
      while (alive && el.textContent) {
        el.textContent = el.textContent.slice(0, -1);
        await wait(42);
      }
      for (let n = 1; alive && n <= next.length; n++) {
        el.textContent = next.slice(0, n);
        await wait(70);
      }
      i = (i + 1) % words.length;
      await wait(hold);
    }
  })();
  return () => {
    alive = false;
    clearTimeout(timer);
  };
}

/** Call fn once when el first scrolls into view. */
export function onceVisible(el: Element, fn: () => void, threshold = 0.35): () => void {
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        fn();
      }
    },
    { threshold },
  );
  io.observe(el);
  return () => io.disconnect();
}

/** Progress of el through the viewport, 0 when its top hits the bottom, 1 when its bottom hits the top. */
export function scrollProgress(el: Element): number {
  const r = el.getBoundingClientRect();
  const total = r.height + innerHeight;
  return Math.min(1, Math.max(0, (innerHeight - r.top) / total));
}

export function fillRange(input: HTMLInputElement) {
  const min = Number(input.min || 0);
  const max = Number(input.max || 100);
  const v = ((Number(input.value) - min) / (max - min)) * 100;
  input.style.setProperty('--fill', `${v}%`);
}

export function track(type: string, props?: Record<string, unknown>) {
  fetch('/api/event', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type, props }),
    keepalive: true,
  }).catch(() => {});
}

/** Run binders on every page load and tear them down before the next swap. */
export function onPage(bind: () => Array<() => void> | void) {
  let cleanups: Array<() => void> = [];
  document.addEventListener('astro:page-load', () => {
    cleanups.forEach((c) => c());
    cleanups = bind() || [];
  });
  document.addEventListener('astro:before-swap', () => {
    cleanups.forEach((c) => c());
    cleanups = [];
  });
}
