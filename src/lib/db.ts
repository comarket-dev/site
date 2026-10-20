import postgres from 'postgres';
import { env } from 'cloudflare:workers';

export type Sql = ReturnType<typeof postgres>;

/**
 * One client per request. Hyperdrive pools connections at the edge, so this is cheap.
 * Returns null when no database is configured, so callers can degrade instead of crash.
 */
export function openDb(): Sql | null {
  const url = env.HYPERDRIVE?.connectionString || env.DATABASE_URL;
  if (!url) return null;
  return postgres(url, { max: 4, fetch_types: false, idle_timeout: 5, connect_timeout: 5 });
}

/** Run work against the database and close the client when the request is done. */
export async function withDb<T>(
  locals: App.Locals & { cfContext?: ExecutionContext },
  work: (sql: Sql) => Promise<T>,
): Promise<T | null> {
  const sql = openDb();
  if (!sql) return null;
  try {
    return await work(sql);
  } finally {
    const end = sql.end({ timeout: 2 });
    if (locals.cfContext) locals.cfContext.waitUntil(end);
    else await end;
  }
}
