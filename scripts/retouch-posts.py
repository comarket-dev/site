"""Hand retouches on generated source shots, done like a healing brush: the patched area takes its tone from its own
surroundings and only its fine texture from somewhere clean nearby, so no patch edge or tone shift shows.
Reads <id>.png, keeps it untouched, writes <id>.fixed.png next to it.

    ~/.venvs/mflux/bin/python scripts/retouch-posts.py
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

POSTS = Path(__file__).resolve().parent.parent / "design/content/posts"


def poly_mask(size, polygon, blur=0.0):
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).polygon(polygon, fill=255)
    if blur:
        m = m.filter(ImageFilter.GaussianBlur(blur))
    return np.asarray(m).astype(np.float32) / 255


def blur(a, sigma):
    """Separable gaussian on a float array (H, W) or (H, W, C)."""
    r = max(1, int(3 * sigma))
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2)
    k /= k.sum()
    pad = [(r, r), (r, r)] + [(0, 0)] * (a.ndim - 2)
    p = np.pad(a, pad, mode="edge")
    p = np.apply_along_axis(lambda v: np.convolve(v, k, mode="valid"), 0, p)
    return np.apply_along_axis(lambda v: np.convolve(v, k, mode="valid"), 1, p)


def diffuse(a, unknown, domain, iters=700):
    """Fill unknown pixels with a smooth membrane stretched from the known pixels of the same material (a harmonic
    fill). Pixels outside the domain don't count, so phone never bleeds into shirt or brow into skin."""
    out = a.copy()
    known = domain & ~unknown
    out[unknown] = a[known].mean(0)
    dom = domain.astype(np.float32)[..., None]
    for _ in range(iters):
        v = out * dom
        s = np.roll(v, 1, 0) + np.roll(v, -1, 0) + np.roll(v, 1, 1) + np.roll(v, -1, 1)
        c = np.roll(dom, 1, 0) + np.roll(dom, -1, 0) + np.roll(dom, 1, 1) + np.roll(dom, -1, 1)
        out[unknown] = (s / np.maximum(c, 1))[unknown]
    return out


def detail(src, sigma=2.0):
    return src - blur(src, sigma)


def lum(a):
    return a[..., 0] * 0.299 + a[..., 1] * 0.587 + a[..., 2] * 0.114


def jonah():
    """The pinkie fades into the phone as if it grows out of it. Remove it, as if it's tucked under the phone."""
    im = Image.open(POSTS / "jonah-thumb-a.png").convert("RGB")
    full = np.asarray(im).astype(np.float32)
    x0, y0, x1, y1 = 270, 650, 400, 760  # work in a crop
    a = full[y0:y1, x0:x1]
    h, w = a.shape[:2]
    pinkie = [(293, 698), (304, 692), (320, 687), (331, 684), (340, 682), (350, 686), (356, 701), (355, 717), (350, 730),
              (339, 738), (326, 742), (312, 743), (301, 736), (293, 722)]
    pin = poly_mask(im.size, pinkie)[y0:y1, x0:x1]
    pin_soft = poly_mask(im.size, pinkie, 1.4)[y0:y1, x0:x1][..., None]

    # the phone: right edge at x 330, bottom at y 744, corner rounded about (318, 732)
    yy, xx = np.mgrid[y0:y1, x0:x1]
    phone = (xx <= 330) & (yy <= 744) & ~((xx > 318) & (yy > 732) & ((xx - 318) ** 2 + (yy - 732) ** 2 > 144))
    phone_aa = blur(phone.astype(np.float32), 0.6)[..., None]

    # phone back: tone from the phone around it, grain from the clean band between the fingers
    hole = blur(pin, 1.0) > 0.02
    # one strip of clean phone back as wide as the work area, column for column, so its grain never repeats sideways
    band = full[678:688, x0:x0 + 62]
    stack = np.concatenate([band, band[::-1]], 0)
    grain = np.zeros_like(a)
    col = np.tile(stack, (int(np.ceil(h / stack.shape[0])), 1, 1))[:h]
    grain[:, :62] = col
    phone_fill = diffuse(a, hole & phone, phone & ((lum(a) < 80) | hole)) + detail(grain)

    # shirt: tone from the shirt around it, texture from 32 px to the right
    shifted = full[y0:y1, x0 + 32:x1 + 32]
    shirt_fill = diffuse(a, hole & ~phone, ~phone & ((lum(a) > 110) | hole)) + detail(shifted)

    fill = phone_aa * phone_fill + (1 - phone_aa) * shirt_fill
    full[y0:y1, x0:x1] = a * (1 - pin_soft) + fill * pin_soft
    Image.fromarray(full.clip(0, 255).astype(np.uint8)).save(POSTS / "jonah-thumb-a.fixed.png")


def devon():
    """Stray hairs drip below the raised brow's inner end, and a tuft spikes off its tail. Heal both with nearby skin."""
    im = Image.open(POSTS / "devon-thumb-b.png").convert("RGB")
    full = np.asarray(im).astype(np.float32)
    x0, y0, x1, y1 = 420, 240, 590, 335
    a = full[y0:y1, x0:x1]
    spots = [
        # polygon, where clean skin texture is (dx)
        ([(456, 296), (468, 294), (478, 297), (485, 300), (486, 306), (482, 313), (470, 318), (458, 316), (454, 306)], -26),
        ([(525, 264), (542, 264), (545, 272), (540, 278), (528, 278), (523, 272)], 22),
    ]
    masks = [poly_mask(im.size, p)[y0:y1, x0:x1] for p, _ in spots]
    hole = blur(np.maximum(*masks), 1.0) > 0.02
    skin = (lum(a) > 90) & ((a[..., 0] - a[..., 2]) > 40)
    tone = diffuse(a, hole, skin | hole)
    for (p, dx), m in zip(spots, masks):
        texture = detail(full[y0:y1, x0 + dx:x1 + dx], 1.8)
        soft = poly_mask(im.size, p, 2.2)[y0:y1, x0:x1][..., None]
        a = a * (1 - soft) + (tone + texture) * soft
    full[y0:y1, x0:x1] = a
    Image.fromarray(full.clip(0, 255).astype(np.uint8)).save(POSTS / "devon-thumb-b.fixed.png")


if __name__ == "__main__":
    jonah()
    devon()
    print("wrote jonah-thumb-a.fixed.png, devon-thumb-b.fixed.png")
