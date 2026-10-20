import { env } from 'cloudflare:workers';

/** Verify a Cloudflare Turnstile token. Passes when Turnstile isn't configured. */
export async function verifyTurnstile(token: unknown, ip: string | null): Promise<boolean> {
  const secret = env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (typeof token !== 'string' || !token) return false;
  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

export interface PassMail {
  to: string;
  passNo: number;
  side: 'brand' | 'creator';
  label: string;
  origin: string;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Send the confirmation through Resend. Skipped quietly when email isn't configured. */
export async function sendPassEmail(m: PassMail): Promise<void> {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) return;
  const no = String(m.passNo).padStart(4, '0');
  const kind = m.side === 'brand' ? 'Brand pass' : 'Creator pass';
  const page = m.side === 'brand' ? '/brands' : '/creators';
  const html = `<!doctype html><html><body style="margin:0;background:#EDF0EC;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#051230">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
  <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border:1px solid #051230">
  <tr><td style="padding:28px 28px 8px;font-weight:700;font-size:20px;letter-spacing:-0.5px">Comarket</td></tr>
  <tr><td style="padding:0 28px;font-family:Menlo,monospace;font-size:11px;letter-spacing:1px;color:#525B67;text-transform:uppercase">${kind} · No. ${no}</td></tr>
  <tr><td style="padding:24px 28px 8px;font-weight:700;font-size:34px;line-height:1;letter-spacing:-1px">You’re on the list, ${esc(m.label)}.</td></tr>
  <tr><td style="padding:12px 28px 28px;font-size:16px;line-height:1.5;color:#525B67">We’ll write when your spot opens. Your pass number holds your place.</td></tr>
  <tr><td style="padding:0 28px 32px"><a href="${m.origin}${page}" style="display:inline-block;background:#051230;color:#EDF0EC;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:600;font-size:14px">See your pass</a></td></tr>
  </table></td></tr></table></body></html>`;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: [m.to], subject: `Your Comarket ${kind.toLowerCase()}, No. ${no}`, html }),
    signal: AbortSignal.timeout(6000),
  });
}
