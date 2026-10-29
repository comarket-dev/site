/**
 * The phone's screen, drawn to a canvas: one example sale from a creator's post, through the storefront and the
 * brand's own checkout, to the moment it completes, which is the only moment anyone pays anything.
 * Every brand and creator here is fictional. Layout is in a 360 x 792 design space.
 */

import { tinted, type BrandId } from '../../lib/marks';

export type ScreenId = 'post' | 'store' | 'checkout' | 'verify' | 'refused' | 'sale' | 'brand' | 'creator' | 'hub';
export type Shot = ScreenId | 'checkout-returning';

export interface BrandSkin {
  name: string;
  color: string;
  ink: string;
  icon: HTMLImageElement | null;
  host: string;
  domain: string;
  product: string;
  what: string;
  /** monthly price in dollars */
  amount: number;
  /** the creator's rate and our cut of a first payment, in percent */
  rate: number;
  cut: number;
  /** one of the example brands drawn in its own look (design/brands/README.md); null for a visitor's own brand */
  look: BrandId | null;
  /** days free through the creator's link; 0 means the buyer pays at checkout */
  trial: number;
  /** a visitor's brand: the palette read from its own logo (src/lib/palette.ts), null until it's read */
  pal?: import('../../lib/palette').Palette | null;
}
export interface CreatorSkin {
  name: string;
  first: string;
  handle: string;
  slug: string;
  tone: string;
  /** the creator's portrait once loaded; until then, or for a visitor's handle, an initial on their tone */
  photo: HTMLImageElement | null;
}

export const W = 720;
export const H = 1584;
const S = W / 360;
const DH = 792;


const INK = '#1E0E3F';
const TEXT = '#17141F';
const MUTED = '#6A6478';
const LINE = '#E9E6EF';
const FILL = '#F4F2F7';
const YELLOW = '#FFF200';
const BLUE = '#006EB8';
const CREAM = '#FDBF68';
const GHOST = '#9C96A8';

export const DEFAULT_BRAND: BrandSkin = {
  name: 'Fernwood',
  color: '#1E6B47',
  ink: '#FFFFFF',
  icon: null,
  host: 'fernwood',
  domain: 'fernwood.app',
  product: 'Fernwood',
  what: 'Onboarding analytics',
  amount: 49,
  rate: 20,
  cut: 15,
  look: 'fernwood',
  trial: 30,
};
export const DEFAULT_CREATOR: CreatorSkin = { name: 'Sarah K.', first: 'Sarah', handle: '@sarah.builds', slug: 'sarah', tone: '#F6C9A8', photo: null };
/** The default creator's portrait (scripts/render-posts.py avatars). */
export const DEFAULT_PHOTO = '/assets/posts/portraits/sarah.jpg';

/* Fernwood, per design/brands/README.md */
const FERN = '#1E6B47';
const PINE = '#0F2A1E';
const PAPER = '#F3F0E8';
const MOSS = '#DCE2D5';
const LICHEN = '#6E7D72';
const SPROUT = '#C8E36A';
const SERIF = '"Fernwood Serif", Georgia, serif';
const SANS = '"Fernwood Sans", system-ui, sans-serif';
/** the trial's first payment: 30 days after the example's checkout */
const FIRST_PAYMENT = 'Nov 22';

export type Ctx = CanvasRenderingContext2D & { letterSpacing?: string };
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ease = (k: number) => 1 - Math.pow(1 - clamp01(k), 3);
const usd = (v: number) => `$${v.toFixed(2)}`;
const money = (v: number) => (Number.isInteger(v) ? `$${v}` : usd(v));
/** What one first payment splits into. */
function split(b: BrandSkin) {
  const creator = (b.amount * b.rate) / 100;
  const us = (b.amount * b.cut) / 100;
  return { creator, us, fee: creator + us, keep: b.amount - creator - us };
}

/* ---------------------------------------------------------------- drawing kit */

