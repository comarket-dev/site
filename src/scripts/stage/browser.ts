/**
 * What the fork's device shows: the same three screens as the phone (the sale, and what it means to each side), laid
 * out for a wider screen, inside the browser chrome the visitor's own device would have. When they pick a side the
 * address bar types the new address, a load bar runs, and the page area clears to show the real next page beneath it
 * (see stage.ts). Everything is drawn in the visitor's CSS pixels.
 */
import { check, chip, face, clamp01, COLORS, ease, logo, money, rr, split, text, textFit, usd, type BrandSkin, type Ctx, type CreatorSkin, type Shot } from './screens';
import type { DeviceKind } from './devices';

const { INK, TEXT, MUTED, FILL, YELLOW, BLUE, CREAM } = COLORS;

export interface Nav {
  url: string;
  title: string;
  /** 0..1, how much of the new address has been typed */
  typing: number;
  /** 0..1, the load bar; null when nothing is loading */
  progress: number | null;
  /** 0..1, how far the page area has cleared to show the next page */
  reveal: number;
}

export interface Screen {
  kind: DeviceKind;
  css: { w: number; h: number; top: number; bottom: number; side: number };
}

/** The address a screen would be at, and its tab title. */
export function where(shot: Shot, b: BrandSkin, c: CreatorSkin): { url: string; title: string } {
  if (shot === 'brand') return { url: `app.comarket.si/${b.host}`, title: `${b.name} · Comarket` };
  if (shot === 'creator') return { url: `app.comarket.si/${c.slug}/payouts`, title: `${c.first}’s payouts · Comarket` };
  return { url: `${b.domain}/checkout/complete`, title: `Thanks for your order · ${b.name}` };
}

/* ------------------------------------------------------------------ chrome */

function lock(x: Ctx, X: number, Y: number, s: number, col: string) {
  x.strokeStyle = col;
  x.fillStyle = col;
  x.lineWidth = s * 0.16;
  x.beginPath();
  x.arc(X + s / 2, Y + s * 0.42, s * 0.26, Math.PI, 0);
  x.stroke();
  rr(x, X + s * 0.12, Y + s * 0.42, s * 0.76, s * 0.56, s * 0.12);
  x.fill();
}

function urlText(nav: Nav | null, url: string): string {
  if (!nav || nav.typing <= 0) return url;
  if (nav.typing >= 1) return nav.url;
  return nav.url.slice(0, Math.max(1, Math.ceil(nav.url.length * nav.typing)));
}

function loadBar(x: Ctx, X: number, Y: number, w: number, p: number | null) {
  if (p === null) return;
  x.globalAlpha = p >= 1 ? 0 : 1;
  rr(x, X, Y, Math.max(4, w * p), 3, 1.5);
  x.fillStyle = BLUE;
  x.fill();
  x.globalAlpha = 1;
}

function desktopChrome(x: Ctx, w: number, top: number, url: string, title: string, nav: Nav | null) {
  // tab strip
  x.fillStyle = '#E4E2E9';
  x.fillRect(0, 0, w, 38);
  ['#FF5F57', '#FEBC2E', '#28C840'].forEach((col, i) => {
    x.beginPath();
    x.arc(20 + i * 20, 19, 6, 0, Math.PI * 2);
    x.fillStyle = col;
    x.fill();
  });
  const tabW = Math.min(250, w * 0.24);
  rr(x, 88, 7, tabW, 31, [9, 9, 0, 0]);
  x.fillStyle = '#F7F6F9';
  x.fill();
  // the tab's icon is a spinner while the page loads, as in a real browser
  const loading = nav && nav.progress !== null && nav.progress < 1;
  if (loading) {
    x.strokeStyle = BLUE;
    x.lineWidth = 2;
    x.lineCap = 'round';
    const a0 = (performance.now() / 1000) * Math.PI * 2.4;
    x.beginPath();
    x.arc(107, 23, 5.5, a0, a0 + Math.PI * 1.4);
    x.stroke();
  } else {
    rr(x, 100, 16, 14, 14, 4);
    x.fillStyle = BLUE;
    x.fill();
  }
  textFit(x, nav && nav.typing >= 1 ? nav.title : title, 122, 27.5, tabW - 44, 12.5, TEXT, 500);
  text(x, '+', 88 + tabW + 16, 28, 17, MUTED, 400);
  // toolbar
  x.fillStyle = '#F7F6F9';
  x.fillRect(0, 38, w, top - 38);
  x.strokeStyle = '#6E6A78';
  x.lineWidth = 1.6;
  x.lineCap = 'round';
  x.lineJoin = 'round';
  x.beginPath();
  x.moveTo(26, 55);
  x.lineTo(20, 61);
  x.lineTo(26, 67);
  x.moveTo(50, 55);
  x.lineTo(56, 61);
  x.lineTo(50, 67);
  x.stroke();
  x.beginPath();
  x.arc(82, 61, 6, -0.4, Math.PI * 1.6);
  x.stroke();
  const fx = 108;
  const fw = w - fx - 64;
  rr(x, fx, 46, fw, 30, 15);
  x.fillStyle = '#EAE8EE';
  x.fill();
  lock(x, fx + 14, 54, 12, '#6E6A78');
  textFit(x, urlText(nav, url), fx + 34, 66, fw - 50, 13.5, TEXT, 400);
  x.beginPath();
  x.arc(w - 32, 61, 11, 0, Math.PI * 2);
  x.fillStyle = CREAM;
  x.fill();
  x.fillStyle = '#E1DEE6';
  x.fillRect(0, top - 1, w, 1);
  loadBar(x, 0, top - 3, w, nav?.progress ?? null);
}

