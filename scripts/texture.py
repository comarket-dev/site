#!/usr/bin/env python3
"""The page's paper: a seamless grain tile for cream sections and one for the ink bands, and a large crease tile for
each (public/assets/texture/).

Uncoated stock under a raking light: a fine tooth, a softer mottle a few millimetres across, and a few fibres. All of
it is alpha over the section's own colour, so the palette stays the palette. The photos get the same tile on top
(Person.astro), which is what lets them sit in the page instead of on it. See design/texture/README.md.

Creases: a sheet that was handled and smoothed flat again, under the page's one light (upper right). Mostly small
crinkles, kinked and sometimes branching, clustered where it was gripped, and one faint long fold. Both tiles come from
one field, so the creases line up between cream and ink. The tile is 1800px, so it doesn't visibly repeat; the page
anchors it (src/layouts/Base.astro), so a crease runs on across section boundaries.

    python3 scripts/texture.py
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public/assets/texture"
N = 384  # the tile, in CSS pixels, drawn at 1x: on a 2x screen a speck is two pixels, which is how paper tooth reads
SEED = 295  # Wada No. 295
CREASE = 1800  # the crease tile, CSS pixels at 1x


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
    """Signed field: negative where a crease's facet turns away from the light, positive where it turns toward it.

    Mostly small crinkles: many short creases of varied length and direction, kinked, some branching, where the sheet
    was handled. One faint long fold. Each crease is drawn as a line, then lit from the upper right: a fine ridge at
    the crease and a narrow facet either side; the long fold also gets one broad, very soft facet. A crease that runs
    with the light barely shows, as on real paper."""
    small = np.zeros((n, n))
    large = np.zeros((n, n))

    def walk(arr, x, y, ang, length, step, turn, weight, branch=0.0):
        done = 0.0
        while done < length:
            for t in np.linspace(0, step, max(2, int(step * 2))):
                iy, ix = int(y + np.sin(ang) * t) % n, int(x + np.cos(ang) * t) % n
                arr[iy, ix] = max(arr[iy, ix], weight)
            x, y = x + np.cos(ang) * step, y + np.sin(ang) * step
            done += step
            # a kink now and then, otherwise a gentle drift
            ang += rng.normal(0, turn) + (rng.choice([-1, 1]) * rng.uniform(0.35, 0.8) if rng.random() < 0.12 else 0)
            # a branch: a shorter, fainter crease peeling off
            if branch and rng.random() < branch:
                walk(arr, x, y, ang + rng.choice([-1, 1]) * rng.uniform(0.5, 1.2), rng.uniform(15, 60), step, turn,
                     weight * rng.uniform(0.5, 0.8))
            # creases fade toward their ends
            weight *= 0.985

    # crinkles: clustered where the sheet was gripped, plus a sparse scatter everywhere
    centres = rng.uniform(0, n, (7, 2))
    for i in range(260):
        if i < 170:
            cx, cy = centres[rng.integers(len(centres))]
            x, y = cx + rng.normal(0, n * 0.09), cy + rng.normal(0, n * 0.09)
        else:
            x, y = rng.uniform(0, n, 2)
        walk(small, x, y, rng.uniform(0, 2 * np.pi), rng.uniform(18, 140), rng.uniform(3, 6), 0.18,
             rng.uniform(0.35, 1.0), branch=0.04)
    # one long fold, slightly bent, right across the tile (wraps, so it joins across the tile's edge)
    walk(large, rng.uniform(0, n), rng.uniform(0, n), rng.uniform(-0.25, 0.25), n, 24, 0.03, 1.0)

    light = np.array([1.0, -1.0]) / np.sqrt(2)  # from the upper right, x then y

    def lit(lines, layers):
        f = np.zeros((n, n))
        for sigma, shift, k in layers:
            dy, dx = int(round(-light[1] * shift)), int(round(-light[0] * shift))
            f += k * (blur(lines, sigma) - blur(np.roll(lines, (dy, dx), (0, 1)), sigma)) * (sigma ** 0.35)
        return f

    fs = lit(small, [(0.6, 1, 0.32), (2.4, 2, 0.62)])
    fl = lit(large, [(0.8, 1.5, 0.3), (6, 5, 0.25), (40, 26, 0.25)])
    fs /= np.quantile(np.abs(fs), 0.9995)
    fl /= np.quantile(np.abs(fl), 0.9995)
    return fs + 0.45 * fl


def creases(field, dark, light, strength, out):
    f = np.clip(field, -1, 1)
    shade = np.clip(-f, 0, 1)
    shine = np.clip(f, 0, 1)
    n = f.shape[0]
    img = np.zeros((n, n, 4), np.float64)
    # one colour per pixel: the shadow's where the field dips, the highlight's where it rises
    w = shade / (shade + shine + 1e-9)
    img[..., :3] = w[..., None] * np.array(dark) + (1 - w[..., None]) * np.array(light)
    a = np.maximum(shade * strength[0], shine * strength[1])
    # alpha in steps of 3/255: invisible at these levels, and it keeps the file small
    img[..., 3] = np.round(np.clip(a, 0, 1) * 255 / 3) * 3
    # lossless alpha: at these low alphas, lossy alpha turns soft shading into blotches
    Image.fromarray(img.astype(np.uint8), "RGBA").save(out, quality=70, alpha_quality=100, method=6)
    print(out.relative_to(ROOT), f"{out.stat().st_size // 1024} KB")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    tile((141, 102, 83), 0.13, OUT / "grain.webp")  # warm specks on cream: half ink, half Cream Yellow
    tile((253, 191, 104), 0.07, OUT / "grain-ink.webp")  # Cream Yellow specks on ink
    # one field for both, so a crease runs on from a cream section into an ink band without a jump
    field = crease_field(np.random.default_rng(SEED + 1), CREASE)
    creases(field, (110, 78, 70), (255, 253, 248), (0.09, 0.34), OUT / "creases.webp")  # on cream
    creases(field, (6, 2, 20), (253, 191, 104), (0.24, 0.04), OUT / "creases-ink.webp")  # on ink


if __name__ == "__main__":
    main()