function rr(x: Ctx, X: number, Y: number, w: number, h: number, r: number | number[]) {
  x.beginPath();
  x.roundRect(X, Y, w, h, r);
}
function font(x: Ctx, size: number, weight = 500, mono = false) {
  x.font = mono ? `${size}px "Fragment Mono", ui-monospace, monospace` : `${weight} ${size}px Satoshi, ui-sans-serif, system-ui, sans-serif`;
}
function track(x: Ctx, px: number) {
  if ('letterSpacing' in x) x.letterSpacing = `${px}px`;
}
function text(x: Ctx, s: string, X: number, Y: number, size: number, color = TEXT, weight = 500, mono = false, tr = 0, align: CanvasTextAlign = 'left') {
  font(x, size, weight, mono);
  track(x, tr);
  x.fillStyle = color;
  x.textAlign = align;
  x.fillText(s, X, Y);
  x.textAlign = 'left';
  track(x, 0);
}
function fit(x: Ctx, s: string, maxW: number): string {
  if (x.measureText(s).width <= maxW) return s;
  let t = s;
  while (t.length > 1 && x.measureText(`${t}…`).width > maxW) t = t.slice(0, -1);
  return `${t}…`;
}
function textFit(x: Ctx, s: string, X: number, Y: number, maxW: number, size: number, color = TEXT, weight = 500, mono = false) {
  font(x, size, weight, mono);
  x.fillStyle = color;
  x.fillText(fit(x, s, maxW), X, Y);
}
function wrap(x: Ctx, s: string, X: number, Y: number, maxW: number, size: number, lh: number, color = TEXT, weight = 700, tr = -0.6) {
  font(x, size, weight);
  track(x, tr);
  const words = s.split(' ');
  let line = '';
  let y = Y;
  x.fillStyle = color;
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (x.measureText(t).width > maxW && line) {
      x.fillText(line, X, y);
      line = w;
      y += lh;
    } else line = t;
  }
  x.fillText(line, X, y);
  track(x, 0);
  return y;
}
function bars(x: Ctx, y: number, widths: number[], gap = 20) {
  x.fillStyle = '#EEECF2';
  widths.forEach((w, i) => {
    rr(x, 24, y + i * gap, w, 9, 4.5);
    x.fill();
  });
}
function ava(x: Ctx, cx: number, cy: number, r: number, tone: string, letter: string) {
  x.fillStyle = tone;
  x.beginPath();
  x.arc(cx, cy, r, 0, Math.PI * 2);
  x.fill();
  text(x, letter, cx, cy + r * 0.38, r * 1.05, TEXT, 700, false, 0, 'center');
}
/** The creator's face: their portrait in a circle, or their initial on their tone. */
function face(x: Ctx, c: CreatorSkin, cx: number, cy: number, r: number) {
  const p = c.photo;
  if (!p || !p.complete || !p.naturalWidth) return ava(x, cx, cy, r, c.tone, c.first[0]);
  x.save();
  x.beginPath();
  x.arc(cx, cy, r, 0, Math.PI * 2);
  x.clip();
  x.drawImage(p, cx - r, cy - r, r * 2, r * 2);
  x.restore();
}
/** An example brand's mark (src/lib/marks.ts), size px square with its top left at X, Y. */
function drawMark(x: Ctx, id: BrandId, X: number, Y: number, size: number, tint?: string) {
  x.save();
  x.translate(X, Y);
  x.scale(size / 24, size / 24);
  for (const p of tinted(id, tint)) {
    const path = new Path2D(p.d);
    if (p.fill) {
      x.fillStyle = p.fill;
      x.fill(path, p.evenodd ? 'evenodd' : 'nonzero');
    }
    if (p.stroke) {
      x.strokeStyle = p.stroke;
      x.lineWidth = p.width ?? 2;
      x.lineCap = 'round';
      x.lineJoin = 'round';
      x.stroke(path);
    }
  }
  x.restore();
}
/** Text in any font, with tracking and alignment; returns its width. */
function say(x: Ctx, s: string, X: number, Y: number, f: string, color: string, align: CanvasTextAlign = 'left', tr = 0) {
  x.font = f;
  track(x, tr);
  x.fillStyle = color;
  x.textAlign = align;
  x.fillText(s, X, Y);
  const w = x.measureText(s).width;
  x.textAlign = 'left';
  track(x, 0);
  return w;
}
/** Wrap text in any font; returns the last line's baseline. */
function wrapIn(x: Ctx, s: string, X: number, Y: number, maxW: number, f: string, lh: number, color: string, tr = 0) {
  x.font = f;
  track(x, tr);
  x.fillStyle = color;
  let line = '';
  let y = Y;
  for (const w of s.split(' ')) {
    const t = line ? `${line} ${w}` : w;
    if (x.measureText(t).width > maxW && line) {
      x.fillText(line, X, y);
      line = w;
      y += lh;
    } else line = t;
  }
  x.fillText(line, X, y);
  track(x, 0);
  return y;
}
function logo(x: Ctx, b: BrandSkin, X: number, Y: number, size: number, onColor = false) {
  if (b.look) return drawMark(x, b.look, X, Y, size, onColor ? b.ink : undefined);
  rr(x, X, Y, size, size, size * 0.26);
  x.fillStyle = onColor ? b.ink : b.color;
  x.fill();
  const icon = b.icon;
  if (icon && icon.complete && icon.naturalWidth) {
    x.save();
    rr(x, X, Y, size, size, size * 0.26);
    x.clip();
    x.fillStyle = '#fff';
    x.fillRect(X, Y, size, size);
    x.drawImage(icon, X + size * 0.12, Y + size * 0.12, size * 0.76, size * 0.76);
    x.restore();
    return;
  }
  text(x, b.name.charAt(0).toUpperCase(), X + size / 2, Y + size * 0.7, size * 0.6, onColor ? b.color : b.ink, 700, false, 0, 'center');
}
export interface Status {
  time: string;
  /** 0..1 */
  battery: number;
  bars: number;
  wifi: boolean;
}
function statusBar(x: Ctx, st: Status, dark = false) {
  const c = dark ? '#fff' : TEXT;
  const dim = dark ? 'rgba(255,255,255,0.35)' : 'rgba(23,20,31,0.25)';
  text(x, st.time, 28, 31, 14, c, 700);
  let xr = st.wifi ? 240 : 262;
  for (let i = 0; i < 4; i++) {
    rr(x, xr + i * 5, 28 - i * 3, 3, 4 + i * 3, 1);
    x.fillStyle = i < st.bars ? c : dim;
    x.fill();
  }
  if (st.wifi) {
    x.strokeStyle = c;
    x.lineWidth = 1.6;
    x.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      x.beginPath();
      x.arc(276, 31, 3 + i * 3.4, Math.PI * 1.27, Math.PI * 1.73);
      x.stroke();
    }
  }
  x.strokeStyle = c;
  x.lineWidth = 1.3;
  rr(x, 292, 20, 24, 12, 4);
  x.stroke();
  rr(x, 294.5, 22.5, Math.max(2, 19 * st.battery), 7, 2);
  x.fillStyle = st.battery < 0.2 ? '#D93F3F' : c;
  x.fill();
  rr(x, 317.5, 24, 2, 4, 1);
  x.fillStyle = c;
  x.fill();
}