function tabletChrome(x: Ctx, w: number, top: number, url: string, nav: Nav | null) {
  x.fillStyle = '#F6F5F8';
  x.fillRect(0, 0, w, top);
  text(x, '10:24', 22, 17, 13, TEXT, 700);
  rr(x, w - 42, 8, 24, 11, 3.5);
  x.strokeStyle = TEXT;
  x.lineWidth = 1.2;
  x.stroke();
  rr(x, w - 40.5, 9.5, 15, 8, 2);
  x.fillStyle = TEXT;
  x.fill();
  const pw = Math.min(560, w * 0.56);
  const px = (w - pw) / 2;
  rr(x, px, 31, pw, 34, 10);
  x.fillStyle = '#E8E6EE';
  x.fill();
  const shown = urlText(nav, url);
  x.font = '400 14px Satoshi, ui-sans-serif, sans-serif';
  const tw = Math.min(pw - 48, x.measureText(shown).width);
  lock(x, w / 2 - tw / 2 - 18, 41, 12, '#6E6A78');
  textFit(x, shown, w / 2 - tw / 2, 52.5, pw - 48, 14, TEXT, 400);
  x.strokeStyle = BLUE;
  x.lineWidth = 1.7;
  x.lineCap = 'round';
  x.beginPath();
  x.moveTo(30, 42);
  x.lineTo(24, 48);
  x.lineTo(30, 54);
  x.stroke();
  rr(x, w - 46, 40, 16, 16, 4);
  x.stroke();
  x.fillStyle = '#E1DEE6';
  x.fillRect(0, top - 1, w, 1);
  loadBar(x, 0, top - 3, w, nav?.progress ?? null);
}

function phoneChrome(x: Ctx, w: number, h: number, top: number, bottom: number, url: string, nav: Nav | null) {
  if (top > 0) {
    x.fillStyle = '#fff';
    x.fillRect(0, 0, w, top);
    text(x, '9:58', 30, Math.min(top - 14, 33), 15, TEXT, 700);
    rr(x, w - 50, Math.min(top - 26, 21), 25, 12, 4);
    x.strokeStyle = TEXT;
    x.lineWidth = 1.2;
    x.stroke();
    rr(x, w - 48, Math.min(top - 24, 23), 17, 8, 2);
    x.fillStyle = TEXT;
    x.fill();
  }
  if (bottom > 0) {
    const y = h - bottom;
    x.fillStyle = '#F4F3F7';
    x.fillRect(0, y, w, bottom);
    x.fillStyle = '#E1DEE6';
    x.fillRect(0, y, w, 1);
    rr(x, 12, y + 8, w - 24, 42, 13);
    x.fillStyle = '#fff';
    x.fill();
    const shown = urlText(nav, url);
    x.font = '400 15px Satoshi, ui-sans-serif, sans-serif';
    const tw = Math.min(w - 90, x.measureText(shown).width);
    lock(x, w / 2 - tw / 2 - 18, y + 22, 12, '#6E6A78');
    textFit(x, shown, w / 2 - tw / 2, y + 34, w - 90, 15, TEXT, 400);
    loadBar(x, 12, y + 47, w - 24, nav?.progress ?? null);
    if (bottom > 90) {
      rr(x, w / 2 - 67, h - 13, 134, 5, 2.5);
      x.fillStyle = TEXT;
      x.fill();
    }
  }
}

/* ------------------------------------------------------------------ the page area */

type Box = { W: number; H: number; wide: boolean };

