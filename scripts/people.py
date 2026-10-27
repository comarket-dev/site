#!/usr/bin/env python3
"""Web versions of the licensed photos of people (design/people/people.json).

Each photo becomes `public/assets/people/<id>-<w>.webp` at a few widths, plus a square face crop around its focal
point (`<id>-face-<w>.webp`) for small round uses. Originals in design/people/originals/<id>.jpg win; until one is
downloaded, the low-res stand-in in design/people/standins/ is used, and the manifest says so.

    python3 scripts/people.py
"""
import json
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "design/people"
OUT = ROOT / "public/assets/people"
WIDTHS = [480, 960, 1600]
FACE = [96, 192, 384]


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
        w, h = im.size
        for tw in WIDTHS:
            # never upscale an original; stand-ins are upscaled so layouts can be judged at size
            if path == orig and tw > w and tw != WIDTHS[0]:
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
