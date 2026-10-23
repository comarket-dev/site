/**
 * The phone's screen, drawn to a canvas: one example sale from a creator's post, through the storefront and the
 * brand's own checkout, to the moment it completes, which is the only moment anyone pays anything.
 * Every brand and creator here is fictional. Layout is in a 360 x 792 design space.
 */

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
}
export interface CreatorSkin {
  name: string;
  first: string;
  handle: string;
  slug: string;
  tone: string;
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
  product: 'Fernwood Growth',
  what: 'See where trials stall',
  amount: 49,
  rate: 20,
  cut: 15,
};
export const DEFAULT_CREATOR: CreatorSkin = { name: 'Sarah K.', first: 'Sarah', handle: '@sarah.builds', slug: 'sarah', tone: '#F6C9A8' };

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
function logo(x: Ctx, b: BrandSkin, X: number, Y: number, size: number, onColor = false) {
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
  if (b.name !== DEFAULT_BRAND.name) {
    text(x, b.name.charAt(0).toUpperCase(), X + size / 2, Y + size * 0.7, size * 0.6, onColor ? b.color : b.ink, 700, false, 0, 'center');
    return;
  }
  x.strokeStyle = onColor ? b.color : b.ink;
  x.lineWidth = size * 0.09;
  x.lineCap = 'round';
  x.lineJoin = 'round';
  x.beginPath();
  x.moveTo(X + size * 0.24, Y + size * 0.78);
  x.bezierCurveTo(X + size * 0.24, Y + size * 0.42, X + size * 0.44, Y + size * 0.24, X + size * 0.78, Y + size * 0.22);
  x.bezierCurveTo(X + size * 0.76, Y + size * 0.58, X + size * 0.56, Y + size * 0.78, X + size * 0.24, Y + size * 0.78);
  x.moveTo(X + size * 0.24, Y + size * 0.78);
  x.lineTo(X + size * 0.54, Y + size * 0.48);
  x.stroke();
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
  post: [250, 612],
  store: [200, 668],
  checkout: [212, 621],
  'checkout-returning': [212, 621],
  hub: [200, 330],
};

function base(x: Ctx, st: Status, bg = '#fff') {
  x.fillStyle = bg;
  x.fillRect(0, 0, 360, DH);
  statusBar(x, st);
}

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
  text(x, 'NEWSLETTER · 8.2K READERS', 24, 116, 10.5, MUTED, 400, true, 1);
  ava(x, 44, 154, 20, c.tone, c.first[0]);
  text(x, c.name, 74, 150, 17, TEXT, 700);
  text(x, 'Trial to Paid · every Tuesday', 74, 170, 13, MUTED);
  wrap(x, 'The tool that fixed my trial-to-paid', 24, 230, 312, 34, 36, TEXT, 700, -1.3);
  bars(x, 316, [312, 290, 306, 220]);
  wrap(x, 'I tried four. This is the one I kept, and my readers get setup free.', 24, 418, 312, 17, 24, '#3B3746', 600, -0.2);
  const y = 492;
  const k = clamp01((t - 1.5) / 0.6);
  const s = 1 - press(k);
  x.save();
  x.translate(180, y + 70);
  x.scale(s, s);
  x.translate(-180, -(y + 70));
  rr(x, 24, y, 312, 140, 18);
  x.fillStyle = '#fff';
  x.fill();
  x.strokeStyle = LINE;
  x.lineWidth = 1.5;
  x.stroke();
  x.save();
  rr(x, 24, y, 312, 56, [18, 18, 0, 0]);
  x.clip();
  x.fillStyle = b.color;
  x.fillRect(24, y, 312, 56);
  x.restore();
  logo(x, b, 40, y + 12, 32, true);
  textFit(x, `${b.name.toUpperCase()} × ${c.name.toUpperCase()}`, 84, y + 33, 236, 11, b.ink, 400, true);
  textFit(x, `${c.first}’s pick: ${b.product}`, 40, y + 86, 280, 17, TEXT, 700);
  textFit(x, `${b.host}.comarket.si/creators/${c.slug}`, 40, y + 107, 280, 11.5, MUTED, 400, true);
  text(x, 'Open storefront →', 40, y + 128, 14, b.color, 700);
  x.restore();
  bars(x, 664, [312, 300, 180]);
  homeBar(x);
  tap(x, ...(TAPS.post as [number, number]), k);
};

