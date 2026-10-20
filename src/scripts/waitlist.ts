/* Waitlist: live preview, signup, then the pass. */
import { track } from './ui';

interface Preview {
  host: string;
  name: string;
  color: string | null;
  icon: string | null;
}

const DEFAULT_BRAND = '#1E6B47';

function slugOf(s: string) {
  return (
    s
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '')
      .slice(0, 24) || 'yourapp'
  );
}

/** Keep a brand color readable as a button on white. */
function usable(color: string | null): string {
  if (!color) return DEFAULT_BRAND;
  const m = color.match(/^#([0-9a-f]{6})$/i);
  if (!m) return DEFAULT_BRAND;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum > 0.82 ? DEFAULT_BRAND : color;
}

export function mountWaitlist(root: HTMLElement): () => void {
  const side = root.dataset.side as 'brand' | 'creator';
  const form = root.querySelector<HTMLFormElement>('[data-form]')!;
  const issued = root.querySelector<HTMLElement>('[data-issued]')!;
  const err = (k: string) => root.querySelector<HTMLElement>(`[data-err="${k}"]`);
  const setErr = (k: string, msg = '') => {
    const e = err(k);
    if (e) e.textContent = msg;
  };
  let preview: Preview | null = null;
  let disposePass: (() => void) | null = null;
  const cleanups: Array<() => void> = [];

  /* ---------- brand preview ---------- */
  if (side === 'brand') {
    const site = form.querySelector<HTMLInputElement>('[name="site"]')!;
    const btn = form.querySelector<HTMLButtonElement>('[data-preview-btn]')!;
    const mini = root.querySelector<HTMLElement>('[data-mini]')!;
    let lastQuery = '';
    const apply = (p: Preview) => {
      preview = p;
      const slug = slugOf(p.name || p.host.split('.')[0]);
      mini.style.setProperty('--brand', usable(p.color));
      root.querySelector('[data-mini-url]')!.textContent = `${slug}.comarket.co/creators/sarah`;
      root.querySelector('[data-mini-lock]')!.textContent = `${p.name.toUpperCase()} × SARAH K.`;
      root.querySelector('[data-mini-name]')!.textContent = p.name;
      const logo = root.querySelector<HTMLElement>('[data-mini-logo]')!;
      logo.style.backgroundImage = p.icon ? `url("${p.icon.replace(/"/g, '')}")` : '';
      mini.classList.remove('bump');
      void mini.offsetWidth;
      mini.classList.add('bump');
      setTimeout(() => mini.classList.remove('bump'), 700);
    };
    const run = async () => {
      const q = site.value.trim();
      if (!q || q === lastQuery) return;
      lastQuery = q;
      setErr('site');
      btn.disabled = true;
      btn.textContent = 'Reading…';
      try {
        const res = await fetch('/api/preview', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ site: q }),
        });
        const data = await res.json();
        if (!res.ok) setErr('site', data.error || 'We couldn’t read that site.');
        else {
          apply(data as Preview);
          track('preview_built', { host: (data as Preview).host });
        }
      } catch {
        setErr('site', 'We couldn’t reach that site. Check the address.');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Preview';
      }
    };
    btn.addEventListener('click', run);
    site.addEventListener('change', run);
    site.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        run();
      }
    });
  }

  /* ---------- creator hub preview ---------- */
  if (side === 'creator') {
    const handle = form.querySelector<HTMLInputElement>('[name="handle"]')!;
    const update = () => {
      const h = handle.value.replace(/^@+/, '').trim() || 'yourname';
      const slug = slugOf(h);
      root.querySelector('[data-hub-handle]')!.textContent = slug;
      root.querySelector('[data-hub-name]')!.textContent = `@${h}`;
      root.querySelector('[data-hub-ava]')!.textContent = h[0].toUpperCase();
    };
    handle.addEventListener('input', update);
    cleanups.push(() => handle.removeEventListener('input', update));
  }

  /* ---------- submit ---------- */
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const onSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    ['site', 'handle', 'email', 'form'].forEach((k) => setErr(k));
    const fd = new FormData(form);
    const email = String(fd.get('email') || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setErr('email', 'Enter a valid email address.');
      return;
    }
    const body: Record<string, unknown> = {
      side,
      email,
      turnstile: fd.get('cf-turnstile-response') || undefined,
      referrer: document.referrer || undefined,
      utm: Object.fromEntries([...new URLSearchParams(location.search)].filter(([k]) => k.startsWith('utm_'))),
    };
    if (side === 'brand') {
      const site = String(fd.get('site') || '').trim();
      if (!site) {
        setErr('site', 'Enter your website, like yourapp.com.');
        return;
      }
      body.site = site;
      if (preview) body.name = preview.name;
    } else {
      const handle = String(fd.get('handle') || '').trim();
      if (!handle) {
        setErr('handle', 'Enter the handle your audience knows you by.');
        return;
      }
      body.handle = handle;
      body.platform = fd.get('platform');
    }
    submit.disabled = true;
    const label = submit.innerHTML;
    submit.textContent = 'Joining…';
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr('form', data.error || 'Something went wrong. Try again.');
        submit.disabled = false;
        submit.innerHTML = label;
        return;
      }
      await showPass(data);
    } catch {
      setErr('form', 'We couldn’t reach the server. Check your connection and try again.');
      submit.disabled = false;
      submit.innerHTML = label;
    }
  };
  form.addEventListener('submit', onSubmit);

  async function showPass(d: { passNo: number; side: 'brand' | 'creator'; label: string; issued: string; returning?: boolean }) {
    const no = String(d.passNo).padStart(4, '0');
    form.hidden = true;
    issued.hidden = false;
    root.querySelector('[data-issued-h]')!.textContent = d.returning ? `Welcome back. You’re No. ${no}.` : `You’re No. ${no}.`;
    root.querySelector('[data-issued-p]')!.textContent =
      d.side === 'brand' ? 'Your spot is held. Drag the pass to turn it over.' : 'Your page is held. Drag the pass to turn it over.';
    const canvas = root.querySelector<HTMLCanvasElement>('[data-pass-canvas]')!;
    const still = root.querySelector<HTMLImageElement>('[data-pass-still]')!;
    let snapshot: () => string;
    try {
      const { mountPass } = await import('./pass');
      const p = await mountPass(canvas, d);
      disposePass = p.dispose;
      snapshot = p.snapshot;
    } catch {
      const { drawPassFront, PASS_W, PASS_H } = await import('./passArt.js');
      const c = document.createElement('canvas');
      c.width = PASS_W;
      c.height = PASS_H;
      drawPassFront(c.getContext('2d')!, { side: d.side, passNo: d.passNo, label: d.label, issued: new Date(d.issued) });
      still.src = c.toDataURL('image/png');
      still.hidden = false;
      canvas.hidden = true;
      snapshot = () => still.src;
    }
    const save = root.querySelector<HTMLButtonElement>('[data-save]')!;
    save.onclick = () => {
      const a = document.createElement('a');
      a.href = snapshot();
      a.download = `comarket-pass-${no}.png`;
      document.body.append(a);
      a.click();
      a.remove();
      track('pass_saved', { side: d.side });
    };
    const share = root.querySelector<HTMLAnchorElement>('[data-share]')!;
    const text = d.side === 'brand' ? `I’m No. ${no} on the Comarket waitlist. Paid only for customers I didn’t have.` : `I’m No. ${no} on the Comarket waitlist. Paid on every customer I bring.`;
    share.href = `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(`${location.origin}/${d.side === 'brand' ? 'brands' : 'creators'}`)}`;
    share.onclick = () => track('pass_shared', { side: d.side });
    issued.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
  }

  return () => {
    form.removeEventListener('submit', onSubmit);
    cleanups.forEach((c) => c());
    disposePass?.();
  };
}