/** Different moments, different phones: a clock and battery for each screen. */
const ST: Record<Shot, Status> = {
  post: { time: '7:52', battery: 0.86, bars: 4, wifi: true },
  store: { time: '7:53', battery: 0.85, bars: 4, wifi: true },
  checkout: { time: '7:54', battery: 0.85, bars: 4, wifi: true },
  'checkout-returning': { time: '6:18', battery: 0.31, bars: 2, wifi: false },
  verify: { time: '7:54', battery: 0.85, bars: 4, wifi: true },
  refused: { time: '6:19', battery: 0.31, bars: 2, wifi: false },
  sale: { time: '8:05', battery: 0.79, bars: 3, wifi: true },
  brand: { time: '9:12', battery: 0.58, bars: 4, wifi: true },
  creator: { time: '11:47', battery: 0.72, bars: 3, wifi: false },
  hub: { time: '2:36', battery: 0.43, bars: 4, wifi: true },
};
function homeBar(x: Ctx, dark = false) {
  rr(x, 120, 772, 120, 5, 2.5);
  x.fillStyle = dark ? 'rgba(255,255,255,0.6)' : 'rgba(23,20,31,0.75)';
  x.fill();
}
function urlPill(x: Ctx, url: string, y = 50, bg = FILL) {
  rr(x, 18, y, 324, 34, 17);
  x.fillStyle = bg;
  x.fill();
  // lock
  x.strokeStyle = MUTED;
  x.lineWidth = 1.4;
  rr(x, 34, y + 15, 9, 8, 2);
  x.stroke();
  x.beginPath();
  x.arc(38.5, y + 15, 3, Math.PI, 0);
  x.stroke();
  textFit(x, url, 52, y + 22, 276, 12, MUTED, 400, true);
}
function chip(x: Ctx, label: string, X: number, Y: number, bg: string, fg: string, border?: string, size = 10.5) {
  font(x, size, 400, true);
  track(x, 0.8);
  const w = x.measureText(label).width + 18;
  rr(x, X, Y - 14, w, 22, 11);
  x.fillStyle = bg;
  x.fill();
  if (border) {
    x.strokeStyle = border;
    x.lineWidth = 1.2;
    x.stroke();
  }
  x.fillStyle = fg;
  x.fillText(label, X + 9, Y + 1.5);
  track(x, 0);
  return w;
}
function chipRight(x: Ctx, label: string, right: number, Y: number, bg: string, fg: string, border?: string) {
  font(x, 10.5, 400, true);
  track(x, 0.8);
  const w = x.measureText(label).width + 18;
  track(x, 0);
  return chip(x, label, right - w, Y, bg, fg, border);
}
function button(x: Ctx, label: string, y: number, bg: string, fg: string, h = 58) {
  rr(x, 24, y, 312, h, h / 2);
  x.fillStyle = bg;
  x.fill();
  text(x, label, 180, y + h / 2 + 6.5, 18, fg, 700, false, -0.2, 'center');
}
function exampleTag(x: Ctx, y = 68) {
  chipRight(x, 'EXAMPLE', 336, y, FILL, MUTED);
}
/** A confirmation mark: a filled circle whose check draws itself as k goes 0 to 1. */
function check(x: Ctx, cx: number, cy: number, r: number, k: number, col = BLUE) {
  if (k <= 0) return;
  x.save();
  x.globalAlpha = Math.min(1, k * 2.5);
  x.fillStyle = col;
  x.beginPath();
  x.arc(cx, cy, r * (0.85 + 0.15 * ease(k * 1.6)), 0, Math.PI * 2);
  x.fill();
  const pts: Array<[number, number]> = [
    [-0.42, 0.02],
    [-0.12, 0.3],
    [0.44, -0.28],
  ];
  const seg = (i: number) => Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
  const total = seg(0) + seg(1);
  let left = clamp01((k - 0.25) / 0.75) * total;
  x.strokeStyle = '#fff';
  x.lineWidth = r * 0.16;
  x.lineCap = 'round';
  x.lineJoin = 'round';
  x.beginPath();
  x.moveTo(cx + pts[0][0] * r, cy + pts[0][1] * r);
  for (let i = 0; i < 2 && left > 0; i++) {
    const f = Math.min(1, left / seg(i));
    x.lineTo(cx + (pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f) * r, cy + (pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f) * r);
    left -= seg(i);
  }
  x.stroke();
  x.restore();
}
/** The opposite of a confirmation: a grey circle with a bar. */
function nope(x: Ctx, cx: number, cy: number, r: number, k: number) {
  if (k <= 0) return;
  x.save();
  x.globalAlpha = Math.min(1, k * 2.5);
  x.fillStyle = '#E2DFE8';
  x.beginPath();
  x.arc(cx, cy, r, 0, Math.PI * 2);
  x.fill();
  x.strokeStyle = GHOST;
  x.lineWidth = r * 0.16;
  x.lineCap = 'round';
  const w = r * 0.42 * clamp01((k - 0.25) / 0.6);
  x.beginPath();
  x.moveTo(cx - w, cy);
  x.lineTo(cx + w, cy);
  x.stroke();
  x.restore();
}
function tap(x: Ctx, X: number, Y: number, k: number) {
  if (k <= 0 || k >= 1) return;
  x.save();
  x.globalAlpha = (1 - k) * 0.35;
  x.fillStyle = INK;
  x.beginPath();
  x.arc(X, Y, 12 + ease(k) * 30, 0, Math.PI * 2);
  x.fill();
  x.globalAlpha = Math.min(1, (1 - k) * 2.2) * 0.8;
  x.beginPath();
  x.arc(X, Y, 13, 0, Math.PI * 2);
  x.fill();
  x.restore();
}
function press(k: number) {
  return k > 0 && k < 0.5 ? 0.06 * Math.sin((k / 0.5) * Math.PI) : 0;
}

/* ---------------------------------------------------------------- screens */
type Draw = (x: Ctx, t: number, b: BrandSkin, c: CreatorSkin) => void;

const TAPS: Partial<Record<Shot, [number, number]>> = {
  store: [200, 625],
  hub: [200, 330],
};

function base(x: Ctx, st: Status, bg = '#fff') {
  x.fillStyle = bg;
  x.fillRect(0, 0, 360, DH);
  statusBar(x, st);
}

/** Safari's compact bar, floating over the page: back, the address, more. */
function safariBar(x: Ctx, url: string) {
  const y = 704;
  x.save();
  x.shadowColor = 'rgba(0,0,0,0.16)';
  x.shadowBlur = 16;
  x.shadowOffsetY = 4;
  x.fillStyle = 'rgba(250,250,251,0.96)';
  for (const [X, w] of [
    [16, 44],
    [66, 228],
    [300, 44],
  ]) {
    rr(x, X, y, w, 44, 22);
    x.fill();
  }
  x.restore();
  x.strokeStyle = TEXT;
  x.lineWidth = 2;
  x.lineCap = 'round';
  x.lineJoin = 'round';
  x.beginPath();
  x.moveTo(41, y + 15);
  x.lineTo(34, y + 22);
  x.lineTo(41, y + 29);
  x.stroke();
  x.fillStyle = TEXT;
  for (const dx of [-6, 0, 6]) {
    x.beginPath();
    x.arc(322 + dx, y + 22, 1.7, 0, Math.PI * 2);
    x.fill();
  }
  x.font = '400 11.5px -apple-system, system-ui, sans-serif';
  track(x, -0.1);
  const u = fit(x, url, 206);
  const w = x.measureText(u).width;
  x.fillStyle = TEXT;
  x.textAlign = 'center';
  x.fillText(u, 186, y + 26);
  x.textAlign = 'left';
  track(x, 0);
  // the lock, just before the address
  const lx = 186 - w / 2 - 11;
  x.fillStyle = MUTED;
  rr(x, lx, y + 19, 7, 6, 1.5);
  x.fill();
  x.strokeStyle = MUTED;
  x.lineWidth = 1.2;
  x.beginPath();
  x.arc(lx + 3.5, y + 19, 2.2, Math.PI, 0);
  x.stroke();
}

/** The two disclosure lines every storefront carries (StoreFoot.astro). */
function storeFoot(x: Ctx, c: CreatorSkin, y: number, col: string) {
  say(x, `${c.first} earns a commission if you buy.`, 180, y, '400 11px -apple-system, system-ui, sans-serif', col, 'center');
  say(x, 'Storefront by Comarket', 180, y + 15, '500 9.5px Satoshi, system-ui, sans-serif', col, 'center');
}

