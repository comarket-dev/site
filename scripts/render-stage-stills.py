"""Stills of the live 3D stage. Needs the dev server and Playwright (pip install playwright).
  Posters (first frame, shown until the 3D draws):  python3 scripts/render-stage-stills.py http://localhost:4321 public/assets/stage
  Share-image phones (used by render-og.mjs):         python3 scripts/render-stage-stills.py http://localhost:4321 design/stage og
"""
import os, sys, time, io
from playwright.sync_api import sync_playwright
from PIL import Image
base, out = sys.argv[1], sys.argv[2]
OG = len(sys.argv) > 3 and sys.argv[3] == "og"
SHOTS = {"fork": ("sale", 3), "brands": ("verify", 99), "creators": ("creator", 99)}
POSTER = {"fork": ("sale", 3), "brands": ("store", 0), "creators": ("store", 0)}
ARGS = ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"]
HIDE = """
html, body { background: transparent !important; }
body > *:not(#stage) { visibility: hidden !important; }
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(channel="chrome", headless=True, args=ARGS)
    for name, path in (("fork", "/?fork=1"), ("brands", "/brands"), ("creators", "/creators")):
        ctx = b.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=2)
        page = ctx.new_page()
        page.goto(base + path, wait_until="networkidle")
        page.wait_for_function("document.documentElement.classList.contains('stage-drawn')", timeout=20000)
        page.mouse.move(720, 899)
        shot, t = SHOTS[name] if OG else POSTER[name]
        page.evaluate(f"window.__stage.debugShot('{shot}', {t})")
        page.add_style_tag(content=HIDE)
        time.sleep(2.0)
        r = page.evaluate("(() => { const r = document.querySelector('[data-stage-anchor]').getBoundingClientRect(); return {x:r.left, y:r.top, w:r.width, h:r.height}; })()")
        clip = {"x": r["x"] - 0.62 * r["w"], "y": r["y"] - 0.2 * r["h"], "width": r["w"] * 2.24, "height": r["h"] * 1.4}
        # the box can overhang the viewport (only faint shadow lives there): shoot what's visible, pad the rest
        vx0, vy0 = max(0, clip["x"]), max(0, clip["y"])
        vx1, vy1 = min(1440, clip["x"] + clip["width"]), min(900, clip["y"] + clip["height"])
        png = page.screenshot(clip={"x": vx0, "y": vy0, "width": vx1 - vx0, "height": vy1 - vy0}, omit_background=True)
        part = Image.open(io.BytesIO(png)).convert("RGBA")
        im = Image.new("RGBA", (round(clip["width"] * 2), round(clip["height"] * 2)), (0, 0, 0, 0))
        im.paste(part, (round((vx0 - clip["x"]) * 2), round((vy0 - clip["y"]) * 2)))
        im = im.resize((960, round(960 * im.height / im.width)), Image.LANCZOS)
        if OG:
            p = os.path.join(out, f"og-phone-{name}.png")
            im.save(p)
        else:
            p = os.path.join(out, f"poster-{name}.webp")
            im.save(p, "WEBP", quality=82, method=6)
        print(name, im.size, os.path.getsize(p))
        ctx.close()
    b.close()
