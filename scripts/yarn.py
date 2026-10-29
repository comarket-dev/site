#!/usr/bin/env python3
"""Knitted yarn for the conversion buttons (src/styles/yarn.css): seamless stockinette tiles in the button colours,
public/assets/yarn/knit-<name>.webp.

Each stitch is a V of two legs. A leg is a soft dome (the yarn's round section) with plies twisting along it, lit
from the page's one light (upper right); the gaps between stitches fall into shadow. Drawn at 2x: a stitch is
10 x 8 CSS pixels, so a 52px button carries about six rows.

    python3 scripts/yarn.py
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public/assets/yarn"
CW, CH = 20, 16  # one stitch, device pixels (2x)
COLS, ROWS = 12, 8  # stitches per tile
SEED = 295

INK = np.array([30, 14, 63], np.float64)  # --ink: every shadow falls toward it, so the wool shades violet, never grey
WHITE = np.array([255, 255, 255], np.float64)

# name: (the token the yarn must read as, how deep its shadows go toward ink)
COLOURS = {
    "blue": ((0, 110, 184), 0.62),  # --blue
    "blue-ink": ((0, 85, 143), 0.62),  # --blue-ink, hover
    "paper": ((255, 247, 236), 0.3),  # --paper, the primary on ink bands
    "paper-hover": ((255, 251, 246), 0.26),  # paper hover: a touch lighter, as the flat button went white
}


def colour(shade, rgb, deep):
    """Shade to colour, calibrated so the knit reads as the token.

    Stitch faces sit on the token; the gaps between them fall toward ink (by `deep`), the tops of the legs catch a
    little white. Then the whole tile is nudged so its mean is the token too (a few rounds, since the light end
    clips at white)."""
    token = np.array(rgb, np.float64)
    s = shade[..., None]
    mid = np.quantile(shade, 0.55)  # a typical lit stitch face
    dark = token + (INK - token) * deep
    lite = token + (WHITE - token) * 0.28
    lo = np.clip((mid - s) / mid, 0, 1)
    hi = np.clip((s - mid) / (1 - mid), 0, 1)
    img = token + (dark - token) * lo ** 0.8 + (lite - token) * hi
    for _ in range(6):
        img = np.clip(img + (token - img.reshape(-1, 3).mean(0)), 0, 255)
    return img


def knit(rgb, deep, out):
    rng = np.random.default_rng(SEED)
    W, H = CW * COLS, CH * ROWS
    shade = np.zeros((H, W))  # 0 = gap (shadow), up to 1 = the top of a leg in full light
    cover = np.zeros((H, W))
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
    light = np.array([0.55, -0.83])  # from the upper right (x, y on screen)
    for r in range(ROWS):
        for c in range(COLS):
            cx = (c + 0.5) * CW + rng.normal(0, 0.5)
            cy = (r + 0.5) * CH + rng.normal(0, 0.4)
            for side in (-1, 1):
                # a leg: its top leans out, its foot meets the other leg's at the bottom of the V
                ang = side * 0.5 + rng.normal(0, 0.04)
                lx, ly = cx + side * CW * 0.2, cy - CH * 0.02
                a, b = CH * 0.78, CW * 0.26  # half length, half width
                # wrap: draw the leg at every tile offset it reaches
                for ox in (-W, 0, W):
                    for oy in (-H, 0, H):
                        dx, dy = xx - (lx + ox), yy - (ly + oy)
                        u = dx * np.sin(ang) + dy * np.cos(ang)  # along the leg
                        v = dx * np.cos(ang) - dy * np.sin(ang)  # across it
                        d = (u / a) ** 2 + (v / b) ** 2
                        inside = d < 1
                        if not inside.any():
                            continue
                        # the yarn's round section: brighter on the side facing the light
                        nx = np.clip(v / b, -1, 1)
                        nz = np.sqrt(np.clip(1 - d, 0, 1))
                        facing = 0.55 + 0.45 * (nx * (light[0] * np.cos(ang) - light[1] * np.sin(ang)))
                        # plies: two strands twisted around each other, a diagonal ripple along the leg
                        ply = 0.82 + 0.18 * np.sin((u * 0.9 + v * 1.6) + side)
                        val = nz ** 0.6 * facing * ply
                        # later legs lie over earlier ones (a row sits on the loops of the row above)
                        m = inside & (val > shade * 0.6)
                        shade[m] = val[m]
                        cover[m] = np.maximum(cover[m], np.clip((1 - d[m]) * 4, 0, 1))
    # fuzz: fine fibres everywhere, a little stronger on the yarn
    fuzz = rng.normal(0, 1, (H, W))
    shade = np.clip(shade + 0.05 * fuzz * (0.4 + cover), 0, 1)
    img = colour(shade, rgb, deep)
    Image.fromarray(img.clip(0, 255).round().astype(np.uint8)).save(out, quality=88, method=6)
    got = np.asarray(Image.open(out).convert("RGB"), np.float64)
    faces = got[shade > np.quantile(shade, 0.55)].mean(0)
    print(
        out.relative_to(ROOT), f"{W}x{H}", f"{out.stat().st_size // 1024} KB",
        "token", tuple(rgb), "mean", tuple(got.reshape(-1, 3).mean(0).round().astype(int)),
        "lit faces", tuple(faces.round().astype(int)),
    )


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, (rgb, deep) in COLOURS.items():
        knit(rgb, deep, OUT / f"knit-{name}.webp")


if __name__ == "__main__":
    main()