/* Sarah's newsletter, opened from the inbox: Trial & Error, the post she sent (posts/Sarah.astro) */
const post: Draw = (x, t, b, c) => {
  base(x, ST.post);
  x.strokeStyle = TEXT;
  x.lineWidth = 2;
  x.lineCap = 'round';
  x.beginPath();
  x.moveTo(34, 62);
  x.lineTo(27, 69);
  x.lineTo(34, 76);
  x.stroke();
  text(x, 'Inbox', 42, 74, 15, TEXT, 600);
  exampleTag(x, 72);
  const serif = (w: number, px: number) => `${w} ${px}px Georgia, serif`;
  rr(x, 24, 100, 26, 26, 6);
  x.fillStyle = '#E8613C';
  x.fill();
  say(x, 'T&E', 37, 117, serif(700, 10), '#fff', 'center');
  say(x, 'Trial & Error', 58, 119, serif(700, 16), TEXT);
  const ty = wrapIn(x, 'I finally figured out why my trials go quiet', 24, 168, 312, serif(700, 26), 30, TEXT, -0.3);
  face(x, c, 40, ty + 38, 16);
  say(x, c.name, 64, ty + 34, '600 13px -apple-system, system-ui, sans-serif', TEXT);
  say(x, 'Oct 14, 2026', 64, ty + 51, '400 12px -apple-system, system-ui, sans-serif', MUTED);
  const by = wrapIn(x, 'Quick one this week. Last spring about 1 in 11 of my trials turned into paying customers. This month it’s closer to 1 in 5.', 24, ty + 92, 312, serif(400, 15), 23, '#2A2A2A');
  // the link card she put in the post
  const y = by + 26;
  const k = clamp01((t - 1.5) / 0.6);
  const s = 1 - press(k);
  x.save();
  x.translate(180, y + 74);
  x.scale(s, s);
  x.translate(-180, -(y + 74));
  if (b.look === 'fernwood') {
    rr(x, 24, y, 312, 148, 16);
    x.fillStyle = PAPER;
    x.fill();
    x.strokeStyle = MOSS;
    x.lineWidth = 1.2;
    x.stroke();
    drawMark(x, 'fernwood', 40, y + 18, 18);
    say(x, `Fernwood × ${c.name}`, 64, y + 33, `19px ${SERIF}`, PINE);
    say(x, 'Find the screen where', 40, y + 68, `24px ${SERIF}`, PINE, 'left', -0.3);
    const w = say(x, 'your trials ', 40, y + 92, `24px ${SERIF}`, PINE, 'left', -0.3);
    say(x, 'stall.', 40 + w, y + 92, `italic 24px ${SERIF}`, FERN, 'left', -0.3);
    say(x, `${c.first}’s readers get 30 days free`, 40, y + 122, `600 13px ${SANS}`, FERN);
    say(x, `${b.host}.comarket.si/creators/${c.slug}`, 40, y + 138, '400 10.5px "Fragment Mono", monospace', LICHEN);
  } else {
    rr(x, 24, y, 312, 148, 16);
    x.fillStyle = '#fff';
    x.fill();
    x.strokeStyle = LINE;
    x.lineWidth = 1.5;
    x.stroke();
    x.save();
    rr(x, 24, y, 312, 52, [16, 16, 0, 0]);
    x.clip();
    x.fillStyle = b.color;
    x.fillRect(24, y, 312, 52);
    x.restore();
    logo(x, b, 40, y + 11, 30, true);
    textFit(x, `${b.name} × ${c.name}`, 82, y + 32, 236, 15, b.ink, 700);
    textFit(x, `${c.first}’s pick: ${b.product}`, 40, y + 84, 280, 17, TEXT, 700);
    textFit(x, `${b.host}.comarket.si/creators/${c.slug}`, 40, y + 106, 280, 11.5, MUTED, 400, true);
    text(x, 'Open storefront →', 40, y + 130, 14, b.color, 700);
  }
  x.restore();
  const changed = b.look === 'fernwood' ? 'What changed: I started using Fernwood, which shows you the exact screen people stall on.' : `What changed: I started using ${b.name}.`;
  wrapIn(x, changed, 24, y + 186, 312, serif(400, 15), 23, '#2A2A2A');
  homeBar(x);
  tap(x, 250, y + 74, k);
};

/* The storefront. Fernwood's is drawn exactly as stores/Fernwood.astro; a visitor's own brand gets the same
   standard (lockup, headline, what it is and the creator's welcome, one visual, the creator's note, one button). */
