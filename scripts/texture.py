#!/usr/bin/env python3
"""The page's paper: a seamless grain tile for cream sections and one for the ink bands (public/assets/texture/).

Uncoated stock under a raking light: a fine tooth, a softer mottle a few millimetres across, and a few fibres. All of
it is alpha over the section's own colour, so the palette stays the palette. The photos get the same tile on top
(Person.astro), which is what lets them sit in the page instead of on it. See design/texture/README.md.

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


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    tile((141, 102, 83), 0.2, OUT / "grain.webp")  # warm specks on cream: half ink, half Cream Yellow
    tile((253, 191, 104), 0.1, OUT / "grain-ink.webp")  # Cream Yellow specks on ink


if __name__ == "__main__":
    main()
