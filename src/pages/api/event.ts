import type { APIRoute } from 'astro';
import { withDb } from '../../lib/db';
import { json, readJson, sameOrigin } from '../../lib/http';

const TYPES = new Set(['fork_choice', 'preview_built', 'pass_saved', 'pass_shared', 'estimator_used', 'rate_used']);

export const POST: APIRoute = async ({ request, url, locals }) => {
  if (!sameOrigin(request, url)) return json({ error: 'forbidden' }, 403);
  // No consent, no record. Respond the same way so the page doesn't care.
  if (!locals.visitorId) return json({ ok: true });
  const body = await readJson(request, 2_000);
  const type = typeof body?.type === 'string' ? body.type : '';
  if (!TYPES.has(type)) return json({ error: 'unknown event' }, 400);
  const props = body?.props && typeof body.props === 'object' ? JSON.stringify(body.props).slice(0, 800) : null;
  await withDb(locals as App.Locals & { cfContext?: ExecutionContext }, (sql) =>
    sql`insert into events (visitor_id, type, props) values (${locals.visitorId!}, ${type}, ${props}::jsonb)`,
  ).catch(() => null);
  return json({ ok: true });
};