const store: Draw = (x, t, b, c) => {
  const fern = b.look === 'fernwood';
  // a visitor's brand is drawn in its logo's own palette: its tint for the page, its darkest for the words
  const pal = !b.look ? b.pal : null;
  base(x, ST.store, fern ? PAPER : pal ? pal.paper : '#FAF9F7');
  const ink = fern ? PINE : pal ? pal.ink : TEXT;
  const quiet = fern ? LICHEN : pal ? `${pal.ink}99` : MUTED;
  // brand x creator, one centered row, both names in the brand's type
  const nameFont = fern ? `23px ${SERIF}` : '700 18px Satoshi, system-ui, sans-serif';
  x.font = nameFont;
  const bw = x.measureText(b.name).width;
  const cw = x.measureText(c.name).width;
  const total = 22 + 7 + bw + 12 + 8 + 12 + 26 + 7 + cw;
  let X = 180 - total / 2;
  logo(x, b, X, 63, 22);
  X += 29;
  say(x, b.name, X, 81, nameFont, ink);
  X += bw + 12;
  say(x, '×', X, 79, '400 13px system-ui, sans-serif', quiet);
  X += 20;
  face(x, c, X + 13, 75, 13);
  say(x, c.name, X + 33, 81, nameFont, ink);

  if (fern) {
    say(x, 'Find the screen where', 22, 150, `42px ${SERIF}`, PINE, 'left', -0.8);
    const w = say(x, 'your trials ', 22, 191, `42px ${SERIF}`, PINE, 'left', -0.8);
    say(x, 'stall.', 22 + w, 191, `italic 42px ${SERIF}`, FERN, 'left', -0.8);
    say(x, 'Onboarding analytics for SaaS teams.', 22, 226, `400 15px ${SANS}`, '#3F5248');
    say(x, `${c.first}’s readers get 30 days free.`, 22, 247, `400 15px ${SANS}`, '#3F5248');
    // the product on a Fern panel, its one finding marked
    rr(x, 14, 268, 332, 194, 18);
    x.fillStyle = FERN;
    x.fill();
    rr(x, 30, 284, 300, 162, 11);
    x.fillStyle = '#fff';
    x.fill();
    say(x, 'Trial onboarding', 42, 306, `600 13px ${SANS}`, PINE);
    say(x, 'Last 30 days', 318, 306, `400 10.5px ${SANS}`, LICHEN, 'right');
    const steps: Array<[string, number, boolean]> = [
      ['Signed up', 1140, false],
      ['Created a project', 912, false],
      ['Added an integration', 342, true],
      ['Paid', 228, false],
    ];
    steps.forEach(([label, n, stall], i) => {
      const y = 316 + i * 31;
      x.fillStyle = i ? '#EDF0EA' : MOSS;
      x.fillRect(42, y, 276, 1);
      say(x, label, 42, y + 20, `${stall ? 600 : 400} 11.5px ${SANS}`, stall ? PINE : '#4A5C52');
      rr(x, 158, y + 12.5, 122, 6.5, 3.25);
      x.fillStyle = '#EEF1EB';
      x.fill();
      const bw2 = (122 * n) / 1140;
      rr(x, 158, y + 12.5, bw2, 6.5, 3.25);
      x.fillStyle = stall ? FERN : '#A9C9B5';
      x.fill();
      say(x, n.toLocaleString('en-US'), 318, y + 20, `500 11.5px ${SANS}`, PINE, 'right');
      if (stall) {
        x.font = `600 9.5px ${SANS}`;
        const mw = x.measureText('570 stalled').width + 12;
        rr(x, 158 + bw2 + 5, y + 7.5, mw, 16, 8);
        x.fillStyle = SPROUT;
        x.fill();
        say(x, '570 stalled', 158 + bw2 + 11, y + 19, `600 9.5px ${SANS}`, PINE);
      }
    });
    face(x, c, 46, 508, 24);
    const qy = wrapIn(x, '“Fernwood showed me the screen my trials quit on. Mine was integrations. Of course it was.”', 82, 500, 256, `17.5px ${SERIF}`, 20, PINE);
    say(x, `${c.name}, Trial & Error`, 82, qy + 20, `400 11.5px ${SANS}`, LICHEN);
  } else {
    wrapIn(x, `${b.name}, picked by ${c.first}.`, 22, 150, 316, '700 36px Satoshi, system-ui, sans-serif', 38, ink, -1.2);
    say(x, `${b.domain} · ${c.first}’s readers start here.`, 22, 238, '500 14px Satoshi, system-ui, sans-serif', quiet);
    rr(x, 14, 262, 332, 196, 18);
    x.fillStyle = pal ? pal.primary : b.color;
    x.fill();
    if (pal) {
      // the logo's second colour as a soft shape in the panel's corner, so the page carries more than one colour
      x.save();
      rr(x, 14, 262, 332, 196, 18);
      x.clip();
      x.globalAlpha = 0.9;
      x.fillStyle = pal.accent;
      x.beginPath();
      x.arc(352, 262, 84, 0, Math.PI * 2);
      x.fill();
      x.globalAlpha = 0.22;
      x.fillStyle = pal.paper;
      x.beginPath();
      x.arc(14, 458, 92, 0, Math.PI * 2);
      x.fill();
      x.restore();
    }
    logo(x, b, 150, 300, 60, true);
    x.font = '700 22px Satoshi, system-ui, sans-serif';
    say(x, fit(x, b.product, 280), 180, 404, '700 22px Satoshi, system-ui, sans-serif', b.ink, 'center');
    // we don't know the visitor's price, so the one we draw says it's an example
    say(x, `Example price: ${money(b.amount)}/mo`, 180, 430, '500 14px Satoshi, system-ui, sans-serif', b.ink, 'center');
    face(x, c, 46, 508, 24);
    const qy = wrapIn(x, '“The first one I recommend when someone asks. I use it every week.”', 82, 500, 256, '600 16px Satoshi, system-ui, sans-serif', 21, ink);
    say(x, c.name, 82, qy + 20, '400 11.5px Satoshi, system-ui, sans-serif', quiet);
  }
  const k = clamp01((t - 1.6) / 0.6);
  const s = 1 - press(k);
  x.save();
  x.translate(180, 625);
  x.scale(s, s);
  x.translate(-180, -625);
  rr(x, 22, 600, 316, 50, 25);
  x.fillStyle = fern ? FERN : pal ? pal.primary : b.color;
  x.fill();
  say(x, fern ? 'Start my free 30 days' : `Get ${b.name}`, 180, 631, fern ? `600 16px ${SANS}` : '700 16px Satoshi, system-ui, sans-serif', fern ? '#fff' : pal ? pal.onPrimary : b.ink, 'center');
  x.restore();
  storeFoot(x, c, 674, quiet);
  safariBar(x, `${b.host}.comarket.si/creators/${c.slug}`);
  homeBar(x);
  tap(x, ...(TAPS.store as [number, number]), k);
};

function field(x: Ctx, label: string, value: string, y: number, focus = false, caret = false) {
  text(x, label, 24, y, 13, MUTED, 600);
  rr(x, 24, y + 10, 312, 54, 14);
  x.fillStyle = '#fff';
  x.fill();
  x.strokeStyle = focus ? BLUE : LINE;
  x.lineWidth = focus ? 2 : 1.5;
  x.stroke();
  text(x, value, 40, y + 43, 17, TEXT, 500);
  if (caret) {
    font(x, 17, 500);
    const w = x.measureText(value).width;
    x.fillStyle = BLUE;
    x.fillRect(41 + w, y + 25, 2, 24);
  }
}
/** Fernwood's own form field. */
function fernField(x: Ctx, label: string, value: string, y: number, focus = false, caret = false) {
  say(x, label, 24, y, `500 12px ${SANS}`, LICHEN);
  rr(x, 24, y + 9, 312, 48, 12);
  x.fillStyle = '#fff';
  x.fill();
  x.strokeStyle = focus ? FERN : MOSS;
  x.lineWidth = focus ? 2 : 1.2;
  x.stroke();
  const w = say(x, value, 40, y + 39, `400 16px ${SANS}`, PINE);
  if (caret) {
    x.fillStyle = FERN;
    x.fillRect(41 + w, y + 22, 2, 22);
  }
}

/* The brand's own checkout, with the creator's credit riding along. With a trial, nothing is charged today: the sale
   completes when the first payment does, 30 days later. */
