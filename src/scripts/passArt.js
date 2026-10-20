// Pass artwork, drawn to a 2D canvas. Plain JS so the site and the Blender texture script share it.
// Front: safety paper (brands) or Deep Indigo (creators), guilloche rosette, microprint border,
// a big pass number and the holder's name. Back: Deep Indigo plate with the motto.

export const PASS_W = 2048;
export const PASS_H = 1292;

const C = {
  paper: '#EDF0EC',
  ink: '#051230',
  benzol: '#00978D',
  benzol2: '#7CC4BC',
  jasper: '#EB5324',
  graphite: '#525B67',
};

function rosette(x, cx, cy, R, color, alpha, lines, seed) {
  x.save();
  x.translate(cx, cy);
  x.strokeStyle = color;
  x.globalAlpha = alpha;
  x.lineWidth = 1.6;
  for (let k = 0; k < lines; k++) {
    const ph = (k / lines) * Math.PI * 2 + seed;
    x.beginPath();
    for (let i = 0; i <= 900; i++) {
      const t = (i / 900) * Math.PI * 2;
      const r = R * (0.8 + 0.13 * Math.sin(7 * t + ph) * Math.cos(3 * t - ph * 0.5) + 0.035 * Math.sin(23 * t + ph * 2));
      const px = Math.cos(t) * r;
      const py = Math.sin(t) * r;
      if (i) x.lineTo(px, py);
      else x.moveTo(px, py);
    }
    x.stroke();
  }
  x.restore();
}

function frame(x, inset, color, alpha) {
  const w = PASS_W - inset * 2;
  const h = PASS_H - inset * 2;
  x.save();
  x.strokeStyle = color;
  x.globalAlpha = alpha;
  x.lineWidth = 1.4;
  for (let k = 0; k < 6; k++) {
    x.beginPath();
    const per = 2 * (w + h);
    for (let s = 0; s <= per; s += 3) {
      let px;
      let py;
      let nx;
      let ny;
      if (s < w) {
        px = inset + s; py = inset; nx = 0; ny = 1;
      } else if (s < w + h) {
        px = inset + w; py = inset + (s - w); nx = -1; ny = 0;
      } else if (s < 2 * w + h) {
        px = inset + w - (s - w - h); py = inset + h; nx = 0; ny = -1;
      } else {
        px = inset; py = inset + h - (s - 2 * w - h); nx = 1; ny = 0;
      }
      const off = 9 + 7 * Math.sin(s * 0.045 + k * 1.05) + 3 * Math.sin(s * 0.13 - k);
      const X = px + nx * off;
      const Y = py + ny * off;
      if (s === 0) x.moveTo(X, Y);
      else x.lineTo(X, Y);
    }
    x.closePath();
    x.stroke();
  }
  x.restore();
}

function micro(x, text, y, color, size) {
  x.save();
  x.beginPath();
  x.rect(70, y - size, PASS_W - 140, size * 2);
  x.clip();
  x.fillStyle = color;
  x.globalAlpha = 0.75;
  x.font = `${size}px "Fragment Mono", ui-monospace, monospace`;
  x.textBaseline = 'middle';
  let s = '';
  while (x.measureText(s).width < PASS_W) s += text + ' ';
  x.fillText(s, 70, y);
  x.restore();
}

function noise(x, alpha) {
  const n = 220;
  const c = document.createElement('canvas');
  c.width = c.height = n;
  const g = c.getContext('2d');
  const d = g.createImageData(n, n);
  for (let i = 0; i < d.data.length; i += 4) {
    const v = Math.random() * 255;
    d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
    d.data[i + 3] = 255;
  }
  g.putImageData(d, 0, 0);
  x.save();
  x.globalAlpha = alpha;
  x.globalCompositeOperation = 'multiply';
  x.fillStyle = x.createPattern(c, 'repeat');
  x.fillRect(0, 0, PASS_W, PASS_H);
  x.restore();
}

/**
 * @param {CanvasRenderingContext2D} x
 * @param {{ side: 'brand'|'creator', passNo: number, label: string, issued?: Date }} o
 */
