"""Screenshot every slide of the examples spotlight on /creators.

    python3 scripts/qa/spotlight.py W H out.jpg   (writes sp_<n>.png full-size frames to the current directory)
"""
import sys
from PIL import Image
from playwright.sync_api import sync_playwright
W, H, OUT = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3]
shots = []
with sync_playwright() as pw:
    b = pw.chromium.launch(channel="chrome")
    pg = b.new_page(viewport={"width": W, "height": H}, device_scale_factor=2)
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("http://localhost:4321/creators", wait_until="networkidle")
    deck = pg.locator("[data-showcase]").first
    deck.scroll_into_view_if_needed()
    pg.evaluate("document.querySelectorAll('[data-reveal]').forEach(e=>e.classList.add('in'))")
    for i in range(11):
        pg.wait_for_timeout(1100)
        f = f"sp_{i}.png"
        pg.locator("[data-deck]").first.screenshot(path=f)
        shots.append(f)
        pg.locator("[data-next]").first.click()
    print("errors", errs[:3])
    b.close()
ims = [Image.open(f).convert("RGB") for f in shots]
ims = [im.resize((im.width // 3, im.height // 3)) for im in ims]
cols = 3 if W > 800 else 4
rows = (len(ims) + cols - 1) // cols
sheet = Image.new("RGB", (cols * (ims[0].width + 6), rows * (ims[0].height + 6)), "white")
for i, im in enumerate(ims):
    sheet.paste(im, ((i % cols) * (im.width + 6), (i // cols) * (im.height + 6)))
sheet.save(OUT, quality=88)
