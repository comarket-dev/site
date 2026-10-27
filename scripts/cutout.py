"""Lift the person out of a photo with macOS Vision, then matte the edge for how the cutout will be used.

    ~/.venvs/mflux/bin/python scripts/cutout.py <photo.png> <out.png> soft|crisp

soft:  an imperfect live key, like TikTok's green screen: a soft edge with a little of the room showing through.
crisp: a designer's cutout for a thumbnail.

Runs on macOS with pyobjc-framework-Vision, pyobjc-framework-Quartz, numpy and Pillow (all in ~/.venvs/mflux).
Output goes in design/posts/keys, where scripts/render-posts.py picks it up.
"""
import sys

import numpy as np
import Quartz
import Vision
from Foundation import NSURL
from PIL import Image, ImageFilter


def person_alpha(path: str) -> Image.Image:
    handler = Vision.VNImageRequestHandler.alloc().initWithURL_options_(NSURL.fileURLWithPath_(path), None)
    req = Vision.VNGenerateForegroundInstanceMaskRequest.alloc().init()
    ok, err = handler.performRequests_error_([req], None)
    if not ok or not req.results():
        raise SystemExit(f"no subject found in {path}: {err}")
    obs = req.results()[0]
    buf, err = obs.generateMaskedImageOfInstances_fromRequestHandler_croppedToInstancesExtent_error_(obs.allInstances(), handler, False, None)
    if buf is None:
        raise SystemExit(f"mask failed: {err}")
    ci = Quartz.CIImage.imageWithCVPixelBuffer_(buf)
    cg = Quartz.CIContext.context().createCGImage_fromRect_(ci, ci.extent())
    w, h = int(ci.extent().size.width), int(ci.extent().size.height)
    data = Quartz.CGDataProviderCopyData(Quartz.CGImageGetDataProvider(cg))
    arr = np.frombuffer(bytes(data), dtype=np.uint8).reshape(h, Quartz.CGImageGetBytesPerRow(cg) // 4, 4)[:, :w]
    return Image.fromarray(arr[..., 3].copy())


def main():
    src, out, mode = sys.argv[1:4]
    a = person_alpha(src)
    if mode == "soft":
        grown = a.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(3.2))
        k = np.clip((np.asarray(grown).astype(np.float32) / 255 - 0.08) / 0.8, 0, 1) ** 1.15
        a = Image.fromarray((k * 255).astype(np.uint8))
    else:
        a = a.filter(ImageFilter.GaussianBlur(0.6))
    rgba = Image.open(src).convert("RGB")
    rgba.putalpha(a)
    rgba.save(out)
    print(out)


if __name__ == "__main__":
    main()
