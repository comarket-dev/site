#!/usr/bin/env python3
"""The page's paper: a seamless grain tile for cream sections and one for the ink bands, and a large crease tile for
each (public/assets/texture/).

Uncoated stock under a raking light: a fine tooth, a softer mottle a few millimetres across, and a few fibres. All of
it is alpha over the section's own colour, so the palette stays the palette. The photos get the same tile on top
(Person.astro), which is what lets them sit in the page instead of on it. See design/texture/README.md.

Creases: a sheet that was folded a few times and smoothed flat again, under the page's one light (upper right). A few
long folds and some faint short crinkles, each mostly soft shading (one facet a touch darker, the other a touch
lighter) with a fine ridge at the crease. The tile is 1800px, so it doesn't visibly repeat on a page.

    python3 scripts/texture.py
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public/assets/texture"
N = 384  # the tile, in CSS pixels, drawn at 1x: on a 2x screen a speck is two pixels, which is how paper tooth reads
SEED = 295  # Wada No. 295


def blur(a, sigma):
    """Gaussian blur that wraps at the edges (FFT), so the tile repeats without a seam."""
    if sigma <= 0:
        return a
    f = np.fft.fftfreq(a.shape[0])
    g = np.exp(-2 * (np.pi * sigma) ** 2 * (f[:, None] ** 2 + f[None, :] ** 2))
    return np.real(np.fft.ifft2(np.fft.fft2(a) * g))


def norm(a):
    a = a - a.mean()
    return a / (np.abs(a).max() + 1e-9)


def fibres(rng, n, count):
    """Short, faint, mostly horizontal strokes, wrapped at the edges."""
    a = np.zeros((n, n))
    for _ in range(count):
        x, y = rng.uniform(0, n, 2)
        ang = rng.normal(0, 0.5)
        length = rng.uniform(4, 12)
        for t in np.linspace(0, length, int(length * 3)):
            a[int(y + np.sin(ang) * t) % n, int(x + np.cos(ang) * t) % n] += 1
    return blur(a, 0.4)


def tile(rgb, strength, out):
    rng = np.random.default_rng(SEED)
    n = N
    tooth = norm(blur(rng.normal(size=(n, n)), 0.45))
    mottle = norm(blur(rng.normal(size=(n, n)), 9))
    fib = norm(fibres(rng, n, 36))
    # sparse specks: only the top of the tooth shows, so it reads as paper, never as a grey veil. The mottle only
    # nudges how dense they are (uneven pulp), it never draws shapes of its own.
    t = np.clip((tooth - np.quantile(tooth, 0.62)) / (1 - np.quantile(tooth, 0.62)), 0, 1)
    a = t * (1 + 0.35 * mottle) + 0.5 * np.clip(fib, 0, None)
    a = np.clip(a / np.quantile(a, 0.998), 0, 1) * strength * 255
    img = np.zeros((n, n, 4), np.uint8)
    img[..., :3] = rgb
    img[..., 3] = a.astype(np.uint8)
    Image.fromarray(img, "RGBA").save(out, quality=80, alpha_quality=60, method=6)
    print(out.relative_to(ROOT), f"{out.stat().st_size // 1024} KB")


def crease_field(rng, n):
    """Signed field: negative where a fold's facet turns away from the light, positive where it turns toward it.

    The folds are drawn as wandering lines, then lit from the upper right at three widths: a fine ridge at the crease
    itself, and two broader facets either side of it. Lighting along a fixed direction means a fold that runs with
    the light barely shows, as on real paper."""
    lines = np.zeros((n, n))

    def walk(x, y, ang, length, step, turn, weight):
        for _ in range(int(length / step)):
            for t in np.linspace(0, step, int(step * 2)):
                lines[int(y + np.sin(ang) * t) % n, int(x + np.cos(ang) * t) % n] = max(
                    lines[int(y + np.sin(ang) * t) % n, int(x + np.cos(ang) * t) % n], weight)
            x, y = x + np.cos(ang) * step, y + np.sin(ang) * step
            ang += rng.normal(0, turn)

    # folds: long, nearly straight, right across the sheet (the walk wraps, so they join up across the tile's edge)
    for ang0, w in [(rng.uniform(-0.1, 0.1), 1.0), (rng.uniform(1.05, 1.3), 0.85), (rng.uniform(-0.8, -0.6), 0.6)]:
        walk(rng.uniform(0, n), rng.uniform(0, n), ang0, n * 1.0, 24, 0.035, w)
    # crinkles: short, bent, faint, where the sheet was handled
    for _ in range(16):
        walk(rng.uniform(0, n), rng.uniform(0, n), rng.uniform(0, 2 * np.pi), rng.uniform(70, 260), 10, 0.35, rng.uniform(0.25, 0.45))

    light = np.array([1.0, -1.0]) / np.sqrt(2)  # from the upper right, x then y
    f = np.zeros((n, n))
    for sigma, shift, k in [(0.9, 1.5, 0.4), (9, 7, 0.6), (34, 22, 0.9)]:
        dy, dx = int(round(-light[1] * shift)), int(round(-light[0] * shift))
        f += k * (blur(lines, sigma) - blur(np.roll(lines, (dy, dx), (0, 1)), sigma)) * (sigma ** 0.35)
    # the paper never lies perfectly flat: a very soft swell over the whole sheet
    f += 0.15 * norm(blur(rng.normal(size=(n, n)), 160)) * np.abs(f).max()
    return f


def creases(dark, light, strength, out):
    rng = np.random.default_rng(SEED + 1)
    n = 1800
    f = crease_field(rng, n)
    f = f / np.quantile(np.abs(f), 0.9995)
    shade = np.clip(-f, 0, 1)
    shine = np.clip(f, 0, 1)
    img = np.zeros((n, n, 4), np.float64)
    # one colour per pixel: the shadow's where the field dips, the highlight's where it rises
    w = shade / (shade + shine + 1e-9)
    img[..., :3] = w[..., None] * np.array(dark) + (1 - w[..., None]) * np.array(light)
    img[..., 3] = np.clip(np.maximum(shade * strength[0], shine * strength[1]), 0, 1) * 255
    # lossless alpha: at these low alphas, lossy alpha turns soft shading into blotches
    Image.fromarray(img.astype(np.uint8), "RGBA").save(out, quality=80, alpha_quality=100, method=6)
    print(out.relative_to(ROOT), f"{out.stat().st_size // 1024} KB")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    tile((141, 102, 83), 0.13, OUT / "grain.webp")  # warm specks on cream: half ink, half Cream Yellow
    tile((253, 191, 104), 0.07, OUT / "grain-ink.webp")  # Cream Yellow specks on ink
    creases((110, 78, 70), (255, 253, 248), (0.14, 0.55), OUT / "creases.webp")  # on cream
    creases((6, 2, 20), (253, 191, 104), (0.45, 0.07), OUT / "creases-ink.webp")  # on ink


if __name__ == "__main__":
    main()
