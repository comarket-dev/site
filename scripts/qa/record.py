"""Record a transition with Chrome's screencast and lay chosen moments out on a contact sheet.

    python3 scripts/qa/record.py W H coarse start_path selector out.jpg t1 t2 ...
    e.g. python3 scripts/qa/record.py 1440 900 0 "/?fork=1" ".side.brands" trip.jpg 0.2 0.6 1.0 1.6 2.4

coarse=1 emulates a touch device. selector "none" records a fresh page load. Times are seconds from the click.
Needs the dev server on localhost:4321, Playwright for Python and Google Chrome. Env: TW (thumb width), COLS.
"""
import base64, io, os, sys
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright
ARGS = ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"]
W, H, C, START, SEL, OUT = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3] == "1", sys.argv[4], sys.argv[5], sys.argv[6]
want = [float(x) for x in sys.argv[7:]]
TW = int(os.environ.get("TW", 360))
frames, errs = [], []
with sync_playwright() as pw:
    b = pw.chromium.launch(channel="chrome", headless=True, args=ARGS)
    ctx = b.new_context(viewport={"width": W, "height": H}, device_scale_factor=1, has_touch=C, is_mobile=C and W < 820, screen={"width": W, "height": H})
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errs.append(str(e)))
    cdp = ctx.new_cdp_session(pg)
    cdp.on("Page.screencastFrame", lambda e: (frames.append((e["metadata"]["timestamp"], e["data"])), cdp.send("Page.screencastFrameAck", {"sessionId": e["sessionId"]})))
    if SEL == "none":
        pg.goto("about:blank")
        cdp.send("Page.startScreencast", {"format": "jpeg", "quality": 80, "maxWidth": W, "maxHeight": H})
        t0 = pg.evaluate("(performance.timeOrigin + performance.now()) / 1000")
        pg.goto("http://localhost:4321" + START)
    else:
        pg.goto("http://localhost:4321" + START, wait_until="networkidle")
        pg.wait_for_function("document.documentElement.classList.contains('stage-drawn')", timeout=20000)
        pg.wait_for_timeout(2500)
        pg.evaluate("document.addEventListener('click', () => { window.__clickAt = (performance.timeOrigin + performance.now()) / 1000; }, { capture: true })")
        cdp.send("Page.startScreencast", {"format": "jpeg", "quality": 80, "maxWidth": W, "maxHeight": H})
        pg.wait_for_timeout(200)
        el = pg.locator(SEL).first
        (el.tap() if C else el.click())
        pg.wait_for_timeout(150)
        t0 = pg.evaluate("window.__clickAt")
    pg.wait_for_timeout(int(max(want) * 1000) + 400)
    cdp.send("Page.stopScreencast")
    print("url", pg.url, "errors", errs[:3])
    b.close()
ims = []
for w in want:
    ts, data = min(frames, key=lambda f: abs(f[0] - t0 - w))
    im = Image.open(io.BytesIO(base64.b64decode(data))).convert("RGB")
    im = im.resize((TW, round(im.height * TW / im.width)))
    d = ImageDraw.Draw(im); d.rectangle([0, 0, 70, 16], fill=(0, 0, 0)); d.text((4, 2), f"{(ts - t0) * 1000:.0f}ms", fill=(255, 255, 0))
    ims.append(im)
cols = int(os.environ.get("COLS", 5))
rows = (len(ims) + cols - 1) // cols
sheet = Image.new("RGB", (cols * (TW + 6), rows * (ims[0].height + 6)), "white")
for i, im in enumerate(ims):
    sheet.paste(im, ((i % cols) * (TW + 6), (i // cols) * (im.height + 6)))
sheet.save(OUT, quality=88)
