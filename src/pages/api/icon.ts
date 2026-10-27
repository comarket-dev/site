import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { fetchBrandPreview, normalizeSiteUrl, type BrandPreview } from '../../lib/preview';

/**
 * A brand's icon, served from our origin so the stage can draw it into a WebGL texture without tainting the canvas.
 * It only serves the icon of a site we have previewed, never an arbitrary URL.
 */
const TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/x-icon', 'image/vnd.microsoft.icon']);
const MAX = 300_000;

const none = (status: number) => new Response(null, { status, headers: { 'cache-control': 'no-store' } });

export const GET: APIRoute = async ({ url }) => {
  const site = normalizeSiteUrl(url.searchParams.get('host') ?? '');
  if (!site) return none(400);
  const host = site.hostname.replace(/^www\./, '');
  const key = `preview:${host}`;
  let preview = await env.EXPERIMENTS?.get<BrandPreview>(key, 'json');
  if (!preview) {
    try {
      preview = await fetchBrandPreview(site);
      await env.EXPERIMENTS?.put(key, JSON.stringify(preview), { expirationTtl: 60 * 60 * 24 });
    } catch {
      return none(404);
    }
  }
  const icon = preview.icon ? normalizeSiteUrl(preview.icon) : null;
  if (!icon) return none(404);

  try {
    const res = await fetch(icon.toString(), {
      redirect: 'follow',
      headers: { 'user-agent': 'ComarketPreview/1.0 (+https://comarket.si)', accept: 'image/*' },
      signal: AbortSignal.timeout(4000),
    });
    const type = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    if (!res.ok || !TYPES.has(type)) return none(404);
    const body = await res.arrayBuffer();
    if (body.byteLength > MAX) return none(404);
    return new Response(body, {
      headers: {
        'content-type': type,
        'cache-control': 'public, max-age=86400',
        'x-content-type-options': 'nosniff',
        'content-security-policy': "default-src 'none'; sandbox",
      },
    });
  } catch {
    return none(404);
  }
};
