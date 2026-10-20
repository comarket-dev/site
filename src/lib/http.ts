export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

export function isEmail(s: unknown): s is string {
  return typeof s === 'string' && s.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());
}

export function clip(s: unknown, max: number): string | null {
  if (typeof s !== 'string') return null;
  const t = s.trim().replace(/[\u0000-\u001f]/g, '');
  return t ? t.slice(0, max) : null;
}

export async function readJson(request: Request, maxBytes = 8_000): Promise<Record<string, unknown> | null> {
  const len = Number(request.headers.get('content-length') ?? 0);
  if (len > maxBytes) return null;
  try {
    const text = await request.text();
    if (text.length > maxBytes) return null;
    const v = JSON.parse(text);
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Reject cross-site form posts. Same-origin fetches send a matching Origin header. */
export function sameOrigin(request: Request, url: URL): boolean {
  const origin = request.headers.get('origin');
  return !origin || origin === url.origin;
}
