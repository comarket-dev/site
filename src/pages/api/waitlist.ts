import type { APIRoute } from 'astro';
import { withDb } from '../../lib/db';
import { PRICING, priceArm } from '../../lib/experiments';
import { clip, isEmail, json, readJson, sameOrigin } from '../../lib/http';
import { sendPassEmail, verifyTurnstile } from '../../lib/notify';
import { normalizeSiteUrl } from '../../lib/preview';
import { isReserved, normalizeHandle } from '../../lib/handle';

const PLATFORMS = new Set(['youtube', 'tiktok', 'instagram', 'substack', 'reddit', 'x', 'podcast', 'blog', 'other']);

export const POST: APIRoute = async ({ request, url, locals, cookies }) => {
  if (!sameOrigin(request, url)) return json({ error: 'Cross-site requests are not accepted.' }, 403);
  const body = await readJson(request);
  if (!body) return json({ error: 'Send the form as JSON.' }, 400);

  const side = body.side === 'brand' || body.side === 'creator' ? body.side : null;
  if (!side) return json({ error: 'Choose brand or creator.' }, 400);
  if (!isEmail(body.email)) return json({ error: 'Enter a valid email address.' }, 400);
  const email = String(body.email).trim().toLowerCase();

  const ip = request.headers.get('cf-connecting-ip');
  if (!(await verifyTurnstile(body.turnstile, ip))) return json({ error: 'The bot check failed. Refresh and try again.' }, 400);

  let label: string;
  let siteUrl: string | null = null;
  let handle: string | null = null;
  let platform: string | null = null;
  if (side === 'brand') {
    const site = normalizeSiteUrl(String(body.site ?? ''));
    if (!site) return json({ error: 'Enter your website, like yourapp.com.' }, 400);
    siteUrl = site.origin;
    label = clip(body.name, 40) ?? site.hostname.replace(/^www\./, '');
  } else {
    handle = normalizeHandle(body.handle);
    if (!handle) return json({ error: 'Use 2 to 24 letters, numbers, dots or underscores.', field: 'handle' }, 400);
    if (isReserved(handle)) return json({ error: `comarket.si/${handle} isn’t available. Try another.`, field: 'handle' }, 409);
    platform = typeof body.platform === 'string' && PLATFORMS.has(body.platform) ? body.platform : 'other';
    label = `@${handle}`;
  }

  // Brands keep the price they were shown.
  const arm = side === 'brand' ? priceArm(locals.arms ?? {}) : null;
  const armFromCookie = cookies.get(`cm_x_${PRICING.id}`)?.value;
  const shown = side === 'brand' ? (PRICING.arms.find((a) => a.id === armFromCookie) ?? arm) : null;

  const utm = typeof body.utm === 'object' && body.utm ? JSON.stringify(body.utm).slice(0, 1000) : null;
  const referrer = clip(body.referrer, 300);

  type Row = { pass_no: number; label: string; created_at: Date; existing: boolean };
  const row = await withDb(locals as App.Locals & { cfContext?: ExecutionContext }, async (sql) => {
    const find = () => sql<Row[]>`
      select pass_no, label, created_at, true as existing from waitlist where side = ${side} and email = ${email}`;
    const [found] = await find();
    if (found) return found;
    if (handle) {
      const [taken] = await sql`select 1 from waitlist where side = 'creator' and lower(handle) = ${handle} limit 1`;
      if (taken) return 'taken' as const;
    }
    // Insert only when new, so duplicate signups don't burn pass numbers.
    const [inserted] = await sql<Row[]>`
      insert into waitlist (side, email, label, site_url, handle, platform, price_arm, price_first, price_after,
                            visitor_id, country, utm, referrer)
      values (${side}, ${email}, ${label}, ${siteUrl}, ${handle}, ${platform},
              ${shown?.id ?? null}, ${shown?.first ?? null}, ${shown?.after ?? null},
              ${locals.visitorId ?? null}, ${locals.country ?? null}, ${utm}::jsonb, ${referrer})
      on conflict (side, email) do nothing
      returning pass_no, label, created_at, false as existing`;
    const r = inserted ?? (await find())[0];
    if (locals.visitorId && !r.existing) {
      await sql`
        insert into events (visitor_id, type, experiment, arm, props)
        values (${locals.visitorId}, ${side === 'brand' ? 'waitlist_brand' : 'waitlist_creator'},
                ${shown ? PRICING.id : null}, ${shown?.id ?? null}, ${JSON.stringify({ platform })}::jsonb)`;
    }
    return r;
  }).catch((e) => {
    // two people racing for the same handle: the unique index decides
    if ((e as { code?: string }).code === '23505' && handle) return 'taken' as const;
    console.error('waitlist insert failed', e);
    return undefined;
  });

  if (row === 'taken') return json({ error: `comarket.si/${handle} is taken. Try another.`, field: 'handle' }, 409);

  if (row === null) return json({ error: 'The waitlist isn’t connected yet. Try again soon.' }, 503);
  if (!row) return json({ error: 'Something went wrong on our side. Try again in a minute.' }, 500);

  if (!row.existing) {
    const mail = sendPassEmail({ to: email, passNo: row.pass_no, side, label: row.label, origin: url.origin }).catch((e) =>
      console.error('email failed', e),
    );
    const ctx = (locals as { cfContext?: ExecutionContext }).cfContext;
    if (ctx) ctx.waitUntil(mail);
  }

  return json({
    ok: true,
    passNo: row.pass_no,
    side,
    label: row.label,
    issued: new Date(row.created_at).toISOString(),
    returning: row.existing,
  });
};
