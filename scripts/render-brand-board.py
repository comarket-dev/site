"""Render the example brands' board (design/brands/board.html) to design/brands/board.png.

    python3 scripts/render-brand-board.py

Needs Playwright for Python and Google Chrome.
"""
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "design/brands/board.html"
with sync_playwright() as pw:
    b = pw.chromium.launch(channel="chrome")
    pg = b.new_page(viewport={"width": 1520, "height": 900}, device_scale_factor=2)
    pg.goto(SRC.as_uri())
    pg.evaluate("document.fonts.ready")
    pg.wait_for_timeout(500)
    pg.screenshot(path=str(ROOT / "design/brands/board.png"), full_page=True)
    b.close()
print("wrote design/brands/board.png")
