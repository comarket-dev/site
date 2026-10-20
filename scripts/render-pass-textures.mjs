// Renders sample pass artwork to PNG with headless Chrome, using the same drawing code as the site.
// Output feeds the Blender scene (design/pass/build_pass.py). Usage: npm run assets:textures
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const out = join(root, 'design/pass/tex');
mkdirSync(out, { recursive: true });
const chrome = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const art = readFileSync(join(root, 'src/scripts/passArt.js'), 'utf8').replace(/^export /gm, '');
const font = (f) => readFileSync(join(root, 'public/fonts', f)).toString('base64');
const fonts = `
@font-face{font-family:Satoshi;src:url(data:font/woff2;base64,${font('Satoshi-Variable.woff2')}) format('woff2');font-weight:300 900}
@font-face{font-family:"Fragment Mono";src:url(data:font/woff2;base64,${font('FragmentMono-Regular.woff2')}) format('woff2')}`;

const jobs = [
  { name: 'front-brand', call: `drawPassFront(x,{side:'brand',passNo:42,label:'Fernwood',issued:new Date('2026-10-20T12:00:00')})` },
  { name: 'front-creator', call: `drawPassFront(x,{side:'creator',passNo:117,label:'@sarah.builds',issued:new Date('2026-10-20T12:00:00')})` },
  { name: 'back', call: `drawPassBack(x,{passNo:42})` },
  { name: 'foil', call: `drawFoilMask(x)` },
];

const tmp = mkdtempSync(join(tmpdir(), 'pass-tex-'));
for (const j of jobs) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${fonts}html,body{margin:0;background:#000}canvas{display:block}</style></head>
<body><canvas id="c" width="2048" height="1292"></canvas><script>
${art}
(async()=>{await document.fonts.load('700 100px Satoshi');await document.fonts.load('30px "Fragment Mono"');
const x=document.getElementById('c').getContext('2d');${j.call};document.title='done';})();
</script></body></html>`;
  const file = join(tmp, `${j.name}.html`);
  writeFileSync(file, html);
  const png = join(out, `${j.name}.png`);
  execFileSync(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--window-size=2048,1292',
    '--virtual-time-budget=3000',
    `--screenshot=${png}`,
    `file://${file}`,
  ], { stdio: 'ignore' });
  console.log('wrote', png);
}
