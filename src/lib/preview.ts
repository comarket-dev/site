/** Reads a brand's public homepage and pulls what we need to dress a storefront. */

export interface BrandPreview {
  host: string;
  name: string;
  color: string | null;
  icon: string | null;
  image: string | null;
}

const MAX_BYTES = 600_000;

export function normalizeSiteUrl(input: string): URL | null {
  let s = input.trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  let url: URL;
  try {
    url = new URL(s);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const host = url.hostname.toLowerCase();
  if (!host.includes('.') || host.endsWith('.local') || host.endsWith('.internal') || host === 'localhost') return null;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith('[')) return null;
  if (url.port && url.port !== '443' && url.port !== '80') return null;
  url.username = '';
  url.password = '';
  url.hash = '';
  return url;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/** HTMLRewriter hands back raw markup, so decode the entities people actually use in titles and URLs. */
export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** "Fernwood | Onboarding analytics" -> "Fernwood". */
export function cleanName(raw: string | null | undefined, host: string): string {
  const fromHost = host.replace(/^www\./, '').split('.')[0];
  const fallback = fromHost.charAt(0).toUpperCase() + fromHost.slice(1);
  if (!raw) return fallback;
  const first = raw
    .replace(/\s+/g, ' ')
    .split(/\s[|\-\u2013\u2014:\u00b7]\s/)[0]
    .trim();
  if (!first || first.length > 40) return fallback;
  return first;
}

export function cleanColor(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s)) {
    if (s.length === 4) return `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`.toUpperCase();
    return s.toUpperCase();
  }
  const m = s.match(/^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/i);
  if (m) {
    const hex = [m[1], m[2], m[3]].map((v) => Math.min(255, Number(v)).toString(16).padStart(2, '0')).join('');
    return `#${hex}`.toUpperCase();
  }
  return null;
}

/** Truncate a body so a huge page can't run up our CPU time. */
function capped(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  let seen = 0;
  return body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, ctrl) {
        if (seen >= MAX_BYTES) return;
        seen += chunk.byteLength;
        ctrl.enqueue(seen > MAX_BYTES ? chunk.slice(0, chunk.byteLength - (seen - MAX_BYTES)) : chunk);
        if (seen >= MAX_BYTES) ctrl.terminate();
      },
    }),
  );
}

export async function fetchBrandPreview(url: URL): Promise<BrandPreview> {
  const res = await fetch(url.toString(), {
    redirect: 'follow',
    headers: { 'user-agent': 'ComarketPreview/1.0 (+https://comarket.co)', accept: 'text/html' },
    signal: AbortSignal.timeout(4500),
  });
  const finalUrl = new URL(res.url || url.toString());
  const host = finalUrl.hostname.replace(/^www\./, '');
  const found = {
    title: '' as string,
    siteName: null as string | null,
    appName: null as string | null,
    theme: null as string | null,
    image: null as string | null,
    icons: [] as { href: string; size: number; apple: boolean }[],
  };

  if (res.ok && (res.headers.get('content-type') ?? '').includes('html') && res.body) {
    let inTitle = false;
    const rewriter = new HTMLRewriter()
      .on('title', {
        element(el) {
          inTitle = true;
          el.onEndTag(() => {
            inTitle = false;
          });
        },
        text(t) {
          if (inTitle && found.title.length < 200) found.title += t.text;
        },
      })
      .on('meta', {
        element(el) {
          const key = (el.getAttribute('property') || el.getAttribute('name') || '').toLowerCase();
          const content = el.getAttribute('content');
          if (!content) return;
          if (key === 'og:site_name') found.siteName = content;
          else if (key === 'application-name') found.appName = content;
          else if (key === 'theme-color' && !found.theme) found.theme = content;
          else if (key === 'og:image' && !found.image) found.image = content;
        },
      })
      .on('link', {
        element(el) {
          const rel = (el.getAttribute('rel') || '').toLowerCase();
          const href = el.getAttribute('href');
          if (!href || !rel.includes('icon')) return;
          const sizes = el.getAttribute('sizes') || '';
          const size = Number(sizes.split('x')[0]) || (rel.includes('apple') ? 180 : 32);
          found.icons.push({ href, size, apple: rel.includes('apple') });
        },
      });
    await rewriter.transform(new Response(capped(res.body))).arrayBuffer();
  }

  const resolve = (href: string | null) => {
    if (!href) return null;
    try {
      const u = new URL(decodeEntities(href), finalUrl);
      return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
    } catch {
      return null;
    }
  };
  const bestIcon = found.icons.sort((a, b) => Number(b.apple) - Number(a.apple) || b.size - a.size)[0];

  return {
    host,
    name: cleanName(decodeEntities(found.siteName || found.appName || found.title || ''), host),
    color: cleanColor(found.theme),
    icon: resolve(bestIcon?.href ?? '/favicon.ico'),
    image: resolve(found.image),
  };
}