export function drawPassFront(x, o) {
  const brand = o.side === 'brand';
  const bg = brand ? C.paper : C.ink;
  const fg = brand ? C.ink : C.paper;
  const line = brand ? C.benzol : C.benzol2;
  x.save();
  x.fillStyle = bg;
  x.fillRect(0, 0, PASS_W, PASS_H);
  rosette(x, PASS_W * 0.73, PASS_H * 0.5, PASS_H * 0.42, line, brand ? 0.55 : 0.5, 72, 0.3);
  rosette(x, PASS_W * 0.73, PASS_H * 0.5, PASS_H * 0.22, line, brand ? 0.4 : 0.35, 40, 1.1);
  frame(x, 44, line, 0.6);
  micro(x, 'COMARKET · NETNEWONLY', 116, brand ? C.graphite : C.benzol2, 13);
  micro(x, 'EVERY SALE HAS TWO SIDES ·', PASS_H - 116, brand ? C.graphite : C.benzol2, 13);

  x.fillStyle = fg;
  x.textBaseline = 'alphabetic';
  x.font = '700 92px Satoshi, sans-serif';
  if ('letterSpacing' in x) x.letterSpacing = '-4px';
  x.fillText('Comarket', 150, 260);
  if ('letterSpacing' in x) x.letterSpacing = '6px';
  x.font = '30px "Fragment Mono", monospace';
  x.textAlign = 'right';
  x.fillText(brand ? 'BRAND PASS' : 'CREATOR PASS', PASS_W - 150, 246);
  x.textAlign = 'left';

  x.font = '30px "Fragment Mono", monospace';
  x.globalAlpha = 0.75;
  x.fillText('NO.', 154, 470);
  x.globalAlpha = 1;
  if ('letterSpacing' in x) x.letterSpacing = '-18px';
  x.font = '700 330px Satoshi, sans-serif';
  x.fillText(String(o.passNo).padStart(4, '0'), 140, 790);

  if ('letterSpacing' in x) x.letterSpacing = '-3px';
  let size = 96;
  x.font = `700 ${size}px Satoshi, sans-serif`;
  while (x.measureText(o.label).width > 1080 && size > 48) {
    size -= 4;
    x.font = `700 ${size}px Satoshi, sans-serif`;
  }
  x.fillText(o.label, 150, 1005);
  if ('letterSpacing' in x) x.letterSpacing = '5px';
  x.font = '26px "Fragment Mono", monospace';
  x.globalAlpha = 0.75;
  const d = o.issued || new Date();
  const when = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  x.fillText(`WAITLIST · ISSUED ${when}`, 154, 1080);
  x.globalAlpha = 1;

  // the seal: Jasper Red is reserved for net-new, and this is the promise
  x.save();
  x.translate(PASS_W - 300, PASS_H - 300);
  x.rotate(-0.22);
  x.fillStyle = C.jasper;
  x.beginPath();
  x.arc(0, 0, 112, 0, Math.PI * 2);
  x.fill();
  x.strokeStyle = C.ink;
  x.globalAlpha = 0.35;
  x.lineWidth = 2;
  x.beginPath();
  x.arc(0, 0, 96, 0, Math.PI * 2);
  x.stroke();
  x.globalAlpha = 1;
  x.fillStyle = C.ink;
  x.textAlign = 'center';
  if ('letterSpacing' in x) x.letterSpacing = '4px';
  x.font = '26px "Fragment Mono", monospace';
  x.fillText('NET-NEW', 0, -4);
  x.fillText('ONLY', 0, 32);
  x.restore();

  noise(x, brand ? 0.05 : 0.08);
  x.restore();
}

export function drawPassBack(x, o) {
  x.save();
  x.fillStyle = C.ink;
  x.fillRect(0, 0, PASS_W, PASS_H);
  rosette(x, PASS_W * 0.5, PASS_H * 0.5, PASS_H * 0.62, C.benzol, 0.38, 96, 2.2);
  rosette(x, PASS_W * 0.5, PASS_H * 0.5, PASS_H * 0.3, C.benzol2, 0.3, 48, 0.7);
  frame(x, 44, C.benzol2, 0.45);
  x.fillStyle = C.paper;
  x.textAlign = 'center';
  x.font = '700 120px Satoshi, sans-serif';
  if ('letterSpacing' in x) x.letterSpacing = '-5px';
  x.fillText('Every sale has two sides.', PASS_W / 2, PASS_H / 2 + 40);
  if ('letterSpacing' in x) x.letterSpacing = '6px';
  x.font = '28px "Fragment Mono", monospace';
  x.globalAlpha = 0.7;
  x.fillText(`COMARKET.CO · NO. ${String(o.passNo).padStart(4, '0')}`, PASS_W / 2, PASS_H - 150);
  x.restore();
  noise(x, 0.08);
}

/** White where the foil stripe sits, black elsewhere. Drives the iridescent layer. */
export function drawFoilMask(x) {
  x.fillStyle = '#000';
  x.fillRect(0, 0, PASS_W, PASS_H);
  x.fillStyle = '#fff';
  x.fillRect(PASS_W * 0.885, 0, PASS_W * 0.05, PASS_H);
}
