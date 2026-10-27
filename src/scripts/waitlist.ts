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
  let lastEmail = '';
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
      root.querySelector('[data-mini-url]')!.textContent = `${slug}.comarket.si/creators/sarah`;
      root.querySelectorAll('[data-mini-name]').forEach((n) => (n.textContent = p.name));
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
      // the page's address keeps dots and underscores, as the handle does
      const slug = h.toLowerCase().replace(/[^a-z0-9._]/g, '').slice(0, 24) || 'yourname';
      root.querySelector('[data-hub-handle]')!.textContent = slug;
      root.querySelector('[data-hub-name]')!.textContent = `@${h}`;
      root.querySelector('[data-hub-ava]')!.textContent = h[0].toUpperCase();
    };
    handle.addEventListener('input', update);
    cleanups.push(() => handle.removeEventListener('input', update));
  }

  /* ---------- submit ---------- */
  type Result = { ok: true; passNo: number } | { ok: false; error: string };
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const fail = (k: string, error: string): Result => {
    setErr(k, error);
    return { ok: false, error };
  };
  /** One signup, from this form or from the hero's email step (which passes the email and skips the scroll). */
  const send = async (opts: { email?: string; scroll?: boolean } = {}): Promise<Result> => {
    ['site', 'handle', 'email', 'form'].forEach((k) => setErr(k));
    if (opts.email) form.querySelector<HTMLInputElement>('[name="email"]')!.value = opts.email;
    const fd = new FormData(form);
    const email = String(fd.get('email') || '').trim();
    lastEmail = email;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return fail('email', 'Enter a valid email address.');
    const params = new URLSearchParams(location.search);
    const utm = Object.fromEntries([...params].filter(([k]) => k.startsWith('utm_')));
    // who sent them: the pass number in a member's shared link
    const ref = params.get('ref');
    if (ref && /^\d{1,7}$/.test(ref)) utm.ref = ref;
    const body: Record<string, unknown> = {
      side,
      email,
      turnstile: fd.get('cf-turnstile-response') || undefined,
      referrer: document.referrer || undefined,
      utm,
    };
    if (side === 'brand') {
      const site = String(fd.get('site') || '').trim();
      if (!site) return fail('site', 'Enter your website, like yourapp.com.');
      body.site = site;
      if (preview) body.name = preview.name;
    } else {
      const handle = String(fd.get('handle') || '').trim();
      if (!handle) return fail('handle', 'Enter the handle your audience knows you by.');
      body.handle = handle;
      body.platform = fd.get('platform') || 'other';
    }
    submit.disabled = true;
    const label = submit.innerHTML;
    submit.textContent = 'Joining…';
    const restore = () => {
      submit.disabled = false;
      submit.innerHTML = label;
    };
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        restore();
        return fail(data.field === 'handle' ? 'handle' : 'form', data.error || 'Something went wrong. Try again.');
      }
      await showPass(data, opts.scroll ?? true);
      return { ok: true, passNo: data.passNo };
    } catch {
      restore();
      return fail('form', 'We couldn’t reach the server. Check your connection and try again.');
    }
  };
  const onSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    send();
  };
  form.addEventListener('submit', onSubmit);
  const onJoin = (e: Event) => {
    const { email, done } = (e as CustomEvent<{ email: string; done: (r: Result) => void }>).detail;
    if (form.hidden) return done({ ok: false, error: 'You’re already on the list. Your pass is below.' });
    send({ email, scroll: false }).then(done);
  };
  addEventListener('waitlist:join', onJoin);
  cleanups.push(() => removeEventListener('waitlist:join', onJoin));

  async function showPass(d: { passNo: number; side: 'brand' | 'creator'; label: string; issued: string; returning?: boolean }, scroll = true) {
    const no = String(d.passNo).padStart(4, '0');
    form.hidden = true;
    issued.hidden = false;
    root.querySelector('[data-issued-h]')!.textContent = d.returning ? `Welcome back. You’re No. ${no}.` : `You’re No. ${no}.`;
    root.querySelector('[data-issued-p]')!.textContent =
      d.side === 'brand'
        ? 'We’ll email you once, when your spot opens. Drag the pass to turn it over.'
        : `comarket.si/${d.label.replace(/^@/, '')} is yours. We’ll email you once, when your spot opens.`;
    mountAfter(d);
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
    const text = d.side === 'brand' ? `I’m No. ${no} on the Comarket waitlist. Creators sell for us, and we pay only when they do.` : `I’m No. ${no} on the Comarket waitlist. Paid on every sale I send.`;
    share.href = `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(`${location.origin}/${d.side === 'brand' ? 'brands' : 'creators'}`)}`;
    share.onclick = () => track('pass_shared', { side: d.side });
    if (scroll) issued.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
  }

  /* After the pass: a link to send a creator (it carries the pass number, recorded on their signup) and the optional
     questions, saved against the pass. */
  function mountAfter(d: { passNo: number; side: 'brand' | 'creator' }) {
    const link = `${location.origin}/creators?ref=${d.passNo}`;
    const url = root.querySelector<HTMLElement>('[data-ref-url]');
    if (url) url.textContent = link.replace(/^https?:\/\//, '');
    const copy = root.querySelector<HTMLButtonElement>('[data-ref-copy]');
    if (copy)
      copy.onclick = async () => {
        try {
          await navigator.clipboard.writeText(link);
          copy.textContent = 'Copied';
        } catch {
          copy.textContent = 'Select and copy';
          if (url) getSelection()?.selectAllChildren(url);
        }
        setTimeout(() => (copy.textContent = 'Copy my link'), 2200);
        track('pass_shared', { side: d.side, via: 'link' });
      };
    const profile = root.querySelector<HTMLFormElement>('[data-profile]');
    const saved = root.querySelector<HTMLElement>('[data-profile-saved]');
    if (!profile || !saved) return;
    const close = (msg: string | null) => {
      profile.hidden = true;
      if (msg) {
        saved.textContent = msg;
        saved.hidden = false;
      }
    };
    // nothing to save until something's picked
    const save = profile.querySelector<HTMLButtonElement>('[data-profile-save]');
    profile.onchange = () => {
      if (save) save.disabled = !new FormData(profile).entries().next().value;
    };
    profile.onsubmit = async (e) => {
      e.preventDefault();
      const answers = Object.fromEntries(new FormData(profile).entries());
      if (!Object.keys(answers).length) return close(null);
      const btn = profile.querySelector<HTMLButtonElement>('button[type="submit"]')!;
      btn.disabled = true;
      try {
        const res = await fetch('/api/profile', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ side: d.side, passNo: d.passNo, email: lastEmail, answers }),
        });
        close(res.ok ? 'Saved. That helps us match you.' : 'We couldn’t save that. Your spot is still held.');
      } catch {
        close('We couldn’t save that. Your spot is still held.');
      }
    };
    root.querySelector<HTMLButtonElement>('[data-profile-skip]')!.onclick = () => close(null);
  }

  return () => {
    form.removeEventListener('submit', onSubmit);
    cleanups.forEach((c) => c());
    disposePass?.();
  };
}
