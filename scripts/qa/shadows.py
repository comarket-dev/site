"""Find CSS box shadows cut off by an ancestor's overflow, on the fork and both heroes at desktop and phone width.

    python3 scripts/qa/shadows.py

Side cuts by div.deck are the spotlight's intended edge fade. Shadows drawn in the 3D canvas aren't covered.
"""
from playwright.sync_api import sync_playwright
JS = r"""() => {
  const out = [];
  const parse = (s) => { // rough extent of the largest shadow: offset + blur + spread
    if (!s || s === 'none') return null;
    let ext = { t: 0, r: 0, b: 0, l: 0 };
    for (const part of s.split(/,(?![^(]*\))/)) {
      if (/inset/.test(part)) continue;
      const nums = (part.replace(/rgba?\([^)]*\)|#[0-9a-f]+|oklch\([^)]*\)/gi, '').match(/-?[\d.]+px/g) || []).map(parseFloat);
      const [x = 0, y = 0, blur = 0, spread = 0] = nums;
      const reach = blur + spread;
      ext.t = Math.max(ext.t, reach - y); ext.b = Math.max(ext.b, reach + y); ext.l = Math.max(ext.l, reach - x); ext.r = Math.max(ext.r, reach + x);
    }
    return ext;
  };
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const ext = parse(cs.boxShadow);
    if (!ext) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    // inside a zoomed box (the scaled posts and storefronts) the shadow is in design pixels, the rect in real ones
    const k = 0.6 * (el.currentCSSZoom || 1);
    const box = { t: r.top - ext.t * k, b: r.bottom + ext.b * k, l: r.left - ext.l * k, r: r.right + ext.r * k };
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const as = getComputedStyle(a);
      if (!/(hidden|clip)/.test(as.overflow + as.overflowX + as.overflowY)) continue;
      const ar = a.getBoundingClientRect();
      const cut = [];
      if (/(hidden|clip)/.test(as.overflowY) || /(hidden|clip)/.test(as.overflow)) { if (box.t < ar.top - 1) cut.push('top'); if (box.b > ar.bottom + 1) cut.push('bottom'); }
      if (/(hidden|clip)/.test(as.overflowX) || /(hidden|clip)/.test(as.overflow)) { if (box.l < ar.left - 1) cut.push('left'); if (box.r > ar.right + 1) cut.push('right'); }
      if (cut.length) {
        const name = (e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
        out.push(`${name(el)} cut ${cut.join('+')} by ${name(a)}`);
        break;
      }
    }
  }
  return [...new Set(out)];
}"""
with sync_playwright() as pw:
    b = pw.chromium.launch(channel="chrome")
    for w, h in ((1440, 900), (390, 844)):
        pg = b.new_page(viewport={"width": w, "height": h})
        for path in ("/?fork=1", "/brands", "/creators"):
            pg.goto("http://localhost:4321" + path, wait_until="networkidle")
            pg.evaluate("document.querySelectorAll('[data-reveal]').forEach(e=>e.classList.add('in'))")
            pg.wait_for_timeout(300)
            res = pg.evaluate(JS)
            print(f"--- {w} {path}: {len(res)}")
            for r in res[:25]: print("   ", r)
        pg.close()
    b.close()
