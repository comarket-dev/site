"""Render the media inside the example posts and write web-size JPEGs to public/assets/posts.

Each post on the site is real HTML (src/components/examples/posts) around one piece of media: a video frame, a
thumbnail, a photo or a screenshot. That media is composed in design/posts/media/*.html from the generated source
shots, then degraded the way its platform degrades it (a re-encoded video is soft and blocky, a thumbnail is a
compressed JPEG). The people are real photos in design/content/real, sources and licenses in
design/content/real-creators.json (iStock, not Pexels: Pexels forbids implying endorsement). Avatars are square crops of one photo per creator; each storefront gets a crop of
another (STORES).

    python3 scripts/render-posts.py           everything
    python3 scripts/render-posts.py avatars   only the face crops and storefront photos
    python3 scripts/render-posts.py sarah-chart imani-slide   only those media
    python3 scripts/render-posts.py --from-raw devon-thumb   degrade and export design/posts/build/<name>.raw.png
                                                             screenshotted some other way (a session without
                                                             Playwright for Python: Node Playwright works the same)

Needs Playwright for Python and Google Chrome. Cutouts in design/posts/keys come from scripts/cutout.py.
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "design/posts/media"
BUILD = ROOT / "design/posts/build"
OUT = ROOT / "public/assets/posts"
REAL = ROOT / "design/content/real"
STORE_OUT = ROOT / "public/assets/stores"

# media page: (css width, css height, device scale, how its platform treats it, web export width or None)
MEDIA = {
    "lena-page": (360, 780, 3, "shot", None),  # the phone screenshot behind Lena's green screen
    "lena-tiktok": (360, 640, 3, "video", 720),
    "alma-tiktok": (360, 640, 3, "video", 720),
    "imani-slide": (360, 450, 3, "photo", 720),
    "devon-thumb": (640, 360, 2, "thumb", 800),
    "jonah-thumb": (640, 360, 2, "thumb", 800),
    "sarah-chart": (600, 300, 2, "shot", 800),
    "mika-shot": (600, 336, 2, "shot", 800),
    "theo-shot": (600, 338, 2, "shot", 800),
}

# avatar crops, one photo per creator in design/content/real: photo, centre x, centre y, side, all in its pixels
AVATARS = {
    "sarah": ("sarah-6764188", 1046, 838, 1201),
    "devon": ("devon-8370788", 1117, 1165, 911),
    "lena": ("lena-6347880", 984, 1516, 1077),
    "mika": ("mika-9553911", 900, 960, 1300),
    "imani": ("imani-5938601", 2250, 760, 1500),
    "theo": ("theo-4339952", 1155, 698, 920),
    "jonah": ("jonah-18935832", 1007, 1580, 1900),
    "alma": ("alma-6634928", 800, 1000, 1500),
}

# the photo inside each storefront (public/assets/stores/<brand>.jpg): photo, crop box (x0, y0, x1, y1) in its
# pixels, web width. Shops label their products first (scripts/print-labels.py writes <photo>.labeled.jpg).
STORES = {}

# the creator's photo beside their note on the storefront (public/assets/stores/creators/<creator>.jpg), 4:5: photo,
# crop box (x0, y0, x1, y1) in its pixels. A different shot from the avatar where the shoot has one.
SHOTS = {
    "sarah": ("sarah-6763899", (200, 0, 1802, 2003)),
    "devon": ("devon-8370427", (550, 0, 2150, 2000)),
    "lena": ("lena-6347901", (0, 0, 2000, 2500)),
    "mika": ("mika-9553911", (0, 250, 2000, 2750)),
    "imani": ("imani-5938601", (1650, 150, 3000, 1837)),
    "theo": ("theo-4339953", (1400, 0, 3000, 2000)),
    "jonah": ("jonah-18935833", (1270, 0, 2870, 2000)),
    "alma": ("alma-6634928", (0, 150, 2000, 2650)),
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


def export(name):
    """Degrade one rendered page (BUILD/<name>.raw.png) the way its platform would, and write the web copy."""
    w, h, dpr, kind, web_w = MEDIA[name]
    im = degrade(BUILD / f"{name}.raw.png", kind)
    im.save(BUILD / f"{name}.jpg", quality=QUALITY[kind], subsampling=2)  # other media pages may use it
    if web_w:
        web = im.resize((web_w, round(web_w * im.height / im.width)), Image.LANCZOS)
        web.save(OUT / f"{name.split('-')[0]}.jpg", quality=QUALITY[kind], subsampling=2, optimize=True, progressive=True)
    print("rendered", name, flush=True)


def main(only=()):
    from playwright.sync_api import sync_playwright

    BUILD.mkdir(parents=True, exist_ok=True)
    (OUT / "avatars").mkdir(parents=True, exist_ok=True)
    with sync_playwright() as pw:
        b = pw.chromium.launch(channel="chrome", args=["--allow-file-access-from-files"])
        pages = {dpr: b.new_page(device_scale_factor=dpr) for dpr in (2, 3)}
        for name, (w, h, dpr, kind, _web) in MEDIA.items():
            if only and name not in only:
                continue
            pg = pages[dpr]
            pg.set_viewport_size({"width": w, "height": h})
            pg.goto((SRC / f"{name}.html").as_uri())
            pg.wait_for_timeout(400)
            pg.screenshot(path=str(BUILD / f"{name}.raw.png"), clip={"x": 0, "y": 0, "width": w, "height": h})
            export(name)
        b.close()
    if not only:
        avatars()


def avatars():
    """Square crops of each creator's avatar photo: 128px avatars for posts and storefronts, 320px for the stage phone
    and anywhere a face is shown large. Then each storefront's photo."""
    for size, folder in ((128, "avatars"), (320, "portraits")):
        (OUT / folder).mkdir(parents=True, exist_ok=True)
        for cid, (photo, cx, cy, side) in AVATARS.items():
            im = Image.open(REAL / f"{photo}.jpg").convert("RGB")
            box = (cx - side // 2, cy - side // 2, cx + side // 2, cy + side // 2)
            im.crop(box).resize((size, size), Image.LANCZOS).save(OUT / folder / f"{cid}.jpg", quality=84, optimize=True)
    print("avatars and portraits", ", ".join(AVATARS))
    STORE_OUT.mkdir(parents=True, exist_ok=True)
    for brand, (photo, box, width) in STORES.items():
        src = REAL / f"{photo}.labeled.jpg"
        im = Image.open(src if src.exists() else REAL / f"{photo}.jpg").convert("RGB").crop(box)
        im = im.resize((width, round(width * im.height / im.width)), Image.LANCZOS)
        im.save(STORE_OUT / f"{brand}.jpg", quality=82, optimize=True, progressive=True)
    print("storefront photos", ", ".join(STORES))
    (STORE_OUT / "creators").mkdir(parents=True, exist_ok=True)
    for cid, (photo, box) in SHOTS.items():
        im = Image.open(REAL / f"{photo}.jpg").convert("RGB").crop(box).resize((256, 320), Image.LANCZOS)
        im.save(STORE_OUT / "creators" / f"{cid}.jpg", quality=84, optimize=True, progressive=True)
    print("creator photos", ", ".join(SHOTS))


if __name__ == "__main__":
    import sys

    # python3 scripts/render-posts.py avatars: only the face crops; with media names, only those media
    args = sys.argv[1:]
    if args[:1] == ["--from-raw"]:
        for name in args[1:]:
            export(name)
    elif args == ["avatars"]:
        avatars()
    else:
        main(tuple(args))
