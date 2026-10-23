/** Creator handles: comarket.si/<handle>. One shape everywhere, so a claimed handle means the same thing in every form. */

/** Paths the site already uses, and names that would confuse buyers. */
const RESERVED = new Set([
  'api', 'brands', 'creators', 'privacy', 'terms', 'about', 'help', 'support', 'admin', 'login', 'signup', 'join',
  'waitlist', 'pricing', 'blog', 'assets', 'fonts', 'og', 'sitemap', 'robots', 'comarket', 'stripe', 'www', 'mail',
]);

export function normalizeHandle(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const h = raw
    .trim()
    .replace(/^@+/, '')
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, '')
    .replace(/^[._]+|[._]+$/g, '');
  if (h.length < 2 || h.length > 24) return null;
  return h;
}

export function isReserved(handle: string): boolean {
  return RESERVED.has(handle);
}
