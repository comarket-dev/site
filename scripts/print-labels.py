"""Print the example brand's labels onto the products in Priya's flat lay, the way ink on a curved surface looks.

Each product is lying on the counter, so each is modelled as a cylinder lying in the photo: an axis, a radius and a
centre, all measured on the photo. The camera looks slightly down the counter, so a ring around a lying cylinder shows
as an arc bowing up by K x its height, exactly like the seam on the jar. The label is drawn flat, then every photo
pixel on the product is traced back to a point on the label (around the curve, and along the axis), so text wraps,
compresses toward the edges and bows with the surface. The ink takes the product's own light and shade.

    ~/.venvs/mflux/bin/python scripts/print-labels.py

Reads design/content/posts/priya-flatlay-a.png, writes priya-flatlay-a.labeled.png next to it.
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "design/content/posts/priya-flatlay-a.png"
OUT = ROOT / "design/content/posts/priya-flatlay-a.labeled.png"
FONTS = ROOT / "design/brands/fonts"
# each brand's own face (design/brands/README.md), so the products match their storefronts
SERIF = str(FONTS / "Newsreader[opsz,wght].ttf")  # Kindred: Newsreader Medium
HOLLOW = str(FONTS / "CormorantGaramond[wght].ttf")  # Hollow: Cormorant Garamond
HOLLOW_ITALIC = str(FONTS / "CormorantGaramond-Italic[wght].ttf")
SANS = "/System/Library/Fonts/HelveticaNeue.ttc"
SANS_INDEX = 10  # Helvetica Neue Medium
INK = np.array([255, 244, 232], dtype=np.float32)
K = 0.2  # how far a ring bows toward the product's base, as a share of its radius (read off the rounded bases)
S = 4  # label pixels per photo pixel


def unit(x, y):
    v = np.array([x, y], dtype=np.float64)
    return v / np.linalg.norm(v)


def flat_label(lines, width):
    """Draw a label flat: lines of (text, font path, size, tracking, gap above), centred, white on clear.
    Sizes are in photo pixels; the label is drawn S times larger."""
    rows = []
    for text, path, size, track, gap in lines:
        f = ImageFont.truetype(path, round(size * S), index=SANS_INDEX if path == SANS else 0)
        if path == SERIF:
            f.set_variation_by_axes([500, 36])  # weight, optical size
        widths = [f.getlength(ch) for ch in text]
        w = sum(widths) + track * S * (len(text) - 1)
        asc, desc = f.getmetrics()
        rows.append((text, f, widths, w, asc + desc, track, gap))
    H = sum(r[4] + r[6] * S for r in rows) + 8 * S
    W = round(width * S)
    im = Image.new("L", (W, round(H)), 0)
    d = ImageDraw.Draw(im)
    y = 4 * S
    for text, f, widths, w, h, track, gap in rows:
        y += gap * S
        x = (W - w) / 2
        for ch, cw in zip(text, widths):
            d.text((x, y), ch, font=f, fill=255)
            x += cw + track * S
        y += h
    return np.asarray(im, dtype=np.float32) / 255


def drop_icon(size):
    """The Kindred drop mark, drawn as a small outline above the name on the serum."""
    s = round(size * S)
    im = Image.new("L", (s, s), 0)
    d = ImageDraw.Draw(im)
    w = max(2, round(s * 0.09))
    pts = []
    for i in range(41):
        a = np.pi * (i / 40)
        pts.append((s / 2 + np.cos(a + np.pi) * s * 0.3 * -1, s * 0.62 + np.sin(a) * s * 0.3))
    d.line([(s / 2, s * 0.08)] + [(s * 0.2, s * 0.6)], fill=255, width=w)
    d.line([(s / 2, s * 0.08)] + [(s * 0.8, s * 0.6)], fill=255, width=w)
    d.arc([s * 0.2, s * 0.32, s * 0.8, s * 0.92], 0, 180, fill=255, width=w)
    return np.asarray(im, dtype=np.float32) / 255


def sample(img, x, y):
    """Bilinear sample of a 2D array at float coordinates; 0 outside."""
    h, w = img.shape
    x0 = np.floor(x).astype(int)
    y0 = np.floor(y).astype(int)
    fx = x - x0
    fy = y - y0
    out = np.zeros_like(x, dtype=np.float32)
    for dy in (0, 1):
        for dx in (0, 1):
            xi = x0 + dx
            yi = y0 + dy
            ok = (xi >= 0) & (xi < w) & (yi >= 0) & (yi < h)
            wgt = (fx if dx else 1 - fx) * (fy if dy else 1 - fy)
            out[ok] += wgt[ok] * img[yi[ok], xi[ok]]
    return out


def print_on(photo, label, *, centre, axis, radius, taper=0.0, height=1.0, around=True, flip=False, box, bow=K):
    """Trace each photo pixel in `box` back onto a lying cylinder and pick up the label there.
    centre: where the label's middle meets the surface's ridge line (photo px, before the bow). axis: unit vector
    along the cylinder. radius: at the centre; taper: change per px along the axis. height: how round the cross
    section is (1 a cylinder, less for a flattened tube). around: text wraps around the cylinder (else it runs along
    it). flip: read the other way."""
    x0, y0, x1, y1 = box
    # trace a 3 x 3 grid per photo pixel and average, so thin strokes stay whole instead of breaking up
    k = 3
    off = (np.arange(k) + 0.5) / k - 0.5
    ys, xs = np.mgrid[y0:y1, x0:x1].astype(np.float64)
    ys = (ys[:, :, None, None] + off[None, None, :, None]).repeat(k, 3)
    xs = (xs[:, :, None, None] + off[None, None, None, :]).repeat(k, 2)
    ax = np.asarray(axis)
    n = np.array([ax[1], -ax[0]])  # across: a quarter turn from the axis, so the text reads left to right
    dx = xs - centre[0]
    dy = ys - centre[1]
    cos = np.ones_like(dx)
    t = np.zeros_like(dx)
    sin = np.zeros_like(dx)
    for _ in range(6):
        r = radius + taper * t
        # undo the bow: on the ridge a ring sits K x height x r further toward the base than at its ends, the same
        # way the product's rounded base bows, so the print follows the shape the eye reads
        qx = dx - bow * height * r * cos * ax[0]
        qy = dy - bow * height * r * cos * ax[1]
        sin = np.clip((qx * n[0] + qy * n[1]) / r, -0.999, 0.999)
        t = qx * ax[0] + qy * ax[1]
        cos = np.sqrt(1 - sin**2)
    r = radius + taper * t
    s = r * np.arcsin(sin)  # distance around the surface from the ridge
    if around:
        lx, ly = s, t
    else:
        lx, ly = -t, s
    if flip:
        lx, ly = -lx, -ly
    h, w = label.shape
    a = sample(label, lx * S + w / 2, ly * S + h / 2)
    a *= np.clip((0.985 - np.abs(sin)) / 0.2, 0, 1)  # ink thins out as the surface turns away
    a = a.mean(axis=(2, 3))
    region = photo[y0:y1, x0:x1]
    lum = region.mean(axis=2, keepdims=True)
    ref = np.median(lum[a > 0.3]) if (a > 0.3).any() else lum.mean()
    shade = np.clip(lum / ref, 0.55, 1.3)
    ink = INK[None, None, :] * (0.25 + 0.75 * shade)
    alpha = (a * 0.94)[..., None]
    region[:] = region * (1 - alpha) + np.minimum(ink, 255) * alpha


def tin_label(photo):
    """A paper label pasted into the tea tin's recessed panel. The tin's front face is turned a little, so the panel is
    a quad: its top and bottom edges slope down to the right like the lid and base. The paper takes the tin's light
    (darker to the left, where the face turns from the window) and the panel's soft shadow at its top edge."""
    W, H = 300, 380
    u = 4  # drawn at 4x the label's design size
    im = Image.new("RGB", (W * u, H * u), (230, 222, 203))
    d = ImageDraw.Draw(im)
    green = (62, 88, 70)
    def centred(text, path, size, y, track=0.0, index=0, weight=None):
        f = ImageFont.truetype(path, round(size * u), index=index)
        if weight:
            f.set_variation_by_axes([weight])
        widths = [f.getlength(ch) for ch in text]
        w = sum(widths) + track * u * (len(text) - 1)
        x = (im.width - w) / 2
        for ch, cw in zip(text, widths):
            d.text((x, y * u), ch, font=f, fill=green)
            x += cw + track * u
    # the cup mark
    cx, cy = im.width / 2, 74 * u
    lw = max(2, round(4 * u))
    d.arc([cx - 26 * u, cy - 18 * u, cx + 22 * u, cy + 30 * u], 0, 180, fill=green, width=lw)
    d.line([cx - 26 * u, cy + 6 * u, cx + 22 * u, cy + 6 * u], fill=green, width=lw)
    d.arc([cx + 14 * u, cy + 2 * u, cx + 36 * u, cy + 22 * u], -90, 90, fill=green, width=lw)
    centred("HOLLOW", HOLLOW, 50, 116, track=6, weight=600)
    d.line([im.width / 2 - 40 * u, 190 * u, im.width / 2 + 40 * u, 190 * u], fill=green, width=max(1, u * 2))
    centred("smoky oolong", HOLLOW_ITALIC, 28, 210, weight=500)
    centred("no. 32", HOLLOW_ITALIC, 28, 244, weight=500)
    centred("LOOSE LEAF  ·  100 G", SANS, 11, 318, track=3, index=SANS_INDEX)
    # the panel on the photo, measured: top left, top right, bottom right, bottom left
    quad = [(484, 680), (626, 699), (626, 884), (484, 866)]
    # map the photo's box back onto the label (PIL's perspective transform runs from output to input)
    xs = [q[0] for q in quad]; ys = [q[1] for q in quad]
    bx0, by0, bx1, by1 = min(xs) - 1, min(ys) - 1, max(xs) + 2, max(ys) + 2
    SS = 4  # warp at 4x the photo's resolution, then scale down, so edges and small type stay smooth
    dst = [((x - bx0) * SS, (y - by0) * SS) for x, y in quad]
    src = [(0, 0), (im.width, 0), (im.width, im.height), (0, im.height)]
    A = []
    B = []
    for (x, y), (X, Y) in zip(dst, src):
        A += [[x, y, 1, 0, 0, 0, -X * x, -X * y], [0, 0, 0, x, y, 1, -Y * x, -Y * y]]
        B += [X, Y]
    coef = np.linalg.solve(np.array(A, dtype=np.float64), np.array(B, dtype=np.float64))
    big = ((bx1 - bx0) * SS, (by1 - by0) * SS)
    warped = im.transform(big, Image.PERSPECTIVE, tuple(coef), Image.BICUBIC).resize((bx1 - bx0, by1 - by0), Image.LANCZOS)
    mask = Image.new("L", im.size, 255).transform(big, Image.PERSPECTIVE, tuple(coef), Image.BICUBIC).resize((bx1 - bx0, by1 - by0), Image.LANCZOS)
    lab = np.asarray(warped, dtype=np.float32)
    m = np.asarray(mask, dtype=np.float32)[..., None] / 255
    region = photo[by0:by1, bx0:bx1]
    lum = region.mean(axis=2, keepdims=True)
    shade = np.clip(lum / np.median(lum[m[..., 0] > 0.5]), 0.7, 1.25)
    # a soft shadow along the panel's top edge, where the paper sits just inside the recess
    yy = np.arange(region.shape[0])[:, None, None] - (np.linspace(680, 699, region.shape[1])[None, :, None] - by0)
    lip = 1 - 0.18 * np.exp(-np.clip(yy, 0, None) / 4)
    paper = lab * (0.35 + 0.65 * shade) * lip
    region[:] = region * (1 - m * 0.97) + paper * (m * 0.97)