const store: Draw = (x, t, b, c) => {
  base(x, ST.store);
  urlPill(x, `${b.host}.comarket.si/creators/${c.slug}`);
  logo(x, b, 24, 104, 34);
  textFit(x, `${b.name.toUpperCase()} × ${c.name.toUpperCase()}`, 68, 126, 268, 11, b.color, 400, true);
  ava(x, 46, 182, 22, c.tone, c.first[0]);
  text(x, c.handle, 78, 178, 16, TEXT, 700);
  text(x, 'Picked for her readers', 78, 197, 13, MUTED);
  wrap(x, `${c.first}’s trial-to-paid kit`, 24, 258, 312, 38, 38, TEXT, 700, -1.6);
  rr(x, 24, 330, 3, 46, 1.5);
  x.fillStyle = b.color;
  x.fill();
  wrap(x, '“The first tool I open when a trial goes quiet.”', 38, 348, 290, 16, 22, '#3B3746', 500, -0.1);
  const y = 400;
  rr(x, 24, y, 312, 164, 20);
  x.fillStyle = b.color;
  x.fill();
  x.save();
  rr(x, 24, y, 312, 164, 20);
  x.clip();
  x.globalAlpha = 0.14;
  x.strokeStyle = b.ink;
  x.lineWidth = 1.2;
  for (let i = 0; i < 6; i++) {
    x.beginPath();
    x.arc(300, y + 150, 40 + i * 34, 0, Math.PI * 2);
    x.stroke();
  }
  x.restore();
  logo(x, b, 44, y + 24, 46, true);
  textFit(x, b.product, 44, y + 110, 270, 22, b.ink, 700);
  textFit(x, `${b.what} · ${money(b.amount)}/mo`, 44, y + 136, 270, 14, b.ink, 500);
  rr(x, 24, y + 180, 312, 48, 14);
  x.fillStyle = FILL;
  x.fill();
  text(x, '★', 42, y + 210, 15, b.color, 700);
  textFit(x, `Free setup call with ${c.first}’s link`, 62, y + 210, 264, 15, TEXT, 700);
  const k = clamp01((t - 1.6) / 0.6);
  const s = 1 - press(k);
  x.save();
  x.translate(180, y + 268);
  x.scale(s, s);
  x.translate(-180, -(y + 268));
  button(x, `Get ${b.name}`, y + 240, b.color, b.ink);
  x.restore();
  // the disclosure rides on every storefront, so creators are covered and buyers know
  text(x, `${c.first} earns a commission if you buy`, 180, y + 330, 12, MUTED, 500, false, 0, 'center');
  text(x, 'STOREFRONT BY COMARKET', 180, y + 350, 9.5, '#A8A3B2', 400, true, 1, 'center');
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

const checkout =
  (email: string, st: Status): Draw =>
  (x, t, b, c) => {
    base(x, st);
    urlPill(x, `${b.domain}/checkout`);
    logo(x, b, 24, 104, 32);
    text(x, b.name, 66, 127, 19, TEXT, 700);
    wrap(x, `Get ${b.product}`, 24, 192, 312, 30, 32, TEXT, 700, -1.1);
    const typed = email.slice(0, Math.round(clamp01(t / 1.1) * email.length));
    field(x, 'Work email', typed, 226, t < 1.25, t < 1.25 && Math.floor(t * 3) % 2 === 0);
    field(x, 'Card', '4242  4242  4242  4242', 314);
    rr(x, 24, 406, 312, 74, 16);
    x.fillStyle = FILL;
    x.fill();
    textFit(x, b.product, 42, 436, 200, 16, TEXT, 700);
    text(x, `${money(b.amount)}/mo`, 318, 436, 16, TEXT, 400, true, 0, 'right');
    text(x, 'Billed monthly · cancel anytime', 42, 459, 13, MUTED);
    // the creator's credit rides along to the brand's own checkout
    rr(x, 24, 498, 312, 52, 16);
    x.strokeStyle = BLUE;
    x.lineWidth = 1.6;
    x.stroke();
    ava(x, 48, 524, 12, c.tone, c.first[0]);
    textFit(x, `Sent by ${c.name} · credit saved`, 70, 529, 250, 14, BLUE, 700);
    const k = clamp01((t - 1.6) / 0.6);
    const s = 1 - press(k);
    x.save();
    x.translate(180, 621);
    x.scale(s, s);
    x.translate(-180, -621);
    button(x, `Pay ${money(b.amount)}`, 592, b.color, b.ink);
    x.restore();
    font(x, 11.5, 500);
    text(x, fit(x, `Checkout on ${b.domain} · payments by Stripe`, 300), 180, 682, 11.5, '#A8A3B2', 500, false, 0, 'center');
    homeBar(x);
    tap(x, ...(TAPS.checkout as [number, number]), k);
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

const verify: Draw = (x, t, b, c) => {
  base(x, ST.verify);
  behind(x);
  wrap(x, 'Did the sale go through?', 24, 142, 312, 30, 32, TEXT, 700, -1);
  checkRow(x, 'Payment', `Stripe · ${usd(b.amount)}`, 'PAID', 198, clamp01((t - 0.2) / 0.35));
  checkRow(x, 'New customer', 'Email, phone and card', 'YES', 270, clamp01((t - 0.45) / 0.35));
  checkRow(x, 'Sent by', `${c.first}’s storefront`, c.name.toUpperCase(), 342, clamp01((t - 0.7) / 0.35));
  // the receipt: the moment money moves, and the only moment anyone pays
  const k = clamp01((t - 1.4) / 0.5);
  check(x, 180, 462, 34, k);
  x.globalAlpha = ease((t - 1.5) / 0.4);
  text(x, usd(b.amount * ease((t - 1.5) / 0.5)), 180, 554, 46, TEXT, 700, false, -2, 'center');
  text(x, `Payment received · ${ST.verify.time} AM`, 180, 584, 13, MUTED, 500, false, 0, 'center');
  x.globalAlpha = 1;
  const sp = split(b);
  verdict(x, `Now ${b.name} pays its share`, `${c.first} ${usd(sp.creator)} · Comarket ${usd(sp.us)}`, (t - 1.75) / 0.45, true);
  homeBar(x);
};

const refused: Draw = (x, t, b) => {
  base(x, ST.refused);
  behind(x);
  wrap(x, 'Did the sale go through?', 24, 142, 312, 30, 32, TEXT, 700, -1);
  checkRow(x, 'Payment', `Stripe · ${usd(b.amount)}`, 'PAID', 198, clamp01((t - 0.2) / 0.35));
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
  ava(x, 40, 71, 16, c.tone, c.first[0]);
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
  ava(x, 180, 152, 44, c.tone, c.first[0]);
  font(x, 21, 700);
  text(x, fit(x, c.handle, 280), 180, 226, 21, TEXT, 700, false, 0, 'center');
  text(x, 'Tools I actually use', 180, 248, 14, MUTED, 500, false, 0, 'center');
  const list = [
    { n: b.name, d: b.what, col: b.color, r: `${b.rate}% · 12 mo`, me: true },
    { n: 'Tallyhawk', d: 'Freelance invoicing', col: '#E4572E', r: '25% · 12 mo' },
    { n: 'Pagewell', d: 'Landing pages, fast', col: '#7A3EF0', r: '18% · 6 mo' },
    { n: 'Quietly', d: 'Focus timer', col: '#0F4C5C', r: '30% · 12 mo' },
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
    if (it.me) logo(x, b, 32, y + 14, 44);
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
export { rr, text, textFit, wrap, chip, chipRight, check, ava, logo, split, usd, money, ease, clamp01, font, fit, statusBar };
export const COLORS = { INK, TEXT, MUTED, LINE, FILL, YELLOW, BLUE, CREAM, GHOST };
