// Applies db/migrations/*.sql in order. Usage: DATABASE_URL=postgres://... npm run db:migrate
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('Set DATABASE_URL to your Neon connection string.');
  process.exit(1);
}

const sql = postgres(url, { max: 1, onnotice: () => {} });
const dir = new URL('../db/migrations/', import.meta.url).pathname;

try {
  await sql`create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())`;
  const done = new Set((await sql`select name from schema_migrations`).map((r) => r.name));
  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
  for (const f of files) {
    if (done.has(f)) continue;
    const text = await readFile(join(dir, f), 'utf8');
    await sql.begin(async (tx) => {
      await tx.unsafe(text);
      await tx`insert into schema_migrations (name) values (${f})`;
    });
    console.log('applied', f);
  }
  console.log('database is up to date');
} finally {
  await sql.end();
}