const checkout =
  (email: string, st: Status): Draw =>
  (x, t, b, c) => {
    const typed = email.slice(0, Math.round(clamp01(t / 1.1) * email.length));
    const typing = t < 1.25;
    const k = clamp01((t - 1.6) / 0.6);
    const s = 1 - press(k);
    if (b.look === 'fernwood') {
      base(x, st, PAPER);
      drawMark(x, 'fernwood', 24, 66, 22);
      say(x, 'Fernwood', 52, 84, `23px ${SERIF}`, PINE);
      say(x, 'Start your free trial', 24, 148, `36px ${SERIF}`, PINE, 'left', -0.6);
      fernField(x, 'Work email', typed, 182, typing, typing && Math.floor(t * 3) % 2 === 0);
      fernField(x, 'Card', '4242  4242  4242  4242', 256);
      // the order: the trial, what's due today, and when the first payment comes
      rr(x, 24, 334, 312, 128, 14);
      x.fillStyle = '#fff';
      x.fill();
      say(x, 'Fernwood', 40, 362, `18px ${SERIF}`, PINE);
      say(x, `${money(b.amount)}/mo`, 320, 362, `500 13px ${SANS}`, PINE, 'right');
      say(x, `${b.trial} days free with ${c.first}’s link`, 40, 382, `600 12px ${SANS}`, FERN);
      x.fillStyle = MOSS;
      x.fillRect(40, 396, 280, 1);
      say(x, 'Due today', 40, 420, `600 13px ${SANS}`, PINE);
      say(x, '$0.00', 320, 420, `600 13px ${SANS}`, PINE, 'right');
      say(x, `First payment, ${FIRST_PAYMENT}`, 40, 442, `400 12px ${SANS}`, LICHEN);
      say(x, usd(b.amount), 320, 442, `400 12px ${SANS}`, LICHEN, 'right');
      // the creator's credit, saved on the brand's side
      rr(x, 24, 476, 312, 46, 23);
      x.strokeStyle = FERN;
      x.lineWidth = 1.4;
      x.stroke();
      face(x, c, 48, 499, 12);
      say(x, `Sent by ${c.name} · credit saved`, 68, 503, `600 12.5px ${SANS}`, FERN);
      x.save();
      x.translate(180, 565);
      x.scale(s, s);
      x.translate(-180, -565);
      rr(x, 24, 540, 312, 50, 25);
      x.fillStyle = FERN;
      x.fill();
      say(x, 'Start my free trial', 180, 571, `600 16px ${SANS}`, '#fff', 'center');
      x.restore();
      say(x, `No charge until ${FIRST_PAYMENT}. Cancel anytime.`, 180, 616, `400 11.5px ${SANS}`, LICHEN, 'center');
      say(x, 'Payments by Stripe', 180, 633, `400 11.5px ${SANS}`, LICHEN, 'center');
      safariBar(x, `${b.domain}/checkout`);
      homeBar(x);
      tap(x, 180, 565, k);
      return;
    }
    base(x, st);
    logo(x, b, 24, 64, 32);
    text(x, b.name, 66, 87, 19, TEXT, 700);
    wrap(x, `Get ${b.product}`, 24, 150, 312, 30, 32, TEXT, 700, -1.1);
    field(x, 'Work email', typed, 184, typing, typing && Math.floor(t * 3) % 2 === 0);
    field(x, 'Card', '4242  4242  4242  4242', 268);
    rr(x, 24, 356, 312, 74, 16);
    x.fillStyle = FILL;
    x.fill();
    textFit(x, b.product, 42, 386, 200, 16, TEXT, 700);
    text(x, `${money(b.amount)}/mo`, 318, 386, 16, TEXT, 400, true, 0, 'right');
    text(x, 'Billed monthly · cancel anytime', 42, 409, 13, MUTED);
    rr(x, 24, 446, 312, 52, 16);
    x.strokeStyle = BLUE;
    x.lineWidth = 1.6;
    x.stroke();
    face(x, c, 48, 472, 12);
    textFit(x, `Sent by ${c.name} · credit saved`, 70, 477, 250, 14, BLUE, 700);
    x.save();
    x.translate(180, 565);
    x.scale(s, s);
    x.translate(-180, -565);
    button(x, `Pay ${money(b.amount)}`, 536, b.color, b.ink);
    x.restore();
    font(x, 11.5, 500);
    text(x, fit(x, `Checkout on ${b.domain} · payments by Stripe`, 300), 180, 626, 11.5, '#A8A3B2', 500, false, 0, 'center');
    safariBar(x, `${b.domain}/checkout`);
    homeBar(x);
    tap(x, 180, 565, k);
  };

function checkRow(x: Ctx, label: string, sub: string, result: string, y: number, k: number, bad = false) {
  x.globalAlpha = 0.3 + 0.7 * clamp01(k * 2);
  rr(x, 24, y, 312, 62, 16);
  x.fillStyle = bad && k >= 1 ? '#fff' : FILL;
  x.fill();
  if (bad && k >= 1) {
    x.strokeStyle = GHOST;
    x.lineWidth = 1.4;
    x.stroke();
  }
  text(x, label, 42, y + 28, 16, TEXT, 700);
  textFit(x, sub, 42, y + 47, 170, 12, MUTED, 400, true);
  if (k >= 1) {
    if (bad) chipRight(x, result, 320, y + 34, '#fff', '#6A6478', GHOST);
    else chipRight(x, result, 320, y + 34, '#fff', BLUE, BLUE);
  } else {
    x.strokeStyle = MUTED;
    x.lineWidth = 2;
    x.lineCap = 'round';
    x.beginPath();
    x.arc(304, y + 31, 8, k * 14, k * 14 + 4.2);
    x.stroke();
  }
  x.globalAlpha = 1;
}

/** The check happens on our side. Say so, so nobody thinks the buyer sees it. */
function behind(x: Ctx) {
  rr(x, 24, 62, 312, 30, 15);
  x.fillStyle = INK;
  x.fill();
  text(x, 'BEHIND THE SCENES · THE BUYER NEVER SEES THIS', 180, 81.5, 9.5, '#FFF7EC', 400, true, 0.8, 'center');
}

function verdict(x: Ctx, title: string, sub: string, k: number, dark: boolean) {
  if (k <= 0) return;
  x.save();
  x.globalAlpha = ease(k);
  x.translate(0, (1 - ease(k)) * 16);
  rr(x, 24, 662, 312, 84, 20);
  x.fillStyle = dark ? INK : '#fff';
  x.fill();
  if (!dark) {
    x.strokeStyle = GHOST;
    x.lineWidth = 1.4;
    x.stroke();
  }
  text(x, title, 44, 698, 20, dark ? '#fff' : TEXT, 700, false, -0.4);
  textFit(x, sub, 44, 722, 276, 13.5, dark ? '#C9C2DC' : MUTED);
  x.restore();
}

/** A trial's sale lands a month after checkout, on another morning. */
const TRIAL_ENDS: Status = { time: '9:02', battery: 0.64, bars: 3, wifi: true };

const verify: Draw = (x, t, b, c) => {
  const st = b.trial ? TRIAL_ENDS : ST.verify;
  base(x, st);
  behind(x);
  wrap(x, 'Did the sale go through?', 24, b.trial ? 148 : 142, 312, 30, 32, TEXT, 700, -1);
  if (b.trial) text(x, `${FIRST_PAYMENT.toUpperCase()} · THE TRIAL ENDS`, 24, 114, 10.5, MUTED, 400, true, 1);
  checkRow(x, 'Payment', b.trial ? `First payment · ${usd(b.amount)}` : `Stripe · ${usd(b.amount)}`, 'PAID', 198, clamp01((t - 0.2) / 0.35));
  checkRow(x, 'New customer', 'Email, phone and card', 'YES', 270, clamp01((t - 0.45) / 0.35));
  checkRow(x, 'Sent by', `${c.first}’s storefront`, c.name.toUpperCase(), 342, clamp01((t - 0.7) / 0.35));
  // the receipt: the moment money moves, and the only moment anyone pays
  const k = clamp01((t - 1.4) / 0.5);
  check(x, 180, 462, 34, k);
  x.globalAlpha = ease((t - 1.5) / 0.4);
  text(x, usd(b.amount * ease((t - 1.5) / 0.5)), 180, 554, 46, TEXT, 700, false, -2, 'center');
  text(x, `Payment received · ${st.time} AM`, 180, 584, 13, MUTED, 500, false, 0, 'center');
  x.globalAlpha = 1;
  const sp = split(b);
  verdict(x, `Now ${b.name} pays its share`, `${c.first} ${usd(sp.creator)} · Comarket ${usd(sp.us)}`, (t - 1.75) / 0.45, true);
  homeBar(x);
};

