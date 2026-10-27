import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { json, readJson, sameOrigin } from '../../lib/http';
import { fetchBrandPreview, normalizeSiteUrl, type BrandPreview } from '../../lib/preview';

export const POST: APIRoute = async ({ request, url }) => {
  if (!sameOrigin(request, url)) return json({ error: 'Cross-site requests are not accepted.' }, 403);
  const body = await readJson(request, 2_000);
  const site = normalizeSiteUrl(String(body?.site ?? ''));
  if (!site) return json({ error: 'Enter a public website, like yourapp.com.' }, 400);

  const key = `preview:${site.hostname.replace(/^www\./, '')}`;
  const cached = await env.EXPERIMENTS?.get<BrandPreview>(key, 'json');
  if (cached) return json(cached);

  try {
    const preview = await fetchBrandPreview(site);
    await env.EXPERIMENTS?.put(key, JSON.stringify(preview), { expirationTtl: 60 * 60 * 24 });
    return json(preview);
  } catch {
    const host = site.hostname.replace(/^www\./, '');
    const name = host.split('.')[0];
    return json({
      host,
      name: name.charAt(0).toUpperCase() + name.slice(1),
      color: null,
      icon: null,
      image: null,
      partial: true,
    } satisfies BrandPreview & { partial: boolean });
  }
};
