/**
 * Engraved type: letters filled with fine wavy lines, the way a banknote fills its numerals.
 * Canvas 2D, animated slowly while on screen.
 */
export interface EngraveOptions {
  text: string;
  color: string;
  accent: string;
  weight?: number;
  rows?: number;
  tracking?: number;
}

export function engrave(canvas: HTMLCanvasElement, o: EngraveOptions): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mask = document.createElement('canvas');
  const mctx = mask.getContext('2d')!;
  let w = 0;
  let h = 0;
  let dpr = 1;
  let raf = 0;
  let visible = false;
  let mx = 0.5;
  let t = Math.random() * 10;
  let last = performance.now();

  const layout = () => {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    mask.width = canvas.width;
    mask.height = canvas.height;
    const weight = o.weight ?? 800;
    let size = canvas.height * 0.98;
    const track = (o.tracking ?? -0.055) * size;
    mctx.font = `${weight} ${size}px Satoshi, ui-sans-serif, system-ui, sans-serif`;
    const measured = mctx.measureText(o.text).width + track * (o.text.length - 1);
    if (measured > canvas.width * 0.995) size *= (canvas.width * 0.995) / measured;
    mctx.clearRect(0, 0, mask.width, mask.height);
    mctx.font = `${weight} ${size}px Satoshi, ui-sans-serif, system-ui, sans-serif`;
    if ('letterSpacing' in mctx) (mctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${(o.tracking ?? -0.055) * size}px`;
    mctx.textBaseline = 'alphabetic';
    mctx.textAlign = 'center';
    mctx.fillStyle = '#000';
    mctx.fillText(o.text, mask.width / 2, mask.height * 0.86);
    draw();
  };

  const draw = () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const rows = o.rows ?? 46;
    const step = canvas.height / rows;
    ctx.lineWidth = Math.max(1, dpr * 1.1);
    for (let i = -2; i < rows + 2; i++) {
      const y0 = i * step;
      const near = 1 - Math.min(1, Math.abs(i / rows - 0.5) * 2);
      ctx.strokeStyle = i % 2 === 0 ? o.color : o.accent;
      ctx.globalAlpha = 0.55 + near * 0.45;
      ctx.beginPath();
      for (let x = 0; x <= canvas.width; x += 6 * dpr) {
        const u = x / canvas.width;
        const y =
          y0 +
          Math.sin(u * 9 + t * 0.6 + i * 0.35) * step * 0.9 +
          Math.sin(u * 23 - t * 0.45 + i * 0.12) * step * 0.25 +
          Math.exp(-((u - mx) ** 2) * 30) * step * 1.2;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(mask, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
  };

  const loop = (now: number) => {
    raf = 0;
    if (!visible) return;
    t += Math.min(0.05, (now - last) / 1000);
    last = now;
    draw();
    raf = requestAnimationFrame(loop);
  };

  const ro = new ResizeObserver(layout);
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
    mx = (e.clientX - r.left) / Math.max(1, r.width);
  };
  canvas.addEventListener('pointermove', onMove);
  document.fonts?.ready.then(layout);

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    io.disconnect();
    canvas.removeEventListener('pointermove', onMove);
  };
}
