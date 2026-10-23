import type { APIRoute } from 'astro';
import { withDb } from '../../lib/db';
import { isReserved, normalizeHandle } from '../../lib/handle';
import { json } from '../../lib/http';

/** Is comarket.si/<handle> free? Used by the creator hero before anyone types an email. */
export const GET: APIRoute = async ({ url, locals }) => {
  const handle = normalizeHandle(url.searchParams.get('h'));
  if (!handle) return json({ error: 'Use 2 to 24 letters, numbers, dots or underscores.' }, 400);
  if (isReserved(handle)) return json({ handle, available: false });
  const taken = await withDb(locals as App.Locals & { cfContext?: ExecutionContext }, async (sql) => {
    const rows = await sql`select 1 from waitlist where side = 'creator' and lower(handle) = ${handle} limit 1`;
    return rows.length > 0;
  }).catch(() => null);
  // Without a database we can't say, so don't promise either way.
  return json({ handle, available: taken === null ? null : !taken });
};
