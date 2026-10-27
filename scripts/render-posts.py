"""Render the media inside the example posts and write web-size JPEGs to public/assets/posts.

Each post on the site is real HTML (src/components/examples/posts) around one piece of media: a video frame, a
thumbnail, a photo or a screenshot. That media is composed in design/posts/media/*.html from the generated source
shots, then degraded the way its platform degrades it (a re-encoded video is soft and blocky, a thumbnail is a
compressed JPEG). Avatars are square crops of the creators' portraits.

    python3 scripts/render-posts.py           everything
    python3 scripts/render-posts.py avatars   only the face crops
    python3 scripts/render-posts.py sarah-chart priya-slide   only those media

Needs Playwright for Python and Google Chrome. Cutouts in design/posts/keys come from scripts/cutout.py.
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "design/posts/media"
BUILD = ROOT / "design/posts/build"
OUT = ROOT / "public/assets/posts"
CREATORS = ROOT / "design/content/creators"

# media page: (css width, css height, device scale, how its platform treats it, web export width or None)
MEDIA = {
    "lena-page": (360, 780, 3, "shot", None),  # the phone screenshot behind Lena's green screen
    "lena-tiktok": (360, 640, 3, "video", 720),
    "ama-tiktok": (360, 640, 3, "video", 720),
    "priya-slide": (360, 450, 3, "photo", 720),
    "devon-thumb": (640, 360, 2, "thumb", 800),
    "jonah-thumb": (640, 360, 2, "thumb", 800),
    "sarah-chart": (600, 300, 2, "shot", 800),
    "mika-shot": (600, 336, 2, "shot", 800),
    "theo-shot": (600, 338, 2, "shot", 800),
}

# avatar crops from each 896x1120 portrait: centre x, centre y, side, all in pixels
AVATARS = {
    "sarah": (450, 330, 440),
    "devon": (530, 420, 440),
    "lena": (490, 390, 460),
    "mika": (426, 370, 440),
    "priya": (480, 340, 440),
    "theo": (516, 340, 420),
    "jonah": (544, 320, 420),
    "ama": (576, 410, 440),
}


def degrade(src: Path, kind: str) -> Image.Image:
    im = Image.open(src).convert("RGB")
    w, h = im.size
    rng = np.random.default_rng(7)
    if kind == "video":
        # a 1080p upload re-encoded and played on a phone: softer, a little noise, heavy compression
        im = im.resize((720, round(720 * h / w)), Image.BILINEAR).filter(ImageFilter.GaussianBlur(0.35))
        a = np.asarray(im).astype(np.float32) + rng.normal(0, 2.6, (im.height, im.width, 1))
        return Image.fromarray(a.clip(0, 255).astype(np.uint8))
    if kind == "photo":
        a = np.asarray(im).astype(np.float32) + rng.normal(0, 2.0, (h, w, 1))
        return Image.fromarray(a.clip(0, 255).astype(np.uint8))
    return im


QUALITY = {"video": 66, "thumb": 80, "photo": 78, "shot": 86}


def main(only=()):
    BUILD.mkdir(parents=True, exist_ok=True)
    (OUT / "avatars").mkdir(parents=True, exist_ok=True)
    with sync_playwright() as pw:
        b = pw.chromium.launch(channel="chrome", args=["--allow-file-access-from-files"])
        pages = {dpr: b.new_page(device_scale_factor=dpr) for dpr in (2, 3)}
        for name, (w, h, dpr, kind, export) in MEDIA.items():
            if only and name not in only:
                continue
            pg = pages[dpr]
            pg.set_viewport_size({"width": w, "height": h})
            pg.goto((SRC / f"{name}.html").as_uri())
            pg.wait_for_timeout(400)
            raw = BUILD / f"{name}.raw.png"
            pg.screenshot(path=str(raw), clip={"x": 0, "y": 0, "width": w, "height": h})
            im = degrade(raw, kind)
            im.save(BUILD / f"{name}.jpg", quality=QUALITY[kind], subsampling=2)  # other media pages may use it
            if export:
                web = im.resize((export, round(export * im.height / im.width)), Image.LANCZOS)
                web.save(OUT / f"{name.split('-')[0]}.jpg", quality=QUALITY[kind], subsampling=2, optimize=True, progressive=True)
            print("rendered", name, flush=True)
        b.close()
    if not only:
        avatars()


def avatars():
    """Square crops of each portrait: 128px avatars for posts and storefronts, 320px for the stage phone and anywhere
    a face is shown large."""
    for size, folder in ((128, "avatars"), (320, "portraits")):
        (OUT / folder).mkdir(parents=True, exist_ok=True)
        for cid, (cx, cy, side) in AVATARS.items():
            im = Image.open(CREATORS / f"{cid}.png").convert("RGB")
            box = (cx - side // 2, cy - side // 2, cx + side // 2, cy + side // 2)
            im.crop(box).resize((size, size), Image.LANCZOS).save(OUT / folder / f"{cid}.jpg", quality=84, optimize=True)
    print("avatars and portraits", ", ".join(AVATARS))


if __name__ == "__main__":
    import sys

    # python3 scripts/render-posts.py avatars: only the face crops; with media names, only those media
    args = sys.argv[1:]
    avatars() if args == ["avatars"] else main(tuple(args))
