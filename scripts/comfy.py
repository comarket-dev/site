"""Minimal Comfy Cloud client for generating the site's example imagery.

The key comes from COMFY_API_KEY in the environment or in .dev.vars (gitignored). Never commit it.

    from comfy import Comfy
    c = Comfy()
    name = c.upload("portrait.png")
    files = c.run(workflow)            # submit, wait, download; returns local paths

Workflows are the ComfyUI API format: {"node_id": {"class_type": ..., "inputs": {...}}}. Nested settings on newer
nodes use dotted names, e.g. "model": "seedream 5.0 pro", "model.size_preset": "...", "model.images.image_1": ["1", 0].
"""
import json
import mimetypes
import os
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path

BASE = "https://cloud.comfy.org"
ROOT = Path(__file__).resolve().parent.parent


def _key() -> str:
    if os.environ.get("COMFY_API_KEY"):
        return os.environ["COMFY_API_KEY"]
    env = ROOT / ".dev.vars"
    if env.exists():
        for line in env.read_text().splitlines():
            if line.startswith("COMFY_API_KEY="):
                return line.split("=", 1)[1].strip()
    raise SystemExit("Set COMFY_API_KEY (or add it to .dev.vars).")


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


class Comfy:
    def __init__(self, out_dir: str | Path = ROOT / "design" / "content" / "out"):
        self.key = _key()
        self.out = Path(out_dir)
        self.out.mkdir(parents=True, exist_ok=True)

    def _req(self, method: str, path: str, body: bytes | None = None, headers: dict | None = None, timeout=120):
        h = {"X-API-Key": self.key, **(headers or {})}
        req = urllib.request.Request(BASE + path, data=body, method=method, headers=h)
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                data = r.read()
                return json.loads(data) if data else None
        except urllib.error.HTTPError as e:
            raise RuntimeError(f"{method} {path} -> {e.code}: {e.read()[:600].decode(errors='replace')}") from None

    def upload(self, path: str | Path) -> str:
        """Upload an input image; returns the name to use in LoadImage."""
        path = Path(path)
        boundary = uuid.uuid4().hex
        ctype = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        parts = [
            f'--{boundary}\r\nContent-Disposition: form-data; name="image"; filename="{path.name}"\r\nContent-Type: {ctype}\r\n\r\n'.encode()
            + path.read_bytes() + b"\r\n",
            f'--{boundary}\r\nContent-Disposition: form-data; name="type"\r\n\r\ninput\r\n'.encode(),
            f'--{boundary}\r\nContent-Disposition: form-data; name="overwrite"\r\n\r\ntrue\r\n'.encode(),
            f"--{boundary}--\r\n".encode(),
        ]
        res = self._req("POST", "/api/upload/image", b"".join(parts), {"Content-Type": f"multipart/form-data; boundary={boundary}"})
        return res.get("name", path.name)

    def submit(self, workflow: dict) -> str:
        # partner nodes (paid models) need the key again inside the request
        body = json.dumps({"prompt": workflow, "extra_data": {"api_key_comfy_org": self.key}}).encode()
        res = self._req("POST", "/api/prompt", body, {"Content-Type": "application/json"})
        if res.get("node_errors"):
            raise RuntimeError(f"node errors: {json.dumps(res['node_errors'])[:1200]}")
        return res["prompt_id"]

    def wait(self, prompt_id: str, timeout_s=1800, every=4.0) -> dict:
        t0 = time.time()
        while time.time() - t0 < timeout_s:
            st = self._req("GET", f"/api/job/{prompt_id}/status")
            state = (st or {}).get("status")
            if state == "success":
                return st
            if state in ("error", "non_retryable_error", "lost", "cancelled"):
                raise RuntimeError(f"job {prompt_id} ended {state}: {json.dumps(st)[:1200]}")
            time.sleep(every)
        raise TimeoutError(prompt_id)

    def outputs(self, prompt_id: str) -> list[dict]:
        """Every output file a finished job produced, as {filename, subfolder, type}."""
        for path in (f"/api/history_v2/{prompt_id}", f"/api/history/{prompt_id}", f"/api/jobs/{prompt_id}"):
            try:
                h = self._req("GET", path)
            except RuntimeError:
                continue
            if not h:
                continue
            job = h.get(prompt_id, h)
            files = []
            for node in (job.get("outputs") or {}).values():
                for kind in ("images", "gifs", "videos", "video", "audio"):
                    for f in node.get(kind, []) or []:
                        if isinstance(f, dict) and f.get("filename"):
                            files.append(f)
            if files:
                return files
        raise RuntimeError(f"no outputs found for {prompt_id}")

    def download(self, f: dict, dest_dir: Path | None = None, name: str | None = None) -> Path:
        from urllib.parse import urlencode

        q = urlencode({"filename": f["filename"], "subfolder": f.get("subfolder", ""), "type": f.get("type", "output")})
        opener = urllib.request.build_opener(_NoRedirect)
        req = urllib.request.Request(f"{BASE}/api/view?{q}", headers={"X-API-Key": self.key})
        try:
            r = opener.open(req, timeout=120)
            data = r.read()
        except urllib.error.HTTPError as e:
            if e.code not in (301, 302, 303, 307, 308):
                raise
            # the signed storage URL must be fetched without our key
            with urllib.request.urlopen(e.headers["Location"], timeout=300) as r2:
                data = r2.read()
        dest = Path(dest_dir or self.out) / (name or f["filename"])
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
        return dest

    def run(self, workflow: dict, dest_dir: Path | None = None, stem: str | None = None) -> list[Path]:
        pid = self.submit(workflow)
        self.wait(pid)
        paths = []
        for i, f in enumerate(self.outputs(pid)):
            ext = Path(f["filename"]).suffix
            paths.append(self.download(f, dest_dir, f"{stem}{'' if i == 0 else f'-{i}'}{ext}" if stem else None))
        return paths