const refused: Draw = (x, t, b) => {
  base(x, b.trial ? { ...ST.refused, time: '6:41' } : ST.refused);
  behind(x);
  wrap(x, 'Did the sale go through?', 24, b.trial ? 148 : 142, 312, 30, 32, TEXT, 700, -1);
  if (b.trial) text(x, `${FIRST_PAYMENT.toUpperCase()} · THE TRIAL ENDS`, 24, 114, 10.5, MUTED, 400, true, 1);
  checkRow(x, 'Payment', b.trial ? `First payment · ${usd(b.amount)}` : `Stripe · ${usd(b.amount)}`, 'PAID', 198, clamp01((t - 0.2) / 0.35));
  checkRow(x, 'New customer', 'Customer since 2024', 'NO', 270, clamp01((t - 0.45) / 0.35), true);
  const k = clamp01((t - 1.4) / 0.5);
  nope(x, 180, 462, 34, k);
  x.globalAlpha = ease((t - 1.5) / 0.4);
  text(x, '$0.00 fee', 180, 554, 46, GHOST, 700, false, -2, 'center');
  text(x, 'They already pay you', 180, 584, 13, MUTED, 500, false, 0, 'center');
  x.globalAlpha = 1;
  verdict(x, 'Already a customer', `${b.name} pays no commission.`, (t - 1.75) / 0.45, false);
  homeBar(x);
};

/** The fork's calm frame: one completed sale, and where its money went. */
const sale: Draw = (x, t, b, c) => {
  base(x, ST.sale, '#FFFDF8');
  logo(x, b, 24, 58, 28);
  textFit(x, `${b.name.toUpperCase()} × ${c.name.toUpperCase()}`, 62, 77, 220, 11, MUTED, 400, true);
  exampleTag(x, 74);
  check(x, 180, 170, 40, clamp01(t / 0.9));
  text(x, 'Sale complete', 180, 252, 28, TEXT, 700, false, -1, 'center');
  font(x, 15, 500);
  text(x, fit(x, `Jordan bought through ${c.first}’s storefront.`, 300), 180, 278, 15, MUTED, 500, false, 0, 'center');
  text(x, usd(b.amount), 180, 360, 60, TEXT, 700, false, -2.5, 'center');
  // one bar, three shares: the brand's, the creator's, ours
  const sp = split(b);
  const kk = ease(t / 1.2);
  const parts = [
    { v: sp.keep, col: b.color, who: `${b.name} keeps` },
    { v: sp.creator, col: CREAM, who: `${c.first} earns` },
    { v: sp.us, col: BLUE, who: 'Comarket' },
  ];
  let xx = 24;
  parts.forEach((p, i) => {
    const w = (p.v / b.amount) * 312 * kk;
    rr(x, xx, 392, Math.max(0, w - (i < 2 ? 3 : 0)), 22, 6);
    x.fillStyle = p.col;
    x.fill();
    xx += w;
  });
  parts.forEach((p, i) => {
    const y = 456 + i * 38;
    x.globalAlpha = ease((t - 0.6 - i * 0.15) / 0.4);
    rr(x, 24, y - 13, 14, 14, 4);
    x.fillStyle = p.col;
    x.fill();
    text(x, p.who, 48, y, 15, TEXT, 600);
    text(x, usd(p.v), 336, y, 15, TEXT, 400, true, 0, 'right');
    x.globalAlpha = 1;
  });
  rr(x, 24, 584, 312, 64, 16);
  x.fillStyle = FILL;
  x.fill();
  text(x, `Sales through ${c.first} this month`, 42, 621, 14, TEXT, 600);
  text(x, '131', 318, 622, 18, TEXT, 700, false, -0.5, 'right');
  text(x, 'Nobody paid anything before this sale.', 180, 694, 14, TEXT, 700, false, 0, 'center');
  homeBar(x);
};

const brandView: Draw = (x, t, b, c) => {
  base(x, ST.brand);
  logo(x, b, 24, 56, 30);
  textFit(x, `${b.name} · Creator sales`, 64, 77, 200, 17, TEXT, 700);
  exampleTag(x, 74);
  text(x, 'TODAY', 24, 132, 10.5, MUTED, 400, true, 1);
  const sp = split(b);
  const k = ease(t / 0.5);
  x.globalAlpha = k;
  text(x, '+3', 22, 204, 76, TEXT, 700, false, -4);
  text(x, 'sales', 124, 180, 20, TEXT, 700);
  textFit(x, `${money(b.amount * 3)}/mo in new revenue`, 124, 203, 210, 14, MUTED);
  x.globalAlpha = 1;
  const items = [
    { e: 'jordan@acme.io', s: 'SALE', v: `fee ${usd(sp.fee)}`, on: true },
    { e: 'priya@lumen.co', s: 'SALE', v: `fee ${usd(sp.fee)}`, on: true },
    { e: 'a•••@proton.me', s: 'CLICKED, NO SALE', v: '$0', on: false },
  ];
  items.forEach((it, i) => {
    const kk = ease((t - 0.3 - i * 0.16) / 0.35);
    x.globalAlpha = kk;
    const y = 236 + i * 70;
    rr(x, 24, y, 312, 60, 16);
    x.fillStyle = it.on ? '#FFFBD6' : FILL;
    x.fill();
    if (it.on) {
      x.strokeStyle = INK;
      x.lineWidth = 1.2;
      x.stroke();
    }
    text(x, it.e, 42, y + 26, 14, it.on ? TEXT : '#8A8496', 600);
    if (it.on) chip(x, it.s, 42, y + 47, YELLOW, INK, INK);
    else chip(x, it.s, 42, y + 47, '#fff', '#8A8496', '#CFCBD8');
    text(x, it.v, 318, y + 37, 14, it.on ? TEXT : '#8A8496', 400, true, 0, 'right');
    x.globalAlpha = 1;
  });
  rr(x, 24, 456, 312, 150, 20);
  x.fillStyle = INK;
  x.fill();
  text(x, 'FROM CREATORS · 90 DAYS', 44, 490, 10.5, '#B9B1CF', 400, true, 1);
  text(x, '212 sales', 44, 528, 26, '#fff', 700, false, -0.6);
  text(x, `$${(b.amount * 212).toLocaleString('en-US')}/mo in new revenue`, 44, 556, 14, '#C9C2DC');
  text(x, '$0 before any of them', 44, 584, 15, YELLOW, 700);
  rr(x, 24, 622, 312, 60, 16);
  x.fillStyle = FILL;
  x.fill();
  text(x, 'Cost per sale, after it lands', 42, 657, 14, TEXT, 600);
  text(x, usd(sp.fee), 318, 657, 15, TEXT, 400, true, 0, 'right');
  homeBar(x);
};

