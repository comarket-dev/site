/* A brand's palette from its own logo, so the storefront we draw for a visitor's site is in its colours, not ours.
   The icon comes through /api/icon (same origin), so the canvas can read it. */

export interface Palette {
  /** the logo's main colour: the most used saturated colour, or its darkest if it has none */
  primary: string;
  /** a second colour from the logo that differs clearly in hue, or the primary shifted if there isn't one */
  accent: string;
  /** text: the logo's darkest colour, or the primary taken down near black */
  ink: string;
  /** the page: a pale tint of the primary */
  paper: string;
  /** what reads on the primary: near white or the ink */
  onPrimary: string;
}

type RGB = [number, number, number];
const hex = ([r, g, b]: RGB) => `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;
export const lum = ([r, g, b]: RGB) => {
  const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contrast = (a: RGB, b: RGB) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
function hsl([r, g, b]: RGB): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const parse = (h: string): RGB => {
  const n = parseInt(h.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** Buckets the logo's opaque pixels by colour and reads its palette. `hint` is the site's theme colour, if any. */
export function paletteFrom(img: HTMLImageElement, hint?: string | null): Palette | null {
  const S = 48;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const x = c.getContext('2d', { willReadFrequently: true });
  if (!x) return null;
  try {
    x.drawImage(img, 0, 0, S, S);
  } catch {
    return null;
  }
  let data: Uint8ClampedArray;
  try {
    data = x.getImageData(0, 0, S, S).data;
  } catch {
    return null; // a tainted canvas: no palette, the theme colour stands
  }
  const buckets = new Map<number, { n: number; sum: RGB }>();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue;
    const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
    const e = buckets.get(key) ?? { n: 0, sum: [0, 0, 0] };
    e.n++;
    e.sum[0] += data[i];
    e.sum[1] += data[i + 1];
    e.sum[2] += data[i + 2];
    buckets.set(key, e);
  }
  const colours = [...buckets.values()]
    .map((e) => ({ n: e.n, rgb: e.sum.map((v) => v / e.n) as RGB }))
    .map((e) => ({ ...e, hsl: hsl(e.rgb) }))
    .sort((a, b) => b.n - a.n);
  if (!colours.length) return null;
  const total = colours.reduce((a, e) => a + e.n, 0);
  // brand colours: saturated, neither near white nor near black, and not a speck
  const brandy = colours.filter((e) => e.hsl[1] > 0.28 && e.hsl[2] > 0.12 && e.hsl[2] < 0.88 && e.n / total > 0.015);
  const score = (e: (typeof colours)[number]) => e.n * (0.4 + e.hsl[1]);
  brandy.sort((a, b) => score(b) - score(a));
  const darkest = [...colours].filter((e) => e.n / total > 0.01).sort((a, b) => lum(a.rgb) - lum(b.rgb))[0];

  let primary: RGB | null = brandy[0]?.rgb ?? null;
  if (!primary && hint && /^#[0-9a-f]{6}$/i.test(hint)) primary = parse(hint);
  if (!primary) primary = lum(darkest.rgb) < 0.2 ? darkest.rgb : colours[0].rgb;
  const ph = hsl(primary)[0];
  const second = brandy.find((e) => {
    const d = Math.abs(e.hsl[0] - ph);
    return Math.min(d, 360 - d) > 28;
  });
  const accent: RGB = second?.rgb ?? mix(primary, lum(primary) > 0.3 ? [0, 0, 0] : [255, 255, 255], 0.35);
  let ink: RGB = darkest && lum(darkest.rgb) < 0.06 ? darkest.rgb : mix(primary, [12, 10, 20], 0.82);
  const paper: RGB = mix(primary, [255, 255, 255], 0.93);
  if (contrast(ink, paper) < 7) ink = mix(ink, [0, 0, 0], 0.5);
  const onPrimary = contrast(primary, [255, 255, 255]) >= 3 ? '#FFFFFF' : hex(ink);
  return { primary: hex(primary), accent: hex(accent), ink: hex(ink), paper: hex(paper), onPrimary };
}
