"""Render the creators' example post images locally, each from the creator's reference portrait.

    python3 scripts/gen-posts.py              # every post not rendered yet
    python3 scripts/gen-posts.py lena-tiktok  # just these
    python3 scripts/gen-posts.py --force      # re-render even the finished ones

Edits use FLUX.2 klein 4B (Apache-2.0) through mflux; shots without a face use Z-Image Turbo.
Output: design/content/posts/<id>.png
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SPEC = json.loads((ROOT / "design/content/posts.json").read_text())
CREATORS = ROOT / "design/content/creators"
OUT = ROOT / "design/content/posts"
VENV = Path.home() / ".venvs/mflux/bin"

force = "--force" in sys.argv
only = {a for a in sys.argv[1:] if not a.startswith("--")}
OUT.mkdir(parents=True, exist_ok=True)
for p in SPEC["posts"]:
    if only and p["id"] not in only:
        continue
    w, h = p["size"]
    dest = OUT / f"{p['id']}.png"
    if dest.exists() and not force and not only:
        print(f"✓ {p['id']} (already rendered)", flush=True)
        continue
    dest.unlink(missing_ok=True)  # mflux won't overwrite
    prompt = f"{p['prompt']} {SPEC['style']}"
    print(f"→ {p['id']}", flush=True)
    if p["kind"] == "still-noref":
        cmd = [str(VENV / "mflux-generate-z-image-turbo"), "-q", "8"]
    else:
        cmd = [str(VENV / "mflux-generate-flux2-edit"), "--model", "flux2-klein-4b", "-q", "8",
               "--image-paths", str(CREATORS / f"{p['creator']}.png")]
    cmd += ["--width", str(w), "--height", str(h), "--seed", str(p["seed"]), "--output", str(dest), "--prompt", prompt]
    subprocess.run(cmd, check=True)
print("done")
