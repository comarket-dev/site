import { defineMiddleware } from 'astro:middleware';
import { requiresConsent } from './lib/consent';
import { assignArms } from './lib/experiments';

const YEAR = 60 * 60 * 24 * 365;
const SIDES = new Set(['brands', 'creators']);

function carryUtm(url: URL): string {
  const keep = new URLSearchParams();
  for (const [k, v] of url.searchParams) if (k.startsWith('utm_')) keep.set(k, v);
  const s = keep.toString();
  return s ? `?${s}` : '';
}

export const onRequest = defineMiddleware(async (ctx, next) => {
  const { url, cookies, locals } = ctx;
  const path = url.pathname.replace(/\/+$/, '') || '/';

  // Static files and Astro internals skip everything below.
  if (path.startsWith('/_') || path.startsWith('/fonts/') || path.startsWith('/assets/') || /\.[a-z0-9]{2,5}$/i.test(path)) {
    return next();
  }

  // Audience routing for the fork. Ads link with ?aud=brands or ?aud=creators.
  if (path === '/') {
    const aud = url.searchParams.get('aud') ?? url.searchParams.get('utm_audience');
    if (aud && SIDES.has(aud)) return ctx.redirect(`/${aud}${carryUtm(url)}`, 302);
    const side = cookies.get('cm_side')?.value;
    if (!url.searchParams.has('fork') && side && SIDES.has(side)) return ctx.redirect(`/${side}${carryUtm(url)}`, 302);
  }

  const cf = (ctx.request as Request & { cf?: { country?: string } }).cf;
  const country = cf?.country;
  const consent = cookies.get('cm_consent')?.value;
  const ask = requiresConsent(country);
  const tracking = !ask || consent === '1';

  let visitorId = cookies.get('cm_vid')?.value;
  if (visitorId && !/^[0-9a-f-]{36}$/i.test(visitorId)) visitorId = undefined;
  if (tracking && !visitorId) {
    visitorId = crypto.randomUUID();
    cookies.set('cm_vid', visitorId, { path: '/', maxAge: YEAR, sameSite: 'lax', secure: true, httpOnly: true });
  }

  locals.country = country;
  locals.needsConsent = ask && consent === undefined;
  locals.visitorId = tracking ? visitorId : undefined;

  const cfContext = (locals as { cfContext?: ExecutionContext }).cfContext;
  const wait = (p: Promise<unknown>) => (cfContext ? cfContext.waitUntil(p) : void p.catch(() => {}));
  locals.arms = path.startsWith('/api/') ? {} : await assignArms(path, locals.visitorId, cookies, wait);

  // Remember the side people land on, so the fork can step aside next time.
  const side = path.slice(1);
  if (tracking && SIDES.has(side)) {
    cookies.set('cm_side', side, { path: '/', maxAge: 60 * 60 * 24 * 180, sameSite: 'lax', secure: true });
  }

  const res = await next();
  if (!path.startsWith('/api/')) {
    try {
      res.headers.set('x-content-type-options', 'nosniff');
      res.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
      res.headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()');
    } catch {
      /* some responses carry immutable headers */
    }
  }
  return res;
});