const creatorView: Draw = (x, t, b, c) => {
  base(x, ST.creator);
  face(x, c, 40, 71, 16);
  textFit(x, `${c.name} · Payouts`, 64, 77, 190, 17, TEXT, 700);
  exampleTag(x, 74);
  text(x, 'THIS MONTH', 24, 132, 10.5, MUTED, 400, true, 1);
  const sp = split(b);
  const k = ease(t / 0.5);
  const months = [212.4, 398.2, 561.7, 790.3, 1032.9, 1284.6];
  x.globalAlpha = k;
  text(x, `+$${(1284.6 * k).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 22, 196, 54, TEXT, 700, false, -2.4);
  text(x, '4 brands · 131 paying customers', 24, 224, 14, MUTED);
  x.globalAlpha = 1;
  // every customer keeps paying, so each month starts higher than the last
  const base0 = 450;
  months.forEach((v, i) => {
    const kk = ease((t - 0.3 - i * 0.1) / 0.35);
    const h = (v / months[5]) * 170 * kk;
    rr(x, 30 + i * 52, base0 - h, 38, Math.max(2, h), 10);
    x.fillStyle = i === months.length - 1 ? YELLOW : '#E7E3EF';
    x.fill();
    if (i === months.length - 1 && kk > 0.9) {
      x.strokeStyle = INK;
      x.lineWidth = 1.2;
      x.stroke();
    }
    text(x, ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'][i], 49 + i * 52, base0 + 22, 11, MUTED, 400, true, 0, 'center');
  });
  text(x, 'Every customer keeps paying you while they stay.', 24, 504, 12.5, MUTED);
  rr(x, 24, 528, 312, 78, 20);
  x.fillStyle = INK;
  x.fill();
  text(x, 'Next payout · Nov 15', 44, 562, 17, '#fff', 700);
  text(x, '$1,284.60 to your bank, through Stripe', 44, 585, 13, '#C9C2DC');
  rr(x, 24, 622, 312, 60, 16);
  x.fillStyle = FILL;
  x.fill();
  chip(x, `+${usd(sp.creator)}`, 40, 657, YELLOW, INK, INK);
  text(x, `Jordan bought ${b.name} · just now`, 112, 657, 12.5, TEXT, 600);
  homeBar(x);
};

const hub: Draw = (x, t, b, c) => {
  base(x, ST.hub, '#F6F4F9');
  urlPill(x, `comarket.si/${c.slug}`, 50, '#fff');
  face(x, c, 180, 152, 44);
  font(x, 21, 700);
  text(x, fit(x, c.handle, 280), 180, 226, 21, TEXT, 700, false, 0, 'center');
  text(x, 'Tools I actually use', 180, 248, 14, MUTED, 500, false, 0, 'center');
  // each brand as a list shows it: its mark on a tile of its own page color
  const list: Array<{ n: string; d: string; col: string; r: string; me?: boolean; id?: BrandId }> = [
    { n: b.name, d: b.what, col: b.look ? PAPER : b.color, r: `${b.rate}% · 12 mo`, me: true },
    { n: 'Tallyhawk', d: 'Invoicing for freelancers', col: '#F2EEE7', r: '25% · 12 mo', id: 'tallyhawk' },
    { n: 'Pagewell', d: 'Landing page builder', col: '#F1ECFF', r: '18% · 6 mo', id: 'pagewell' },
    { n: 'Quietly', d: 'Focus app for Mac', col: '#0A2229', r: '30% · 12 mo', id: 'quietly' },
  ];
  const k = clamp01((t - 1.6) / 0.6);
  list.forEach((it, i) => {
    const y = 278 + i * 84;
    const s = i === 0 ? 1 - press(k) : 1;
    x.save();
    x.translate(180, y + 36);
    x.scale(s, s);
    x.translate(-180, -(y + 36));
    rr(x, 18, y, 324, 72, 18);
    x.fillStyle = '#fff';
    x.fill();
    rr(x, 32, y + 14, 44, 44, 12);
    x.fillStyle = it.col;
    x.fill();
    if (it.me) b.look ? drawMark(x, b.look, 41, y + 23, 26) : logo(x, b, 32, y + 14, 44);
    else if (it.id) drawMark(x, it.id, 41, y + 23, 26);
    textFit(x, it.n, 90, y + 33, 140, 16, TEXT, 700);
    textFit(x, it.d, 90, y + 53, 140, 12.5, MUTED);
    chipRight(x, it.r, 328, y + 41, FILL, '#3B3746');
    x.restore();
  });
  rr(x, 18, 620, 324, 52, 26);
  x.strokeStyle = TEXT;
  x.lineWidth = 1.5;
  x.stroke();
  text(x, 'Read my newsletter', 180, 652, 15, TEXT, 700, false, 0, 'center');
  text(x, 'ONE LINK · EVERY BRAND YOU WORK WITH', 180, 712, 10, '#A8A3B2', 400, true, 1, 'center');
  homeBar(x);
  tap(x, ...(TAPS.hub as [number, number]), k);
};

export const DRAW: Record<Shot, Draw> = {
  post,
  store,
  checkout: checkout('jordan@acme.io', ST.checkout),
  'checkout-returning': checkout('m.alvarez@outlook.com', ST['checkout-returning']),
  verify,
  refused,
  sale,
  brand: brandView,
  creator: creatorView,
  hub,
};

/** Paint a screen, optionally sliding in over the previous one. */
export function paint(ctx: Ctx, id: Shot, t: number, b: BrandSkin, c: CreatorSkin, prev?: { id: Shot; t: number }, k = 1, dir: 1 | -1 = 1) {
  ctx.setTransform(S, 0, 0, S, 0, 0);
  ctx.clearRect(0, 0, 360, DH);
  if (prev && k < 1) {
    const e = ease(k);
    ctx.save();
    ctx.translate(-70 * e * dir, 0);
    DRAW[prev.id](ctx, prev.t, b, c);
    ctx.fillStyle = `rgba(23,20,31,${0.18 * e})`;
    ctx.fillRect(0, 0, 360, DH);
    ctx.restore();
    ctx.save();
    ctx.translate(360 * (1 - e) * dir, 0);
    ctx.shadowColor = 'rgba(30,14,63,0.25)';
    ctx.shadowBlur = 40;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 360, DH);
    ctx.shadowBlur = 0;
    DRAW[id](ctx, t, b, c);
    ctx.restore();
  } else {
    DRAW[id](ctx, t, b, c);
  }
}

/* the drawing kit, shared with the larger devices' screens (browser.ts) */
export { rr, text, textFit, wrap, chip, chipRight, check, ava, face, logo, drawMark, split, usd, money, ease, clamp01, font, fit, statusBar };
export const COLORS = { INK, TEXT, MUTED, LINE, FILL, YELLOW, BLUE, CREAM, GHOST };
