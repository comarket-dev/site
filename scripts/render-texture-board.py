"""Render the texture and warmth board (design/texture/board.html) to design/texture/board.png.

Makes the before/after pairs first (design/texture/build/, ungraded and graded crops of the same photos), then
screenshots the board.

    python3 scripts/render-texture-board.py

Needs Playwright for Python and Google Chrome.
"""
import importlib.util
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "design/texture/board.html"
BUILD = ROOT / "design/texture/build"

spec = importlib.util.spec_from_file_location("people", ROOT / "scripts/people.py")
people = importlib.util.module_from_spec(spec)
spec.loader.exec_module(people)

BUILD.mkdir(parents=True, exist_ok=True)
for pid in ["shop-plan", "florists"]:
    im = ImageOps.exif_transpose(Image.open(ROOT / f"design/people/originals/{pid}.jpg")).convert("RGB")
    im = im.resize((1400, round(im.height * 1400 / im.width)), Image.LANCZOS)
    im.save(BUILD / f"{pid}-before.jpg", quality=88)
    people.warm(im).save(BUILD / f"{pid}-after.jpg", quality=88)

from playwright.sync_api import sync_playwright  # noqa: E402

with sync_playwright() as pw:
    b = pw.chromium.launch(channel="chrome")
    pg = b.new_page(viewport={"width": 1520, "height": 900}, device_scale_factor=2)
    pg.goto(SRC.as_uri())
    pg.evaluate("document.fonts.ready")
    pg.wait_for_timeout(500)
    pg.screenshot(path=str(ROOT / "design/texture/board.png"), full_page=True)
    b.close()
print("wrote design/texture/board.png")
