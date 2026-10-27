"""The fork at rest across 15 common viewports (phones, tablets, laptops, monitors) on one contact sheet.

    python3 scripts/qa/viewports.py out.jpg
"""
import sys
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright
ARGS = ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"]
VPS = [("phone SE", 375, 667, 1), ("iPhone 15", 393, 852, 1), ("Pro Max", 430, 932, 1), ("Android", 360, 800, 1),
       ("iPad mini", 744, 1133, 1), ("iPad", 820, 1180, 1), ("iPad Pro", 1024, 1366, 1), ("iPad land", 1180, 820, 1),
       ("1280x720", 1280, 720, 0), ("1366x768", 1366, 768, 0), ("1440x900", 1440, 900, 0), ("1536x864", 1536, 864, 0),
       ("1920x1080", 1920, 1080, 0), ("2560x1440", 2560, 1440, 0), ("3440x1440", 3440, 1440, 0)]
out = []
with sync_playwright() as pw:
    b = pw.chromium.launch(channel="chrome", headless=True, args=ARGS)
    for name, w, h, c in VPS:
        ctx = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=1, has_touch=bool(c), is_mobile=bool(c) and w < 820,
                            screen={"width": w, "height": h})
        pg = ctx.new_page()
        pg.goto("http://localhost:4321/?fork=1", wait_until="networkidle")
        try: pg.wait_for_function("document.documentElement.classList.contains('stage-drawn')", timeout=15000)
        except Exception: pass
        pg.wait_for_timeout(2200)
        dev = pg.evaluate("document.documentElement.dataset.device")
        im = Image.open(__import__("io").BytesIO(pg.screenshot())).convert("RGB")
        out.append((f"{name} {w}x{h} {dev}", im))
        ctx.close()
    b.close()
H = 420
thumbs = []
for label, im in out:
    t = im.resize((round(im.width * H / im.height), H))
    d = ImageDraw.Draw(t); d.rectangle([0, 0, 220, 16], fill=(0, 0, 0)); d.text((4, 2), label, fill=(255, 255, 0))
    thumbs.append(t)
rows, row, wsum = [], [], 0
for t in thumbs:
    if wsum + t.width > 2400 and row: rows.append(row); row, wsum = [], 0
    row.append(t); wsum += t.width + 8
rows.append(row)
sheet = Image.new("RGB", (2400, len(rows) * (H + 8)), "white")
for i, r in enumerate(rows):
    x = 0
    for t in r: sheet.paste(t, (x, i * (H + 8))); x += t.width + 8
sheet.save(sys.argv[1], quality=85)