function header(x: Ctx, bx: Box, title: string, mark: (X: number, Y: number) => void) {
  mark(48, 34);
  textFit(x, title, 96, 64, bx.W * 0.6, 24, TEXT, 700);
  chip(x, 'EXAMPLE', bx.W - 48 - 96, 60, '#fff', MUTED, '#D8D4E0', 12);
}

function saleScene(x: Ctx, bx: Box, t: number, b: BrandSkin, c: CreatorSkin) {
  header(x, bx, `${b.name} × ${c.name}`, (X, Y) => logo(x, b, X, Y, 36));
  const sp = split(b);
  const parts = [
    { v: sp.keep, col: b.color, who: `${b.name} keeps` },
    { v: sp.creator, col: CREAM, who: `${c.first} earns` },
    { v: sp.us, col: BLUE, who: 'Comarket' },
  ];
  const L = bx.wide ? 48 : bx.W / 2;
  const align: CanvasTextAlign = bx.wide ? 'left' : 'center';
  const cx = bx.wide ? 48 + 62 : bx.W / 2;
  check(x, cx, 190, 62, clamp01(t / 0.9));
  text(x, 'Sale complete', L, 316, 46, TEXT, 700, false, -1.6, align);
  text(x, `Jordan bought through ${c.first}’s storefront.`, L, 356, 20, MUTED, 500, false, 0, align);
  text(x, usd(b.amount), L, 470, 104, TEXT, 700, false, -4.5, align);
  const R = bx.wide ? bx.W * 0.53 : 48;
  const RW = bx.wide ? bx.W - R - 48 : bx.W - 96;
  const top = bx.wide ? 150 : 540;
  text(x, `WHERE THE ${money(b.amount)} GOES`, R, top, 13, MUTED, 400, true, 1.6);
  const kk = ease(t / 1.2);
  let xx = R;
  parts.forEach((p, i) => {
    const w = (p.v / b.amount) * RW * kk;
    rr(x, xx, top + 22, Math.max(0, w - (i < 2 ? 4 : 0)), 30, 8);
    x.fillStyle = p.col;
    x.fill();
    xx += w;
  });
  parts.forEach((p, i) => {
    const y = top + 104 + i * 48;
    x.globalAlpha = ease((t - 0.6 - i * 0.15) / 0.4);
    rr(x, R, y - 17, 18, 18, 5);
    x.fillStyle = p.col;
    x.fill();
    text(x, p.who, R + 32, y, 20, TEXT, 600);
    text(x, usd(p.v), R + RW, y, 20, TEXT, 400, true, 0, 'right');
    x.globalAlpha = 1;
  });
  const cardY = top + 262;
  rr(x, R, cardY, RW, 78, 20);
  x.fillStyle = FILL;
  x.fill();
  text(x, `Sales through ${c.first} this month`, R + 24, cardY + 47, 19, TEXT, 600);
  text(x, '131', R + RW - 24, cardY + 48, 26, TEXT, 700, false, -0.6, 'right');
  text(x, 'Nobody paid anything before this sale.', R, cardY + 130, 20, TEXT, 700);
}

