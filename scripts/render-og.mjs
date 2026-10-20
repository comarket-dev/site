// Share images (1200x630) composed from the Blender pass renders. Usage: node scripts/render-og.mjs
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const out = join(root, 'public/og');
mkdirSync(out, { recursive: true });
const chrome = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const b64 = (p) => readFileSync(join(root, p)).toString('base64');
const fonts = `
@font-face{font-family:Satoshi;src:url(data:font/woff2;base64,${b64('public/fonts/Satoshi-Variable.woff2')}) format('woff2');font-weight:300 900}
@font-face{font-family:"Fragment Mono";src:url(data:font/woff2;base64,${b64('public/fonts/FragmentMono-Regular.woff2')}) format('woff2')}`;
const img = (p) => `data:image/png;base64,${b64(p)}`;

const cards = [
  {
    name: 'og-fork',
    bg: '#EDF0EC',
    fg: '#051230',
    label: 'Comarket',
    title: 'Every sale has two sides.',
    note: 'For brands and creators',
    art: `<img class="a1" src="${img('design/pass/render-creator.png')}"><img class="a2" src="${img('design/pass/render-brand.png')}">`,
  },
  {
    name: 'og-brands',
    bg: '#EDF0EC',
    fg: '#051230',
    label: 'Comarket for brands',
    title: 'Every commission is a customer you didn’t have.',
    note: '$0 upfront · paid on net-new only',
    art: `<img class="solo" src="${img('design/pass/render-brand.png')}">`,
  },
  {
    name: 'og-creators',
    bg: '#051230',
    fg: '#EDF0EC',
    label: 'Comarket for creators',
    title: 'Earn on every customer you bring.',
    note: 'Free for creators',
    art: `<img class="solo" src="${img('design/pass/render-creator.png')}">`,
  },
];

const tmp = mkdtempSync(join(tmpdir(), 'og-'));
for (const c of cards) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${fonts}
  html,body{margin:0;width:1200px;height:630px;overflow:hidden;background:${c.bg};color:${c.fg};font-family:Satoshi}
  .t{position:absolute;left:64px;top:64px;bottom:64px;width:560px;display:flex;flex-direction:column;justify-content:space-between;z-index:2}
  .l{font-family:"Fragment Mono";font-size:16px;letter-spacing:.12em;text-transform:uppercase;opacity:.7}
  h1{margin:0;font-weight:700;font-size:70px;line-height:.94;letter-spacing:-.045em}
  .n{font-family:"Fragment Mono";font-size:16px;letter-spacing:.1em;text-transform:uppercase;opacity:.7}
  img{position:absolute;width:900px;filter:drop-shadow(0 40px 50px rgb(5 18 48 / .28))}
  .solo{right:-180px;top:30px}
  .a1{right:-230px;top:-60px;width:760px;opacity:.9}
  .a2{right:-120px;top:150px;width:820px}
  </style></head><body><div class="t"><span class="l">${c.label}</span><h1>${c.title}</h1><span class="n">${c.note}</span></div>${c.art}</body></html>`;
  const file = join(tmp, `${c.name}.html`);
  writeFileSync(file, html);
  const png = join(tmp, `${c.name}.png`);
  execFileSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=1200,630', '--virtual-time-budget=2000', `--screenshot=${png}`, `file://${file}`], { stdio: 'ignore' });
  const jpg = join(out, `${c.name}.jpg`);
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '84', png, '--out', jpg], { stdio: 'ignore' });
  console.log('wrote', jpg);
}
rmSync(tmp, { recursive: true, force: true });
