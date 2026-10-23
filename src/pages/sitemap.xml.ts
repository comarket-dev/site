import type { APIRoute } from 'astro';

const PAGES = ['/', '/brands', '/creators', '/privacy'];

export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL('https://comarket.si');
  const urls = PAGES.map((p) => `<url><loc>${new URL(p, base)}</loc></url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, {
    headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' },
  });
};