function brandScene(x: Ctx, bx: Box, t: number, b: BrandSkin) {
  header(x, bx, `${b.name} · Creator sales`, (X, Y) => logo(x, b, X, Y, 36));
  const sp = split(b);
  const k = ease(t / 0.5);
  const L = 48;
  const LW = bx.wide ? bx.W * 0.47 - 48 : bx.W - 96;
  text(x, 'TODAY', L, 140, 13, MUTED, 400, true, 1.6);
  x.globalAlpha = k;
  text(x, '+3', L - 4, 250, 118, TEXT, 700, false, -6);
  text(x, 'sales', L + 156, 204, 30, TEXT, 700);
  textFit(x, `${money(b.amount * 3)}/mo in new revenue`, L + 156, 240, LW - 160, 20, MUTED);
  x.globalAlpha = 1;
  const items = [
    { e: 'jordan@acme.io', s: 'SALE', v: `fee ${usd(sp.fee)}`, on: true },
    { e: 'priya@lumen.co', s: 'SALE', v: `fee ${usd(sp.fee)}`, on: true },
    { e: 'a•••@proton.me', s: 'CLICKED, NO SALE', v: '$0', on: false },
  ];
  items.forEach((it, i) => {
    x.globalAlpha = ease((t - 0.3 - i * 0.16) / 0.35);
    const y = 290 + i * 88;
    rr(x, L, y, LW, 76, 20);
    x.fillStyle = it.on ? '#FFFBD6' : FILL;
    x.fill();
    if (it.on) {
      x.strokeStyle = INK;
      x.lineWidth = 1.4;
      x.stroke();
    }
    text(x, it.e, L + 24, y + 33, 19, it.on ? TEXT : '#8A8496', 600);
    chip(x, it.s, L + 24, y + 60, it.on ? YELLOW : '#fff', it.on ? INK : '#8A8496', it.on ? INK : '#CFCBD8', 11.5);
    text(x, it.v, L + LW - 24, y + 47, 19, it.on ? TEXT : '#8A8496', 400, true, 0, 'right');
    x.globalAlpha = 1;
  });
  const R = bx.wide ? bx.W * 0.53 : 48;
  const RW = bx.wide ? bx.W - R - 48 : bx.W - 96;
  const top = bx.wide ? 120 : 568;
  rr(x, R, top, RW, 250, 26);
  x.fillStyle = INK;
  x.fill();
  text(x, 'FROM CREATORS · 90 DAYS', R + 32, top + 52, 13, '#B9B1CF', 400, true, 1.6);
  text(x, '212 sales', R + 32, top + 116, 54, '#fff', 700, false, -1.8);
  text(x, `$${(b.amount * 212).toLocaleString('en-US')}/mo in new revenue`, R + 32, top + 158, 20, '#C9C2DC');
  text(x, '$0 before any of them', R + 32, top + 204, 22, YELLOW, 700);
  rr(x, R, top + 276, RW, 78, 20);
  x.fillStyle = FILL;
  x.fill();
  text(x, 'Cost per sale, after it lands', R + 24, top + 322, 19, TEXT, 600);
  text(x, usd(sp.fee), R + RW - 24, top + 322, 20, TEXT, 400, true, 0, 'right');
}

