/**
 * A wordmark punched out of perforation dots, like a ticket's tear line. Canvas 2D.
 * Dots breathe slowly and swell to yellow under the pointer.
 */
export interface PerforateOptions {
  text: string;
  color: string;
  accent: string;
  rows?: number;
}

export function perforate(canvas: HTMLCanvasElement, o: PerforateOptions): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let dots: Array<{ x: number; y: number }> = [];
  let pitch = 8;
  let dpr = 1;
  let raf = 0;
  let visible = false;
  let px = -1e4;
  let py = -1e4;
  let heat = 0;
  let t = 0;
  let last = performance.now();

  const layout = () => {
    dpr = Math.min(2, devicePixelRatio || 1);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    const mask = document.createElement('canvas');
    mask.width = canvas.width;
    mask.height = canvas.height;
    const m = mask.getContext('2d', { willReadFrequently: true })!;
    const track = -0.045;
    const setFont = (px: number) => {
      m.font = `900 ${px}px Satoshi, ui-sans-serif, system-ui, sans-serif`;
      if ('letterSpacing' in m) (m as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${track * px}px`;
    };
    let size = canvas.height;
    setFont(size);
    // measure the ink, not the advance, so the last letter's overhang fits; leave room for a dot's radius each side
    const ink = (t: TextMetrics) => t.actualBoundingBoxLeft + t.actualBoundingBoxRight;
    const room = canvas.width - (canvas.height / (o.rows ?? 30)) * 2;
    const w0 = ink(m.measureText(o.text));
    if (w0 > room) {
      size *= room / w0;
      setFont(size);
    }
    // center the ink itself; tracking makes the advance width lopsided
    const met = m.measureText(o.text);
    m.textAlign = 'left';
    m.textBaseline = 'alphabetic';
    m.fillStyle = '#000';
    m.fillText(o.text, (mask.width - ink(met)) / 2 + met.actualBoundingBoxLeft, mask.height * 0.86);
    const data = m.getImageData(0, 0, mask.width, mask.height).data;
    pitch = canvas.height / (o.rows ?? 30);
    dots = [];
    for (let y = pitch / 2; y < mask.height; y += pitch) {
      for (let x = pitch / 2; x < mask.width; x += pitch) {
        if (data[(Math.round(y) * mask.width + Math.round(x)) * 4 + 3] > 140) dots.push({ x, y });
      }
    }
    draw();
  };

  const draw = () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const r0 = pitch * 0.34;
    const reach = pitch * 9;
    ctx.fillStyle = o.color;
    ctx.beginPath();
    const hot: Array<{ x: number; y: number; r: number }> = [];
    for (const d of dots) {
      const wave = Math.sin(d.x * 0.012 / dpr + d.y * 0.004 / dpr - t * 1.1) * 0.12;
      const dist = Math.hypot(d.x - px, d.y - py);
      const k = heat * Math.max(0, 1 - dist / reach);
      const r = r0 * (1 + wave + k * 0.55);
      if (k > 0.35) hot.push({ x: d.x, y: d.y, r });
      else {
        ctx.moveTo(d.x + r, d.y);
        ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
      }
    }
    ctx.fill();
    if (hot.length) {
      ctx.fillStyle = o.accent;
      ctx.beginPath();
      for (const d of hot) {
        ctx.moveTo(d.x + d.r, d.y);
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      }
      ctx.fill();
    }
  };

  const loop = (now: number) => {
    raf = 0;
    if (!visible) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;
    heat += ((px > -1e3 ? 1 : 0) - heat) * Math.min(1, dt * 6);
    draw();
    raf = requestAnimationFrame(loop);
  };

  // lay out on the next frame: resizing the canvas inside the observer callback trips a ResizeObserver loop warning
  let pending = 0;
  const ro = new ResizeObserver(() => {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(layout);
  });
  ro.observe(canvas);
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !reduce && !raf) {
      last = performance.now();
      raf = requestAnimationFrame(loop);
    }
  });
  io.observe(canvas);
  const onMove = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    px = (e.clientX - r.left) * dpr;
    py = (e.clientY - r.top) * dpr;
  };
  const onLeave = () => {
    px = -1e4;
    py = -1e4;
  };
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerleave', onLeave);
  document.fonts?.load('900 100px Satoshi').then(layout, layout);

  return () => {
    cancelAnimationFrame(raf);
    cancelAnimationFrame(pending);
    ro.disconnect();
    io.disconnect();
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerleave', onLeave);
  };
}
