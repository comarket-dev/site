"""After build_window.py: crop each render to its window and shadow, save web versions, and move the screen corners
into the cropped frame (public/assets/window/window.json).

    python3 design/window/finish.py
"""
import json
from pathlib import Path
from PIL import Image

D = Path(__file__).resolve().parents[2] / "public/assets/window"
meta = json.loads((D / "window.json").read_text())
for shape, m in meta.items():
    src = D / f"window-{shape}.png"
    if not src.exists():
        continue
    im = Image.open(src).convert("RGBA")
    # the window alone, plus a hair of margin
    box = im.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    pad = 6
    x0, y0 = max(0, box[0] - pad), max(0, box[1] - pad)
    x1, y1 = min(im.width, box[2] + pad), min(im.height, box[3] + pad)
    im = im.crop((x0, y0, x1, y1))
    corners = [[round(x - x0, 2), round(y - y0, 2)] for x, y in m.get("raw", m["corners"])]
    m.update({"raw": m.get("raw", m["corners"]), "w": im.width, "h": im.height, "corners": corners})
    for w in (900, 1600):
        im.resize((w, round(im.height * w / im.width)), Image.LANCZOS).save(D / f"window-{shape}-{w}.webp", quality=88, method=6)

    print(shape, m["w"], m["h"], corners)
(D / "window.json").write_text(json.dumps(meta, indent=1))