def main():
    photo = np.asarray(Image.open(SRC).convert("RGB")).astype(np.float32)

    # jar, standing, lid up. Measured from its pixels: sides at x 365 and 565 (radius 100); its rings tilt 6.3 degrees,
    # rising to the right (the seam and the base agree). The generated seam arches up a little while the base smiles
    # down, but the eye reads the jar from above, as the lid and base show, so the print smiles too: a little less than
    # the base, as a ring partway up would. Its middle sits at y 560, in the upper half of the body below the seam
    jar_axis = unit(0.110, 0.994)
    jar_bow = 0.16
    jar = flat_label([("kindred", SERIF, 40, 0.6, 0), ("REPAIR CREAM", SANS, 9.4, 2.4, 7)], 200)
    # the bow pushes the label's middle toward the base by bow x radius, so start that much higher
    jar_centre = (465.0 - jar_bow * 100 * jar_axis[0], 560.0 - jar_bow * 100 * jar_axis[1])
    print_on(photo, jar, centre=jar_centre, axis=jar_axis, radius=100, around=True, box=(340, 480, 600, 700), bow=jar_bow)

    # serum, on its side, neck up and to the left: axis through (242, 700) and (287, 800), 73 px radius
    ser_axis = unit(0.41, 0.912)
    name = flat_label([("kindred", SERIF, 36, 0.5, 0), ("BARRIER SERUM", SANS, 9.0, 2.2, 6)], 180)
    icon = drop_icon(13)
    ser = np.zeros((name.shape[0] + icon.shape[0] + 3 * S, name.shape[1]), dtype=np.float32)
    ox = (ser.shape[1] - icon.shape[1]) // 2
    ser[: icon.shape[0], ox : ox + icon.shape[1]] = icon
    ser[icon.shape[0] + 3 * S :] = name
    print_on(photo, ser, centre=(262.0, 745.0), axis=ser_axis, radius=73, around=True, box=(140, 600, 420, 900))

    # tube, flattened, cap down and to the left: 68 px half-width at y 700 narrowing to 58.5 at y 900; text runs
    # along it, reading from the cap toward the crimp
    tube_axis = unit(-0.351, 0.936)
    tube = flat_label([("kindred", SERIF, 44, 0.8, 0), ("GENTLE CLEANSER", SANS, 9.0, 2.4, 6)], 230)
    print_on(photo, tube, centre=(653.0, 790.0), axis=tube_axis, radius=63.7, taper=-0.0445, height=0.45, around=False, box=(500, 600, 800, 1000))

    out = Image.fromarray(np.clip(photo, 0, 255).astype(np.uint8))
    tea = np.asarray(Image.open(ROOT / "design/content/posts/ama-pour2-a.png").convert("RGB")).astype(np.float32)
    tin_label(tea)
    Image.fromarray(np.clip(tea, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.35)).save(ROOT / "design/content/posts/ama-pour2-a.labeled.png")
    # a breath of softness, so the print sits in the photo's focus rather than on top of it
    soft = out.filter(ImageFilter.GaussianBlur(0.45))
    mask = Image.fromarray((np.abs(photo - np.asarray(Image.open(SRC).convert("RGB"), dtype=np.float32)).sum(2) > 2).astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(3))
    out.paste(soft, (0, 0), mask)
    out.save(OUT)
    print("wrote", OUT.relative_to(ROOT))


if __name__ == "__main__":
    main()
