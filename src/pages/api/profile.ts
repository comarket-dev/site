import type { APIRoute } from 'astro';
import { withDb } from '../../lib/db';
import { clip, isEmail, json, readJson, sameOrigin } from '../../lib/http';

/* The optional questions under a new pass. Answers belong to the signup, not to tracking, so they're kept whether
   or not the visitor consented to analytics: an event tied to the pass, checked against its email. */
const KEYS = new Set(['sells', 'pays', 'price', 'platform', 'followers', 'topic']);

export const POST: APIRoute = async ({ request, url, locals }) => {
  if (!sameOrigin(request, url)) return json({ error: 'forbidden' }, 403);
  const body = await readJson(request, 2_000);
  if (!body) return json({ error: 'Send the answers as JSON.' }, 400);
  const side = body.side === 'brand' || body.side === 'creator' ? body.side : null;
  const passNo = Number(body.passNo);
  if (!side || !Number.isInteger(passNo) || !isEmail(body.email)) return json({ error: 'Unknown pass.' }, 400);
  const email = String(body.email).trim().toLowerCase();
  const raw = body.answers && typeof body.answers === 'object' ? (body.answers as Record<string, unknown>) : {};
  const answers = Object.fromEntries(
    Object.entries(raw)
      .filter(([k, v]) => KEYS.has(k) && typeof v === 'string')
      .map(([k, v]) => [k, clip(v, 60)]),
  );
  if (!Object.keys(answers).length) return json({ ok: true });

  const ok = await withDb(locals as App.Locals & { cfContext?: ExecutionContext }, async (sql) => {
    const [row] = await sql`select 1 from waitlist where side = ${side} and email = ${email} and pass_no = ${passNo}`;
    if (!row) return false;
    await sql`
      insert into events (visitor_id, type, props)
      values (${locals.visitorId ?? null}, 'profile', ${sql.json({ side, passNo, ...answers })})`;
    return true;
  }).catch(() => null);

  if (ok === false) return json({ error: 'Unknown pass.' }, 404);
  return json({ ok: true });
};
