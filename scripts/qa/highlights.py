"""Measure each yellow highlight box (mark.hl) against the ink of its text, in em, on every page and three widths.

    python3 scripts/qa/highlights.py [base_url] [out_dir]

Even boxes read about 0.09em top/bottom and 0.08em left/right.
"""
import io
import json
import sys

import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:4321"
OUT = sys.argv[2] if len(sys.argv) > 2 else "."
PAGES = ["/?fork=1", "/brands", "/creators"]
SIZES = [(1440, 900), (1024, 768), (390, 844)]

JS = """() => {
  const s = document.createElement('style');
  s.textContent = '*,*::before,*::after{transition:none!important;animation:none!important}';
  document.head.appendChild(s);
  document.querySelectorAll('[data-reveal]').forEach(e => e.classList.add('in'));
  return [...document.querySelectorAll('mark.hl')].map((m, i) => {
    m.dataset.qa = i;
    return { i, text: m.textContent.trim(), fs: parseFloat(getComputedStyle(m).fontSize) };
  });
}"""


def measure(png: bytes):
    a = np.asarray(Image.open(io.BytesIO(png)).convert("RGB")).astype(int)
    yellow = (a[..., 0] > 200) & (a[..., 1] > 190) & (a[..., 2] < 120)
    ys, xs = np.nonzero(yellow)
    if not len(xs):
        return None
    yl, yr, yt, yb = xs.min(), xs.max(), ys.min(), ys.max()
    inner = a[yt:yb + 1, yl:yr + 1]
    ink = inner.sum(-1) < 300
    iy, ix = np.nonzero(ink)
    if not len(ix):
        return None
    return {"left": int(ix.min()), "right": int(inner.shape[1] - 1 - ix.max()), "top": int(iy.min()), "bottom": int(inner.shape[0] - 1 - iy.max())}


rows = []
with sync_playwright() as pw:
    b = pw.chromium.launch(channel="chrome")
    for w, h in SIZES:
        pg = b.new_page(viewport={"width": w, "height": h}, device_scale_factor=2)
        for path in PAGES:
            pg.goto(BASE + path, wait_until="networkidle")
            pg.wait_for_timeout(500)
            marks = pg.evaluate(JS)
            for m in marks:
                el = pg.locator(f'mark[data-qa="{m["i"]}"]')
                el.scroll_into_view_if_needed()
                pg.wait_for_timeout(120)
                rects = pg.evaluate(f"""() => [...document.querySelector('mark[data-qa="{m["i"]}"]').getClientRects()].map(r => ({{x:r.x,y:r.y,w:r.width,h:r.height}}))""")
                for li, r in enumerate(rects):
                    clip = {"x": max(0, r["x"] - 4), "y": max(0, r["y"] - 4), "width": r["w"] + 8, "height": r["h"] + 8}
                    res = measure(pg.screenshot(clip=clip))
                    if not res:
                        continue
                    em = {k: round(v / 2 / m["fs"], 3) for k, v in res.items()}
                    rows.append({"page": path, "w": w, "text": m["text"], "line": li, "fs": m["fs"], **em})
        pg.close()
    b.close()

for r in rows:
    print(f'{r["w"]:>5} {r["page"]:<10} L{r["line"]} fs{r["fs"]:>5.1f}  top {r["top"]:.3f}  bottom {r["bottom"]:.3f}  left {r["left"]:.3f}  right {r["right"]:.3f}  | {r["text"][:40]}')
json.dump(rows, open(f"{OUT}/hl_qa.json", "w"), indent=1)