function creatorScene(x: Ctx, bx: Box, t: number, b: BrandSkin, c: CreatorSkin) {
  header(x, bx, `${c.name} · Payouts`, (X, Y) => face(x, c, X + 18, Y + 18, 18));
  const sp = split(b);
  const k = ease(t / 0.5);
  const L = 48;
  const LW = bx.wide ? bx.W * 0.47 - 48 : bx.W - 96;
  text(x, 'THIS MONTH', L, 140, 13, MUTED, 400, true, 1.6);
  x.globalAlpha = k;
  text(x, `+$${(1284.6 * k).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, L - 3, 232, 86, TEXT, 700, false, -4);
  text(x, '4 brands · 131 paying customers', L, 272, 20, MUTED);
  x.globalAlpha = 1;
  const months = [212.4, 398.2, 561.7, 790.3, 1032.9, 1284.6];
  const base0 = 530;
  const bw = (LW - 5 * 18) / 6;
  months.forEach((v, i) => {
    const kk = ease((t - 0.3 - i * 0.1) / 0.35);
    const h = (v / months[5]) * 200 * kk;
    rr(x, L + i * (bw + 18), base0 - h, bw, Math.max(2, h), 14);
    x.fillStyle = i === months.length - 1 ? YELLOW : '#E7E3EF';
    x.fill();
    if (i === months.length - 1 && kk > 0.9) {
      x.strokeStyle = INK;
      x.lineWidth = 1.4;
      x.stroke();
    }
    text(x, ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'][i], L + i * (bw + 18) + bw / 2, base0 + 30, 14, MUTED, 400, true, 0, 'center');
  });
  text(x, 'Every customer keeps paying you while they stay.', L, base0 + 72, 17, MUTED);
  const R = bx.wide ? bx.W * 0.53 : 48;
  const RW = bx.wide ? bx.W - R - 48 : bx.W - 96;
  const top = bx.wide ? 120 : 660;
  rr(x, R, top, RW, 128, 26);
  x.fillStyle = INK;
  x.fill();
  text(x, 'Next payout · Nov 15', R + 32, top + 56, 28, '#fff', 700, false, -0.6);
  text(x, '$1,284.60 to your bank, through Stripe', R + 32, top + 92, 18, '#C9C2DC');
  rr(x, R, top + 152, RW, 76, 20);
  x.fillStyle = FILL;
  x.fill();
  chip(x, `+${usd(sp.creator)}`, R + 22, top + 197, YELLOW, INK, INK, 12);
  textFit(x, `Jordan bought ${b.name} · just now`, R + 112, top + 197, RW - 130, 17, TEXT, 600);
  if (bx.wide) {
    text(x, 'BRANDS ON YOUR PAGE', R, top + 290, 13, MUTED, 400, true, 1.6);
    [
      { n: b.name, col: b.color, r: `${b.rate}% · 12 mo` },
      { n: 'Tallyhawk', col: '#E4572E', r: '25% · 12 mo' },
      { n: 'Pagewell', col: '#7A3EF0', r: '18% · 6 mo' },
    ].forEach((it, i) => {
      const y = top + 314 + i * 64;
      rr(x, R, y, 40, 40, 11);
      x.fillStyle = it.col;
      x.fill();
      text(x, it.n, R + 56, y + 27, 19, TEXT, 700);
      text(x, it.r, R + RW, y + 27, 16, MUTED, 400, true, 0, 'right');
    });
  }
}

const SCENES: Partial<Record<Shot, (x: Ctx, bx: Box, t: number, b: BrandSkin, c: CreatorSkin) => void>> = {
  sale: saleScene,
  brand: (x, bx, t, b) => brandScene(x, bx, t, b),
  creator: creatorScene,
};

/** Lay one screen into the page area: a 1000-wide two-column board on wide screens, a 600-wide column on tall ones. */
function scene(x: Ctx, shot: Shot, t: number, b: BrandSkin, c: CreatorSkin, X: number, Y: number, w: number, h: number) {
  const wide = w / h > 1.15;
  const D = wide ? { W: 1000, H: 640 } : { W: 600, H: 980 };
  const u = Math.min(w / D.W, h / D.H);
  x.save();
  x.beginPath();
  x.rect(X, Y, w, h);
  x.clip();
  x.fillStyle = '#FFFDF8';
  x.fillRect(X, Y, w, h);
  x.translate(X + (w - D.W * u) / 2, Y + (h - D.H * u) / 2);
  x.scale(u, u);
  (SCENES[shot] ?? saleScene)(x, { ...D, wide }, t, b, c);
  x.restore();
}

/**
 * Paint a device's screen at canvas scale `px` (canvas pixels per CSS pixel). `app` is the phone's own screen
 * (its 720-wide canvas), used for the phone, whose demo is the phone app rather than a web page.
 */
export function paintScreen(
  x: Ctx,
  s: Screen,
  px: number,
  shot: Shot,
  t: number,
  b: BrandSkin,
  c: CreatorSkin,
  nav: Nav | null,
  opts: { prev?: { id: Shot; t: number }; slide?: number; dir?: 1 | -1; app?: HTMLCanvasElement } = {},
) {
  const { w, h, top, bottom, side } = s.css;
  const area = { X: side, Y: top, w: w - side * 2, h: h - top - bottom };
  x.setTransform(px, 0, 0, px, 0, 0);
  x.clearRect(0, 0, w, h);
  const reveal = nav?.reveal ?? 0;
  const here = where(shot, b, c);

  // the page area: the demo, fading away to let the next page show through once it's loaded
  if (reveal < 1) {
    x.save();
    x.globalAlpha = 1 - reveal;
    if (s.kind === 'phone' && opts.app) {
      // the phone's demo is its own app screen, full width between the browser's bars, from just below its status bar
      const a = opts.app;
      const crop = a.width * (50 / 360);
      x.save();
      x.beginPath();
      x.rect(0, top, w, h - top - bottom);
      x.clip();
      x.fillStyle = '#fff';
      x.fillRect(0, top, w, h - top - bottom);
      x.drawImage(a, 0, crop, a.width, a.height - crop, 0, top, w, w * ((a.height - crop) / a.width));
      x.restore();
    } else {
      const k = opts.slide ?? 1;
      if (opts.prev && k < 1) {
        const e = ease(k);
        const dir = opts.dir ?? 1;
        x.save();
        x.translate(-area.w * 0.2 * e * dir, 0);
        scene(x, opts.prev.id, opts.prev.t, b, c, area.X, area.Y, area.w, area.h);
        x.restore();
        x.save();
        x.beginPath();
        x.rect(area.X, area.Y, area.w, area.h);
        x.clip();
        x.translate(area.w * (1 - e) * dir, 0);
        x.shadowColor = 'rgba(30,14,63,0.25)';
        x.shadowBlur = 40;
        scene(x, shot, t, b, c, area.X, area.Y, area.w, area.h);
        x.restore();
      } else scene(x, shot, t, b, c, area.X, area.Y, area.w, area.h);
    }
    x.restore();
  }

  // the chrome around it
  if (s.kind === 'laptop' || s.kind === 'monitor') desktopChrome(x, w, top, here.url, here.title, nav);
  else if (s.kind === 'tablet') tabletChrome(x, w, top, here.url, nav);
  else phoneChrome(x, w, h, top, bottom, here.url, nav);
}

