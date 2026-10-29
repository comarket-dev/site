#!/usr/bin/env python3
"""Web versions of the licensed photos of people (design/people/people.json).

Each photo becomes `public/assets/people/<id>-<w>.webp` at a few widths, plus a square face crop around its focal
point (`<id>-face-<w>.webp`) for small round uses. Originals in design/people/originals/<id>.jpg win; until one is
downloaded, the low-res stand-in in design/people/standins/ is used, and the manifest says so.

`"grade": "warm"` bakes the site's photo grade (design/texture/README.md): blacks lift to the palette's ink, whites
settle on its paper, and colour eases back 12%, so every photo shares the page's light. The paper grain goes on
top in the browser (Person.astro), at the page's own scale.

    python3 scripts/people.py
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "design/people"
OUT = ROOT / "public/assets/people"
WIDTHS = [480, 960, 1600, 2400, 3200]
FACE = [96, 192, 384]

INK = np.array([30, 14, 63]) / 255  # --ink
PAPER = np.array([255, 247, 236]) / 255  # --paper
SUN = np.array([253, 191, 104]) / 255  # --cream, Wada's Cream Yellow


def warm(im: Image.Image) -> Image.Image:
    a = np.asarray(im, dtype=np.float32) / 255
    lum = a @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    # colour eases back 12%, so skin and wood stay warm but the loud colours stop shouting over the page
    a = lum[..., None] + (a - lum[..., None]) * 0.88
    # a soft S, then the ends land on the palette: black is the page's ink, white is its paper
    a = a - 0.035 * np.sin(2 * np.pi * a)
    lo, hi = INK * 0.78, PAPER
    a = lo + np.clip(a, 0, 1) * (hi - lo)
    # the mids catch a little sun (cream yellow, soft light, strongest at mid grey)
    mid = (4 * lum * (1 - lum))[..., None] * 0.22
    a = a * (1 - mid) + np.minimum(a * SUN * 1.18, 1) * mid
    return Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8))


def main():
    spec = json.loads((SRC / "people.json").read_text())
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {}
    for p in spec["people"]:
        pid = p["id"]
        orig = SRC / "originals" / f"{pid}.jpg"
        stand = SRC / "standins" / f"{pid}.jpg"
        path = orig if orig.exists() else stand
        im = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
        # nothing ships wider than the widest web size, so grade and crop at that size
        if im.width > WIDTHS[-1]:
            im = im.resize((WIDTHS[-1], round(im.height * WIDTHS[-1] / im.width)), Image.LANCZOS)
        if p.get("grade") == "warm":
            im = warm(im)
        w, h = im.size
        for tw in WIDTHS:
            # never upscale an original; stand-ins are upscaled (to 1600) so layouts can be judged at size
            if (path == orig and tw > w and tw != WIDTHS[0]) or (path != orig and tw > 1600):
                continue
            im.resize((tw, round(h * tw / w)), Image.LANCZOS).save(OUT / f"{pid}-{tw}.webp", quality=82, method=6)
        # face: a square on the focal point, as tight as the shorter side allows times 0.55
        fx, fy = p["focal"]
        side = round(min(w, h) * 0.55)
        cx, cy = round(fx * w), round(fy * h)
        x0 = min(max(cx - side // 2, 0), w - side)
        y0 = min(max(cy - side // 2, 0), h - side)
        face = im.crop((x0, y0, x0 + side, y0 + side))
        for tw in FACE:
            face.resize((tw, tw), Image.LANCZOS).save(OUT / f"{pid}-face-{tw}.webp", quality=84, method=6)
        manifest[pid] = {"w": w, "h": h, "original": path == orig}
        print(f"{pid:15} {'original' if path == orig else 'STAND-IN'} {w}x{h}")
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=1))


if __name__ == "__main__":
    main()
