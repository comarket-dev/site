import type { APIRoute } from 'astro';
import { json, readJson, sameOrigin } from '../../lib/http';

export const POST: APIRoute = async ({ request, url, cookies }) => {
  if (!sameOrigin(request, url)) return json({ error: 'forbidden' }, 403);
  const body = await readJson(request, 200);
  const value = body?.value === '1' ? '1' : '0';
  cookies.set('cm_consent', value, { path: '/', maxAge: 60 * 60 * 24 * 180, sameSite: 'lax', secure: true });
  if (value === '0') {
    cookies.delete('cm_vid', { path: '/' });
    cookies.delete('cm_side', { path: '/' });
  }
  return json({ ok: true, value });
};
