/** Creator handles: comarket.si/<handle>. One shape everywhere, so a claimed handle means the same thing in every form. */

/**
 * Paths the site already uses, names that would confuse buyers, and paths the platform will need.
 * A copy of RESERVED_HANDLES in comarket_code's packages/core/src/handle.ts, which is the source of truth.
 */
const RESERVED = new Set([
  'api', 'brands', 'creators', 'privacy', 'terms', 'about', 'help', 'support', 'admin', 'login', 'signup', 'join',
  'waitlist', 'pricing', 'blog', 'assets', 'fonts', 'og', 'sitemap', 'robots', 'comarket', 'stripe', 'www', 'mail',
  // added for the platform
  'app', 'dashboard', 'account', 'settings', 'legal', 'status', 'docs', 'hooks', 'static', 'cdn',
  // sign-in and accounts
  'logout', 'signin', 'register', 'auth', 'verify', 'reset', 'invite', 'onboarding', 'welcome',
  // money
  'pay', 'payouts', 'billing', 'invoices', 'earnings', 'checkout',
  // storefronts
  'offers', 'shop', 'store', 'storefront', 'hub', 'go', 'links',
  // names that sound like the company speaking
  'official', 'team', 'staff', 'security', 'abuse', 'safety', 'trust', 'contact', 'press', 'careers', 'faq', 'cookies',
  // words software treats specially
  'null', 'undefined', 'test', 'dev', 'staging', 'demo', 'example', 'new', 'search', 'home', 'me', 'email', 'webhooks',
  'media', 'images',
]);

/** Handles may contain dots, so a handle could be a file name the site serves at its root (robots.txt, favicon.svg). */
const FILE_NAME = /\.(txt|xml|svg|ico|png|jpe?g|gif|webp|json|webmanifest|js|css|html?)$/;

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

/** Expects a normalized handle. Also blocks file names and anything containing "comarket" (comarket_official). */
export function isReserved(handle: string): boolean {
  return RESERVED.has(handle) || FILE_NAME.test(handle) || handle.includes('comarket');
}
