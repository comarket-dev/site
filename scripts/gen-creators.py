"""Render the creators' reference portraits locally with Z-Image Turbo (Apache-2.0) through mflux on Apple Silicon.

    python3 scripts/gen-creators.py            # every creator in design/content/creators.json
    python3 scripts/gen-creators.py sarah lena # just these

Needs mflux in ~/.venvs/mflux (Python 3.12, pillow>=12.3,<13). Output: design/content/creators/<id>.png
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SPEC = json.loads((ROOT / "design/content/creators.json").read_text())
OUT = ROOT / "design/content/creators"
BIN = Path.home() / ".venvs/mflux/bin/mflux-generate-z-image-turbo"

only = set(sys.argv[1:])
OUT.mkdir(parents=True, exist_ok=True)
for c in SPEC["creators"]:
    if only and c["id"] not in only:
        continue
    prompt = f"{c['prompt']} {SPEC['style']}"
    dest = OUT / f"{c['id']}.png"
    dest.unlink(missing_ok=True)  # mflux won't overwrite; it would write <id>_1.png instead
    print(f"→ {c['id']}", flush=True)
    subprocess.run(
        [str(BIN), "-q", "8", "--width", "896", "--height", "1120", "--seed", str(c["seed"]), "--output", str(dest), "--prompt", prompt],
        check=True,
    )
print("done")
