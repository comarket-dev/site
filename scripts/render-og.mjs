// Share images (1200x630) composed from stills of the 3D stage phone. Usage: node scripts/render-og.mjs
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
// The phone stills (design/stage/og-phone-*.png) come from scripts/render-stage-stills.py with `og`.

const cards = [
  {
    name: 'og-fork',
    bg: '#FFF7EC',
    fg: '#1E0E3F',
    label: 'Comarket',
    title: 'More sales for brands. More money for creators. <mark>One co-branded storefront.</mark>',
    note: 'No sale, no fee',
    art: `<img class="solo" src="${img('design/stage/og-phone-fork.png')}">`,
  },
  {
    name: 'og-brands',
    bg: '#FFF7EC',
    fg: '#1E0E3F',
    label: 'Comarket for brands',
    title: 'Turn creator traffic into customers with storefronts <mark class="one">built to convert.</mark>',
    note: 'We only take a share of completed sales',
    art: `<img class="solo" src="${img('design/stage/og-phone-brands.png')}">`,
  },
  {
    name: 'og-creators',
    bg: '#1E0E3F',
    fg: '#FFF7EC',
    label: 'Comarket for creators',
    title: 'Get matched with brands your audience wants, and <mark class="one low">earn more</mark> from every one.',
    note: 'Every offer’s rate, up front',
    art: `<img class="solo" src="${img('design/stage/og-phone-creators.png')}">`,
  },
];

const tmp = mkdtempSync(join(tmpdir(), 'og-'));
for (const c of cards) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${fonts}
  html,body{margin:0;width:1200px;height:630px;overflow:hidden;background:${c.bg};color:${c.fg};font-family:Satoshi}
  mark.one{white-space:nowrap}
  .t{position:absolute;left:64px;top:64px;bottom:64px;width:560px;display:flex;flex-direction:column;justify-content:space-between;z-index:2}
  .l{font-family:"Fragment Mono";font-size:16px;letter-spacing:.12em;text-transform:uppercase;opacity:.7}
  h1{margin:0;font-weight:700;font-size:52px;line-height:1.16;letter-spacing:-.045em}
  mark{--top:calc(.16em - 2px);--bot:calc(.13em - 2px);color:#1E0E3F;padding:0 calc(.08em + .042em) 0 .08em;margin:0 -.04em;-webkit-box-decoration-break:clone;box-decoration-break:clone;background:linear-gradient(#FFF200,#FFF200) no-repeat 2px calc(var(--top) + 2px)/calc(100% - 4px) calc(100% - var(--top) - var(--bot) - 4px),linear-gradient(#1E0E3F,#1E0E3F) no-repeat 0 var(--top)/100% calc(100% - var(--top) - var(--bot))}
  mark.low{--top:calc(.28em - 2px);--bot:.01em;padding-bottom:2px}
  .dark mark{background:linear-gradient(#FFF200,#FFF200) no-repeat 0 calc(var(--top) + 2px)/100% calc(100% - var(--top) - var(--bot) - 4px)}
  .n{font-family:"Fragment Mono";font-size:16px;letter-spacing:.1em;text-transform:uppercase;opacity:.7}
  img{position:absolute}
  .solo{right:20px;top:-70px;width:580px}
  </style></head><body class="${c.bg === '#1E0E3F' ? 'dark' : ''}"><div class="t"><span class="l">${c.label}</span><h1>${c.title}</h1><span class="n">${c.note}</span></div>${c.art}</body></html>`;
  const file = join(tmp, `${c.name}.html`);
  writeFileSync(file, html);
  const png = join(tmp, `${c.name}.png`);
  execFileSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=1200,630', '--virtual-time-budget=2000', `--screenshot=${png}`, `file://${file}`], { stdio: 'ignore' });
  const jpg = join(out, `${c.name}.jpg`);
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '84', png, '--out', jpg], { stdio: 'ignore' });
  console.log('wrote', jpg);
}
rmSync(tmp, { recursive: true, force: true });
