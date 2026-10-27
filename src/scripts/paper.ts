/* One sheet of paper under the whole page (design/texture/README.md). Every surface with its own paper colour (a cream
   band, an ink band, the FAQ) would start the grain and crease tiles at its own top edge, so a crease would stop at
   the boundary and jump. Instead each surface gets its offset from the top left of the page as --paper-x/--paper-y,
   which its background-position subtracts, so the tiles line up as if printed on one sheet. Kept current on resize and
   whenever the page's layout changes height. */
import { onPage } from './ui';

const SURFACES = '.band-paper, .band-2, .band-ink, .faq, .outcome, [data-paper]';

function align() {
  const sx = scrollX;
  const sy = scrollY;
  document.querySelectorAll<HTMLElement>(SURFACES).forEach((el) => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--paper-x', `${-Math.round(r.left + sx)}px`);
    el.style.setProperty('--paper-y', `${-Math.round(r.top + sy)}px`);
  });
}

onPage(() => {
  let raf = 0;
  const queue = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(align);
  };
  align();
  const ro = new ResizeObserver(queue);
  ro.observe(document.body);
  document.fonts?.ready.then(queue);
  addEventListener('load', queue);
  return [() => ro.disconnect(), () => removeEventListener('load', queue), () => cancelAnimationFrame(raf)];
});
